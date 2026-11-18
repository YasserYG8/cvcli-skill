// Parse and validate a CV.md file (the format of cvcli/templates/cv-full.md).
// Built-ins only. Returns { cv, errors, warnings }; never throws on bad input.

// Known sections, in the required order. `kind` decides how the content is parsed.
export const SECTIONS = [
  { id: "summary", en: "Summary", fr: "Résumé", kind: "text" },
  { id: "experience", en: "Experience", fr: "Expériences", kind: "entries" },
  { id: "projects", en: "Projects", fr: "Projets", kind: "entries" },
  { id: "open-source", en: "Open Source", fr: "Open Source", kind: "entries" },
  { id: "skills", en: "Skills", fr: "Compétences", kind: "groups" },
  { id: "education", en: "Education", fr: "Formation", kind: "entries" },
  { id: "languages", en: "Languages", fr: "Langues", kind: "items" },
  { id: "interests", en: "Interests", fr: "Centres d'intérêt", kind: "text" },
];

export const META_KEYS = [
  "name", "title", "location", "country", "remote", "relocation", "status",
  "email", "phone", "website", "github", "linkedin", "language", "updated",
];

export const CONTACT_KEYS = ["email", "phone", "website", "github", "linkedin"];

// Version of the cv.json shape, so a viewer can refuse data it does not understand.
export const CV_FORMAT = 1;

// "[metric?]", "[city?]", "[métrique ?]": short text in brackets ending with "?".
const PLACEHOLDER = /\[[^[\]\n]{1,30}\?\]/g;

// Separators used by the template: " — " between title and subtitle, " · " in meta lines.
const TITLE_SEP = " — ";
const META_SEP = " · ";

