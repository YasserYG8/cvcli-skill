#!/usr/bin/env python3
"""Scan a code repository and print facts about it as JSON.

Usage:
    python3 scan_repo.py <repo-path>

Standard library only (Python 3.9+). The script never crashes on a bad repo:
a section that fails is set to null and the reason goes into "errors".
Exit codes: 0 = scan done, 2 = the path does not exist or is not a folder.
"""

import fnmatch
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional

SCANNER_VERSION = "0.1.0"

# The README excerpt is sent to the model, so we keep it short.
README_EXCERPT_CHARS = 1500

# Files bigger than this are almost always generated or data, not hand-written code.
MAX_FILE_BYTES = 1_000_000

# YAML and test files are read only at the start (Kubernetes / Ansible / test imports).
YAML_SNIFF_BYTES = 4096

# A contributor with at least this share of commits counts as "significant".
SIGNIFICANT_SHARE = 0.10

# Git calls should be fast; this protects against a hung git process.
GIT_TIMEOUT_SECONDS = 30

# Max dependency names listed per manifest, to keep the JSON readable.
MAX_DEPS_PER_MANIFEST = 40

SKIP_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", ".venv", "venv", "env",
    "__pycache__", ".tox", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    ".next", ".nuxt", "target", ".gradle", ".idea", ".vscode", "coverage",
    ".terraform", "bower_components", "site-packages", ".claude",
}

LOCK_FILES = {
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json",
    "bun.lockb", "poetry.lock", "Pipfile.lock", "uv.lock", "Cargo.lock",
    "composer.lock", "Gemfile.lock", "go.sum", "mix.lock", "pubspec.lock",
    ".terraform.lock.hcl",
}

MINIFIED_PATTERNS = ("*.min.js", "*.min.css", "*.bundle.js", "*.map")

# Extension -> (language, kind). "code" is real code; "markup" is docs/config.
EXTENSIONS = {
    ".py": ("Python", "code"), ".js": ("JavaScript", "code"),
    ".mjs": ("JavaScript", "code"), ".cjs": ("JavaScript", "code"),
    ".jsx": ("JavaScript", "code"), ".ts": ("TypeScript", "code"),
    ".tsx": ("TypeScript", "code"), ".go": ("Go", "code"),
    ".rs": ("Rust", "code"), ".java": ("Java", "code"),
    ".kt": ("Kotlin", "code"), ".kts": ("Kotlin", "code"),
    ".scala": ("Scala", "code"), ".rb": ("Ruby", "code"),
    ".php": ("PHP", "code"), ".cs": ("C#", "code"), ".c": ("C", "code"),
    ".h": ("C", "code"), ".cpp": ("C++", "code"), ".cc": ("C++", "code"),
    ".hpp": ("C++", "code"), ".swift": ("Swift", "code"),
    ".dart": ("Dart", "code"), ".ex": ("Elixir", "code"),
    ".exs": ("Elixir", "code"), ".lua": ("Lua", "code"),
    ".r": ("R", "code"), ".sh": ("Shell", "code"), ".bash": ("Shell", "code"),
    ".zsh": ("Shell", "code"), ".ps1": ("PowerShell", "code"),
    ".sql": ("SQL", "code"), ".vue": ("Vue", "code"),
    ".svelte": ("Svelte", "code"), ".tf": ("HCL (Terraform)", "code"),
    ".hcl": ("HCL (Terraform)", "code"), ".html": ("HTML", "markup"),
    ".htm": ("HTML", "markup"), ".css": ("CSS", "markup"),
    ".scss": ("SCSS", "markup"), ".sass": ("SCSS", "markup"),
    ".less": ("Less", "markup"), ".md": ("Markdown", "markup"),
    ".rst": ("reStructuredText", "markup"), ".json": ("JSON", "markup"),
    ".yml": ("YAML", "markup"), ".yaml": ("YAML", "markup"),
    ".toml": ("TOML", "markup"), ".xml": ("XML", "markup"),
    ".ipynb": ("Jupyter Notebook", "code"),
}

