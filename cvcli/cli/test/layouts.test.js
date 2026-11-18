// Tests for the layouts and accent themes (specs: cv-layouts, cv-accent-themes, terminal-cv-viewer).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PassThrough } from "node:stream";
import { parseCv } from "../lib/parse.js";
import {
  LAYOUTS, ACCENTS, createState, renderFrame, stripAnsi, visibleWidth, assignKeys, viewSections,
  makeTheme, rgbTo256, detectColorDepth, runViewer, isPagedLayout,
} from "../lib/viewer.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..", "bin", "cvcli.js");
const SAMPLE = path.join(HERE, "fixtures", "sample-cv.md");
const sample = () => parseCv(fs.readFileSync(SAMPLE, "utf8")).cv;

/** Frame helper: render a layout on a fake screen, with no real terminal. */
function frame(cv, { layout = "sidebar", accent, columns = 100, rows = 30, depth = 1, current = 0, pkgName, gallery } = {}) {
  const state = createState(cv, { layout, accent, depth, pkgName, gallery });
  state.current = current;
  if (!isPagedLayout(state.layout)) state.jump = current;
  return { state, lines: renderFrame(state, { columns, rows }) };
}
const plain = (lines) => lines.map(stripAnsi);
const firstCode = (s) => s.match(/\x1b\[[0-9;]+m/)[0];
// Foreground color codes only (39, the color reset, is not a color).
const colorCodes = (lines) => new Set(lines.join("").match(/\x1b\[(?:3[0-7]|9[0-7]|38;5;\d+|38;2;\d+;\d+;\d+)m/g) || []);

// ---- layout registry, sizes and content

test("registry order and default look", () => {
  assert.deepEqual(LAYOUTS, ["sidebar", "classic", "manpage"]);
  assert.deepEqual(ACCENTS, ["teal", "blue", "violet", "green", "amber"]);
  assert.equal(createState(sample()).layout, "sidebar");
  assert.equal(createState(sample()).accent, "teal");
});

test("every layout fits every size: exact height, no line wider than the terminal", () => {
  const cv = sample();
  const count = viewSections(cv).length;
  for (const layout of LAYOUTS) {
    for (const [columns, rows] of [[40, 12], [60, 24], [80, 24], [100, 30], [160, 50]]) {
      for (let current = 0; current < count; current++) {
        const { lines } = frame(cv, { layout, columns, rows, current, depth: 24 });
        assert.equal(lines.length, rows, `${layout} ${columns}x${rows} #${current}: ${lines.length} lines`);
        for (const l of lines) {
          assert.ok(visibleWidth(l) <= columns, `${layout} ${columns}x${rows} #${current} too wide: ${stripAnsi(l)}`);
          // A cut line loses its styling; layouts must never need that.
          assert.ok(!stripAnsi(l).endsWith("…") || /\x1b\[/.test(l), `${layout} ${columns}x${rows} #${current} was cut: ${stripAnsi(l)}`);
        }
      }
    }
  }
});

test("every layout shows every section title and entry title", () => {
  const cv = sample();
  const sections = viewSections(cv);
  const entryTitles = sections.flatMap((s) => (s.entries || []).map((e) => e.title));
  for (const layout of LAYOUTS) {
    const seen = sections.map((_, i) => plain(frame(cv, { layout, current: i, rows: 300 }).lines).join("\n")).join("\n");
    for (const s of sections) {
      const title = layout === "manpage" && s.id === "summary" ? "DESCRIPTION" : s.title;
      assert.ok(seen.toLowerCase().includes(title.toLowerCase()), `${layout}: missing section ${title}`);
    }
    for (const t of entryTitles) assert.ok(seen.includes(t), `${layout}: missing entry ${t}`);
  }
});

test("sidebar: each section name is on its own line, not cut", () => {
  const text = plain(frame(sample(), { columns: 100, rows: 30 }).lines);
  for (const s of viewSections(sample())) {
    assert.ok(text.some((l) => new RegExp(`│ [ ▌] ${s.title} +[a-z] │`).test(l)), `missing nav line for ${s.title}`);
  }
});

test("sidebar: the card is 100 wide and centered on a 160-column terminal", () => {
  const top = plain(frame(sample(), { columns: 160, rows: 30 }).lines)[0];
  const leftGap = top.indexOf("╭");
  const width = [...top.trimEnd()].length - leftGap;
  assert.equal(width, 100);
  assert.ok(Math.abs(leftGap - (160 - leftGap - width)) <= 1);
});

test("sidebar: small screens use a one-line section indicator", () => {
  const text = plain(frame(sample(), { columns: 64, rows: 24, current: 2 }).lines).join("\n");
  assert.match(text, /‹ Projects {2}3\/9 ›/);
});

test("classic: two columns at 100, one column at 80 with contact first", () => {
  const wide = plain(frame(sample(), { layout: "classic", columns: 100, rows: 300 }).lines);
  const exp = wide.find((l) => l.includes("EXPERIENCE"));
  assert.ok(exp && /│.*│.*EXPERIENCE/.test(exp), `no column border on: ${exp}`);
  const narrow = plain(frame(sample(), { layout: "classic", columns: 80, rows: 300 }).lines).join("\n");
  assert.ok(narrow.indexOf("CONTACT") < narrow.indexOf("EXPERIENCE"));
});

test("classic: a jump puts the heading on the first body line", () => {
  const cv = sample();
  const projects = viewSections(cv).findIndex((s) => s.id === "projects");
  const lines = plain(frame(cv, { layout: "classic", columns: 80, rows: 24, current: projects }).lines);
  assert.match(lines[1], /PROJECTS/); // line 0 is the top border
});

test("manpage: NAME, DESCRIPTION, EXPERIENCE in order; SYNOPSIS only with a package name", () => {
  const text = plain(frame(sample(), { layout: "manpage", rows: 300 }).lines).join("\n");
  const at = (h) => text.search(new RegExp(`^ *${h}\\s*$`, "m"));
  assert.ok(at("NAME") >= 0 && at("NAME") < at("DESCRIPTION") && at("DESCRIPTION") < at("EXPERIENCE"));
  assert.equal(at("SYNOPSIS"), -1);
  assert.match(text, /SAM-RIVERA\(1\)/);
  const withPkg = plain(frame(sample(), { layout: "manpage", rows: 300, pkgName: "sam-rivera-cv" }).lines).join("\n");
  assert.match(withPkg, /SYNOPSIS\s*\n +npx sam-rivera-cv/);
});

// ---- display settings

test("cv.json display sets the starting look; unknown values fall back silently", () => {
  const cv = sample();
  const s = createState({ ...cv, display: { layout: "manpage", accent: "amber" } });
  assert.equal(s.layout, "manpage");
  assert.equal(s.accent, "amber");
  const bad = createState({ ...cv, display: { layout: "fancy", accent: "pink" } });
  assert.equal(bad.layout, "sidebar");
  assert.equal(bad.accent, "teal");
  const flags = createState({ ...cv, display: { layout: "manpage" } }, { layout: "classic" });
  assert.equal(flags.layout, "classic");
});

// ---- keys

test("q, t and a are never section shortcuts", () => {
  const keys = assignKeys([{ title: "Talks" }, { title: "Awards" }, { title: "Quotes" }]);
  for (const k of keys) assert.ok(!["q", "t", "a"].includes(k), `reserved key used: ${k}`);
  assert.equal(keys[0], "l"); // Talks: t and a are reserved, so l
});

// ---- colors

test("16 colors: teal accent is ANSI cyan and there are no 256 or truecolor codes", () => {
  const codes = [...colorCodes(frame(sample(), { depth: 4 }).lines)].join(" ");
  assert.match(codes, /\x1b\[(36|96)m/);
  assert.doesNotMatch(codes, /38;[25];/);
});

test("truecolor: the accent is a 38;2;r;g;b code", () => {
  assert.match(makeTheme("teal", 24).accent("x"), /\x1b\[38;2;26;158;158m/);
});

test("256 colors: every color in a frame is one of the theme roles", () => {
  const th = makeTheme("blue", 8);
  const allowed = new Set(["accent", "muted", "border", "success"].map((r) => firstCode(th[r]("x"))));
  for (const layout of LAYOUTS) {
    for (const code of colorCodes(frame(sample(), { layout, accent: "blue", depth: 8, current: 2 }).lines)) {
      assert.ok(allowed.has(code), `${layout}: unexpected color ${JSON.stringify(code)}`);
    }
  }
});

test("only accent codes differ between two accents", () => {
  const accents = new Set([firstCode(makeTheme("teal", 8).accent("x")), firstCode(makeTheme("amber", 8).accent("x"))]);
  for (const layout of LAYOUTS) {
    const a = colorCodes(frame(sample(), { layout, accent: "teal", depth: 8 }).lines);
    const b = colorCodes(frame(sample(), { layout, accent: "amber", depth: 8 }).lines);
    const diff = [...a].filter((c) => !b.has(c)).concat([...b].filter((c) => !a.has(c)));
    assert.ok(diff.length > 0, `${layout}: accent did not change anything`);
    for (const c of diff) assert.ok(accents.has(c), `${layout}: non-accent difference ${JSON.stringify(c)}`);
  }
});

test("rgbTo256 picks the cube or the gray ramp", () => {
  assert.equal(rgbTo256([0, 0, 0]), 16);
  assert.equal(rgbTo256([255, 255, 255]), 231);
  assert.equal(rgbTo256([138, 138, 138]), 245);
});

test("NO_COLOR or depth 1: no color codes, selection still visible", () => {
  assert.equal(detectColorDepth({ getColorDepth: () => 24 }, { NO_COLOR: "1" }), 1);
  assert.equal(detectColorDepth({ getColorDepth: () => 8 }, {}), 8);
  assert.equal(detectColorDepth({}, {}), 4);
  for (const layout of LAYOUTS) {
    assert.equal(colorCodes(frame(sample(), { layout, depth: 1, current: 2 }).lines).size, 0, `${layout} has colors`);
  }
  assert.match(plain(frame(sample(), { depth: 1, current: 2 }).lines).join("\n"), /▌ Projects/);
});

// ---- interactive: t switch and gallery (fake terminal)

function fakeTerminal(columns = 100, rows = 30) {
  const stdin = new PassThrough();
  stdin.isTTY = true;
  stdin.setRawMode = () => {};
  const stdout = new PassThrough();
  stdout.isTTY = true;
  stdout.columns = columns;
  stdout.rows = rows;
  let screen = "";
  stdout.on("data", (chunk) => { screen += chunk.toString(); });
  const last = () => stripAnsi(screen.split("\x1b[H").pop());
  return { stdin, stdout, screen: () => screen, last };
}
const tick = () => new Promise((r) => setTimeout(r, 30));

test("t cycles sidebar -> classic -> manpage -> sidebar without writing files", async () => {
  const term = fakeTerminal();
  const before = fs.readdirSync(path.dirname(SAMPLE)).join();
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout, depth: 1 });
  await tick();
  assert.match(term.last(), /sidebar · 1\/9/);
  for (const expected of ["classic", "manpage", "sidebar"]) {
    term.stdin.write("t");
    await tick();
    assert.match(term.last(), new RegExp(`\\b${expected}\\b`), `expected ${expected}`);
  }
  term.stdin.write("q");
  assert.equal(await done, 0);
  assert.equal(fs.readdirSync(path.dirname(SAMPLE)).join(), before);
});

test("sidebar: ↓/↑ move through the section list and stop at the ends", async () => {
  const term = fakeTerminal();
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout, depth: 1 });
  await tick();
  const down = "\x1b[B";
  const up = "\x1b[A";
  term.stdin.write(down);
  await tick();
  assert.match(term.last(), /▌ Experience/);
  term.stdin.write(up);
  await tick();
  assert.match(term.last(), /▌ Summary/);
  term.stdin.write(up); // already first: stays
  await tick();
  assert.match(term.last(), /▌ Summary/);
  term.stdin.write("c"); // last section
  await tick();
  term.stdin.write(down); // already last: stays
  await tick();
  assert.match(term.last(), /▌ Contact/);
  term.stdin.write("q");
  assert.equal(await done, 0);
});

test("sidebar: ↓ scrolls a long section to its end before opening the next one", async () => {
  const term = fakeTerminal(100, 18); // small body area: Projects does not fit
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout, depth: 1 });
  await tick();
  term.stdin.write("p");
  await tick();
  assert.match(term.last(), /▌ Projects/);
  let presses = 0;
  while (/▌ Projects/.test(term.last()) && presses < 50) {
    term.stdin.write("\x1b[B");
    await tick();
    presses++;
  }
  assert.ok(presses > 1, "the first ↓ should scroll, not change the section");
  assert.match(term.last(), /▌ Open Source/);
  assert.match(term.last(), /example\/linter/);
  term.stdin.write("q");
  assert.equal(await done, 0);
});

