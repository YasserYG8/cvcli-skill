## Context

The cvcli skill (Markdown instructions + `scripts/scan_repo.py`) writes a `CV.md` with a fixed format (`cvcli/templates/cv-full.md`: front matter + fixed `##` sections). Users want a terminal CV they can test and share. Constraints from the project: no API keys, no external services, simple for non-npm users, honest content. A real failure shaped this design: `npx github:YasserYG8/MySeve-CLI` fails because its `bin` points to a gitignored, build-generated `dist/`, and there is no `prepare` script. Packages run from GitHub must work from the committed files alone.

## Goals / Non-Goals

**Goals:**
- One CLI with three commands: `check`, `view`, `pack`.
- Generated packages that work, unchanged, at three levels: `npx ./folder`, `npx github:user/repo`, `npx name`.
- Zero runtime dependencies and no build step, for both the CLI and the generated package.
- The skill can run the CLI offline, without cvcli being published on npm.
- CI and a guide that make npm publishing optional and safe.

**Non-Goals:**
- AI chat, `/hire`-style forms, servers, API keys.
- PDF or HTML export.
- Publishing `cvcli` itself to npm (maintainer decision, later).
- A full YAML parser (the front matter is a flat `key: value` subset).

## Decisions

### 1. Location: `cvcli/cli/` inside the skill folder, plus a root `package.json`
The CLI code lives in `cvcli/cli/` (`bin/cvcli.js`, `lib/parse.js`, `lib/viewer.js`, `lib/pack.js`, `templates/`, `test/`). The skill runs it with `node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js`, so it works as soon as the skill is installed. A root `package.json` (name `cvcli`, `bin.cvcli` → `cvcli/cli/bin/cvcli.js`, `files` → `cvcli/cli`) makes `npx github:YasserYG8/cvcli-skill <cmd>` work today and allows `npm publish` from the root later.
- Alternative: a separate top-level `cli/` folder. Rejected: the installed skill would not contain it, so the skill would depend on an npm release.
- Alternative: a separate repo. Rejected: the CV.md format and the parser must change together.

### 2. Plain JavaScript ES modules, Node 18+, built-ins only
All files are `.js` ES modules (`"type": "module"`), using only `node:fs`, `node:path`, `node:readline`, `node:process`, `node:os`, `node:test`.
- Alternative: TypeScript. Rejected: needs a build, which is exactly what broke MySeve-CLI from GitHub.
- Alternative: Ink (React for terminals). Rejected: many MB of dependencies, so a slow first `npx` run; not needed for a read-only CV.

### 3. Parse once, ship JSON
`cvcli` parses CV.md into a CV object (`lib/parse.js`). `pack` writes it to `cv.json`. The generated package contains only `cv.json` and the viewer, never the parser.
- Why: the generated package stays one small file plus data; a parser bug cannot break a published CV; the viewer has one input format.
- The CV object: `{ meta: {name, title, ...}, sections: [{ id, title, kind, entries|groups|items|text }] }` with `id` in `summary | experience | projects | open-source | skills | education | languages | interests | unknown`.

### 4. One self-contained viewer file
`lib/viewer.js` exports `render(cv, options)` and, when run directly, loads `../cv.json` relative to its own path and starts. `pack` copies it byte-for-byte to `bin/cli.js` and adds the shebang. `cvcli view` imports the same file and passes the parsed object. One file, two uses, so the preview equals the published result.

### 5. Terminal handling with built-ins
Interactive mode: alternate screen buffer, hidden cursor, `readline.emitKeypressEvents` + `stdin.setRawMode(true)`, re-render on `resize`. Restore the terminal on quit, `SIGINT`, `SIGTERM` and uncaught errors. Non-interactive mode (`!stdout.isTTY` or `--print`): plain text, no escape codes. Colors are off when `NO_COLOR` is set. Text wrapping is done by a small word-wrap function with width = `min(columns || 80, 100)`.

