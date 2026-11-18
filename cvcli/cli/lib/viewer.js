#!/usr/bin/env node
// Terminal CV viewer. Built-ins only, one self-contained file.
// - `cvcli view CV.md` imports it and passes the parsed CV.
// - `cvcli pack` copies it unchanged to <package>/bin/cli.js, where it reads ../cv.json.
//
// File map (see openspec design for add-cv-layouts):
//   plain text (--print) → design tokens → components → layouts → frame → controller → entry points

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

// Lines longer than this are hard to read, even on wide terminals.
const MAX_WIDTH = 100;
// Used when the width is unknown (output piped to a file or another program).
const DEFAULT_WIDTH = 80;
// Below this, wrapping makes the CV unreadable; we clamp to it.
const MIN_WIDTH = 20;
// The cv.json shape this viewer understands (see lib/parse.js CV_FORMAT).
const SUPPORTED_FORMAT = 1;
// Below these sizes, layouts drop the outer frame.
const FRAME_MIN_COLUMNS = 60;
const FRAME_MIN_ROWS = 16;
// The sidebar needs this width for its section list; classic needs this for two columns.
const SIDEBAR_MIN_COLUMNS = 72;
const CLASSIC_TWO_COLUMNS = 90;

const CONTACT_LABELS = [
  ["email", "Email"], ["phone", "Phone"], ["website", "Website"],
  ["github", "GitHub"], ["linkedin", "LinkedIn"],
];

// ---------------------------------------------------------------- styles (plain print path)

function makeStyle(color) {
  const wrap = (open, close) => (s) => (color ? `\x1b[${open}m${s}\x1b[${close}m` : s);
  return {
    bold: wrap(1, 22), dim: wrap(2, 22), cyan: wrap(36, 39),
    yellow: wrap(33, 39), green: wrap(32, 39), inverse: wrap(7, 27),
  };
}

/** Colors are on unless NO_COLOR is set to a non-empty value (https://no-color.org). */
export function colorEnabled(env = process.env) {
  return !(env.NO_COLOR !== undefined && env.NO_COLOR !== "");
}

// ---------------------------------------------------------------- text helpers

const ANSI_RE = /\x1b\[[0-9;?]*[A-Za-z]/g;

/** Remove escape codes. */
export function stripAnsi(s) {
  return String(s).replace(ANSI_RE, "");
}

/** Width on screen: characters, not counting escape codes. */
export function visibleWidth(s) {
  return [...stripAnsi(s)].length;
}

const len = visibleWidth;
const spaces = (n) => " ".repeat(Math.max(0, n));

/** Pad a (maybe styled) string with spaces to `width` visible columns. */
function padV(s, width) {
  return s + spaces(width - visibleWidth(s));
}

/** Word-wrap `text` to `width` columns. `indent` starts the first line, `hang` the others. */
export function wrap(text, width, indent = "", hang = indent) {
  const out = [];
  let line = indent;
  let lineHasWord = false;
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    let w = word;
    const room = () => width - len(line) - (lineHasWord ? 1 : 0);
    if (len(w) <= room()) {
      line += (lineHasWord ? " " : "") + w;
      lineHasWord = true;
      continue;
    }
    if (lineHasWord) {
      out.push(line);
      line = hang;
      lineHasWord = false;
    }
    // A word longer than a whole line: cut it.
    while (len(w) > width - len(line)) {
      const cut = Math.max(1, width - len(line));
      out.push(line + [...w].slice(0, cut).join(""));
      w = [...w].slice(cut).join("");
      line = hang;
    }
    if (w) {
      line += w;
      lineHasWord = true;
    }
  }
  if (lineHasWord || out.length === 0) out.push(line);
  return out;
}

/** Cut plain text to `width` columns, with "…" when it was cut. */
function clip(s, width) {
  if (width <= 0) return "";
  return len(s) > width ? [...s].slice(0, Math.max(0, width - 1)).join("") + "…" : s;
}

/** Make sure a (maybe styled) line is not wider than `width`; styling is dropped only if it must be cut. */
function fitLine(s, width) {
  return visibleWidth(s) <= width ? s : clip(stripAnsi(s), width);
}

// ---------------------------------------------------------------- plain text rendering (--print)

export function clampWidth(columns) {
  const n = Number(columns) || DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
}

/** "Lyon, France · remote OK · open to relocation" */
function whereLine(m) {
  const place = [m.location, m.country].filter(Boolean).join(", ");
  const extras = [];
  if (m.remote === "yes") extras.push("remote OK");
  if (m.remote === "hybrid") extras.push("hybrid OK");
  if (m.relocation === "yes") extras.push("open to relocation");
  return [place, ...extras].filter(Boolean).join(" · ");
}

/** Header lines: name, title, location, status. */
export function renderHeader(cv, { width = DEFAULT_WIDTH, color = false } = {}) {
  const st = makeStyle(color);
  const m = cv.meta || {};
  const lines = [];
  lines.push(st.bold(st.cyan(clip((m.name || "").toUpperCase(), width))));
  if (m.title) lines.push(...wrap(m.title, width).map(st.bold));
  const where = whereLine(m);
  if (where) lines.push(...wrap(where, width).map(st.dim));
  if (m.status) lines.push(...wrap(m.status, width).map(st.green));
  return lines;
}