# Files without a useful extension.
SPECIAL_FILENAMES = {
    "Dockerfile": ("Dockerfile", "code"),
    "Makefile": ("Makefile", "code"),
    "Jenkinsfile": ("Groovy (Jenkinsfile)", "code"),
}

# Dependency name (lowercase) -> framework or tool label.
KNOWN_FRAMEWORKS = {
    # JavaScript / TypeScript
    "react": "React", "next": "Next.js", "vue": "Vue", "nuxt": "Nuxt",
    "svelte": "Svelte", "@sveltejs/kit": "SvelteKit", "@angular/core": "Angular",
    "express": "Express", "fastify": "Fastify", "@nestjs/core": "NestJS",
    "koa": "Koa", "hono": "Hono", "electron": "Electron",
    "react-native": "React Native", "vite": "Vite", "webpack": "webpack",
    "typescript": "TypeScript", "tailwindcss": "Tailwind CSS",
    "prisma": "Prisma", "@prisma/client": "Prisma", "mongoose": "Mongoose",
    "sequelize": "Sequelize", "typeorm": "TypeORM", "drizzle-orm": "Drizzle",
    "socket.io": "Socket.IO", "graphql": "GraphQL", "@apollo/server": "Apollo",
    "redux": "Redux", "@reduxjs/toolkit": "Redux Toolkit",
    "jest": "Jest", "vitest": "Vitest", "mocha": "Mocha",
    "@playwright/test": "Playwright", "cypress": "Cypress",
    # Python
    "django": "Django", "djangorestframework": "Django REST Framework",
    "flask": "Flask", "fastapi": "FastAPI", "starlette": "Starlette",
    "sqlalchemy": "SQLAlchemy", "pydantic": "Pydantic", "celery": "Celery",
    "pandas": "pandas", "numpy": "NumPy", "scikit-learn": "scikit-learn",
    "torch": "PyTorch", "tensorflow": "TensorFlow", "streamlit": "Streamlit",
    "pytest": "pytest", "requests": "requests", "httpx": "HTTPX",
    "boto3": "AWS SDK (boto3)", "click": "Click", "typer": "Typer",
    # Go
    "github.com/gin-gonic/gin": "Gin", "github.com/labstack/echo": "Echo",
    "github.com/labstack/echo/v4": "Echo", "github.com/gofiber/fiber/v2": "Fiber",
    "gorm.io/gorm": "GORM", "github.com/spf13/cobra": "Cobra",
    "github.com/go-chi/chi/v5": "chi", "google.golang.org/grpc": "gRPC",
    # PHP
    "laravel/framework": "Laravel", "symfony/framework-bundle": "Symfony",
    "phpunit/phpunit": "PHPUnit", "slim/slim": "Slim",
    # Java / Kotlin
    "spring-boot-starter": "Spring Boot", "spring-boot-starter-web": "Spring Boot",
    "spring-boot-starter-test": "Spring Boot", "junit": "JUnit",
    "junit-jupiter": "JUnit", "hibernate-core": "Hibernate", "quarkus-core": "Quarkus",
    # Rust
    "actix-web": "Actix Web", "axum": "Axum", "tokio": "Tokio",
    "rocket": "Rocket", "serde": "Serde", "clap": "clap", "diesel": "Diesel",
    # Ruby
    "rails": "Ruby on Rails", "sinatra": "Sinatra", "rspec": "RSpec",
    "rspec-rails": "RSpec", "sidekiq": "Sidekiq",
}

# Framework labels that are test frameworks.
TEST_FRAMEWORKS = {
    "Jest", "Vitest", "Mocha", "Playwright", "Cypress", "pytest", "PHPUnit",
    "JUnit", "RSpec",
}

MANIFEST_ECOSYSTEMS = {
    "package.json": "npm", "go.mod": "go", "composer.json": "composer",
    "requirements.txt": "pip", "pyproject.toml": "python",
    "pom.xml": "maven", "build.gradle": "gradle", "build.gradle.kts": "gradle",
    "Cargo.toml": "cargo", "Gemfile": "rubygems",
}

