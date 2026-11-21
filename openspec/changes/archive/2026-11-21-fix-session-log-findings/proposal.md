## Why

A real run of the skill on 2026-11-19 (written up in `SESSION-LOG.md`) found three problems that still exist in the code. (1) The scanner counted a packed terminal CV (`yasser-gombra-cv/`) as the user's own code: its `bin/cli.js` raised the JavaScript lines from 2,593 to 4,563, and its `package.json` showed up as a manifest. A CV built on those numbers is not honest. (2) The question "Show your phone number?" made the user think the phone was not found, although the old CV had it. (3) The scan JSON can end up saved in the user's folders, because nothing tells the agent where to save it.

The log listed two more ideas: say which default was used, and add a "Co-developed with X" rule for repo owners. `SKILL.md` already covers both (rule 2 of "How to talk to the user" and honesty rule 3), so this change leaves them alone.

## What Changes

- **Scanner skips files that git ignores.** In a git repo, the scanner counts only tracked files and new, untracked files that `.gitignore` does not ignore. Outside a git repo, or when git is missing, it scans the same files as today.
- **Scanner skips packed terminal CVs.** A folder with `package.json`, `cv.json` and `bin/cli.js`, whose `package.json` has the `cvcli` keyword, is skipped completely, even if git tracks it.
- **Scanner says what it skipped.** A new `skipped` field gives the number of files left out because git ignores them, and the paths of skipped CV packages. Scanner version goes to `0.2.0`.
- **Show the value you found.** When the skill asks about a fact it found in a source (phone, address, a date), the question shows that value and where it came from. Example: "Your PDF has the phone +216 …. Show it on the CV? (default: no)".
- **Scan output goes to a temp folder.** If the agent saves the scan JSON to a file, it uses the system temp folder, never the user's project or CV folder.

## Capabilities

### New Capabilities

- `repo-scanner`: which files `scripts/scan_repo.py` counts and which it skips (dependency and cache folders, git-ignored files, packed terminal CVs), and how it reports what it skipped.
- `skill-questions`: how the skill asks about facts it found in the user's sources, and where it keeps scan output.

### Modified Capabilities

(none)

## Impact

- Code: `cvcli/scripts/scan_repo.py` (file list, CV package check, `skipped` field, version).
- Tests: `tests/test_scan_repo.py` (git-ignored files, untracked files, CV package tracked or ignored, folder without git, the `skipped` field).
- Skill text: `cvcli/SKILL.md` ("Scan a repo": temp folder rule; fact sheet can mention skipped CV packages), `cvcli/references/full-cv.md` (step 4: show the found value when asking about contact details and other found facts).
- Results change for repos that have git-ignored files with code in them. Language line counts and manifests can go down. Git history numbers do not change.
- Git submodules: the scanner no longer counts code inside submodules, because `git ls-files` lists a submodule as one entry. See design.md.
