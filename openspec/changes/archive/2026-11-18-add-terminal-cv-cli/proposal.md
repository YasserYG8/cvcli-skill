## Why

The cvcli skill now writes an honest `CV.md`, but a Markdown file is not something people can "run" or share easily. Developers want a terminal CV (`npx <their-name>`), like MySeve-CLI, but publishing to npm is too hard for most users, and packages that need a build step break silently when run from GitHub (`npx github:YasserYG8/MySeve-CLI` fails with `yassergombra: not found` because `dist/` is gitignored).

## What Changes

- New Node.js CLI `cvcli` inside the skill folder (`cvcli/cli/`), plain JavaScript, Node 18+, **zero runtime dependencies**, no build step. The skill runs it locally; a root `package.json` also makes `npx github:YasserYG8/cvcli-skill <command>` work without npm.
- `npx cvcli view <CV.md>`: renders any CV.md in the terminal (sections, colors, key shortcuts) so the user can preview it.
- `npx cvcli check <CV.md>`: validates the CV.md format (front matter keys, section names and order) and prints clear errors.
- `npx cvcli pack <CV.md>`: creates a standalone, ready-to-share package folder (e.g. `./yassergombra-cv/`) containing `package.json`, `cv.json`, a copy of the viewer, CI workflows, `README.md` and `PUBLISHING.md`. It asks which contact fields to include (phone excluded by default).
- Three sharing levels, all from the same generated folder:
  1. Local test: `npx ./yassergombra-cv` (the main path)
  2. GitHub only: `npx github:<user>/<repo>` (no npm account)
  3. npm: `npx <name>` (optional, guided by `PUBLISHING.md` and a publish workflow)
- Generated CI: `check.yml` (on push: the package contains `bin/cli.js` and the viewer runs) and `publish.yml` (on a version tag: publish to npm).
- Skill update: at the end of the Full CV workflow, cvcli offers to create the terminal version and run the local test for the user.
- Non-goals: no AI chat, no API keys, no servers, no PDF/HTML export in this change.

## Capabilities

### New Capabilities
- `cv-md-format`: the CV.md contract (front matter keys, section names and order, English and French section names) and its parser and validator (`cvcli check`).
- `terminal-cv-viewer`: rendering a parsed CV in the terminal, interactive and non-interactive modes (`cvcli view` and the generated package's `bin/cli.js`).
- `cv-package-generator`: `cvcli pack`, which turns a CV.md into a standalone zero-dependency package folder that works locally, from GitHub and from npm.
- `cv-package-ci`: the GitHub Actions workflows and the `PUBLISHING.md` guide included in every generated package.
- `skill-terminal-handoff`: the skill's offer, after writing CV.md, to create and test the terminal CV.

### Modified Capabilities
<!-- None: no specs exist yet in openspec/specs/. -->

## Impact

- New folder `cvcli/cli/` (`bin/cvcli.js`, `lib/` parser, viewer and pack, `templates/` for the generated package, tests with `node:test`) and a new root `package.json` (name `cvcli`, bin → `cvcli/cli/bin/cvcli.js`).
- Requirements change: Node.js 18+ is now needed for the terminal CV (the CV.md mode still needs only Python and git).
- `cvcli/templates/cv-full.md`: becomes the reference for the parser; any change to section names is now a breaking format change.
- `cvcli/SKILL.md` and `cvcli/references/full-cv.md`: new final step (terminal CV offer).
- CI for this repo: a workflow that runs both the Python and the Node tests.
- npm: the name `cvcli` is free today (checked 2026-11-18); publishing `cvcli` itself is a later decision for the maintainer.
- Privacy: generated packages are public once pushed or published, so contact fields must be chosen explicitly.