test("manpage: a letter jumps to the heading", async () => {
  const term = fakeTerminal(80, 24);
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout, layout: "manpage", depth: 1 });
  await tick();
  term.stdin.write("p");
  await tick();
  assert.match(term.last().split("\r\n")[2], /^ +PROJECTS/);
  term.stdin.write("q");
  assert.equal(await done, 0);
});

test("gallery: t, a, a, Enter chooses classic + violet and restores the terminal", async () => {
  const term = fakeTerminal();
  let choice = null;
  const done = runViewer(sample(), {
    stdin: term.stdin, stdout: term.stdout, gallery: true, depth: 1, onChoice: (c) => { choice = c; },
  });
  await tick();
  assert.match(term.last(), /Gallery · sidebar · teal/);
  for (const k of ["t", "a", "a"]) {
    term.stdin.write(k);
    await tick();
  }
  assert.match(term.last(), /Gallery · classic · violet/);
  term.stdin.write("\r");
  assert.equal(await done, 0);
  assert.deepEqual(choice, { layout: "classic", accent: "violet" });
  assert.ok(term.screen().endsWith("\x1b[?25h\x1b[?1049l"));
});

test("gallery: q quits without a choice", async () => {
  const term = fakeTerminal();
  let called = false;
  const done = runViewer(sample(), {
    stdin: term.stdin, stdout: term.stdout, gallery: true, depth: 1, onChoice: () => { called = true; },
  });
  await tick();
  term.stdin.write("q");
  assert.equal(await done, 0);
  assert.equal(called, false);
});

