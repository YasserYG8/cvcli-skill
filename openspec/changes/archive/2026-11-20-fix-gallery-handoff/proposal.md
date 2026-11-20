## Why

A real test on 2026-11-19 left two identical CV packages: `MyCv/yasser-gombra-cv/` and `./yasser-gombra-cv/` in the repo root. Two messages disagreed. The skill (`references/style.md`) said "try the looks, then tell me what you picked". The gallery said "To keep it, run: `cvcli pack MyCv/CV.md --layout manpage --accent green`". A second copy then appeared in the repo root, made outside Claude Code. The exact command is not proven (see design.md), but the gallery's command is the most likely cause: it has no `--out`, and `pack` puts the folder in the **current** folder. The skill's share workflow says the default is **next to CV.md**, so the CLI and the skill also disagree about the folder. Duplicates like this confuse users, and they can leak personal data into a repo.

## What Changes

- **Gallery message.** After Enter, the gallery says the choice, tells AI-assistant users to just tell their assistant (`"manpage, green"`), and then gives the pack command for people who type commands themselves. `q` still prints nothing.
- **BREAKING: default output folder of `pack`.** Without `--out`, the package folder goes **next to CV.md** (`<folder of CV.md>/<name>`) instead of the current folder. When CV.md is in the current folder, nothing changes. `--out` still wins.
- **No silent duplicate.** When `--out` is not given, the new default folder does not exist yet, and the current folder already has a cvcli package with the same name and the same CV owner (from the old default), `pack` stops with exit code 1. Its message names both paths and says how to continue: pass `--out <old folder>` to update it, or move it.
- **Skill text.** `references/style.md` tells the user that they only need to tell the AI their choice, and that they don't need to run the command the gallery prints.
- **Docs and tests.** The README shows the new default. The pack tests stop writing into the test fixtures folder, and new tests cover the default, `--out`, the duplicate guard and the gallery message.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cv-layouts`: the "Gallery mode" requirement. Enter prints the choice, a line for AI-assistant users, and then the pack command.
- `cv-package-generator`: the "Safe output folder" requirement. The default folder is next to CV.md, `--out` wins, and pack refuses to create a second copy when an old-default package exists in the current folder.

## Impact

- Code: `cvcli/cli/lib/pack.js` (default folder, duplicate guard), `cvcli/cli/bin/cvcli.js` (gallery `onChoice` message).
- Tests: `cvcli/cli/test/pack.test.js` (23 tests pack the fixture CV from a temp folder and must copy it there first), `cvcli/cli/test/layouts.test.js` or a new CLI test for the message.
- Skill: `cvcli/references/style.md` (step 3). `references/share.md` already says "next to CV.md", and now the CLI matches it.
- Docs: `README.md` (Terminal CV section).
- Users who run `pack <path>/CV.md --force` from another folder, to update an old package in the current folder, now get the duplicate-guard message and must add `--out`. The agent's skill always passes `--out`, so the skill flows don't change.