/** The contact block is built from front matter, not from a ## section. */
export function contactSection(cv) {
  const m = cv.meta || {};
  const items = CONTACT_LABELS.filter(([k]) => m[k]).map(([k, label]) => ({ name: label, level: m[k] }));
  return items.length ? { id: "contact", title: "Contact", kind: "items", items } : null;
}

/** All sections to show, in order, with the contact block last. */
export function viewSections(cv) {
  const list = (cv.sections || []).filter((s) => sectionHasContent(s));
  const contact = contactSection(cv);
  if (contact) list.push(contact);
  return list;
}

function sectionHasContent(s) {
  return Boolean(
    (s.paragraphs && s.paragraphs.length) || (s.entries && s.entries.length) ||
    (s.groups && s.groups.length) || (s.items && s.items.length) || (s.intro && s.intro.length));
}

/** Lines for one section body (without its title), plain text style. */
export function renderSection(section, { width = DEFAULT_WIDTH, color = false } = {}) {
  const st = makeStyle(color);
  const lines = [];
  const para = (p) => lines.push(...wrap(p, width));
  for (const p of section.intro || []) para(p);
  if (section.paragraphs) {
    section.paragraphs.forEach((p, i) => {
      if (i) lines.push("");
      para(p);
    });
  }
  if (section.entries) {
    section.entries.forEach((e, i) => {
      if (i || (section.intro && section.intro.length)) lines.push("");
      const head = e.subtitle ? `${e.title} — ${e.subtitle}` : e.title;
      lines.push(...wrap(head, width).map((l) => st.bold(l)));
      if (e.meta && e.meta.length) lines.push(...wrap(e.meta.join(" · "), width).map(st.dim));
      if (e.tech && e.tech.length) lines.push(...wrap(`Tech: ${e.tech.join(", ")}`, width).map(st.cyan));
      for (const n of e.notes || []) para(n);
      for (const b of e.bullets || []) lines.push(...wrap(b, width, "  • ", "    "));
    });
  }
  if (section.groups) {
    for (const g of section.groups) {
      const text = g.name ? `${g.name}: ${g.items.join(", ")}` : g.items.join(", ");
      const wrapped = wrap(text, width, "", "  ");
      if (g.name && color) wrapped[0] = wrapped[0].replace(`${g.name}:`, st.bold(`${g.name}:`));
      lines.push(...wrapped);
    }
  }
  if (section.items) {
    const pad = Math.min(14, Math.max(...section.items.map((it) => len(it.name))) + 2);
    for (const it of section.items) {
      if (!it.level) {
        lines.push(...wrap(it.name, width));
        continue;
      }
      // The label is the indent of the first line, so wrap() keeps its padding.
      const label = (it.name + ":").padEnd(pad);
      const wrapped = wrap(it.level, width, label, " ".repeat(pad));
      if (color) wrapped[0] = st.bold(label) + wrapped[0].slice(label.length);
      lines.push(...wrapped);
    }
  }
  return lines;
}

function sectionTitle(title, width, st) {
  const text = ` ${title.toUpperCase()} `;
  const rule = "─".repeat(Math.max(0, width - len(text) - 2));
  return st.yellow(`──${text}${rule}`);
}

/** The whole CV as plain text lines (used by --print and when output is not a terminal). */
export function renderAll(cv, { width = DEFAULT_WIDTH, color = false } = {}) {
  const st = makeStyle(color);
  const lines = [...renderHeader(cv, { width, color })];
  for (const s of viewSections(cv)) {
    lines.push("", sectionTitle(s.title, width, st), "");
    lines.push(...renderSection(s, { width, color }));
  }
  return lines;
}

// ---------------------------------------------------------------- design tokens

export const LAYOUTS = ["sidebar", "classic", "manpage"];
export const ACCENTS = ["teal", "blue", "violet", "green", "amber"];
export const DEFAULT_LAYOUT = "sidebar";
export const DEFAULT_ACCENT = "teal";

// Mid-lightness colors: contrast >= 3:1 on both #1e1e1e and #ffffff (values in the design doc).
// `basic` is the 16-color ANSI code used when the terminal has only 16 colors.
const ACCENT_COLORS = {
  teal: { hex: "#1a9e9e", basic: 36 },
  blue: { hex: "#4a8ae8", basic: 34 },
  violet: { hex: "#9a72e6", basic: 35 },
  green: { hex: "#3d9e4f", basic: 32 },
  amber: { hex: "#c07f12", basic: 33 },
};
const NEUTRALS = {
  muted: { hex: "#8a8a8a", basic: 90 },
  border: { hex: "#707070", basic: 90 },
  success: { hex: "#3d9e4f", basic: 32 },
};

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Nearest xterm-256 color index: the 6×6×6 cube or the gray ramp, whichever is closer. */
export function rgbTo256([r, g, b]) {
  const steps = [0, 95, 135, 175, 215, 255];
  const near = (v) => steps.reduce((best, s, i) => (Math.abs(s - v) < Math.abs(steps[best] - v) ? i : best), 0);
  const [ri, gi, bi] = [near(r), near(g), near(b)];
  const gray = Math.max(0, Math.min(23, Math.round(((r + g + b) / 3 - 8) / 10)));
  const gv = 8 + gray * 10;
  const dist = ([x, y, z]) => (x - r) ** 2 + (y - g) ** 2 + (z - b) ** 2;
  return dist([gv, gv, gv]) < dist([steps[ri], steps[gi], steps[bi]]) ? 232 + gray : 16 + 36 * ri + 6 * gi + bi;
}