function normalizeHeading(text) {
  return text.trim().replace(/[’`]/g, "'").toLowerCase();
}

const SECTION_BY_NAME = new Map();
for (const s of SECTIONS) {
  SECTION_BY_NAME.set(normalizeHeading(s.en), s);
  SECTION_BY_NAME.set(normalizeHeading(s.fr), s);
}

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2 && ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

function paragraphs(lines) {
  const out = [];
  let current = [];
  for (const { text } of lines) {
    if (text.trim() === "") {
      if (current.length) out.push(current.join(" "));
      current = [];
    } else {
      current.push(text.trim());
    }
  }
  if (current.length) out.push(current.join(" "));
  return out;
}

function bulletText(text) {
  const m = /^\s*[-*]\s+(.*)$/.exec(text);
  return m ? m[1].trim() : null;
}

function parseEntries(lines, warnings) {
  const entries = [];
  const intro = [];
  let entry = null;
  for (const { text, line } of lines) {
    const heading = /^###\s+(.*)$/.exec(text);
    if (heading) {
      const raw = heading[1].trim();
      const sep = raw.indexOf(TITLE_SEP);
      entry = {
        title: sep === -1 ? raw : raw.slice(0, sep).trim(),
        subtitle: sep === -1 ? null : raw.slice(sep + TITLE_SEP.length).trim(),
        meta: [],
        tech: [],
        bullets: [],
        notes: [],
        line,
      };
      entries.push(entry);
      continue;
    }
    if (text.trim() === "") continue;
    if (!entry) {
      intro.push(text.trim());
      continue;
    }
    const bullet = bulletText(text);
    const tech = /^(?:tech|technologies)\s*:\s*(.*)$/i.exec(text.trim());
    if (bullet !== null) {
      entry.bullets.push(bullet);
    } else if (tech) {
      entry.tech = tech[1].split(",").map((t) => t.trim()).filter(Boolean);
    } else if (entry.meta.length === 0 && entry.bullets.length === 0 && entry.notes.length === 0) {
      entry.meta = text.trim().split(META_SEP).map((m) => m.trim()).filter(Boolean);
    } else {
      entry.notes.push(text.trim());
    }
  }
  if (intro.length) {
    warnings.push({ line: lines[0].line, message: "Text before the first ### entry is shown as an intro" });
  }
  return { entries, intro };
}

function parseGroups(lines) {
  const groups = [];
  for (const { text } of lines) {
    const bullet = bulletText(text);
    if (bullet === null) continue;
    // "**Languages:** Go, Python" or "**Languages**: Go, Python"
    const m = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/.exec(bullet);
    if (m) {
      groups.push({
        name: m[1].replace(/:$/, "").trim(),
        items: m[2].split(",").map((s) => s.trim()).filter(Boolean),
      });
    } else {
      groups.push({ name: null, items: bullet.split(",").map((s) => s.trim()).filter(Boolean) });
    }
  }
  return groups;
}

function parseItems(lines) {
  const items = [];
  for (const { text } of lines) {
    const bullet = bulletText(text);
    if (bullet === null) continue;
    const sep = bullet.indexOf(":");
    items.push(sep === -1
      ? { name: bullet, level: null }
      : { name: bullet.slice(0, sep).trim(), level: bullet.slice(sep + 1).trim() || null });
  }
  return items;
}

/**
 * Parse CV.md text.
 * @param {string} source - the file content
 * @returns {{cv: object, errors: {line:number,message:string}[], warnings: {line:number,message:string}[]}}
 */
export function parseCv(source) {
  const errors = [];
  const warnings = [];
  const text = String(source).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const all = text.split("\n").map((t, i) => ({ text: t, line: i + 1 }));
  const meta = {};
  const cv = { format: CV_FORMAT, meta, title: null, sections: [] };

  // --- Front matter
  let bodyStart = 0;
  if (all.length === 0 || all[0].text.trim() !== "---") {
    errors.push({ line: 1, message: "File must start with front matter (a line with ---)" });
  } else {
    const end = all.findIndex((l, i) => i > 0 && l.text.trim() === "---");
    if (end === -1) {
      errors.push({ line: 1, message: "Front matter is not closed (missing the second --- line)" });
      bodyStart = all.length;
    } else {
      for (const { text: t, line } of all.slice(1, end)) {
        if (t.trim() === "" || t.trim().startsWith("#")) continue;
        const m = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(t);
        if (!m) {
          errors.push({ line, message: `Front matter line must be "key: value": ${t.trim()}` });
          continue;
        }
        const key = m[1];
        if (!META_KEYS.includes(key)) {
          warnings.push({ line, message: `Unknown front matter key: ${key}` });
        }
        const value = unquote(m[2]);
        if (value !== "") meta[key] = value;
      }
      bodyStart = end + 1;
    }
  }
  // Only report a missing name when there is a front matter block to look in.
  const hasFrontMatter = all[0] && all[0].text.trim() === "---";
  if (hasFrontMatter && !meta.name) {
    errors.push({ line: 1, message: "Missing front matter key: name" });
  }

  // --- Body: optional "# Title", then "## Section" blocks.
  const body = all.slice(bodyStart);
  const blocks = [];
  let block = null;
  for (const l of body) {
    const h2 = /^##\s+(.*)$/.exec(l.text);
    if (h2 && !l.text.startsWith("###")) {
      block = { heading: h2[1].trim(), line: l.line, lines: [] };
      blocks.push(block);
      continue;
    }
    const h1 = /^#\s+(.*)$/.exec(l.text);
    if (h1 && !block && cv.title === null) {
      cv.title = h1[1].trim();
      continue;
    }
    if (block) block.lines.push(l);
  }

  // --- Sections, order and content
  let lastIndex = -1;
  let lastTitle = null;
  const seen = new Set();
  for (const b of blocks) {
    const known = SECTION_BY_NAME.get(normalizeHeading(b.heading));
    if (!known) {
      warnings.push({ line: b.line, message: `Unknown section: ${b.heading}` });
      cv.sections.push({ id: "unknown", title: b.heading, kind: "text", paragraphs: paragraphs(b.lines), line: b.line });
      continue;
    }
    if (seen.has(known.id)) {
      errors.push({ line: b.line, message: `Section "${b.heading}" appears twice` });
      continue;
    }
    seen.add(known.id);
    const index = SECTIONS.indexOf(known);
    if (index < lastIndex) {
      errors.push({
        line: b.line,
        message: `Section "${b.heading}" must come before "${lastTitle}". Expected order: ${SECTIONS.map((s) => s.en).join(", ")}`,
      });
    } else {
      lastIndex = index;
      lastTitle = b.heading;
    }
    const section = { id: known.id, title: b.heading, kind: known.kind, line: b.line };
    if (known.kind === "text") section.paragraphs = paragraphs(b.lines);
    if (known.kind === "entries") Object.assign(section, parseEntries(b.lines, warnings));
    if (known.kind === "groups") section.groups = parseGroups(b.lines);
    if (known.kind === "items") section.items = parseItems(b.lines);
    cv.sections.push(section);
  }

  // --- Placeholders anywhere in the file
  for (const { text: t, line } of all) {
    for (const m of t.matchAll(PLACEHOLDER)) {
      warnings.push({ line, message: `Placeholder to fill: ${m[0]}` });
    }
  }

  errors.sort((a, b) => a.line - b.line);
  warnings.sort((a, b) => a.line - b.line);
  return { cv, errors, warnings };
}

/** Format problems as "file:line: message" lines. */
export function formatProblems(file, errors, warnings) {
  const lines = [];
  for (const e of errors) lines.push(`error: ${file}:${e.line}: ${e.message}`);
  for (const w of warnings) lines.push(`warning: ${file}:${w.line}: ${w.message}`);
  return lines;
}
