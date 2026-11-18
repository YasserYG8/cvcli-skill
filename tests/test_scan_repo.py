"""Tests for cvcli/scripts/scan_repo.py. Run with: python -m pytest -q"""

import importlib.util
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parent.parent / "cvcli" / "scripts" / "scan_repo.py"

# Load the script as a module so we can call scan() directly.
_spec = importlib.util.spec_from_file_location("scan_repo", SCRIPT)
scan_repo = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(scan_repo)

HAS_GIT = shutil.which("git") is not None
needs_git = pytest.mark.skipif(not HAS_GIT, reason="git is not installed")

ALICE = ("Alice Dev", "alice@example.com")
BOB = ("Bob Dev", "bob@example.com")


# ---------------------------------------------------------------- helpers

def write(root: Path, relpath: str, content: str) -> None:
    path = root / relpath
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def git(root: Path, *args: str, author=None, date=None) -> None:
    """Run git in root with a clean, fixed identity (ignores the user's global config)."""
    env = dict(os.environ)
    env["GIT_CONFIG_GLOBAL"] = os.devnull
    env["GIT_CONFIG_NOSYSTEM"] = "1"
    if author:
        env["GIT_AUTHOR_NAME"] = env["GIT_COMMITTER_NAME"] = author[0]
        env["GIT_AUTHOR_EMAIL"] = env["GIT_COMMITTER_EMAIL"] = author[1]
    if date:
        env["GIT_AUTHOR_DATE"] = env["GIT_COMMITTER_DATE"] = date
    subprocess.run(["git"] + list(args), cwd=root, env=env, check=True,
                   capture_output=True)


def git_init(root: Path, user_email: str = ALICE[1]) -> None:
    git(root, "init", "-q")
    git(root, "config", "user.email", user_email)
    git(root, "config", "user.name", "Local User")
    git(root, "config", "commit.gpgsign", "false")


def commit(root: Path, message: str, author, date: str) -> None:
    git(root, "add", "-A")
    git(root, "commit", "-q", "-m", message, author=author, date=date)


def build_fake_repo(root: Path) -> None:
    """A small full-stack repo with infra and tests."""
    write(root, "README.md", "# Fake Shop\n\nA small shop API with a React front end.\n")
    write(root, "LICENSE", "MIT License\n\nPermission is hereby granted, free of charge, to any person...\n")
    write(root, "api/app.py", "from flask import Flask\n\napp = Flask(__name__)\n\n\n@app.get('/')\ndef index():\n    return 'ok'\n")
    write(root, "api/requirements.txt", "flask==3.0.0\npytest>=8  # tests\n-r other.txt\n")
    write(root, "web/package.json", json.dumps({
        "name": "web",
        "dependencies": {"react": "^18.0.0", "express": "^4.0.0"},
        "devDependencies": {"jest": "^29.0.0"},
    }))
    write(root, "web/src/index.js", "const a = 1;\nconst b = 2;\nconsole.log(a + b);")  # no final newline
    write(root, "web/src/index.test.js", "test('sum', () => {});\n")
    write(root, "tests/test_app.py", "def test_ok():\n    assert True\n")
    write(root, "Dockerfile", "FROM python:3.12-slim\nCOPY . .\n")
    write(root, "docker-compose.yml", "services:\n  api:\n    build: .\n")
    write(root, ".github/workflows/ci.yml", "name: CI\non: push\njobs: {}\n")
    write(root, "k8s/deployment.yaml", "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\n")
    write(root, "infra/main.tf", 'provider "aws" {\n  region = "eu-west-3"\n}\n')
    # Noise that must be ignored.
    write(root, "web/package-lock.json", "{\n" + "  \"x\": 1,\n" * 500 + "}\n")
    write(root, "web/node_modules/react/index.js", "module.exports = {};\n" * 1000)
    write(root, "web/public/app.min.js", "var a=1;\n" * 1000)


# ---------------------------------------------------------------- tests

