## Why

The vision (`docs/vision.md`) says the user talks to an AI agent and often does not know programming. Today the skill has one entry point, `/cvcli`, and a Step 0 question with technical wording ("Full CV or one project?"). The terminal CV is hidden at the end of the full CV workflow, and the instructions tell the agent to show flags and commands. New users do not know what the skill can do, and they get commands where they wanted results. This is change #1 of the vision roadmap: a small, clear set of commands that later changes (preview engine, style file) build on.

## What Changes

- Add 6 user-facing commands, as one skill with one word after it:
  - `/cvcli`: a start menu. One simple question that shows the 5 other commands in plain words.
  - `/cvcli cv`: make or update `CV.md` (the full CV workflow).
  - `/cvcli project`: CV bullets and a portfolio card for one repo.
  - `/cvcli post`: a LinkedIn and/or X post about one repo.
  - `/cvcli style`: choose the look of the terminal CV in plain words. In this change, it maps words like "calm" or "bold" to the existing layouts and accents. Changes #2 and #3 upgrade this same command.
  - `/cvcli share`: make the terminal CV package, test it, and guide the user to GitHub or npm.
- Natural-language requests keep working without a command.
- Add the vision principles to the skill: talk about **results, not commands**; every question has a **default**, and "skip", "I don't know" and "you choose" are valid answers.
- The full CV workflow no longer runs the terminal CV steps itself. After saving `CV.md`, it offers the next step (style or share) in plain words.
- `/cvcli share` makes sure the package folder cannot be pushed to a public repo by mistake: it uses a folder outside the repo, or one that git ignores, and offers to add it to `.gitignore`.
- The terminal CV steps move from `references/full-cv.md` into new `references/share.md` and `references/style.md`, so `SKILL.md` stays short.
- The skill frontmatter and README list the commands. `metadata.version` goes from 0.3.0 to 0.4.0.

## Capabilities

### New Capabilities

- `skill-commands`: the 6 commands, how the skill picks a workflow from them, the start menu, the "results, not commands" and "every question has a default" rules, and what `/cvcli style` and `/cvcli share` do.

### Modified Capabilities

- `skill-terminal-handoff`: after the full CV, the skill offers style or share in plain words instead of asking for a terminal CV and packing inline. The terminal steps (check, placeholders, contacts, pack, local test, next steps) now run from `/cvcli share`.

## Impact

- Skill files: `cvcli/SKILL.md` (frontmatter, command routing, principles), `cvcli/references/full-cv.md` (step 8), new `cvcli/references/share.md` and `cvcli/references/style.md`.
- Docs: `README.md` (Usage section).
- No change to the CLI code (`cvcli/cli/`), the scanner or the CV.md format. No new dependencies.
- Out of scope: the snapshot / HTML preview (change #2), the style file and locking the package to the user's design (change #3), and PDF or website styles.
