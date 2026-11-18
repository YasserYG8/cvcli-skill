// `cvcli pack`: turn a CV.md into a standalone, zero-dependency package folder
// that works with `npx ./folder`, `npx github:user/repo` and `npx <name>`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { parseCv, formatProblems, CONTACT_KEYS } from "./parse.js";
import { LAYOUTS, ACCENTS, DEFAULT_LAYOUT, DEFAULT_ACCENT, displayArgError } from "./viewer.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.join(HERE, "..", "templates");
const VIEWER = path.join(HERE, "viewer.js");

// npm limit for package names.
const MAX_NAME_LENGTH = 214;
export const CVCLI_URL = "https://github.com/YasserYG8/cvcli-skill";

/** "Zoé Ünal" -> "zoe-unal-cv". Returns "" if nothing usable is left. */
export function defaultPackageName(fullName) {
  const slug = String(fullName || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `${slug}-cv` : "";
}

/** Returns null when valid, or a message naming the npm rule that failed. */
export function validatePackageName(name) {
  if (!name) return "Package name is empty";
  if (name.length > MAX_NAME_LENGTH) return `Package name must be at most ${MAX_NAME_LENGTH} characters`;
  if (/\s/.test(name)) return "Package name must not contain spaces";
  if (name !== name.toLowerCase()) return "Package name must be lowercase";
  if (/^[._]/.test(name)) return "Package name must not start with . or _";
  if (!/^(?:@[a-z0-9~-][a-z0-9._~-]*\/)?[a-z0-9~-][a-z0-9._~-]*$/.test(name)) {
    return "Package name may only use a-z, 0-9, - . _ ~ (and an optional @scope/ prefix)";
  }
  return null;
}

/** "user/repo" or a GitHub URL -> "user/repo"; null if not recognised. */
export function normalizeRepo(repo) {
  if (!repo) return null;
  const m = /^(?:https?:\/\/github\.com\/|git\+https:\/\/github\.com\/|github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(repo.trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

function fill(template, values) {
  return template.replace(/%%([A-Z_]+)%%/g, (all, key) => (key in values ? values[key] : all));
}

function readTemplate(file) {
  return fs.readFileSync(path.join(TEMPLATES, file), "utf8");
}

function isNonEmptyDir(dir) {
  try {
    return fs.readdirSync(dir).length > 0;
  } catch {
    return false;
  }
}

/** Decide which contact fields go into cv.json. */
async function chooseContacts(meta, opts, io) {
  const present = CONTACT_KEYS.filter((k) => meta[k]);
  if (opts.yes) {
    return present.filter((k) => k !== "phone" || opts.includePhone);
  }
  if (!io.stdin.isTTY) {
    throw new PackError("pack needs your answers about contact fields. Run it in a terminal, or pass --yes (add --include-phone to include the phone).");
  }
  const rl = createInterface({ input: io.stdin, output: io.stdout });
  try {
    const chosen = [];
    for (const key of present) {
      const defaultYes = key !== "phone" || opts.includePhone;
      const hint = defaultYes ? "[Y/n]" : "[y/N]";
      const answer = (await rl.question(`Include ${key} (${meta[key]})? ${hint} `)).trim().toLowerCase();
      const yes = answer === "" ? defaultYes : answer.startsWith("y");
      if (yes) chosen.push(key);
    }
    return chosen;
  } finally {
    rl.close();
  }
}

export class PackError extends Error {}

/**
 * Create (or update with force) the package folder.
 * @param {string} file - path to CV.md
 * @param {{name?:string,out?:string,repo?:string,yes?:boolean,includePhone?:boolean,force?:boolean,layout?:string,accent?:string}} opts
 * @returns {Promise<{dir:string,name:string,binName:string,contacts:string[]}>}
 */
export async function pack(file, opts = {}, io = { stdin: process.stdin, stdout: process.stdout }) {
  const lookError = displayArgError({ layout: opts.layout, accent: opts.accent });
  if (lookError) throw new PackError(lookError);
  const source = fs.readFileSync(file, "utf8");
  const { cv, errors, warnings } = parseCv(source);
  if (errors.length) {
    throw new PackError(["Fix these problems first:", ...formatProblems(file, errors, warnings)].join("\n"));
  }

  const name = opts.name || defaultPackageName(cv.meta.name);
  if (!name) throw new PackError("Could not make a package name from the CV name. Pass --name <package-name>.");
  const nameError = validatePackageName(name);
  if (nameError) throw new PackError(`Invalid package name "${name}": ${nameError}`);
  const repo = opts.repo ? normalizeRepo(opts.repo) : null;
  if (opts.repo && !repo) throw new PackError(`--repo must look like user/repo, got "${opts.repo}"`);

  const binName = name.split("/").pop();
  const dir = path.resolve(opts.out || binName);
  const exists = isNonEmptyDir(dir);
  if (exists && !opts.force) {
    throw new PackError(`Folder ${dir} already exists and is not empty.\nTo update it, run pack again with --force (it keeps your version, README.md and .git).`);
  }

  io.stdout.write("Note: this package is public once you push it to GitHub or publish it on npm.\n");
  const contacts = await chooseContacts(cv.meta, opts, io);

  // Remove contact fields the user did not choose.
  const meta = { ...cv.meta };
  for (const key of CONTACT_KEYS) if (!contacts.includes(key)) delete meta[key];

  // The look: flags first, then (with --force) the existing cv.json, then the defaults.
  let oldDisplay = {};
  if (exists) {
    try { oldDisplay = JSON.parse(fs.readFileSync(path.join(dir, "cv.json"), "utf8")).display || {}; } catch { /* new */ }
  }
  const display = {
    layout: opts.layout || (LAYOUTS.includes(oldDisplay.layout) ? oldDisplay.layout : DEFAULT_LAYOUT),
    accent: opts.accent || (ACCENTS.includes(oldDisplay.accent) ? oldDisplay.accent : DEFAULT_ACCENT),
  };
  const data = { ...cv, meta, display };

  // Keep the version (and other fields the user added) when updating.
  let oldPkg = {};
  if (exists) {
    try { oldPkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")); } catch { /* new */ }
  }
  const pkg = {
    name,
    version: oldPkg.version || "1.0.0",
    description: `${cv.meta.name}: CV in the terminal`,
    type: "module",
    bin: { [binName]: "bin/cli.js" },
    files: ["bin/", "cv.json"],
    engines: { node: ">=18" },
    keywords: ["cv", "resume", "terminal", "cvcli"],
  };
  const repoUrl = repo || normalizeRepo(oldPkg.repository && (oldPkg.repository.url || oldPkg.repository));
  if (repoUrl) pkg.repository = { type: "git", url: `git+https://github.com/${repoUrl}.git` };

  const values = {
    NAME: name,
    BIN: binName,
    FOLDER: path.basename(dir),
    DISPLAY_NAME: cv.meta.name,
    REPO: repoUrl || `<user>/${binName}`,
    REPO_NOTE: repoUrl ? "" : "\n(Replace `<user>` with the GitHub user that hosts this repo.)\n",
    CVCLI_URL,
  };

  fs.mkdirSync(path.join(dir, "bin"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "cv.json"), JSON.stringify(data, null, 2) + "\n");
  const cliFile = path.join(dir, "bin", "cli.js");
  fs.copyFileSync(VIEWER, cliFile);
  try { fs.chmodSync(cliFile, 0o755); } catch { /* not needed on Windows */ }
  fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n*.tgz\n");
  fs.writeFileSync(path.join(dir, ".github", "workflows", "check.yml"), readTemplate("check.yml"));
  fs.writeFileSync(path.join(dir, ".github", "workflows", "publish.yml"), readTemplate("publish.yml"));
  fs.writeFileSync(path.join(dir, "PUBLISHING.md"), fill(readTemplate("PUBLISHING.md"), values));
  const readme = path.join(dir, "README.md");
  if (!fs.existsSync(readme)) fs.writeFileSync(readme, fill(readTemplate("README.md"), values));

  return { dir, name, binName, contacts, warnings, display };
}

/** Quote a command argument when a shell (PowerShell, bash) would split or change it. */
export function quoteArg(s) {
  return /[\s"'&|<>()$`;]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

/**
 * How the user started cvcli, so the commands we print can be copied and pasted:
 * "npx github:<repo>" under npx, "cvcli" for an installed package, else "node <path>/cvcli.js".
 */
export function selfCommand({ argv1 = process.argv[1] || "", cwd = process.cwd(), env = process.env } = {}) {
  const slashes = argv1.replace(/\\/g, "/");
  if (env.npm_command === "exec" || slashes.includes("/_npx/")) {
    return `npx github:${CVCLI_URL.replace("https://github.com/", "")}`;
  }
  if (slashes.includes("/node_modules/")) return "cvcli";
  const rel = path.relative(cwd, argv1);
  const shown = rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? rel : argv1;
  return `node ${quoteArg(shown.replace(/\\/g, "/"))}`;
}

/** The pack command that keeps a look chosen in the gallery. */
export function packCommandFor(file, { layout, accent }, self = selfCommand()) {
  return `${self} pack ${quoteArg(file)} --layout ${layout} --accent ${accent}`;
}

/** The "what next" text printed after a successful pack. */
export function nextSteps({ dir, name }, cwd = process.cwd()) {
  let local = path.relative(cwd, dir).split(path.sep).join("/");
  if (!local.startsWith(".")) local = `./${local}`;
  return [
    `Created ${local}/ (package ${name})`,
    "",
    `1. Test it now:      npx ${local}`,
    `2. Share on GitHub:  push the folder to a repo, then anyone runs: npx github:<your-user>/<your-repo>`,
    `3. Publish on npm:   follow ${local}/PUBLISHING.md, then anyone runs: npx ${name}`,
  ].join("\n");
}