function colorCode(color, depth) {
  if (depth >= 24) return `38;2;${hexToRgb(color.hex).join(";")}`;
  if (depth >= 8) return `38;5;${rgbTo256(hexToRgb(color.hex))}`;
  if (depth >= 4) return String(color.basic);
  return null;
}

/**
 * The style roles used by every component: accent, text, strong, muted, border, success.
 * Layouts and components never write color codes themselves.
 */
export function makeTheme(accent = DEFAULT_ACCENT, depth = 4) {
  const paint = (color) => {
    const code = colorCode(color, depth);
    return (s) => (code && s ? `\x1b[${code}m${s}\x1b[39m` : s);
  };
  const bold = (s) => (s ? `\x1b[1m${s}\x1b[22m` : s);
  const acc = paint(ACCENT_COLORS[accent] || ACCENT_COLORS[DEFAULT_ACCENT]);
  return {
    accent: acc,
    accentBold: (s) => bold(acc(s)),
    text: (s) => s,
    strong: bold,
    muted: paint(NEUTRALS.muted),
    border: paint(NEUTRALS.border),
    success: paint(NEUTRALS.success),
  };
}

/** Color depth in bits: 1 (no color), 4, 8 or 24. NO_COLOR always wins. */
export function detectColorDepth(stream, env = process.env) {
  if (!colorEnabled(env)) return 1;
  try {
    if (stream && typeof stream.getColorDepth === "function") return stream.getColorDepth(env);
  } catch { /* fall through */ }
  return 4;
}

// ---------------------------------------------------------------- components
// Each component takes plain data and a width, and returns lines that are never wider than it.

function statusBadge(status, width, th) {
  return wrap(`● ${status}`, width, "", "  ").map(th.success);
}

/**
 * Name, title, location line and status badge.
 * `badgeInline`: put the badge on the name line when it fits. `compact`: name, title and badge only.
 */
function header(meta, width, th, { compact = false, badgeInline = true } = {}) {
  const lines = [];
  const name = (meta.name || "").toUpperCase();
  const badge = meta.status ? `● ${meta.status}` : "";
  let badgeDone = !badge;
  if (badge && badgeInline && !compact && len(name) + 4 + len(badge) <= width) {
    lines.push(th.accentBold(name) + spaces(width - len(name) - len(badge)) + th.success(badge));
    badgeDone = true;
  } else {
    lines.push(...wrap(name, width).map(th.accentBold));
  }
  if (meta.title) lines.push(...wrap(meta.title, width).map(th.strong));
  const where = compact ? "" : whereLine(meta);
  if (where) lines.push(...wrap(where, width).map(th.muted));
  if (!badgeDone) lines.push(...statusBadge(meta.status, width, th));
  return lines;
}

/** "EXPERIENCE" (bold accent), with an optional rule to the right edge. */
function heading(title, width, th, rule = false) {
  const t = clip(title.toUpperCase(), width);
  if (!rule || len(t) + 2 > width) return th.accentBold(t);
  return th.accentBold(t) + " " + th.border("─".repeat(width - len(t) - 1));
}

// A meta part that looks like a date: a year, or words like "Present".
const DATE_RE = /\b(?:19|20)\d{2}\b|\b(?:present|now|today|current)\b|aujourd'hui|en cours/i;

function datePartIndex(meta) {
  return (meta || []).findIndex((p) => len(p) <= 30 && !p.includes("://") && DATE_RE.test(p));
}

function bullet(text, width, th) {
  // "  ▸ " starts the first line; the marker is the accent color.
  return wrap(text, width, "  ▸ ", "    ").map((l, i) => (i === 0 ? "  " + th.accent("▸") + l.slice(3) : l));
}

function tagList(items, width, th) {
  return wrap(items.join(" · "), width).map((l) => l.replace(/·/g, th.muted("·")));
}

/** One experience, project, open-source or education entry. Text is never changed, only placed. */
function entry(e, width, th) {
  const lines = [];
  const head = e.subtitle ? `${e.title} — ${e.subtitle}` : e.title;
  const meta = [...(e.meta || [])];
  const di = datePartIndex(meta);
  const date = di >= 0 ? meta[di] : "";
  if (date && len(head) + 2 + len(date) <= width) {
    lines.push(th.strong(head) + spaces(width - len(head) - len(date)) + th.muted(date));
    meta.splice(di, 1);
  } else {
    lines.push(...wrap(head, width).map(th.strong));
  }
  if (meta.length) lines.push(...wrap(meta.join(" · "), width).map(th.muted));
  if (e.tech && e.tech.length) lines.push(...tagList(e.tech, width, th));
  for (const n of e.notes || []) lines.push(...wrap(n, width));
  for (const b of e.bullets || []) lines.push(...bullet(b, width, th));
  return lines;
}

