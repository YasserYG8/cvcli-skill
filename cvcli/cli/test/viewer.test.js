// Tests for lib/viewer.js and `cvcli view` (spec: terminal-cv-viewer).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseCv } from "../lib/parse.js";
import { PassThrough } from "node:stream";
import {
  renderAll, renderHeader, wrap, assignKeys, viewSections, colorEnabled, clampWidth, runViewer,
} from "../lib/viewer.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "bin", "cvcli.js");
const VIEWER = path.join(HERE, "..", "lib", "viewer.js");
const SAMPLE = path.join(HERE, "fixtures", "sample-cv.md");
const sample = () => parseCv(fs.readFileSync(SAMPLE, "utf8")).cv;
const ANSI = /\x1b\[/;

test("header shows name, title, location and status", () => {
  const lines = renderHeader(sample(), { width: 80 });
  assert.equal(lines[0], "SAM RIVERA");
  assert.equal(lines[1], "Junior DevOps Engineer");
  assert.match(lines[2], /Lyon, France · remote OK/);
  assert.match(lines[3], /Open to an internship/);
});

test("print output has every section, contact last, and no escape codes", () => {
  const text = renderAll(sample(), { width: 80 }).join("\n");
  assert.doesNotMatch(text, ANSI);
  for (const title of ["SUMMARY", "EXPERIENCE", "PROJECTS", "OPEN SOURCE", "SKILLS", "EDUCATION", "LANGUAGES", "INTERESTS", "CONTACT"]) {
    assert.ok(text.includes(` ${title} `), `missing ${title}`);
  }
  assert.ok(text.indexOf("CONTACT") > text.indexOf("INTERESTS"));
  assert.match(text, /Email: +sam@example\.com/);
});

test("no rendered line is longer than 60 columns", () => {
  for (const line of renderAll(sample(), { width: 60 })) {
    assert.ok([...line].length <= 60, `too long (${[...line].length}): ${line}`);
  }
});

test("wrap cuts words longer than the line", () => {
  const lines = wrap("a ".repeat(3) + "x".repeat(30), 10);
  assert.ok(lines.every((l) => [...l].length <= 10));
  assert.equal(lines.join("").replace(/ /g, ""), "aaa" + "x".repeat(30));
});

test("width is clamped to 20..100 and defaults to 80", () => {
  assert.equal(clampWidth(undefined), 80);
  assert.equal(clampWidth(300), 100);
  assert.equal(clampWidth(5), 20);
});

test("shortcut keys are unique and never q", () => {
  const keys = assignKeys(viewSections(sample()));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes("q"));
  assert.equal(keys[0], "s"); // Summary
  assert.equal(keys[2], "p"); // Projects
});

test("NO_COLOR turns colors off", () => {
  assert.equal(colorEnabled({ NO_COLOR: "1" }), false);
  assert.equal(colorEnabled({}), true);
  assert.equal(colorEnabled({ NO_COLOR: "" }), true);
});

test("cvcli view prints plain text when piped and exits 0", () => {
  const r = spawnSync(process.execPath, [CLI, "view", SAMPLE], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.doesNotMatch(r.stdout, ANSI);
  assert.match(r.stdout, /SAM RIVERA/);
});

test("cvcli view refuses an invalid file with exit 1", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvcli-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "CV.md");
  fs.writeFileSync(file, "---\ntitle: x\n---\n");
  const r = spawnSync(process.execPath, [CLI, "view", file], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Missing front matter key: name/);
});

test("standalone copy of the viewer runs with only cv.json next to it", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvcli-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "bin"));
  fs.copyFileSync(VIEWER, path.join(dir, "bin", "cli.js"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "x-cv", version: "1.2.3", type: "module" }));
  fs.writeFileSync(path.join(dir, "cv.json"), JSON.stringify(sample()));
  const r = spawnSync(process.execPath, [path.join(dir, "bin", "cli.js"), "--print", "--width", "60"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /SAM RIVERA/);
  const v = spawnSync(process.execPath, [path.join(dir, "bin", "cli.js"), "--version"], { encoding: "utf8" });
  assert.equal(v.stdout.trim(), "1.2.3");
});

// A fake terminal: lets the test press keys and read the screen.
function fakeTerminal(columns = 70, rows = 30) {
  const stdin = new PassThrough();
  stdin.isTTY = true;
  stdin.rawModes = [];
  stdin.setRawMode = (on) => stdin.rawModes.push(on);
  const stdout = new PassThrough();
  stdout.isTTY = true;
  stdout.columns = columns;
  stdout.rows = rows;
  let screen = "";
  stdout.on("data", (chunk) => { screen += chunk.toString(); });
  return { stdin, stdout, screen: () => screen };
}
const tick = () => new Promise((r) => setTimeout(r, 30));

test("interactive: letter opens a section, arrows move, q quits and restores the terminal", async () => {
  const term = fakeTerminal();
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout });
  await tick();
  assert.match(term.screen(), /\x1b\[\?1049h/); // alternate screen on
  assert.match(term.screen(), /Computer science student/); // first section (Summary)
  term.stdin.write("p");
  await tick();
  assert.match(term.screen(), /logtail — a tiny log follower/);
  term.stdin.write("\x1b[C"); // right arrow -> Open Source
  await tick();
  assert.match(term.screen(), /example\/linter/);
  term.stdin.write("q");
  assert.equal(await done, 0);
  assert.ok(term.screen().endsWith("\x1b[?25h\x1b[?1049l")); // cursor back, normal screen
  assert.deepEqual(term.stdin.rawModes, [true, false]);
});

test("interactive: frames never exceed the terminal width", async () => {
  const term = fakeTerminal(50, 20);
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout });
  await tick();
  term.stdin.write("p");
  await tick();
  term.stdin.write("\x03"); // Ctrl+C
  assert.equal(await done, 0);
  // Each frame starts with "cursor home" (\x1b[H); split frames, then lines.
  const frames = term.screen().split("\x1b[H").slice(1);
  assert.ok(frames.length >= 2);
  const lines = frames.flatMap((f) => f.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").split("\r\n"));
  for (const line of lines) {
    assert.ok([...line].length <= 50, `too long: ${line}`);
  }
});

test("viewer refuses cv.json from a newer format", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvcli-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "bin"));
  fs.copyFileSync(VIEWER, path.join(dir, "bin", "cli.js"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
  fs.writeFileSync(path.join(dir, "cv.json"), JSON.stringify({ ...sample(), format: 99 }));
  const r = spawnSync(process.execPath, [path.join(dir, "bin", "cli.js"), "--print"], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /newer cvcli/);
});
