# Contributing to cvcli

Thanks for helping. Small, focused pull requests are easiest to review.

## Setup

```bash
git clone https://github.com/YasserYG8/cvcli-skill.git
cd cvcli-skill
pip install pytest
python -m pytest -q   # scanner (Python 3.9+)
npm test              # terminal CV CLI (Node.js 18+)
```

To try your changes in Claude Code, copy (or symlink) `cvcli/` into `~/.claude/skills/cvcli`. Claude Code picks up edits without a restart.

## Add a platform (e.g. dev.to, GitHub profile, Mastodon)

1. Create `cvcli/references/<platform>.md`. Follow the shape of `references/x.md`:
   - `Last reviewed: YYYY-MM-DD` line at the top (platforms change; this tells users how fresh the rules are).
   - Rules: hook, length, links, media, hashtags.
   - An **Output format** block.
   - One short example that uses only real or `[metric?]` facts.
2. Add one row to the "Generate" table in `cvcli/SKILL.md`.
3. If you add a platform name to the trigger words, update the `description` in the SKILL.md frontmatter. Keep it under 1024 characters.

## Add a CV language

1. Add an action-verb list to `cvcli/references/cv-rules.md`.
2. Add banned phrases for that language to `cvcli/references/style-guide.md`.
3. Add a block in that language to `cvcli/templates/cv-section.md`.
4. Mention the language in `SKILL.md` (Generate → Language).

## Improve the scanner

- Standard library only. Python 3.9+ syntax (no `match`, no `X | Y` type hints).
- The scanner must never crash. A failing section returns `null` and adds a message to `errors`.
- Add a test in `tests/test_scan_repo.py` for every new detection rule.
- Keep values explained: no magic numbers without a comment.

## Improve the terminal CV CLI (`cvcli/cli/`)

- **Zero dependencies, no build step.** Only Node.js built-in modules (`node:fs`, `node:readline`...), plain JavaScript ES modules, Node 18+ APIs only. This is what makes `npx github:...` work: npx runs the files in git, so nothing may depend on a build output or on `node_modules`.
- `lib/viewer.js` is copied unchanged into every generated package as `bin/cli.js`. It must stay one self-contained file (no imports from other `lib/` files).
- The CV.md format is a contract. If you change a section name in `cvcli/templates/cv-full.md`, change `SECTIONS` in `lib/parse.js` too; a test checks that they match.
- Add a `node:test` test in `cvcli/cli/test/` for every new behavior.

## Honesty rules for contributions

Examples in references, templates and `examples/` must follow the same rules as the skill:
- No invented numbers. Use `[metric?]`.
- No banned phrases from `style-guide.md`.

## Before you open a PR

- `python -m pytest -q` and `npm test` pass.
- `SKILL.md` stays short (well under 500 lines). Put details in `references/`.
- Paths use forward slashes.