test("a does nothing outside the gallery", async () => {
  const term = fakeTerminal();
  const done = runViewer(sample(), { stdin: term.stdin, stdout: term.stdout, depth: 4 });
  await tick();
  const before = term.last();
  term.stdin.write("a");
  await tick();
  assert.equal(term.last(), before);
  term.stdin.write("q");
  assert.equal(await done, 0);
});

// ---- cvcli view flags

test("cvcli view --gallery in a pipe exits 2", () => {
  const r = spawnSync(process.execPath, [CLI, "view", SAMPLE, "--gallery"], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /interactive terminal/);
});

test("cvcli view with an unknown layout or accent exits 2 with the valid values", () => {
  const l = spawnSync(process.execPath, [CLI, "view", SAMPLE, "--layout", "fancy"], { encoding: "utf8" });
  assert.equal(l.status, 2);
  assert.match(l.stderr, /sidebar, classic, manpage/);
  const a = spawnSync(process.execPath, [CLI, "view", SAMPLE, "--accent=pink"], { encoding: "utf8" });
  assert.equal(a.status, 2);
  assert.match(a.stderr, /teal, blue, violet, green, amber/);
});

test("--print output is the same for every layout", () => {
  const outs = LAYOUTS.map((layout) => spawnSync(process.execPath, [CLI, "view", SAMPLE, "--print", "--layout", layout], { encoding: "utf8" }).stdout);
  assert.equal(new Set(outs).size, 1);
});
