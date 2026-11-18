## Context

Git for Windows ships with `core.autocrlf=true`. On checkout it turns LF into CRLF in the working tree, and on commit it turns CRLF back into LF. In this repo the Git index has LF for all 82 tracked files, but 70 of them have CRLF on a Windows disk.

`pack.js` builds the generated package from files on disk:

```
  viewer.js ──copyFileSync──▶ bin/cli.js        (CRLF copied as is)
  templates/*.yml, *.md ──readFileSync + fill──▶ workflows, README, PUBLISHING  (CRLF kept)
  JSON.stringify(...) ──▶ package.json, cv.json  (always LF ✓)
  string literal ──▶ .gitignore                  (always LF ✓)
```

`parse.js` already handles CRLF in CV.md, so `cv.json` is clean today.

## Goals / Non-Goals

**Goals:**
- A package generated on Windows is the same as one generated on Linux, byte for byte, apart from the CV data.
- Checkouts of this repo have LF endings on every system.
- `npm test` passes on Windows.

**Non-Goals:**
- Changing `check.yml` in the generated package to look for CR characters.
- Handling `.bat` or `.cmd` files (none exist).
- Normalizing the user's own `README.md`. Pack does not write it on `--force`, so pack does not touch it.

## Decisions

**1. Fix it in both places: `.gitattributes` and pack.**
`.gitattributes` only helps people who clone with Git. The skill is also copied as a folder, downloaded as a ZIP, or edited on Windows, so pack must not depend on the checkout. Normalizing in pack alone would leave the tests and the repo checkout on CRLF. Both together are cheap.
- Alternative: only `.gitattributes`. Rejected, because pack still breaks when the source files have CRLF for any other reason.
- Alternative: ask users to set `core.autocrlf=false`. Rejected, because it is a personal setting that we cannot enforce.

**2. One helper that writes text with LF: `writeText(file, content)`.**
It replaces `\r\n` with `\n`, removes any other `\r`, and then writes the file. Every text output goes through it, including `bin/cli.js`. `copyFileSync` for the viewer becomes read + `writeText`, then `chmod`. One function keeps the rule in one place, and new outputs follow it by default.
- Alternative: normalize in `readTemplate` only. Rejected, because the viewer copy does not use `readTemplate`, and a later new output could miss the rule.
- Changing line endings in `viewer.js` is safe. JavaScript treats CRLF and LF the same in code, and template literals already turn CRLF into LF.

**3. `.gitattributes` in the generated package is written only when missing.**
This follows the same rule as `README.md`: it is a file that users may want to change. `.gitignore` keeps its current behavior (always written).

**4. Root `.gitattributes` content.**
```
* text=auto eol=lf
*.pdf  binary
*.png  binary
*.gif  binary
*.jpg  binary
*.jpeg binary
*.ico  binary
*.webp binary
```
The binary rules matter for files like `docs/demo.gif` (planned) and the CV PDFs users drop into the folder. Git usually detects binary files, but an explicit rule is safer.

**5. Tests do not depend on the checkout.**
The `--force` test changes the title with a regex that accepts both endings (`/Junior DevOps Engineer\r?\n/`). The workflow test normalizes the file before matching. A new test copies the sample CV with CRLF endings, runs pack, and checks every generated file for `\r`. That test also proves Decision 2 on Linux CI, where the checkout is LF. To cover CRLF templates and viewer source on Linux too, the helper is exported and tested directly with CRLF input.

## Risks / Trade-offs

- [Existing Windows clones keep CRLF files until a refresh] → The Migration Plan below has the one-time commands.
- [A user's editor shows LF files differently] → Modern Windows editors (VS Code, Notepad since 2018) handle LF.
- [A future binary type is missing from `.gitattributes`] → `text=auto` still detects binary content. The explicit list is only extra safety.

## Migration Plan

1. Commit `.gitattributes`. The commit adds only that file, because the index is already LF (`git add --renormalize .` shows no other changes).
2. Refresh the working tree once on Windows: `git rm --cached -r -q . && git reset --hard` (only with a clean working tree), or simply clone again.
3. Rollback: delete `.gitattributes` and revert the pack change. No data migrations.

## Open Questions

(none)
