## Context

What happened in the test on 2026-11-19 (times in UTC). Lines marked *record* come from the Claude Code session file (`~/.claude/projects/<project>/<session>.jsonl`). The 00:03:29 line comes only from the folder's file date, because commands typed in the user's own terminal are not recorded:

```
00:00:29  agent (style.md), record: "Open a separate terminal and run: ... view MyCv/CV.md --gallery"
00:03:29  ./yasser-gombra-cv/ appears in the repo root     (file date; in no session record)
00:04:57  agent (share.md), record: pack MyCv/CV.md --out MyCv/yasser-gombra-cv    →  second copy
```

The cause of the 00:03:29 folder is **not proven**. The user remembers running only `npx ./MyCv/yasser-gombra-cv --print`, which cannot create a folder. The most likely cause is the command that the gallery prints after Enter (`To keep it, run: cvcli pack MyCv/CV.md --layout manpage --accent green`). It has no `--out`, so it creates the folder in the current folder. Whatever the exact cause, both problems below are real and can produce this duplicate: the gallery tells users to run `pack` themselves, and `pack`'s default folder depends on where it runs.

The code today:
- `cvcli/cli/bin/cvcli.js:97-98`, `onChoice`: prints `Your choice: … To keep it, run:` + `packCommandFor(file, choice)`.
- `cvcli/cli/lib/pack.js:123`: `const dir = path.resolve(opts.out || binName)`, which resolves against the current folder.
- `pack.js` `nextSteps()` already prints paths relative to the current folder, so it shows the right path for any folder.

## Goals / Non-Goals

**Goals:**
- The gallery message works for both kinds of users: people who talk to an AI, and people who type commands.
- `pack CV.md` gives the same folder, wherever it is run from.
- `pack` never silently makes a second copy of a package that it made before under the old default.

**Non-Goals:**
- Finding packages anywhere on disk. The guard only checks the one place the old default used.
- Changing how the agent packs. `share.md` always passes `--out`, and the user's own rule (`--out yasser-gombra-cv` in the repo root) keeps working because `--out` wins.
- The scanner, the phone question and the PR-count honesty fix (separate changes).

## Decisions

**1. The gallery message: the AI line comes first, the command last.**
```
Your choice: manpage layout, green accent.
Using an AI assistant? Just tell it: "manpage, green".
Or save it yourself:

  cvcli pack MyCv/CV.md --layout manpage --accent green
```
Most cvcli users now run the gallery because their AI told them to, so the first instruction is for them. The command stays, because the CLI is also used without an AI.
- Alternative: detect whether an AI started the gallery. Rejected: the gallery always runs in the user's own terminal, so there is nothing to detect.
- Alternative: write the choice to a file that the agent reads. Rejected for now: it is more moving parts, and saying two words to the AI is simple.

**2. Default folder = next to CV.md.**
`path.resolve(opts.out || path.join(path.dirname(file), binName))`. This matches `share.md`, keeps the CV and its package together, and makes the result independent of the current folder. When CV.md is in the current folder (the common manual case, and every README example), the result is the same as before.
- Alternative: keep the current folder and fix only the message. Rejected by the user: the folder would still depend on where the command runs.

**3. Duplicate guard: check only the old default place.**
It runs only when `--out` is not given, the new default folder does not exist (or is empty), and `path.resolve(binName)` is a different folder. It refuses when that folder has `package.json`, `cv.json` and `bin/cli.js`, and the `cv.json` `meta.name` equals the CV's `meta.name`. It exits with code 1 (a `PackError`) **before** asking any question or writing anything. The message names both paths and suggests `--out <old> --force`, or moving the folder.
- Why refuse instead of using the old folder: using it silently would make the default "sometimes here, sometimes there". A clear stop is easier to understand, and it happens only once per old package.
- Why also compare `meta.name`: a folder with the same name may belong to someone else's CV (for example, a test or a friend's package). Then the two folders are not duplicates, so pack goes on.

**4. Tests copy the fixture CV into the temp folder.**
A helper `sampleIn(dir)` copies `fixtures/sample-cv.md` to `<tmp>/CV.md`, and the 23 existing pack calls use it. Their expected `./ada-cv` folders stay the same, and nothing is ever written into `cvcli/cli/test/fixtures/`. New tests:
- the default folder when CV.md is in a subfolder
- `--out` wins
- the duplicate guard (refuses, creates nothing, names both paths) and its exception (a different `meta.name` → pack goes on)
- the gallery message: through `onChoice` in a CLI-level test, or by exporting a small `galleryChoiceMessage(file, choice, self)` from `pack.js` next to `packCommandFor`, and testing it directly
- an extra check that the fixtures folder is unchanged after the whole test file

**5. The skill text.**
`references/style.md` step 3 adds: "The gallery prints a command at the end. You don't need to run it: just tell me your choice." `share.md` needs no change.

## Risks / Trade-offs

- [**BREAKING** for people who run `pack other/CV.md` from another folder and expect the folder in the current one] → The new place is printed in the "Created …" line, the README shows the new default, and the duplicate guard catches the update case.
- [A test forgets the helper and writes into `fixtures/`] → The extra test checks that the fixtures folder only has its known files.
- [The guard has a false positive] → It needs a full cvcli package **and** the same `meta.name`, and it can always be bypassed with `--out`.
- [The gallery message gets longer] → It's 4 short lines, printed once after the terminal is restored.

## Migration Plan

No data migration. Old packages keep working. Updating one from another folder now needs `--out <folder> --force`, and the guard's message says so. Rollback: revert `pack.js`, `cvcli.js`, the tests and the docs.

## Open Questions

(none)