LICENSE_SIGNATURES = [
    ("MIT", "permission is hereby granted, free of charge"),
    ("Apache-2.0", "apache license"),
    ("GPL-3.0", "gnu general public license"),
    ("LGPL", "gnu lesser general public license"),
    ("AGPL-3.0", "gnu affero general public license"),
    ("MPL-2.0", "mozilla public license"),
    ("BSD", "redistribution and use in source and binary forms"),
    ("ISC", "permission to use, copy, modify, and/or distribute"),
    ("Unlicense", "this is free and unencumbered software"),
]


# ---------------------------------------------------------------- helpers

def read_text(path: str, limit: Optional[int] = None) -> str:
    """Read a text file as UTF-8, ignoring bad bytes."""
    with open(path, "r", encoding="utf-8", errors="replace") as handle:
        return handle.read(limit) if limit else handle.read()


def rel(root: str, path: str) -> str:
    """Path relative to the repo root, always with forward slashes."""
    return os.path.relpath(path, root).replace(os.sep, "/")


def count_lines(path: str) -> int:
    """Count lines; a last line without a newline still counts."""
    with open(path, "rb") as handle:
        data = handle.read()
    if not data:
        return 0
    return data.count(b"\n") + (0 if data.endswith(b"\n") else 1)


def unique(items: List[str]) -> List[str]:
    """Remove duplicates but keep order."""
    seen = set()
    out = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out


# ---------------------------------------------------------------- file walk

def walk_repo(root: str, errors: List[str]) -> List[str]:
    """Return all files to consider (absolute paths), skipping noise folders."""
    files = []

    def on_error(err: OSError) -> None:
        errors.append("cannot read folder: {} ({})".format(
            rel(root, err.filename or root), err.strerror or err))

    for dirpath, dirnames, filenames in os.walk(root, onerror=on_error):
        # Edit dirnames in place so os.walk does not enter skipped folders.
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in SKIP_DIRS and not d.endswith(".egg-info"))
        for name in sorted(filenames):
            files.append(os.path.join(dirpath, name))
    return files


def is_noise_file(name: str) -> bool:
    """Lock files and minified/bundled files are not hand-written code."""
    if name in LOCK_FILES or name.endswith(".lock"):
        return True
    return any(fnmatch.fnmatch(name, pattern) for pattern in MINIFIED_PATTERNS)


def language_of(name: str):
    """Return (language, kind) or None."""
    if name in SPECIAL_FILENAMES:
        return SPECIAL_FILENAMES[name]
    if name.startswith("Dockerfile"):
        return SPECIAL_FILENAMES["Dockerfile"]
    ext = os.path.splitext(name)[1].lower()
    return EXTENSIONS.get(ext)


# ---------------------------------------------------------------- sections

def scan_readme(root: str) -> Optional[dict]:
    """Find a README at the root; return its title and the start of the text."""
    candidates = [n for n in sorted(os.listdir(root)) if n.lower().startswith("readme")]
    if not candidates:
        return None
    # Prefer Markdown when there are several.
    candidates.sort(key=lambda n: (not n.lower().endswith(".md"), n))
    name = candidates[0]
    path = os.path.join(root, name)
    if not os.path.isfile(path):
        return None
    text = read_text(path).strip()
    title = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            title = stripped.lstrip("#").strip() or None
            break
        # HTML title like <h1>Name</h1>
        match = re.search(r"<h1[^>]*>(.*?)</h1>", stripped, re.IGNORECASE)
        if match:
            title = re.sub(r"<[^>]+>", "", match.group(1)).strip() or None
            break
    return {
        "file": name,
        "title": title,
        "excerpt": text[:README_EXCERPT_CHARS],
        "truncated": len(text) > README_EXCERPT_CHARS,
        "total_chars": len(text),
    }


def scan_license(root: str) -> Optional[dict]:
    """Find a LICENSE file at the root and guess its type from known phrases."""
    names = [n for n in sorted(os.listdir(root))
             if n.lower().startswith(("license", "licence", "copying"))]
    names = [n for n in names if os.path.isfile(os.path.join(root, n))]
    if not names:
        return None
    text = read_text(os.path.join(root, names[0]), 5000).lower()
    guess = None
    for spdx, phrase in LICENSE_SIGNATURES:
        if phrase in text:
            guess = spdx
            break
    return {"file": names[0], "spdx_guess": guess}