/** Aligned "Label: value" lines; labels go on their own line when the column would be too wide. */
function keyValue(pairs, width, th) {
  const lines = [];
  const keyed = pairs.filter((p) => p.key && p.value);
  const keyW = keyed.length ? Math.max(...keyed.map((p) => len(p.key))) + 2 : 0;
  const inline = keyW <= Math.floor(width * 0.4);
  for (const { key, value } of pairs) {
    if (!key || !value) {
      lines.push(...wrap(key || value, width));
    } else if (inline) {
      const label = padV(key + ":", keyW);
      const w = wrap(value, width, label, spaces(keyW));
      w[0] = th.strong(label) + w[0].slice(label.length);
      lines.push(...w);
    } else {
      lines.push(...wrap(key, width).map(th.strong));
      lines.push(...wrap(value, width, "  ", "  "));
    }
  }
  return lines;
}

function paragraphs(list, width) {
  const lines = [];
  list.forEach((p, i) => {
    if (i) lines.push("");
    lines.push(...wrap(p, width));
  });
  return lines;
}

/** Body of one section (without its heading). */
function sectionBody(section, width, th) {
  const lines = [];
  const add = (more) => {
    if (!more.length) return;
    if (lines.length) lines.push("");
    lines.push(...more);
  };
  add(paragraphs(section.intro || [], width));
  add(paragraphs(section.paragraphs || [], width));
  for (const e of section.entries || []) add(entry(e, width, th));
  if (section.groups) add(keyValue(section.groups.map((g) => ({ key: g.name || "", value: g.items.join(" · ") })), width, th));
  if (section.items) add(keyValue(section.items.map((it) => ({ key: it.name, value: it.level || "" })), width, th));
  return lines;
}

/** The vertical section list of the sidebar: " ▌ Projects    p ". */
function navList(state, width, th) {
  const titleW = Math.max(1, width - 6);
  return state.sections.map((s, i) => {
    const key = state.keys[i] || " ";
    const title = padV(clip(s.title, titleW), titleW);
    return i === state.current
      ? " " + th.accent("▌") + " " + th.strong(title) + " " + th.accent(key) + " "
      : "   " + title + " " + th.muted(key) + " ";
  });
}

/** One-line section indicator for small screens: "‹ Projects  3/9 ›". */
function navLine(state, width, th) {
  const s = state.sections[state.current];
  const pos = `${state.current + 1}/${state.sections.length}`;
  const title = clip(s ? s.title : "", Math.max(1, width - len(pos) - 6));
  return th.muted("‹ ") + th.accentBold(title) + "  " + th.muted(pos + " ›");
}

/** Key hints on the left (the longest set that fits), status on the right. */
function footer(hintSets, right, width, th) {
  for (const h of hintSets) {
    if (len(h) + 2 + len(right) <= width) return th.muted(h) + spaces(width - len(h) - len(right)) + th.muted(right);
  }
  return th.muted(clip(right, width));
}

/** A horizontal border line: corners/edges plus optional joins ({ column: "┬" }). */
function hline(width, th, [left, right], joins = {}) {
  let s = "";
  for (let i = 0; i < width; i++) s += i === 0 ? left : i === width - 1 ? right : joins[i] || "─";
  return th.border(s);
}

/** Text inside a box cell: padding left and right, exact width. */
function cell(content, width, padL = 2, padR = 2) {
  const inner = Math.max(0, width - padL - padR);
  return spaces(padL) + padV(fitLine(content, inner), inner) + spaces(padR);
}

/** A box row: │cell│cell│ */
function boxRow(cells, th) {
  const b = th.border("│");
  return b + cells.join(b) + b;
}

// ---------------------------------------------------------------- layouts

/** Clamp the scroll for `total` lines in a window of `height`, remember it, and return the visible slice. */
function scrollWindow(state, lines, height) {
  const max = Math.max(0, lines.length - height);
  state.scroll = Math.max(0, Math.min(state.scroll, max));
  state.view = { height, total: lines.length };
  const visible = lines.slice(state.scroll, state.scroll + height);
  while (visible.length < height) visible.push("");
  return visible;
}

function scrollPercent(state) {
  const { height, total } = state.view;
  return total > height ? ` · ${Math.min(100, Math.round(((state.scroll + height) / total) * 100))}%` : "";
}

const PAGED_HINTS = ["↑↓ section  PgUp/PgDn scroll  letter jump  t layout  q quit", "↑↓ section  t layout  q quit", "t layout  q quit"];
const PAGE_HINTS = ["↑↓ scroll  ←→ / letter jump  t layout  q quit", "↑↓ scroll  t layout  q quit", "t layout  q quit"];

function centered(columns, width) {
  return spaces(Math.floor((columns - width) / 2));
}

