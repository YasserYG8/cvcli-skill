## Context

The skill is one folder (`cvcli/`) with a short `SKILL.md` and reference files that are loaded only when needed. Today:

```
  SKILL.md
  ├── Step 0: "Full CV or one project?" + language + sources
  ├── Full CV  → references/full-cv.md  (steps 1–7, then step 8: terminal CV inline)
  └── Project  → "Project workflow" in SKILL.md  (scan → fact sheet → ask → generate → self-check)
```

In Claude Code, `/cvcli cv` invokes the skill and passes `cv` as its arguments. When the skill body has no `$ARGUMENTS` placeholder, Claude Code appends them as `ARGUMENTS: cv`. Other Agent Skills clients may not pass arguments at all, so the words after `/cvcli` must also work as plain text in the user's message.

The vision (`docs/vision.md`, sections 3, 4 and 7) gives the principles: results instead of commands, a default for every question, and a non-programmer as the typical user.

## Goals / Non-Goals

**Goals:**
- The 6 commands work in Claude Code, and the same words work as plain text in any client.
- A new user who types `/cvcli` understands in one message what the skill can do.
- `SKILL.md` stays short. Each command loads only the reference files it needs.
- The share workflow cannot leak the package folder into a public repo by mistake.

**Non-Goals:**
- Snapshot or HTML previews (change #2) and a free-form style file (change #3).
- Changes to the CLI (`cvcli/cli/`), the scanner or the CV.md format.
- Separate skills per command (see Decision 1).

## Decisions

**1. One skill with a word after it, not 6 skills.**
`/cvcli style` reads as one product with sub-commands, and the user installs one folder. Six skills (`/cvcli-style`…) would mean six descriptions that compete for automatic triggering, and six folders to install and update.
- Alternative: one skill per command. Rejected for the reasons above.

**2. Routing table at the top of SKILL.md, replacing Step 0.**
```
  word after /cvcli   →  workflow                 →  reads
  (none, unclear)     →  start menu               →  –
  cv                  →  full CV                  →  references/full-cv.md (+ cv-rules, style-guide)
  project             →  project workflow          →  (SKILL.md) + cv-rules, cv-section, portfolio-card
  post                →  project workflow, posts   →  (SKILL.md) + linkedin.md / x.md
  style               →  terminal CV look          →  references/style.md
  share               →  terminal CV package       →  references/share.md
  (other words)       →  treat as a plain request
```
Routing reads the first word from the invocation arguments or from the start of the user's message. The language and sources questions of today's Step 0 move into the workflows that need them (full CV asks for sources, posts ask for the language).

**3. Two new reference files: `share.md` and `style.md`.**
Step 8 of `full-cv.md` moves to `share.md` almost unchanged (Node.js check, `check`, placeholders, contacts, repo, pack, local test, next steps). The look question moves to `style.md`. `full-cv.md` step 8 becomes a short "offer the next step" paragraph. This keeps the full CV workflow shorter and lets users run share and style on a CV.md made earlier.

**4. Words → preset mapping in `style.md`.**
A small table maps feelings to presets, for example:

| The user says… | Layout | Accent |
| --- | --- | --- |
| calm, professional, serious | classic | blue |
| modern, clean, "you choose", "I don't know" | sidebar | teal |
| creative, playful | sidebar | violet |
| hacker, Linux, retro, "like a terminal" | manpage | green |
| warm, bold, energetic | sidebar | amber |

The table is a guide, not a rule. A named layout or color always wins. Change #3 replaces the presets with a real style, and this same file grows into the creative loop.

**5. Finding an existing package for style.**
A cvcli package is a folder with `package.json`, `cv.json` and `bin/cli.js`, whose `cv.json` has the same `meta.name` as the CV.md. `style.md` tells the agent to look next to CV.md and in the current folder. If it finds one, the agent changes only `display.layout` and `display.accent` in the package's `cv.json`. The viewer reads them at every start. Otherwise, the agent keeps the choice and offers share.
- Rejected during implementation: repacking with `pack --force --yes --layout … --accent …`. `--yes` chooses the contact fields again (all except the phone), so a contact the user hid would come back. `pack` has no flag to leave out one contact, and its contact questions need a TTY. Editing the two `display` fields changes nothing else.

**6. Safe package folder in share.**
Before packing, the agent runs `git rev-parse --is-inside-work-tree` in the target folder's parent. If it is inside a repo, the agent runs `git check-ignore <folder>`. When the folder is not ignored, the agent offers: (a) add it to `.gitignore` (the default), or (b) put it outside the repo. This comes from a real case in this project: a packed CV folder appeared untracked in the repo root.

**7. Frontmatter.**
Add the commands to `description` (it drives automatic triggering), and add `argument-hint: "[cv | project | post | style | share]"` only if Claude Code documents this field for skills and the Agent Skills spec allows it. Otherwise, the description alone lists them. `metadata.version` goes from `0.3.0` to `0.4.0`.

*Checked on 2026-11-19 (task 1.1):* Claude Code documents `argument-hint` ("Hint shown during autocomplete"), and with no placeholder in the body it appends `ARGUMENTS: <your input>` to the skill content. The Agent Skills spec lists only `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`, and its `skills-ref validate` checks the frontmatter. **Result:** no `argument-hint` (the skill must stay portable), and no `$ARGUMENTS` placeholder (other clients would show it as literal text). The routing reads the appended `ARGUMENTS:` line or the first word of the message.

## Risks / Trade-offs

- [Clients without argument passing] → The routing also reads the first word of the user's message, and plain-language requests keep working.
- [An unknown field like `argument-hint` breaks a strict Agent Skills validator] → Verify the field first (task 1.1). Leave it out when in doubt.
- [The words → preset table feels limiting] → It is temporary. Change #3 replaces it, and the command name stays the same.
- [SKILL.md grows] → The routing table replaces Step 0, and the terminal steps move out of `full-cv.md`. The net size of SKILL.md should stay about the same.
- [Skill text has no automated tests] → Verify by reading the files against the spec scenarios, and by a manual dry run of each command in Claude Code (tasks in group 5).

## Migration Plan

No data migration. Users update the skill folder. `/cvcli` with plain-language requests behaves as before. Rollback: restore the previous `SKILL.md` and `full-cv.md`, and delete the two new reference files.

## Open Questions

(none for this change; see `docs/vision.md` section 9 for later changes)