def scan_languages(root: str, files: List[str], errors: List[str]) -> List[dict]:
    """Count files and lines per language."""
    stats = defaultdict(lambda: {"files": 0, "lines": 0, "kind": "code"})
    for path in files:
        name = os.path.basename(path)
        if is_noise_file(name):
            continue
        lang = language_of(name)
        if not lang:
            continue
        try:
            if os.path.getsize(path) > MAX_FILE_BYTES:
                continue
            lines = count_lines(path)
        except OSError as err:
            errors.append("cannot read file: {} ({})".format(rel(root, path), err.strerror or err))
            continue
        entry = stats[lang[0]]
        entry["kind"] = lang[1]
        entry["files"] += 1
        entry["lines"] += lines

    code_total = sum(v["lines"] for v in stats.values() if v["kind"] == "code")
    result = []
    for language, value in stats.items():
        share = None
        if value["kind"] == "code" and code_total:
            share = round(value["lines"] / code_total, 3)
        result.append({
            "language": language,
            "kind": value["kind"],
            "files": value["files"],
            "lines": value["lines"],
            "share_of_code": share,
        })
    # Code first, then biggest first.
    result.sort(key=lambda e: (e["kind"] != "code", -e["lines"], e["language"]))
    return result


# --- manifest parsers: each returns a list of dependency names

def deps_package_json(text: str) -> List[str]:
    data = json.loads(text)
    names = []
    for key in ("dependencies", "devDependencies", "peerDependencies"):
        section = data.get(key) or {}
        if isinstance(section, dict):
            names.extend(section.keys())
    return names


def deps_composer_json(text: str) -> List[str]:
    data = json.loads(text)
    names = []
    for key in ("require", "require-dev"):
        section = data.get(key) or {}
        if isinstance(section, dict):
            names.extend(k for k in section.keys() if "/" in k)  # skip "php", "ext-*"
    return names


def deps_go_mod(text: str) -> List[str]:
    names = []
    in_block = False
    for line in text.splitlines():
        line = line.split("//")[0].strip()
        if line.startswith("require ("):
            in_block = True
            continue
        if in_block and line == ")":
            in_block = False
            continue
        if in_block and line:
            names.append(line.split()[0])
        elif line.startswith("require "):
            parts = line.split()
            if len(parts) >= 2:
                names.append(parts[1])
    return names


def deps_requirements_txt(text: str) -> List[str]:
    names = []
    for line in text.splitlines():
        line = line.split("#")[0].strip()
        if not line or line.startswith("-"):
            continue
        match = re.match(r"([A-Za-z0-9][A-Za-z0-9._-]*)", line)
        if match:
            names.append(match.group(1))
    return names


def deps_pyproject_toml(text: str) -> List[str]:
    """Simple parser (tomllib needs Python 3.11). Covers PEP 621 and Poetry."""
    names = []
    # PEP 621: dependencies = ["fastapi>=0.1", ...] and optional-dependencies lists.
    for block in re.findall(r"(?:^|\n)\s*[\w-]*dependencies\s*=\s*\[(.*?)\]", text, re.S):
        for item in re.findall(r"[\"']([^\"']+)[\"']", block):
            match = re.match(r"([A-Za-z0-9][A-Za-z0-9._-]*)", item.strip())
            if match:
                names.append(match.group(1))
    # Poetry: [tool.poetry.dependencies] / [tool.poetry.group.dev.dependencies] tables.
    section = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("["):
            section = stripped
            continue
        if section and "poetry" in section and "dependencies" in section:
            match = re.match(r"([A-Za-z0-9][A-Za-z0-9._-]*)\s*=", stripped)
            if match and match.group(1).lower() != "python":
                names.append(match.group(1))
    return names


def deps_pom_xml(text: str) -> List[str]:
    # Remove the project's own <parent>/<artifactId> noise by only reading <dependency> blocks.
    names = []
    for block in re.findall(r"<(?:dependency|parent|plugin)>(.*?)</(?:dependency|parent|plugin)>", text, re.S):
        match = re.search(r"<artifactId>\s*([^<\s]+)\s*</artifactId>", block)
        if match:
            names.append(match.group(1))
    return names


