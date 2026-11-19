# Style workflow (`/cvcli style`)

Help the user choose how their terminal CV looks, in their own words. They never need to know layout or color names. Report results in plain words (SKILL.md, "How to talk to the user").

Today the look is a layout plus an accent color. The CV's **content** never changes here: the style is how it looks, CV.md is what it says.

Below, `CVCLI` means `node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js` (outside Claude Code: `node <skill-folder>/cli/bin/cvcli.js`).

## 1. Ask how it should feel

Ask one open question:

```
How should your CV feel? For example "calm and professional", "modern", "playful",
"like an old hacker screen", or name a color. Or say "you choose".
```

Default ("you choose", "I don't know", "skip"): `sidebar` + `teal`.

## 2. Pick a look

The layouts:

| Layout | Looks like |
| --- | --- |
| `sidebar` | a framed card: the section list on the left, one section at a time on the right |
| `classic` | a paper CV: contact and skills in a left column, the rest on the right, one page you scroll |
| `manpage` | a Unix manual page: `NAME`, `DESCRIPTION`, `EXPERIENCE`… |

Accents: `teal`, `blue`, `violet`, `green`, `amber`. Everything else is neutral gray.

Map the user's words to a look with this table. It is a guide, not a rule: a layout or color the user names always wins, and you can mix (for example "playful, but like paper" → `classic` + `violet`).

| The user says… | Layout | Accent |
| --- | --- | --- |
| calm, professional, serious, paper, traditional | classic | blue |
| modern, clean, simple, "you choose", "I don't know" | sidebar | teal |
| creative, playful, unique | sidebar | violet |
| hacker, Linux, retro, terminal, nerdy | manpage | green |
| warm, bold, energetic, friendly | sidebar | amber |

Tell the user the pick and **why, in one line**, in plain words, for example: "A paper-like page in blue: it reads like a classic CV and feels calm." Do not show the layout and accent names unless the user asks.

## 3. Let them see it (optional)

You cannot show the look in the chat: the viewer needs a real terminal. Offer this once, as an extra:

```
Want to see it, and try the other looks? Open a separate terminal window and run:
  <CVCLI> view <CV.md> --gallery
Press t to change the layout, a to change the color, Enter to choose, q to quit.
Then tell me what you picked.
```

Write the real path instead of `<CVCLI>` (it must work when pasted into a new terminal). Say that Claude Code's `!` does not work for this, because it is not a real terminal. If the user tells you what they picked, use it.

## 4. Save the look

Find a cvcli package for this CV: a folder next to CV.md or in the current folder that has `package.json`, `cv.json` and `bin/cli.js`, where `cv.json` has the same `meta.name` as CV.md.

- **A package exists**: in `<folder>/cv.json`, change only `display.layout` and `display.accent` (add `display` if it is missing), and keep every other field exactly as it is. Do not run `pack --force --yes` for this: it would choose the contact details again and could show details the user hid. Then run `npx --yes ./<folder> --print` as a quick test, and confirm in plain words: "Your terminal CV now uses the new look." If the user also changed CV.md since the package was made, offer to update the whole package with [share.md](share.md).
- **No package yet**: keep the choice for this conversation, and offer: "Should I make your terminal CV now with this look?" If yes, follow [share.md](share.md), which uses this look.