@needs_git
def test_full_fake_repo(tmp_path):
    build_fake_repo(tmp_path)
    git_init(tmp_path)
    commit(tmp_path, "first", ALICE, "2024-01-10T10:00:00+01:00")
    write(tmp_path, "api/extra.py", "x = 1\n")
    commit(tmp_path, "second", BOB, "2024-02-01T09:00:00+00:00")
    write(tmp_path, "api/more.py", "y = 2\n")
    commit(tmp_path, "third", ALICE, "2024-03-05T18:30:00-05:00")

    result = scan_repo.scan(str(tmp_path))

    assert result["errors"] == []
    assert result["readme"]["title"] == "Fake Shop"
    assert result["readme"]["truncated"] is False
    assert result["license"] == {"file": "LICENSE", "spdx_guess": "MIT"}

    langs = {l["language"]: l for l in result["languages"]}
    # 3 lines with no final newline still count as 3; node_modules and .min.js are skipped.
    assert langs["JavaScript"]["files"] == 2
    assert langs["JavaScript"]["lines"] == 3 + 1
    assert langs["Python"]["files"] == 4
    assert langs["JSON"]["files"] == 1  # package.json only, lock file skipped
    assert result["languages"][0]["kind"] == "code"

    framework_names = {f["name"] for f in result["frameworks"]}
    assert {"React", "Express", "Jest", "Flask", "pytest"} <= framework_names
    manifest_files = {m["file"] for m in result["manifests"]}
    assert manifest_files == {"api/requirements.txt", "web/package.json"}

    infra = result["infra"]
    assert infra["dockerfile"] == ["Dockerfile"]
    assert infra["docker_compose"] == ["docker-compose.yml"]
    assert infra["github_workflows"] == [".github/workflows/ci.yml"]
    assert infra["kubernetes"] == ["k8s/deployment.yaml"]
    assert infra["terraform"] == ["infra/main.tf"]
    assert infra["gitlab_ci"] is False

    assert result["tests"]["present"] is True
    assert result["tests"]["test_files"] == 2
    assert {"pytest", "Jest"} <= set(result["tests"]["frameworks"])

    g = result["git"]
    assert g["is_repo"] is True
    assert g["total_commits"] == 3
    assert g["first_commit"].startswith("2024-01-10")
    assert g["last_commit"].startswith("2024-03-05")
    by_email = {c["email"]: c for c in g["contributors"]}
    assert by_email["alice@example.com"]["commits"] == 2
    assert by_email["alice@example.com"]["share"] == pytest.approx(0.667, abs=0.001)
    assert by_email["bob@example.com"]["share"] == pytest.approx(0.333, abs=0.001)
    assert g["significant_contributors"] == 2
    assert g["current_user"]["email"] == "alice@example.com"
    assert g["current_user"]["commits"] == 2


@needs_git
def test_bot_is_not_significant(tmp_path):
    write(tmp_path, "a.py", "a = 1\n")
    git_init(tmp_path)
    commit(tmp_path, "one", ALICE, "2024-01-01T00:00:00+00:00")
    write(tmp_path, "b.py", "b = 1\n")
    commit(tmp_path, "bump", ("dependabot[bot]", "bot@users.noreply.github.com"),
           "2024-01-02T00:00:00+00:00")

    g = scan_repo.scan(str(tmp_path))["git"]
    bots = [c for c in g["contributors"] if c["bot"]]
    assert len(bots) == 1
    assert g["significant_contributors"] == 1


@needs_git
def test_empty_git_repo(tmp_path):
    git_init(tmp_path)
    result = scan_repo.scan(str(tmp_path))
    g = result["git"]
    assert g["is_repo"] is True
    assert g["total_commits"] == 0
    assert g["first_commit"] is None
    assert g["last_commit"] is None
    assert g["contributors"] == []
    assert g["current_user"] == {"email": "alice@example.com", "commits": 0, "share": None}