def deps_gradle(text: str) -> List[str]:
    names = []
    # 'group:artifact:version' or "group:artifact"
    for coord in re.findall(r"[\"']([\w.\-]+:[\w.\-]+)(?::[^\"']*)?[\"']", text):
        names.append(coord.split(":")[1])
    # Plugin ids like id 'org.springframework.boot'
    if "org.springframework.boot" in text:
        names.append("spring-boot-starter")
    return names


def deps_cargo_toml(text: str) -> List[str]:
    names = []
    section = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("["):
            section = stripped.strip("[]")
            # [dependencies.serde] style
            if section.startswith(("dependencies.", "dev-dependencies.")):
                names.append(section.split(".", 1)[1])
            continue
        if section in ("dependencies", "dev-dependencies", "build-dependencies"):
            match = re.match(r"([A-Za-z0-9_-]+)\s*=", stripped)
            if match:
                names.append(match.group(1))
    return names


def deps_gemfile(text: str) -> List[str]:
    return re.findall(r"^\s*gem\s+[\"']([^\"']+)[\"']", text, re.M)


MANIFEST_PARSERS = {
    "package.json": deps_package_json,
    "composer.json": deps_composer_json,
    "go.mod": deps_go_mod,
    "requirements.txt": deps_requirements_txt,
    "pyproject.toml": deps_pyproject_toml,
    "pom.xml": deps_pom_xml,
    "build.gradle": deps_gradle,
    "build.gradle.kts": deps_gradle,
    "Cargo.toml": deps_cargo_toml,
    "Gemfile": deps_gemfile,
}


def scan_manifests(root: str, files: List[str], errors: List[str]):
    """Parse dependency manifests; return (manifests, frameworks)."""
    manifests = []
    frameworks = []
    for path in files:
        name = os.path.basename(path)
        parser = MANIFEST_PARSERS.get(name)
        if not parser:
            continue
        try:
            deps = unique(parser(read_text(path)))
        except (OSError, ValueError) as err:
            errors.append("cannot parse manifest: {} ({})".format(rel(root, path), err))
            continue
        manifests.append({
            "file": rel(root, path),
            "ecosystem": MANIFEST_ECOSYSTEMS[name],
            "dependency_count": len(deps),
            "dependencies": deps[:MAX_DEPS_PER_MANIFEST],
        })
        for dep in deps:
            label = KNOWN_FRAMEWORKS.get(dep.lower())
            if label is None and dep.lower().startswith("spring-boot-starter"):
                label = "Spring Boot"
            if label:
                frameworks.append({"name": label, "source": rel(root, path)})

    # One entry per framework name, keep the first source found.
    seen = set()
    deduped = []
    for item in frameworks:
        if item["name"] not in seen:
            seen.add(item["name"])
            deduped.append(item)
    return manifests, deduped


def scan_infra(root: str, files: List[str], errors: List[str]) -> dict:
    """Detect Docker, CI, Kubernetes, Helm, Terraform and Ansible files."""
    infra = {
        "dockerfile": [], "docker_compose": [], "github_workflows": [],
        "gitlab_ci": False, "kubernetes": [], "helm": [], "terraform": [],
        "ansible": [],
    }
    for path in files:
        name = os.path.basename(path)
        lower = name.lower()
        relpath = rel(root, path)
        parts = relpath.split("/")

        if name.startswith("Dockerfile") or lower.endswith(".dockerfile"):
            infra["dockerfile"].append(relpath)
        if re.match(r"^(docker-)?compose([.\-].*)?\.ya?ml$", lower):
            infra["docker_compose"].append(relpath)
            continue
        if relpath.startswith(".github/workflows/") and lower.endswith((".yml", ".yaml")):
            infra["github_workflows"].append(relpath)
            continue
        if lower == ".gitlab-ci.yml":
            infra["gitlab_ci"] = True
            continue
        if lower == "chart.yaml":
            infra["helm"].append(relpath)
            continue
        if lower.endswith(".tf"):
            infra["terraform"].append(relpath)
            continue
        if lower == "ansible.cfg" or ("roles" in parts and "tasks" in parts):
            infra["ansible"].append(relpath)
            continue
        if lower.endswith((".yml", ".yaml")):
            try:
                head = read_text(path, YAML_SNIFF_BYTES)
            except OSError as err:
                errors.append("cannot read file: {} ({})".format(relpath, err.strerror or err))
                continue
            # Helm templates ("{{ ... }}") are already covered by Chart.yaml under "helm".
            if "{{" in head:
                continue
            if re.search(r"^apiVersion:\s*\S+", head, re.M) and re.search(r"^kind:\s*\S+", head, re.M):
                infra["kubernetes"].append(relpath)
            elif re.search(r"^\s*-?\s*hosts:\s*\S+", head, re.M) and re.search(r"^\s*(tasks|roles):", head, re.M):
                infra["ansible"].append(relpath)
    return infra


