// Tests for lib/pack.js and `cvcli pack` (specs: cv-package-generator, cv-package-ci).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { defaultPackageName, validatePackageName, normalizeRepo, selfCommand, packCommandFor, quoteArg, writeText } from "../lib/pack.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "bin", "cvcli.js");
const SAMPLE = path.join(HERE, "fixtures", "sample-cv.md");
const IS_WINDOWS = process.platform === "win32";

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvcli-pack-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const cli = (cwd, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", input: "" });
const npm = (cwd, ...args) => spawnSync(IS_WINDOWS ? "npm.cmd" : "npm", args, { cwd, encoding: "utf8", shell: IS_WINDOWS });
const hasNpm = npm(os.tmpdir(), "--version").status === 0;
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

test("default package name: kebab-case + -cv, accents removed", () => {
  assert.equal(defaultPackageName("Ada Lovelace"), "ada-lovelace-cv");
  assert.equal(defaultPackageName("Zoé Ünal"), "zoe-unal-cv");
  assert.equal(defaultPackageName("ياسر"), "");
});

test("package name validation names the failed rule", () => {
  assert.equal(validatePackageName("ada-cv"), null);
  assert.equal(validatePackageName("@ada/cv"), null);
  assert.match(validatePackageName("My CV"), /spaces/);
  assert.match(validatePackageName("MyCV"), /lowercase/);
  assert.match(validatePackageName("_cv"), /start/);
  assert.match(validatePackageName("a".repeat(215)), /214/);
  assert.match(validatePackageName("cv!"), /may only use/);
});

test("repo normalisation", () => {
  assert.equal(normalizeRepo("ada/cv"), "ada/cv");
  assert.equal(normalizeRepo("https://github.com/ada/cv.git"), "ada/cv");
  assert.equal(normalizeRepo("git+https://github.com/ada/cv.git"), "ada/cv");
  assert.equal(normalizeRepo("not a repo"), null);
});

test("successful pack creates every file and prints the three commands", (t) => {
  const cwd = tmp(t);
  const r = cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  assert.equal(r.status, 0, r.stderr);
  const dir = path.join(cwd, "ada-cv");
  for (const f of ["package.json", "cv.json", "bin/cli.js", "README.md", "PUBLISHING.md", ".gitignore", ".gitattributes",
    ".github/workflows/check.yml", ".github/workflows/publish.yml"]) {
    assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}`);
  }
  assert.match(r.stdout, /npx \.\/ada-cv/);
  assert.match(r.stdout, /npx github:/);
  assert.match(r.stdout, /npx ada-cv/);
  assert.match(r.stdout, /public once you push/);
});

test("generated package.json is build-free and dependency-free", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  const pkg = readJson(path.join(cwd, "ada-cv", "package.json"));
  assert.deepEqual(pkg.bin, { "ada-cv": "bin/cli.js" });
  assert.ok(pkg.files.includes("bin/") && pkg.files.includes("cv.json"));
  assert.equal(pkg.engines.node, ">=18");
  for (const k of ["dependencies", "devDependencies", "scripts"]) assert.equal(pkg[k], undefined);
  const cli0 = fs.readFileSync(path.join(cwd, "ada-cv", "bin", "cli.js"), "utf8");
  assert.ok(cli0.startsWith("#!/usr/bin/env node"));
});

test("invalid CV stops pack before creating a folder", (t) => {
  const cwd = tmp(t);
  const bad = path.join(cwd, "CV.md");
  fs.writeFileSync(bad, "---\ntitle: x\n---\n");
  const r = cli(cwd, "pack", bad, "--name", "ada-cv", "--yes");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Missing front matter key: name/);
  assert.equal(fs.existsSync(path.join(cwd, "ada-cv")), false);
});

test("invalid name is refused with the rule", (t) => {
  const r = cli(tmp(t), "pack", SAMPLE, "--name", "My CV", "--yes");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /must not contain spaces/);
});

test("default name comes from the CV name", (t) => {
  const cwd = tmp(t);
  const r = cli(cwd, "pack", SAMPLE, "--yes");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readJson(path.join(cwd, "sam-rivera-cv", "package.json")).name, "sam-rivera-cv");
});

test("phone is excluded by default and included on request", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "a-cv", "--yes");
  const meta = readJson(path.join(cwd, "a-cv", "cv.json")).meta;
  assert.equal(meta.phone, undefined);
  assert.equal(meta.email, "sam@example.com");
  cli(cwd, "pack", SAMPLE, "--name", "b-cv", "--yes", "--include-phone");
  assert.equal(readJson(path.join(cwd, "b-cv", "cv.json")).meta.phone, "+33 6 00 00 00 00");
});

test("without a terminal and without --yes, pack asks for flags", (t) => {
  const cwd = tmp(t);
  const r = cli(cwd, "pack", SAMPLE, "--name", "ada-cv");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--yes/);
  assert.equal(fs.existsSync(path.join(cwd, "ada-cv", "cv.json")), false);
});

test("existing folder is refused without --force", (t) => {
  const cwd = tmp(t);
  fs.mkdirSync(path.join(cwd, "ada-cv"));
  fs.writeFileSync(path.join(cwd, "ada-cv", "notes.txt"), "mine");
  const r = cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--force/);
});

test("--force keeps version, README.md and .git", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  const dir = path.join(cwd, "ada-cv");
  const pkgFile = path.join(dir, "package.json");
  fs.writeFileSync(pkgFile, JSON.stringify({ ...readJson(pkgFile), version: "1.2.0" }));
  fs.writeFileSync(path.join(dir, "README.md"), "my own readme");
  fs.mkdirSync(path.join(dir, ".git"));
  fs.writeFileSync(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
  const cvFile = path.join(cwd, "CV.md");
  // \r? because a Windows checkout may have CRLF line endings.
  fs.writeFileSync(cvFile, fs.readFileSync(SAMPLE, "utf8").replace(/Junior DevOps Engineer\r?\n/, "Platform Engineer\n"));
  const r = cli(cwd, "pack", cvFile, "--name", "ada-cv", "--yes", "--force");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(readJson(pkgFile).version, "1.2.0");
  assert.equal(fs.readFileSync(path.join(dir, "README.md"), "utf8"), "my own readme");
  assert.ok(fs.existsSync(path.join(dir, ".git", "HEAD")));
  assert.equal(readJson(path.join(dir, "cv.json")).meta.title, "Platform Engineer");
});

test("--repo sets package.json repository; README and guide use the real names", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--repo", "ada/ada-cv");
  const dir = path.join(cwd, "ada-cv");
  assert.equal(readJson(path.join(dir, "package.json")).repository.url, "git+https://github.com/ada/ada-cv.git");
  const guide = fs.readFileSync(path.join(dir, "PUBLISHING.md"), "utf8");
  for (const s of ["npx ./ada-cv", "npm view ada-cv", "npx ada-cv", "Last reviewed:", "Privacy"]) assert.ok(guide.includes(s), s);
  assert.doesNotMatch(guide, /%%[A-Z_]+%%/);
  const readme = fs.readFileSync(path.join(dir, "README.md"), "utf8");
  assert.ok(readme.includes("npx github:ada/ada-cv"));
  assert.ok(readme.includes("Ok to proceed?"));
});

test("bad --repo value is refused", (t) => {
  const r = cli(tmp(t), "pack", SAMPLE, "--name", "ada-cv", "--yes", "--repo", "not a repo");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /user\/repo/);
});

test("README without --repo shows the <user> placeholder", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  const readme = fs.readFileSync(path.join(cwd, "ada-cv", "README.md"), "utf8");
  assert.ok(readme.includes("npx github:<user>/ada-cv"));
  assert.match(readme, /Replace `<user>`/);
});

test("workflows have the expected triggers and checks", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  const wf = path.join(cwd, "ada-cv", ".github", "workflows");
  const check = fs.readFileSync(path.join(wf, "check.yml"), "utf8");
  assert.match(check, /on:\n  push:\n  pull_request:/);
  assert.match(check, /node: \["18", "lts\/\*"\]/);
  assert.match(check, /npm pack --dry-run --json/);
  assert.match(check, /node bin\/cli\.js --print/);
  const publish = fs.readFileSync(path.join(wf, "publish.yml"), "utf8");
  assert.match(publish, /tags:\n      - "v\*"/);
  assert.match(publish, /id-token: write/);
  assert.match(publish, /GITHUB_REF_NAME/);
  assert.match(publish, /npm publish --access public/);
  assert.doesNotMatch(publish, /NPM_TOKEN|NODE_AUTH_TOKEN/);
});

test("end to end: npm pack lists the files and the bin runs", { skip: !hasNpm && "npm not found" }, (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  const dir = path.join(cwd, "ada-cv");
  const p = npm(dir, "pack", "--dry-run", "--json");
  assert.equal(p.status, 0, p.stderr);
  const files = JSON.parse(p.stdout)[0].files.map((f) => f.path);
  for (const f of ["package.json", "bin/cli.js", "cv.json"]) assert.ok(files.includes(f), `${f} not packed`);
  const run = spawnSync(process.execPath, [path.join(dir, "bin", "cli.js"), "--print"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /SAM RIVERA/);
});

// ---- the command printed after a gallery choice can be copied and pasted

test("selfCommand: node path, npx and installed package", () => {
  const cwd = path.resolve("project");
  const script = path.join(cwd, "cvcli", "cli", "bin", "cvcli.js");
  assert.equal(selfCommand({ argv1: script, cwd, env: {} }), "node cvcli/cli/bin/cvcli.js");
  const outside = path.resolve("elsewhere", "my tools", "cvcli.js");
  assert.equal(selfCommand({ argv1: outside, cwd, env: {} }), `node "${outside.replace(/\\/g, "/")}"`);
  assert.equal(selfCommand({ argv1: script, cwd, env: { npm_command: "exec" } }), "npx github:YasserYG8/cvcli-skill");
  assert.equal(selfCommand({ argv1: "/home/a/.npm/_npx/123/node_modules/cvcli/cvcli/cli/bin/cvcli.js", cwd, env: {} }), "npx github:YasserYG8/cvcli-skill");
  assert.equal(selfCommand({ argv1: "/usr/lib/node_modules/cvcli/cvcli/cli/bin/cvcli.js", cwd, env: {} }), "cvcli");
});

test("packCommandFor quotes only paths that need it", () => {
  const self = "node cvcli/cli/bin/cvcli.js";
  assert.equal(packCommandFor("cvcli/cli/test/fixtures/sample-cv.md", { layout: "sidebar", accent: "teal" }, self),
    "node cvcli/cli/bin/cvcli.js pack cvcli/cli/test/fixtures/sample-cv.md --layout sidebar --accent teal");
  assert.equal(packCommandFor("My CV/CV.md", { layout: "classic", accent: "violet" }, self),
    'node cvcli/cli/bin/cvcli.js pack "My CV/CV.md" --layout classic --accent violet');
  assert.equal(quoteArg("sss.md"), "sss.md");
});

// ---- look: --layout / --accent (change add-cv-layouts)

test("pack saves the default look in cv.json", (t) => {
  const dir = tmp(t);
  const r = cli(dir, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readJson(path.join(dir, "ada-cv", "cv.json")).display, { layout: "sidebar", accent: "teal" });
  assert.match(r.stdout, /Look: sidebar layout, teal accent/);
});

test("pack saves the chosen look", (t) => {
  const dir = tmp(t);
  const r = cli(dir, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--layout", "classic", "--accent", "violet");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readJson(path.join(dir, "ada-cv", "cv.json")).display, { layout: "classic", accent: "violet" });
});

test("unknown accent or layout is refused and no folder is created", (t) => {
  const dir = tmp(t);
  const a = cli(dir, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--accent", "pink");
  assert.equal(a.status, 1);
  assert.match(a.stderr, /teal, blue, violet, green, amber/);
  const l = cli(dir, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--layout", "fancy");
  assert.equal(l.status, 1);
  assert.match(l.stderr, /sidebar, classic, manpage/);
  assert.equal(fs.existsSync(path.join(dir, "ada-cv")), false);
});

test("--force keeps the existing look for flags that are not given", (t) => {
  const dir = tmp(t);
  assert.equal(cli(dir, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--layout", "manpage", "--accent", "amber").status, 0);
  const r = cli(dir, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--force", "--accent", "green");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(readJson(path.join(dir, "ada-cv", "cv.json")).display, { layout: "manpage", accent: "green" });
});

// Line endings (spec: cv-package-generator, "LF line endings in the generated package").

/** Every file under dir, as paths relative to dir. */
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(full, base) : [path.relative(base, full)];
  });
}

test("writeText turns CRLF and lone CR into LF", (t) => {
  const file = path.join(tmp(t), "out.txt");
  writeText(file, "#!/usr/bin/env node\r\nline 2\rline 3\nend\r\n");
  assert.equal(fs.readFileSync(file, "utf8"), "#!/usr/bin/env node\nline 2\nline 3\nend\n");
});

test("pack writes LF only, even from a CRLF CV.md", (t) => {
  const cwd = tmp(t);
  const cvFile = path.join(cwd, "CV.md");
  fs.writeFileSync(cvFile, fs.readFileSync(SAMPLE, "utf8").replace(/\r?\n/g, "\r\n"));
  const r = cli(cwd, "pack", cvFile, "--name", "ada-cv", "--yes");
  assert.equal(r.status, 0, r.stderr);
  const dir = path.join(cwd, "ada-cv");
  const files = listFiles(dir);
  assert.ok(files.length >= 9, files.join(", "));
  for (const f of files) {
    assert.ok(!fs.readFileSync(path.join(dir, f), "utf8").includes("\r"), `${f} contains \r`);
  }
  assert.ok(fs.readFileSync(path.join(dir, "bin", "cli.js"), "utf8").startsWith("#!/usr/bin/env node\n"));
});

test("a new package has a .gitattributes with the LF rule", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  assert.match(fs.readFileSync(path.join(cwd, "ada-cv", ".gitattributes"), "utf8"), /^\* text=auto eol=lf$/m);
});

test("--force keeps the user's own .gitattributes", (t) => {
  const cwd = tmp(t);
  cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes");
  const file = path.join(cwd, "ada-cv", ".gitattributes");
  fs.writeFileSync(file, "* text=auto eol=lf\n*.pdf binary\n");
  const r = cli(cwd, "pack", SAMPLE, "--name", "ada-cv", "--yes", "--force");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(file, "utf8"), "* text=auto eol=lf\n*.pdf binary\n");
});