@needs_git
def test_folder_without_git(tmp_path):
    write(tmp_path, "main.go", "package main\n\nfunc main() {}\n")
    write(tmp_path, "go.mod", "module x\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)\n")
    result = scan_repo.scan(str(tmp_path))
    assert result["git"]["available"] is True
    assert result["git"]["is_repo"] is False
    assert result["git"]["total_commits"] is None
    assert result["git"]["contributors"] is None
    assert result["frameworks"] == [{"name": "Gin", "source": "go.mod"}]


def test_git_not_installed(tmp_path, monkeypatch):
    def no_git(*args, **kwargs):
        raise FileNotFoundError("git")
    monkeypatch.setattr(scan_repo.subprocess, "run", no_git)
    result = scan_repo.scan(str(tmp_path))
    assert result["git"]["available"] is False
    assert any("git is not installed" in e for e in result["errors"])


def test_empty_folder(tmp_path):
    result = scan_repo.scan(str(tmp_path))
    assert result["readme"] is None
    assert result["license"] is None
    assert result["languages"] == []
    assert result["manifests"] == []
    assert result["frameworks"] == []
    assert result["tests"] == {"present": False, "test_files": 0, "frameworks": []}
    assert result["infra"]["dockerfile"] == []
    json.dumps(result)  # must be valid JSON


def test_readme_excerpt_is_cut(tmp_path):
    write(tmp_path, "README.md", "# Big\n\n" + "word " * 1000)
    readme = scan_repo.scan(str(tmp_path))["readme"]
    assert len(readme["excerpt"]) == scan_repo.README_EXCERPT_CHARS
    assert readme["truncated"] is True
    assert readme["title"] == "Big"


def test_other_manifests(tmp_path):
    write(tmp_path, "pyproject.toml",
          '[project]\nname = "x"\ndependencies = ["fastapi>=0.110", "sqlalchemy"]\n')
    write(tmp_path, "Cargo.toml", '[package]\nname = "y"\n\n[dependencies]\naxum = "0.7"\ntokio = { version = "1" }\n')
    write(tmp_path, "Gemfile", "source 'https://rubygems.org'\ngem 'rails', '~> 7.1'\n")
    write(tmp_path, "composer.json", json.dumps({"require": {"php": "^8.2", "laravel/framework": "^11.0"}}))
    write(tmp_path, "pom.xml", "<project><dependencies><dependency><groupId>org.springframework.boot</groupId>"
                               "<artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>")
    names = {f["name"] for f in scan_repo.scan(str(tmp_path))["frameworks"]}
    assert {"FastAPI", "SQLAlchemy", "Axum", "Tokio", "Ruby on Rails", "Laravel", "Spring Boot"} <= names


def test_pytest_found_from_imports(tmp_path):
    write(tmp_path, "tests/test_x.py", "import pytest\n\ndef test_x():\n    assert True\n")
    write(tmp_path, ".claude/settings.local.json", "{}\n")  # tool config, must be skipped
    result = scan_repo.scan(str(tmp_path))
    assert result["tests"]["frameworks"] == ["pytest"]
    assert all(l["language"] != "JSON" for l in result["languages"])


def test_broken_manifest_is_reported_not_fatal(tmp_path):
    write(tmp_path, "package.json", "{ not json")
    result = scan_repo.scan(str(tmp_path))
    assert result["manifests"] == []
    assert any("package.json" in e for e in result["errors"])


def test_cli_outputs_json(tmp_path):
    write(tmp_path, "hello.py", "print('hi')\n")
    proc = subprocess.run([sys.executable, str(SCRIPT), str(tmp_path)],
                          capture_output=True, text=True, encoding="utf-8")
    assert proc.returncode == 0
    data = json.loads(proc.stdout)
    assert data["repo_name"] == tmp_path.name
    assert data["languages"][0]["language"] == "Python"


def test_cli_missing_path(tmp_path):
    missing = tmp_path / "does-not-exist"
    proc = subprocess.run([sys.executable, str(SCRIPT), str(missing)],
                          capture_output=True, text=True, encoding="utf-8")
    assert proc.returncode == 2
    assert "error" in json.loads(proc.stdout)