TEST_FILE_PATTERNS = (
    "test_*.py", "*_test.py", "*.test.js", "*.test.jsx", "*.test.ts", "*.test.tsx",
    "*.spec.js", "*.spec.jsx", "*.spec.ts", "*.spec.tsx", "*_test.go",
    "*Test.java", "*Tests.java", "*Test.kt", "*_spec.rb", "*_test.rb",
    "*Test.php", "*.test.mjs", "*.spec.mjs",
)
TEST_DIRS = {"test", "tests", "__tests__", "spec", "e2e"}


def scan_tests(root: str, files: List[str], frameworks: List[dict]) -> dict:
    """Detect test files and test frameworks."""
    count = 0
    found = []
    for path in files:
        name = os.path.basename(path)
        parts = rel(root, path).split("/")[:-1]
        in_test_dir = any(p in TEST_DIRS for p in parts)
        is_test_name = any(fnmatch.fnmatch(name, p) for p in TEST_FILE_PATTERNS)
        if is_test_name or (in_test_dir and language_of(name) and language_of(name)[1] == "code"):
            count += 1
            # Python tests without a config file: look at the imports.
            if name.endswith(".py"):
                try:
                    head = read_text(path, YAML_SNIFF_BYTES)
                except OSError:
                    head = ""
                if re.search(r"^\s*(import pytest|from pytest)", head, re.M):
                    found.append("pytest")
                elif re.search(r"^\s*(import unittest|from unittest)", head, re.M):
                    found.append("unittest")
        # Config files also tell us the framework.
        if name in ("conftest.py", "pytest.ini"):
            found.append("pytest")
        elif name.startswith("jest.config."):
            found.append("Jest")
        elif name.startswith("vitest.config."):
            found.append("Vitest")
        elif name.startswith("playwright.config."):
            found.append("Playwright")
        elif name.startswith("cypress.config."):
            found.append("Cypress")
        elif name in ("phpunit.xml", "phpunit.xml.dist"):
            found.append("PHPUnit")
        elif name == ".rspec":
            found.append("RSpec")
        elif name.endswith("_test.go"):
            found.append("go test")
    found.extend(f["name"] for f in frameworks if f["name"] in TEST_FRAMEWORKS)
    return {"present": count > 0, "test_files": count, "frameworks": unique(found)}


# ---------------------------------------------------------------- git

def parse_iso(value: str) -> datetime:
    """Parse git's strict ISO date (%aI). "Z" is not accepted by 3.9 fromisoformat."""
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)