/** sidebar: a framed card, section list on the left, one section on the right. */
function sidebarFrame(state, { columns, rows }, th) {
  const meta = state.cv.meta || {};
  const section = state.sections[state.current];
  const status = () => `sidebar · ${state.current + 1}/${state.sections.length}${scrollPercent(state)}`;

  if (columns < FRAME_MIN_COLUMNS || rows < FRAME_MIN_ROWS) {
    const tw = Math.max(1, columns - 2);
    const top = [...header(meta, tw, th, { compact: true }), navLine(state, tw, th), th.border("─".repeat(tw))];
    const body = section ? sectionBody(section, tw, th) : ["(empty CV)"];
    const visible = scrollWindow(state, body, Math.max(1, rows - top.length - 1));
    return [...top, ...visible, footer(PAGED_HINTS, status(), tw, th)].map((l) => " " + l);
  }

  const W = Math.min(columns, MAX_WIDTH);
  const inner = W - 2;
  const wide = W >= SIDEBAR_MIN_COLUMNS;
  const full = (s) => boxRow([cell(s, inner)], th);
  let head = header(meta, inner - 4, th);
  let pad = 1;
  // Fixed rows: top border, 2 rules, footer, bottom border (+ the nav line and its rule when narrow).
  const fixedRows = () => 5 + head.length + 2 * pad + (wide ? 0 : 2);
  if (rows - fixedRows() < 4) {
    head = header(meta, inner - 4, th, { compact: true });
    pad = 0;
  }
  const areaH = Math.max(1, rows - fixedRows());
  const lines = [hline(W, th, ["╭", "╮"])];
  if (pad) lines.push(full(""));
  lines.push(...head.map(full));
  if (pad) lines.push(full(""));

  const maxTitle = Math.max(0, ...state.sections.map((s) => len(s.title)));
  const NW = wide ? Math.max(16, Math.min(26, maxTitle + 6)) : 0;
  const bodyCellW = wide ? inner - NW - 1 : inner;
  const textW = bodyCellW - 4;
  const roomy = areaH >= 7;
  const paneTop = roomy && section ? ["", heading(section.title, textW, th), ""] : [];
  const body = section ? sectionBody(section, textW, th) : ["(empty CV)"];
  const pane = [...paneTop, ...scrollWindow(state, body, Math.max(1, areaH - paneTop.length))];

  if (wide) {
    lines.push(hline(W, th, ["├", "┤"], { [NW + 1]: "┬" }));
    let nav = [...(roomy ? [""] : []), ...navList(state, NW, th)];
    if (nav.length > areaH) {
      const first = Math.max(0, Math.min(state.current + (roomy ? 1 : 0) - Math.floor(areaH / 2), nav.length - areaH));
      nav = nav.slice(first, first + areaH);
    }
    for (let r = 0; r < areaH; r++) lines.push(boxRow([padV(nav[r] || "", NW), cell(pane[r] || "", bodyCellW)], th));
    lines.push(hline(W, th, ["├", "┤"], { [NW + 1]: "┴" }));
  } else {
    lines.push(hline(W, th, ["├", "┤"]));
    lines.push(full(navLine(state, inner - 4, th)));
    lines.push(hline(W, th, ["├", "┤"]));
    for (let r = 0; r < areaH; r++) lines.push(full(pane[r] || ""));
    lines.push(hline(W, th, ["├", "┤"]));
  }
  lines.push(full(footer(PAGED_HINTS, status(), inner - 4, th)));
  lines.push(hline(W, th, ["╰", "╯"]));
  const margin = centered(columns, W);
  return lines.map((l) => margin + l);
}

// Sections that go in the classic layout's left column.
const CLASSIC_LEFT = new Set(["contact", "skills", "languages"]);

/** Header and sections as one column, with the line number of each section heading. */
function classicColumn(state, list, width, th, withHeader) {
  const lines = [""];
  const anchors = {};
  if (withHeader) lines.push(...header(state.cv.meta || {}, width, th, { badgeInline: false }));
  for (const i of list) {
    const s = state.sections[i];
    if (lines.length > 1) lines.push("");
    anchors[i] = lines.length;
    lines.push(heading(s.title, width, th, true), "");
    lines.push(...sectionBody(s, width, th));
  }
  lines.push("");
  return { lines, anchors };
}

/** Scroll to a requested heading, or follow the scroll to update the current section. */
function syncPage(state, anchors) {
  if (state.jump !== null && state.jump !== undefined) {
    state.current = state.jump;
    state.scroll = anchors[state.jump] || 0;
    state.jump = null;
  }
}

function followScroll(state, anchors) {
  if (!state.follow) return;
  state.follow = false;
  let best = 0;
  for (const [i, row] of Object.entries(anchors)) if (row <= state.scroll && row >= (anchors[best] || 0)) best = Number(i);
  state.current = best;
}