### 6. Front matter subset
Front matter is parsed line by line as `key: value` (trimmed, optional quotes removed). Lists and nesting are not supported; a line that does not match is a validation error with its line number. This matches what the skill template writes.

### 7. Interactive choices with `readline/promises`
`pack` asks about each contact field (`y/N` for phone, `Y/n` for others) with `node:readline/promises`. When stdin is not a TTY, `pack` requires `--yes` (defaults) or explicit flags, and errors otherwise. This keeps the skill (which runs commands non-interactively) in control: it asks the user in chat, then passes flags.

### 8. Generated CI
- `check.yml`: on push/PR; matrix Node 18 and `lts/*`; steps: `npm pack --dry-run --json` → assert `bin/cli.js` and `cv.json` are listed; `node bin/cli.js --print`.
- `publish.yml`: on tags `v*`; job permissions `id-token: write`, `contents: read`; assert tag == `v${version}`; same checks; `npm publish --access public` with trusted publishing (OIDC). Exact Node/npm versions and flags are taken from the current npm trusted-publishing docs when the template is written.

### 9. Tests with `node:test`, plus a format-sync test
- Unit tests for the parser (fixtures: valid, missing name, wrong order, French, placeholders, unknown section).
- Viewer tests on `--print` output (no ANSI codes, width limits) and on `render()` for each section.
- Pack tests in a temp folder: files present, `package.json` has no deps/scripts, phone excluded by default, `--force` keeps the version, and `npx ./folder --print` / `node bin/cli.js --print` works (npm-dependent checks skip when npm is missing).
- A sync test that reads the `##` section names from `cvcli/templates/cv-full.md` and checks they equal the parser's known sections, so the skill template and the CLI cannot drift.
- The repo gets one workflow running both `pytest` and `node --test`.

## Risks / Trade-offs

- [`npx github:` needs git on the viewer's machine and is slower than npm] → Documented in the generated README; npm level stays available.
- [Raw-mode key handling differs between Windows terminals] → Test on Windows Terminal and PowerShell; `--print` always works as a fallback; arrows are optional (letter shortcuts are enough).
- [Published personal data is hard to remove from npm] → Phone off by default, explicit warning in `pack`, privacy section in PUBLISHING.md.
- [The CV.md format becomes a public contract] → Format-sync test; a `format` version may be added to front matter later if the format must change.
- [npm trusted publishing details change (first publish, required npm version)] → "Last reviewed" date in the PUBLISHING.md template; verify against docs during implementation.
- [The default package name may be taken on npm] → PUBLISHING.md step `npm view <name>`; `--name` flag; scoped names (`@user/cv`) mentioned as an option.
- [Hand-written front matter parser is less flexible than YAML] → Intentional: the skill writes the format; errors include line numbers.

## Migration Plan

New feature, nothing to migrate. Existing `CV.md` files written by the Full CV mode are already in the format. Rollback: remove `cvcli/cli/`, the root `package.json` and the skill's handoff step.

## Open Questions

- ~~Does npm trusted publishing still require a manual first publish, and which npm version does it need?~~ Checked 2026-11-18 (docs.npmjs.com/trusted-publishers): needs npm CLI 11.5.1+ and Node 22.14+ (so `publish.yml` uses Node 24); `id-token: write`; no token; provenance is automatic for public repos. The trusted publisher is configured in the package settings on npmjs.com, so the package must exist first: the **first publish is manual**. A new configuration expires if no publish succeeds within 2 days. The `repository` field in package.json **must exactly match** the GitHub repo, so `pack` got a `--repo <user/repo>` option and PUBLISHING.md has a step for it. Actions versions used: `actions/checkout@v6`, `actions/setup-node@v6`.
- Should `cvcli` itself be published to npm, and when? (Not needed for the skill or the GitHub level.)
- Should the generated package support version tags for old CVs (`npx github:user/repo#v1.0.0`)? It works by default with git tags; the guide could mention it.
