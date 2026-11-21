## Context

`scripts/scan_repo.py` builds its file list with `walk_repo()`: an `os.walk` that prunes folders by name (`SKIP_DIRS`, hidden folders except `KEEP_HIDDEN_DIRS`). The same list feeds `languages`, `manifests`, `infra` and `tests`. Git is used only in `scan_git()`, for history. So a folder that `.gitignore` ignores, like a packed terminal CV, is counted as the user's code.

The packed CV is a known shape. `cvcli/cli/lib/pack.js` always writes `package.json` with `"keywords": ["cv", "resume", "terminal", "cvcli"]`, plus `cv.json` and `bin/cli.js`. `references/style.md` already finds packages by the three files.

The other two fixes are text only: `SKILL.md` and `references/full-cv.md`.

## Goals / Non-Goals

**Goals:**
- Count only code the user's repo really holds: no git-ignored files, no packed CVs.
- Keep today's results for folders without git and for repos with nothing ignored.
- Say in the JSON what was skipped, so the agent can tell the user.
- Questions about found facts show the found value.
- Scan JSON never lands in user folders.

**Non-Goals:**
- No change to git history numbers (`git.*`). Git history already ignores untracked files.
- No new command-line flags for the scanner (for example `--include-ignored`).
- No special handling of git submodules (see Risks).
- No change to the log ideas that `SKILL.md` already covers (say which default was used, "Co-developed with X").

## Decisions

### 1. Filter the walk with `git ls-files`, do not replace it

Keep `walk_repo()` as it is, then keep only files that are also in the output of `git ls-files -z --cached --others --exclude-standard`, run in the scanned folder.

- `--cached`: tracked files, even if a rule matches them later.
- `--others --exclude-standard`: new files that are not ignored, so uncommitted work counts.
- `-z`: no quoting of special characters, safe split on `\0`.
- Run in the scanned folder: git prints paths relative to that folder and lists only files under it. So scanning a subfolder of a bigger repo works.

The walk's skip rules still apply. A repo that commits `node_modules/` by mistake still does not count it.

*Alternative: use only `git ls-files` as the file list.* Rejected: it would lose the existing skip rules and need a second code path. Filtering one list is smaller and keeps the current tests valid.

*Alternative: call `git check-ignore` per folder during the walk.* Rejected: many git calls, slower on big repos, and it does not handle "tracked but matched by a rule".

### 2. Fallback is silent outside git, loud inside git

- Not a git work tree, or git missing → use the walk as today, `ignored_by_git: null`, no new error (scan_git already reports a missing git).
- Inside a git work tree but `git ls-files` fails or times out → use the walk, `ignored_by_git: null`, add one line to `errors`.

The check uses the same `git rev-parse --is-inside-work-tree` call that `scan_git()` uses, through `run_git()`.

- The scanned folder is itself ignored by its repo (for example the user scans `MyCv/` or a packed CV folder that the project ignores) → `git check-ignore -q .` exits 0, so treat it like a folder without git. Otherwise `git ls-files` would list nothing, and the scan would count zero files. Found while building (tested with git 2.47: exit 0 inside an ignored folder, 1 elsewhere, also at the repo root).

### 3. Detect a packed CV during the walk

While pruning `dirnames` in `walk_repo()`, skip a subfolder when it has `package.json`, `cv.json` and `bin/cli.js`, and `package.json` parses as a JSON object whose `keywords` contains `"cvcli"`. Record its repo-relative path. The scanned root itself is never skipped, so a user can scan their own CV repo.

The keyword check avoids false positives: a normal Node project could have a `cv.json` (for example computer vision data) and a `bin/cli.js`. Only cvcli writes the `cvcli` keyword.

*Alternative: only rely on `.gitignore`.* Rejected: `share.md` lets the user keep the package folder un-ignored, and then the git rule would not catch it.

### 4. Output shape

Add a top-level `skipped` object: `{"ignored_by_git": <int or null>, "cv_packages": [<paths>]}`. Bump `SCANNER_VERSION` to `0.2.0`, because the JSON shape changed. `walk_repo()` returns the CV package list next to the files (or fills a list passed in), so `scan()` can put it in `skipped`.

### 5. Skill text: one general rule, not a phone rule

Add a rule to "How to talk to the user" in `SKILL.md`: when you ask about a fact you found, show the value and its source. It applies to every workflow (phone, address, dates, old job titles). In `references/full-cv.md` step 4, change the contact details line to use it, with the phone example and default "no".

Add the temp folder rule under "Scan a repo" in `SKILL.md`. Add skipped CV packages to the Flags line of the project fact sheet.

*Alternative: a phone-only sentence.* Rejected: the same confusion can happen with any found fact.

## Risks / Trade-offs

- [Code that the user ignores by mistake disappears from the counts] → `skipped.ignored_by_git` gives the number, and the agent can mention it when it is large. The files are not lost, only not counted.
- [Git submodules: `git ls-files` lists a submodule as one entry, so its files are dropped and counted in `ignored_by_git`] → Accepted. Submodule code is usually someone else's code, so leaving it out is closer to honest. The count may look a bit high in repos with submodules.
- [Big untracked folders make `git ls-files --others` slow] → `run_git()` already has a 60 s timeout. On timeout, fall back to the walk and report it in `errors`.
- [Unicode file names may differ between git and `os.walk` (macOS NFD)] → Compare paths after `unicodedata.normalize("NFC", ...)` on both sides.
- [Results change for some repos] → Version bump to `0.2.0`. Only `languages`, `manifests`, `infra` and `tests` can go down; history stays the same.

## Migration Plan

No data to migrate. The scanner runs fresh every time. Rollback is a revert of the commit.

## Open Questions

- Should the fact sheet mention `ignored_by_git` when it is large (for example over 50 files)? Default for now: no, only CV packages are named.