/** classic: a paper-CV page, two columns when there is room. */
function classicFrame(state, { columns, rows }, th) {
  const framed = columns >= FRAME_MIN_COLUMNS && rows >= FRAME_MIN_ROWS;
  const W = framed ? Math.min(columns, MAX_WIDTH) : columns;
  const inner = W - 2;
  const two = framed && W >= CLASSIC_TWO_COLUMNS;
  const idx = state.sections.map((_, i) => i);
  const left = idx.filter((i) => CLASSIC_LEFT.has(state.sections[i].id));
  const right = idx.filter((i) => !CLASSIC_LEFT.has(state.sections[i].id));
  const status = () => `classic${scrollPercent(state)}`;
  const lines = [];

  if (two) {
    const LCW = Math.max(27, Math.floor(inner * 0.3));
    const RCW = inner - LCW - 1;
    const L = classicColumn(state, left, LCW - 3, th, true);
    const R = classicColumn(state, right, RCW - 4, th, false);
    const anchors = { ...L.anchors, ...R.anchors };
    const page = Array.from({ length: Math.max(L.lines.length, R.lines.length) }, (_, r) => [L.lines[r] || "", R.lines[r] || ""]);
    const h = Math.max(1, rows - 4);
    syncPage(state, anchors);
    const visible = scrollWindow(state, page, h).map((p) => p || ["", ""]);
    followScroll(state, anchors);
    lines.push(hline(W, th, ["╭", "╮"], { [LCW + 1]: "┬" }));
    for (const [l, r] of visible) lines.push(boxRow([cell(l, LCW, 2, 1), cell(r, RCW)], th));
    lines.push(hline(W, th, ["├", "┤"], { [LCW + 1]: "┴" }));
    lines.push(boxRow([cell(footer(PAGE_HINTS, status(), inner - 4, th), inner)], th));
    lines.push(hline(W, th, ["╰", "╯"]));
    const margin = centered(columns, W);
    return lines.map((l) => margin + l);
  }

  // One column: the left column content first, then the rest.
  const tw = framed ? inner - 4 : Math.max(1, columns - 2);
  const col = classicColumn(state, [...left, ...right], tw, th, true);
  const h = Math.max(1, rows - (framed ? 4 : 1));
  syncPage(state, col.anchors);
  const visible = scrollWindow(state, col.lines, h);
  followScroll(state, col.anchors);
  if (!framed) return [...visible, footer(PAGE_HINTS, status(), tw, th)].map((l) => " " + l);
  const full = (s) => boxRow([cell(s, inner)], th);
  lines.push(hline(W, th, ["╭", "╮"]), ...visible.map(full), hline(W, th, ["├", "┤"]));
  lines.push(full(footer(PAGE_HINTS, status(), inner - 4, th)), hline(W, th, ["╰", "╯"]));
  const margin = centered(columns, W);
  return lines.map((l) => margin + l);
}

/** "SAM-RIVERA(1)" */
function manToken(meta) {
  return `${(meta.name || "CV").toUpperCase().trim().replace(/\s+/g, "-")}(1)`;
}

/** A line with text on the left, in the middle and on the right, when it fits. */
function threePart(a, b, c, width) {
  if (len(a) + len(b) + len(c) + 4 <= width) {
    const gap = width - len(a) - len(b) - len(c);
    const l = Math.floor(gap / 2);
    return a + spaces(l) + b + spaces(gap - l) + c;
  }
  if (len(a) + len(c) + 2 <= width) return a + spaces(width - len(a) - len(c)) + c;
  return clip(a, width);
}

/** manpage: the CV as a Unix manual page. */
function manpageFrame(state, { columns, rows }, th) {
  const meta = state.cv.meta || {};
  const W = Math.min(columns, MAX_WIDTH);
  const tw = Math.max(1, W - 2);
  const ind = W < FRAME_MIN_COLUMNS ? 3 : 7;
  const bw = Math.max(1, tw - ind);
  const indent = (ls) => ls.map((l) => (l ? spaces(ind) + l : l));
  const tok = manToken(meta);
  const page = [];
  const anchors = {};
  const block = (title, body, i) => {
    if (page.length) page.push("");
    if (i !== undefined) anchors[i] = page.length;
    page.push(th.accentBold(clip(title, tw)), ...indent(body));
  };

  const nameBody = wrap(meta.title ? `${meta.name} — ${meta.title}` : meta.name || "", bw);
  const where = whereLine(meta);
  if (where) nameBody.push(...wrap(where, bw).map(th.muted));
  if (meta.status) nameBody.push(...statusBadge(meta.status, bw, th));
  block("NAME", nameBody);
  if (state.pkgName) block("SYNOPSIS", wrap(`npx ${state.pkgName} [--print] [--layout sidebar|classic|manpage]`, bw).map(th.strong));
  state.sections.forEach((s, i) => {
    const title = s.id === "summary" ? "DESCRIPTION" : s.title.toUpperCase();
    block(title, sectionBody(s, bw, th), i);
  });
  page.push("", th.muted(threePart("cvcli", meta.updated || "", tok, tw)), "");

  const h = Math.max(1, rows - 3);
  syncPage(state, anchors);
  const visible = scrollWindow(state, page, h);
  followScroll(state, anchors);
  const lines = [
    th.strong(threePart(tok, "Curriculum Vitae", tok, tw)), "",
    ...visible,
    footer(PAGE_HINTS, `manpage${scrollPercent(state)}`, tw, th),
  ];
  const margin = centered(columns, W) + " ";
  return lines.map((l) => margin + l);
}

const LAYOUT_IMPL = {
  sidebar: { nav: "paged", frame: sidebarFrame },
  classic: { nav: "page", frame: classicFrame },
  manpage: { nav: "page", frame: manpageFrame },
};

// ---------------------------------------------------------------- frame

