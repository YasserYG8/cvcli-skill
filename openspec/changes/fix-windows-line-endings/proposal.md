## Why

On Windows with `core.autocrlf=true` (the Git for Windows default), Git checks files out with CRLF line endings. `cvcli pack` copies the viewer and templates from disk, so the generated CV package gets CRLF files. The worst case is `bin/cli.js`: its first line becomes `#!/usr/bin/env node\r`, and running it directly on Linux or macOS fails with `env: 'node\r': No such file or directory`. npm repairs the shebang when it installs the package, but the package is still not clean. The same problem makes 2 of the 79 CLI tests fail on Windows. CI runs on Linux, so it never showed this.

## What Changes

- Add a root `.gitattributes` with `* text=auto eol=lf`, plus `binary` rules for common binary files (pdf, png, gif, jpg, jpeg, ico, webp). Every checkout then has LF endings, on Windows too.
- `cvcli pack` writes every text file it creates with LF line endings, whatever the endings of the source files: `bin/cli.js`, `README.md`, `PUBLISHING.md`, the two workflows, `.gitignore`, `package.json` and `cv.json`. This protects users who copy the skill folder without Git, or who edit it in an editor that saves CRLF.
- The generated package gets its own `.gitattributes` (`* text=auto eol=lf`), so it stays LF when the user commits and clones it on Windows. Like `README.md`, it is only written when it does not exist yet, so `--force` keeps a user's own version.
- Tests: the 2 failing pack tests work with both line endings, and a new test checks that no file written by pack contains `\r`.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `cv-package-generator`: the Pack command also creates `.gitattributes`, and every file that pack writes uses LF line endings. The generated-package requirement adds that `bin/cli.js` starts with `#!/usr/bin/env node` followed directly by LF.

## Impact

- New file: `.gitattributes` (repo root). The Git index already stores LF, so no other tracked file changes in the commit. Each existing Windows clone needs a one-time refresh of its working tree.
- Code: `cvcli/cli/lib/pack.js` (LF normalization, `.gitattributes` output).
- Tests: `cvcli/cli/test/pack.test.js`.
- Docs: the README file list for the generated package, if it lists the files.
- No new dependencies. No change for users on Linux or macOS.
