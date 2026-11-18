// Tests for lib/parse.js and `cvcli check` (spec: cv-md-format).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseCv, SECTIONS } from "../lib/parse.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "bin", "cvcli.js");
const SAMPLE = path.join(HERE, "fixtures", "sample-cv.md");

const cvText = (front, body) => `---\n${front}\n---\n\n${body}\n`;
const runCli = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });

test("valid minimal CV", () => {
  const { cv, errors } = parseCv(cvText("name: Ada Dev", "## Summary\n\nI build tools."));
  assert.deepEqual(errors, []);
  assert.equal(cv.meta.name, "Ada Dev");
  assert.deepEqual(cv.sections.map((s) => s.id), ["summary"]);
  assert.deepEqual(cv.sections[0].paragraphs, ["I build tools."]);
});

test("missing name is an error on line 1", () => {
  const { errors } = parseCv(cvText("title: Dev", "## Summary\n\nx"));
  assert.deepEqual(errors, [{ line: 1, message: "Missing front matter key: name" }]);
});

test("file without front matter", () => {
  const { errors } = parseCv("# Just a title\n");
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /must start with front matter/);
});

test("sections out of order name both sections and the expected order", () => {
  const { errors } = parseCv(cvText("name: A", "## Skills\n\n- **Go:** x\n\n## Projects\n\n### P"));
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /"Projects".*"Skills"/);
  assert.match(errors[0].message, /Expected order: Summary, Experience, Projects/);
});

test("unknown section is a warning and its text is kept", () => {
  const { cv, errors, warnings } = parseCv(cvText("name: A", "## Hobbies\n\nChess and running."));
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.message === "Unknown section: Hobbies"));
  assert.equal(cv.sections[0].id, "unknown");
  assert.deepEqual(cv.sections[0].paragraphs, ["Chess and running."]);
});

test("French section names map to English ids and keep their titles", () => {
  const { cv, errors } = parseCv(cvText("name: A\nlanguage: fr", "## Résumé\n\nBonjour.\n\n## Projets\n\n### X — y\nSolo\n\n## Centres d’intérêt\n\nEscalade."));
  assert.deepEqual(errors, []);
  assert.deepEqual(cv.sections.map((s) => s.id), ["summary", "projects", "interests"]);
  assert.deepEqual(cv.sections.map((s) => s.title), ["Résumé", "Projets", "Centres d’intérêt"]);
});

test("project entry: title, subtitle, meta, tech and bullets", () => {
  const body = [
    "## Projects", "",
    "### Specter — live log streamer",
    "Solo project · Oct 2026 – Nov 2026 · https://github.com/u/specter", "",
    "Tech: Go, eBPF", "",
    "- First bullet.", "- Second bullet.",
  ].join("\n");
  const { cv, errors } = parseCv(cvText("name: A", body));
  assert.deepEqual(errors, []);
  const e = cv.sections[0].entries[0];
  assert.equal(e.title, "Specter");
  assert.equal(e.subtitle, "live log streamer");
  assert.deepEqual(e.meta, ["Solo project", "Oct 2026 – Nov 2026", "https://github.com/u/specter"]);
  assert.deepEqual(e.tech, ["Go", "eBPF"]);
  assert.equal(e.bullets.length, 2);
});

test("skill groups and language items", () => {
  const body = "## Skills\n\n- **Languages:** Go, Python\n- Docker, Linux\n\n## Languages\n\n- Arabic: Native\n- Spanish";
  const { cv } = parseCv(cvText("name: A", body));
  assert.deepEqual(cv.sections[0].groups, [
    { name: "Languages", items: ["Go", "Python"] },
    { name: null, items: ["Docker", "Linux"] },
  ]);
  assert.deepEqual(cv.sections[1].items, [{ name: "Arabic", level: "Native" }, { name: "Spanish", level: null }]);
});

test("placeholders are warnings with line numbers", () => {
  const { warnings, errors } = parseCv(cvText("name: A", "## Experience\n\n### Dev — Co\n[city?] · 2025\n\n- Did [metric?] and [métrique ?]."));
  assert.deepEqual(errors, []);
  const ph = warnings.filter((w) => w.message.startsWith("Placeholder to fill"));
  assert.deepEqual(ph.map((w) => w.message), [
    "Placeholder to fill: [city?]", "Placeholder to fill: [metric?]", "Placeholder to fill: [métrique ?]",
  ]);
  assert.equal(ph[0].line, 8);
});

test("duplicate section and bad front matter line are errors", () => {
  const { errors } = parseCv(cvText("name: A\nthis is not a key", "## Summary\n\na\n\n## Summary\n\nb"));
  assert.ok(errors.some((e) => /key: value/.test(e.message)));
  assert.ok(errors.some((e) => /appears twice/.test(e.message)));
});

test("CRLF line endings and BOM are accepted", () => {
  const { cv, errors } = parseCv("﻿---\r\nname: A\r\n---\r\n## Summary\r\n\r\nHi\r\n");
  assert.deepEqual(errors, []);
  assert.equal(cv.meta.name, "A");
});

test("the sample fixture uses every known section", () => {
  const { cv, errors } = parseCv(fs.readFileSync(SAMPLE, "utf8"));
  assert.deepEqual(errors, []);
  assert.deepEqual(cv.sections.map((s) => s.id), SECTIONS.map((s) => s.id));
});

// --- format sync: the skill template and the parser must agree

test("section names in templates/cv-full.md match the parser", () => {
  const template = fs.readFileSync(path.join(HERE, "..", "..", "templates", "cv-full.md"), "utf8");
  const inBlock = template.slice(template.indexOf("````markdown"), template.lastIndexOf("````"));
  const headings = [...inBlock.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  assert.deepEqual(headings, SECTIONS.map((s) => s.en));
  const french = /French section names: (.+)\./.exec(template)[1].split(", ");
  assert.deepEqual(french, SECTIONS.map((s) => s.fr));
});

// --- check command

test("check: valid file exits 0 and prints placeholder warnings", () => {
  const r = runCli("check", SAMPLE);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /sample-cv\.md:\d+: Placeholder to fill: \[metric\?\]/);
});

test("check: missing name exits 1 with file:line message", (t) => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cvcli-")), "CV.md");
  t.after(() => fs.rmSync(path.dirname(file), { recursive: true, force: true }));
  fs.writeFileSync(file, cvText("title: x", "## Summary\n\nx"));
  const r = runCli("check", file);
  assert.equal(r.status, 1);
  assert.ok(r.stdout.includes(`${file}:1: Missing front matter key: name`));
});

test("check: missing file exits 2", () => {
  const r = runCli("check", "nope.md");
  assert.equal(r.status, 2);
  assert.match(r.stderr, /File not found: nope\.md/);
});