/** One-letter shortcut per section: first free letter of its title (q, t and a are reserved). */
export function assignKeys(sections) {
  const used = new Set(["q", "t", "a"]);
  return sections.map((s) => {
    const letters = [...s.title.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")];
    const key = letters.find((c) => !used.has(c)) || null;
    if (key) used.add(key);
    return key;
  });
}

const pick = (wanted, saved, list, fallback) => (list.includes(wanted) ? wanted : list.includes(saved) ? saved : fallback);

/**
 * Viewer state. The look comes from `opts` (flags), then cv.display (owner's choice), then defaults.
 * Unknown values in cv.json fall back silently, so an old or edited cv.json still opens.
 */
export function createState(cv, opts = {}) {
  const sections = viewSections(cv);
  const display = cv.display || {};
  return {
    cv, sections, keys: assignKeys(sections),
    current: 0, scroll: 0, jump: null, follow: false,
    layout: pick(opts.layout, display.layout, LAYOUTS, DEFAULT_LAYOUT),
    accent: pick(opts.accent, display.accent, ACCENTS, DEFAULT_ACCENT),
    depth: opts.depth === undefined ? 4 : opts.depth,
    gallery: Boolean(opts.gallery),
    pkgName: opts.pkgName || null,
    view: { height: 10, total: 0 },
  };
}

export function isPagedLayout(layout) {
  return LAYOUT_IMPL[layout].nav === "paged";
}

function galleryBanner(state, width, th) {
  const left = `Gallery · ${state.layout} · ${state.accent}`;
  const hints = ["t layout · a accent · Enter choose · q quit", "t · a · Enter · q", ""];
  for (const h of hints) {
    if (len(left) + 2 + len(h) <= width) return th.accentBold(left) + spaces(width - len(left) - len(h)) + th.muted(h);
  }
  return th.accentBold(clip(left, width));
}

/** Render one screen: exactly `rows` lines, none wider than `columns`. */
export function renderFrame(state, { columns = DEFAULT_WIDTH, rows = 24 } = {}) {
  const c = Math.max(MIN_WIDTH, Number(columns) || DEFAULT_WIDTH);
  const r = Math.max(3, Number(rows) || 24);
  const th = makeTheme(state.accent, state.depth);
  const top = state.gallery ? [" " + galleryBanner(state, c - 2, th)] : [];
  const body = LAYOUT_IMPL[state.layout].frame(state, { columns: c, rows: r - top.length }, th);
  const lines = [...top, ...body];
  return Array.from({ length: r }, (_, i) => fitLine(lines[i] || "", c));
}

// ---------------------------------------------------------------- interactive mode

const nextOf = (list, value) => list[(list.indexOf(value) + 1) % list.length];

function interactive(state, { stdin, stdout }) {
  return new Promise((resolve) => {
    let done = false;

    const draw = () => {
      const lines = renderFrame(state, { columns: stdout.columns, rows: stdout.rows });
      // Clear each line before writing it ("\x1b[2K"), so a full-width line keeps its last character.
      stdout.write("\x1b[H" + lines.map((l) => "\x1b[2K" + l).join("\r\n"));
    };

    const finish = (choice = null) => {
      if (done) return;
      done = true;
      stdin.removeListener("keypress", onKey);
      stdout.removeListener("resize", draw);
      process.removeListener("SIGTERM", onSigterm);
      process.removeListener("exit", restore);
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.pause();
      restore();
      resolve({ code: 0, choice });
    };
    const onSigterm = () => finish();
    const restore = () => stdout.write("\x1b[?25h\x1b[?1049l");

    const onKey = (str, key = {}) => {
      const name = key.name;
      if ((key.ctrl && name === "c") || name === "q" || name === "escape") return finish();
      if (state.gallery && (name === "return" || name === "enter")) {
        return finish({ layout: state.layout, accent: state.accent });
      }
      const paged = isPagedLayout(state.layout);
      const count = Math.max(1, state.sections.length);
      const go = (i) => {
        state.current = (i + count) % count;
        if (paged) state.scroll = 0;
        else state.jump = state.current;
      };
      const scrollBy = (n) => {
        state.scroll += n;
        if (!paged) state.follow = true;
      };
      const page = Math.max(1, state.view.height - 1);
      if (name === "t" && !key.ctrl) {
        state.layout = nextOf(LAYOUTS, state.layout);
        if (isPagedLayout(state.layout)) state.scroll = 0;
        else state.jump = state.current;
      } else if (name === "a" && !key.ctrl && state.gallery) state.accent = nextOf(ACCENTS, state.accent);
      else if (name === "right" || name === "tab") go(state.current + 1);
      else if (name === "left") go(state.current - 1);
      // In the sidebar, ↑/↓ follow the vertical section list: scroll a long section first, then move.
      else if (name === "down" && paged) {
        if (state.scroll < state.view.total - state.view.height) scrollBy(1);
        else if (state.current < count - 1) go(state.current + 1);
      } else if (name === "up" && paged) {
        if (state.scroll > 0) scrollBy(-1);
        else if (state.current > 0) go(state.current - 1);
      } else if (name === "down") scrollBy(1);
      else if (name === "up") scrollBy(-1);
      else if (name === "pagedown" || name === "space") scrollBy(page);
      else if (name === "pageup") scrollBy(-page);
      else if (name === "home") scrollBy(-Number.MAX_SAFE_INTEGER / 2);
      else if (name === "end") scrollBy(Number.MAX_SAFE_INTEGER / 2);
      else if (str) {
        const i = state.keys.indexOf(str.toLowerCase());
        if (i !== -1) go(i);
      }
      state.scroll = Math.max(0, state.scroll);
      draw();
    };

    process.on("exit", restore);
    process.on("SIGTERM", onSigterm);
    stdout.write("\x1b[?1049h\x1b[?25l");
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("keypress", onKey);
    stdout.on("resize", draw);
    draw();
  });
}

// ---------------------------------------------------------------- entry points

/** Error message for an unknown --layout or --accent value, or null. */
export function displayArgError({ layout, accent } = {}) {
  if (layout !== undefined && !LAYOUTS.includes(layout)) {
    return `Unknown layout "${layout}". Choose one of: ${LAYOUTS.join(", ")}`;
  }
  if (accent !== undefined && !ACCENTS.includes(accent)) {
    return `Unknown accent "${accent}". Choose one of: ${ACCENTS.join(", ")}`;
  }
  return null;
}

/**
 * Show a parsed CV. Interactive when both stdin and stdout are terminals and
 * `print` is false; otherwise prints plain text once.
 * `onChoice({layout, accent})` is called after the terminal is restored when a gallery look is chosen.
 * @returns {Promise<number>} exit code
 */
export async function runViewer(cv, {
  print = false, width, layout, accent, gallery = false, depth, pkgName, onChoice,
  stdin = process.stdin, stdout = process.stdout, stderr = process.stderr,
} = {}) {
  if (cv.format && cv.format > SUPPORTED_FORMAT) {
    stderr.write("This CV was made with a newer cvcli. Please update the package.\n");
    return 1;
  }
  const argError = displayArgError({ layout, accent });
  if (argError) {
    stderr.write(argError + "\n");
    return 2;
  }
  const tty = Boolean(stdout.isTTY && stdin.isTTY);
  if (gallery && !tty) {
    stderr.write("The gallery needs an interactive terminal. Run the command directly, not in a pipe.\n");
    return 2;
  }
  if ((gallery || !print) && tty) {
    const state = createState(cv, {
      layout, accent, gallery, pkgName, depth: depth === undefined ? detectColorDepth(stdout) : depth,
    });
    try {
      const result = await interactive(state, { stdin, stdout });
      if (result.choice && onChoice) onChoice(result.choice);
      return result.code;
    } catch (err) {
      stdout.write("\x1b[?25h\x1b[?1049l");
      throw err;
    }
  }
  const w = width ? clampWidth(width) : clampWidth(stdout.isTTY ? stdout.columns : DEFAULT_WIDTH);
  stdout.write(renderAll(cv, { width: w, color: false }).join("\n") + "\n");
  return 0;
}

/** Read --print, --width N, --layout X, --accent X, --gallery, --help and --version from argv. */
export function parseViewerArgs(argv) {
  const opts = { print: false, width: undefined, help: false, version: false, gallery: false, layout: undefined, accent: undefined };
  const value = (a, i, name) => (a.startsWith(`${name}=`) ? [a.slice(name.length + 1), i] : [argv[i + 1], i + 1]);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--print" || a === "-p") opts.print = true;
    else if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--version" || a === "-v") opts.version = true;
    else if (a === "--gallery") opts.gallery = true;
    else if (a === "--width" || a.startsWith("--width=")) {
      const [v, j] = value(a, i, "--width");
      opts.width = Number(v);
      i = j;
    } else if (a === "--layout" || a.startsWith("--layout=")) {
      const [v, j] = value(a, i, "--layout");
      opts.layout = v === undefined ? "" : v;
      i = j;
    } else if (a === "--accent" || a.startsWith("--accent=")) {
      const [v, j] = value(a, i, "--accent");
      opts.accent = v === undefined ? "" : v;
      i = j;
    }
  }
  return opts;
}

