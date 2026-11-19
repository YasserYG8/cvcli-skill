## 1. Frontmatter

- [x] 1.1 Check the Claude Code docs and the Agent Skills spec: is `argument-hint` a supported skill frontmatter field, and how are arguments passed (`$ARGUMENTS` or appended `ARGUMENTS:`)? Write down the answer in design.md Decision 7
- [x] 1.2 Update the `cvcli/SKILL.md` frontmatter: list the 6 commands in `description`, add `argument-hint` only if 1.1 says it is safe, and set `metadata.version` to `0.4.0`

## 2. Routing and principles in SKILL.md

- [x] 2.1 Replace "Step 0" with a command routing table (design.md Decision 2): first word from the arguments or the message, unknown words treated as a plain request
- [x] 2.2 Add the start menu for a bare or unclear `/cvcli`: one message, 5 choices in plain words, each with a short example; answers by command, number or own words
- [x] 2.3 Add the two principles near the top: "results, not commands" (when a command may be shown) and "every question has a default" (skip / I don't know / you choose; never invent facts)
- [x] 2.4 Make the project workflow defaults explicit: `project` → CV bullets + portfolio card; `post` → ask LinkedIn, X or both (default both); language asked where needed

## 3. Reference files

- [x] 3.1 Create `cvcli/references/share.md` from step 8 of `full-cv.md`, written in "results, not commands" style, plus the safe package folder check (design.md Decision 6) and the no-push/no-publish rule
- [x] 3.2 Create `cvcli/references/style.md`: words → preset table (Decision 4), one-line explanation of the pick, optional gallery with the "separate terminal window" note, and the existing-package / no-package paths (Decision 5)
- [x] 3.3 Replace step 8 of `cvcli/references/full-cv.md` with a short "offer the next step" paragraph (style, share or nothing for now), and update its checklist line

## 4. Docs

- [x] 4.1 Update the README "Usage" section with the 6 commands and one example each, keeping the plain-language examples
- [x] 4.2 Update the README project layout tree with `references/share.md` and `references/style.md`

## 5. Verify

- [x] 5.1 Read SKILL.md, share.md, style.md and full-cv.md against every scenario in `specs/skill-commands/spec.md` and `specs/skill-terminal-handoff/spec.md`; fix gaps
- [x] 5.2 Check that every link in SKILL.md and the references points to an existing file
- [x] 5.3 Run `npm test` and `python -m pytest -q` (nothing should change, but check)
- [x] 5.4 Dry run in a fresh Claude Code session with the installed skill: `/cvcli`, `/cvcli project`, `/cvcli style` on `MyCv/CV.md`; note what the user would see (the user runs this step, because it needs a new session)
