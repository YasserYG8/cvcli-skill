#!/usr/bin/env node
// cvcli: check, preview and pack an honest CV.md into a terminal CV.
// Built-ins only (Node.js 18+).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCv, formatProblems } from "../lib/parse.js";
import { runViewer, parseViewerArgs, LAYOUTS, ACCENTS } from "../lib/viewer.js";
import { pack, nextSteps, galleryChoiceMessage, selfCommand, quoteArg, PackError } from "../lib/pack.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERSION = JSON.parse(fs.readFileSync(path.join(HERE, "..", "package.json"), "utf8")).version;

const HELP = `cvcli ${VERSION}: check, preview and pack an honest CV.md into a terminal CV

Usage:
  cvcli check <CV.md>            Check the CV.md format (errors, placeholders)
  cvcli view  <CV.md> [options]  Show the CV in the terminal
  cvcli pack  <CV.md> [options]  Make a shareable package folder

View options:
  --print            print the whole CV once, as plain text
  --layout <name>    preview a layout: ${LAYOUTS.join(", ")}
  --accent <color>   preview an accent color: ${ACCENTS.join(", ")}
  --gallery          try every layout and accent, then print the pack command

Pack options:
  --name <name>      npm package name (default: <your-name>-cv)
  --out <folder>     output folder (default: ./<name>)
  --repo <user/repo> GitHub repo, needed later for npm publishing
  --yes              no questions: include all contact fields except the phone
  --include-phone    also include the phone number
  --layout <name>    default layout of the terminal CV (default: sidebar)
  --accent <color>   accent color (default: teal)
  --force            update an existing folder (keeps version, README.md, .git, look)

Keys in the viewer: letters jump to a section, arrows move and scroll,
t changes the layout, q quits.

Exit codes: 0 ok, 1 problems found, 2 file not found or bad usage.
`;

/** Split argv into positional args and --flags (with values for the known ones). */
function parseArgs(argv) {
  const takesValue = new Set(["--name", "--out", "--repo", "--width", "--layout", "--accent"]);
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [key, inline] = a.split("=", 2);
      if (takesValue.has(key)) flags[key] = inline !== undefined ? inline : argv[++i];
      else flags[key] = true;
    } else if (a === "-h") {
      flags["--help"] = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function readCvFile(file) {
  if (!file) {
    process.stderr.write("Missing file. Example: cvcli check CV.md\n");
    return null;
  }
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    process.stderr.write(err.code === "ENOENT" ? `File not found: ${file}\n` : `Cannot read ${file}: ${err.message}\n`);
    return null;
  }
}

function check(file) {
  const source = readCvFile(file);
  if (source === null) return 2;
  const { errors, warnings } = parseCv(source);
  const lines = formatProblems(file, errors, warnings);
  if (lines.length) process.stdout.write(lines.join("\n") + "\n");
  const summary = `${errors.length} error${errors.length === 1 ? "" : "s"}, ${warnings.length} warning${warnings.length === 1 ? "" : "s"}`;
  process.stdout.write(errors.length ? `${summary}. Fix the errors, then run check again.\n` : `OK: ${file} is valid (${summary}).\n`);
  return errors.length ? 1 : 0;
}

async function view(file, argv) {
  const source = readCvFile(file);
  if (source === null) return 2;
  const { cv, errors, warnings } = parseCv(source);
  if (errors.length) {
    process.stdout.write(formatProblems(file, errors, warnings).join("\n") + "\n");
    return 1;
  }
  // After a gallery choice: tell AI-assistant users what to say, then show the pack command.
  const onChoice = (choice) => process.stdout.write(galleryChoiceMessage(file, choice));
  return runViewer(cv, { ...parseViewerArgs(argv), onChoice });
}

async function packCommand(file, flags) {
  if (readCvFile(file) === null) return 2;
  try {
    const result = await pack(file, {
      name: flags["--name"],
      out: flags["--out"],
      repo: flags["--repo"],
      yes: Boolean(flags["--yes"]),
      includePhone: Boolean(flags["--include-phone"]),
      force: Boolean(flags["--force"]),
      layout: flags["--layout"] === true ? "" : flags["--layout"],
      accent: flags["--accent"] === true ? "" : flags["--accent"],
    });
    if (result.warnings.length) {
      process.stdout.write(formatProblems(file, [], result.warnings).join("\n") + "\n");
    }
    process.stdout.write(`Contact fields included: ${result.contacts.join(", ") || "none"}\n`);
    process.stdout.write(`Look: ${result.display.layout} layout, ${result.display.accent} accent (try others: ${selfCommand()} view ${quoteArg(file)} --gallery)\n\n`);
    process.stdout.write(nextSteps(result) + "\n");
    return 0;
  } catch (err) {
    if (err instanceof PackError) {
      process.stderr.write(err.message + "\n");
      return 1;
    }
    throw err;
  }
}

async function main(argv) {
  const { positional, flags } = parseArgs(argv);
  const [command, file] = positional;
  if (flags["--version"]) {
    process.stdout.write(VERSION + "\n");
    return 0;
  }
  if (!command || flags["--help"] || command === "help") {
    process.stdout.write(HELP);
    return command || flags["--help"] ? 0 : 2;
  }
  if (command === "check") return check(file);
  if (command === "view") return view(file, argv);
  if (command === "pack") return packCommand(file, flags);
  process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => { process.exitCode = code; },
  (err) => {
    process.stderr.write(`${err.stack || err}\n`);
    process.exitCode = 1;
  },
);