// When this file runs as the bin of a generated package, load ../cv.json and show it.
async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const opts = parseViewerArgs(process.argv.slice(2));
  const pkgFile = path.join(here, "..", "package.json");
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")); } catch { /* optional */ }
  if (opts.version) {
    process.stdout.write(`${pkg.version || "unknown"}\n`);
    return 0;
  }
  if (opts.help) {
    process.stdout.write([
      `${pkg.name || "cv"}: a CV in your terminal`,
      "",
      "Usage: npx <package> [--print] [--width N] [--layout NAME] [--accent COLOR]",
      "  --print         print the whole CV once, as plain text",
      "  --width N       wrap text at N columns (with --print)",
      `  --layout NAME   start with a layout: ${LAYOUTS.join(", ")}`,
      `  --accent COLOR  accent color: ${ACCENTS.join(", ")}`,
      "Keys: letters jump to a section, arrows move and scroll, t changes the layout, q quits.",
      "",
    ].join("\n"));
    return 0;
  }
  let cv;
  try {
    cv = JSON.parse(fs.readFileSync(path.join(here, "..", "cv.json"), "utf8"));
  } catch (err) {
    process.stderr.write(`Cannot read cv.json next to this package: ${err.message}\n`);
    return 1;
  }
  return runViewer(cv, { ...opts, gallery: false, pkgName: pkg.name });
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    // npx runs bins through symlinks or shims, so compare real paths.
    return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMain()) {
  main().then((code) => { process.exitCode = code; }, (err) => {
    process.stderr.write(`${err.stack || err}\n`);
    process.exitCode = 1;
  });
}