def run_git(root: str, args: List[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args, cwd=root, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=GIT_TIMEOUT_SECONDS)


def scan_git(root: str, errors: List[str]) -> dict:
    """Commit count, dates and contributors from git history."""
    info = {
        "available": False, "is_repo": False, "total_commits": None,
        "first_commit": None, "last_commit": None, "contributors": None,
        "significant_contributors": None, "current_user": None,
    }
    try:
        check = run_git(root, ["rev-parse", "--is-inside-work-tree"])
    except FileNotFoundError:
        errors.append("git is not installed or not on PATH")
        return info
    except (OSError, subprocess.SubprocessError) as err:
        errors.append("git failed: {}".format(err))
        return info
    info["available"] = True
    if check.returncode != 0 or check.stdout.strip() != "true":
        return info
    info["is_repo"] = True

    try:
        email_proc = run_git(root, ["config", "user.email"])
        user_email = email_proc.stdout.strip().lower() or None

        # "-- ." limits history to this folder when scanning part of a bigger repo.
        log = run_git(root, ["log", "--format=%aN%x09%aE%x09%aI", "--", "."])
    except (OSError, subprocess.SubprocessError) as err:
        errors.append("git log failed: {}".format(err))
        return info

    if log.returncode != 0:
        # Most common reason: a new repo with no commits yet.
        info["total_commits"] = 0
        info["contributors"] = []
        info["significant_contributors"] = 0
        if user_email:
            info["current_user"] = {"email": user_email, "commits": 0, "share": None}
        return info

    commits = [line.split("\t") for line in log.stdout.splitlines() if line.count("\t") == 2]
    total = len(commits)
    info["total_commits"] = total
    if total:
        # Compare real datetimes: plain string sort is wrong across time zones.
        dates = sorted((c[2] for c in commits), key=parse_iso)
        info["first_commit"] = dates[0]
        info["last_commit"] = dates[-1]

    # Group by email (lowercase); keep the most recent name seen.
    by_email = {}
    for name, email, _date in commits:
        key = email.lower()
        if key not in by_email:
            by_email[key] = {"name": name, "email": key, "commits": 0}
        by_email[key]["commits"] += 1

    contributors = []
    for entry in by_email.values():
        is_bot = "[bot]" in entry["name"].lower() or "[bot]" in entry["email"]
        entry["share"] = round(entry["commits"] / total, 3) if total else None
        entry["bot"] = is_bot
        contributors.append(entry)
    contributors.sort(key=lambda e: (-e["commits"], e["email"]))
    info["contributors"] = contributors
    info["significant_contributors"] = sum(
        1 for c in contributors if not c["bot"] and (c["share"] or 0) >= SIGNIFICANT_SHARE)

    if user_email:
        mine = by_email.get(user_email, {}).get("commits", 0)
        info["current_user"] = {
            "email": user_email,
            "commits": mine,
            "share": round(mine / total, 3) if total else None,
        }
    return info


# ---------------------------------------------------------------- main

def safe(section: str, errors: List[str], func, *args, default=None):
    """Run one scan section; on any error, record it and return the default."""
    try:
        return func(*args)
    except Exception as err:  # noqa: BLE001 - the scanner must never crash
        errors.append("{} failed: {}: {}".format(section, type(err).__name__, err))
        return default


def scan(path: str) -> Dict:
    """Scan a folder and return the full result as a dict."""
    root = os.path.abspath(path)
    errors: List[str] = []
    result: Dict = {
        "scanner_version": SCANNER_VERSION,
        "path": root.replace(os.sep, "/"),
        "repo_name": os.path.basename(root.rstrip("/\\")) or root,
    }
    files = safe("walk", errors, walk_repo, root, errors, default=[])
    result["readme"] = safe("readme", errors, scan_readme, root)
    result["license"] = safe("license", errors, scan_license, root)
    result["languages"] = safe("languages", errors, scan_languages, root, files, errors)
    manifests, frameworks = safe(
        "manifests", errors, scan_manifests, root, files, errors, default=(None, None))
    result["manifests"] = manifests
    result["frameworks"] = frameworks
    result["infra"] = safe("infra", errors, scan_infra, root, files, errors)
    result["tests"] = safe("tests", errors, scan_tests, root, files, frameworks or [])
    result["git"] = safe("git", errors, scan_git, root, errors)
    result["errors"] = errors
    return result


def main(argv: List[str]) -> int:
    # Windows consoles may not use UTF-8; force it so names with accents print fine.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    if len(argv) != 2:
        print(json.dumps({"error": "usage: scan_repo.py <repo-path>"}))
        return 2
    path = argv[1]
    if not os.path.isdir(path):
        print(json.dumps({"error": "path is not a folder: {}".format(path)}))
        return 2
    print(json.dumps(scan(path), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
