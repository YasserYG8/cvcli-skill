# Share workflow (`/cvcli share`)

Turn `CV.md` into a terminal CV: a small folder that people open with one command (`npx`). Run every step yourself and report results in plain words (SKILL.md, "How to talk to the user").

Below, `CVCLI` means `node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js` (outside Claude Code: `node <skill-folder>/cli/bin/cvcli.js`).

## Checklist

```
cvcli share progress:
- [ ] 1. Find CV.md and check Node.js
- [ ] 2. Check CV.md
- [ ] 3. Fill placeholders (or skip)
- [ ] 4. Contact details
- [ ] 5. Look
- [ ] 6. Safe folder
- [ ] 7. Pack and test
- [ ] 8. Next steps
```

## 1. Find CV.md and check Node.js

- Use the CV.md the user names. Default: `CV.md` in the current folder. If there is none, offer to make one first (`/cvcli cv`).
- Run `node --version`. If it fails or is below 18, say in plain words that the terminal CV needs Node.js 18 or newer, point to https://nodejs.org, and stop. CV.md is still the result.

## 2. Check CV.md

Run `CVCLI check <CV.md>`. On errors, fix CV.md yourself (the honesty rules still apply) and check again. Tell the user only what you changed, in one line per fix.

## 3. Fill placeholders

If the check lists `Placeholder to fill`, show each one in plain words ("the city of your Dream Tek internship") and ask for the facts in one message. Default: keep them, and they show as `[city?]` in the terminal CV. Never guess a value.

## 4. Contact details

Ask which contact details people should see: email, phone, website, GitHub, LinkedIn (only the ones CV.md has). Say clearly that the CV becomes **public** once it is on GitHub or npm. Default: all of them **except the phone**. Include the phone only if the user clearly says yes.

## 5. Look

If the user already chose a look in this conversation (`/cvcli style`), use it. Otherwise ask one short question: "Should I use the default look (a card with a section list, teal), or do you want to choose one first?" Default: the default look. If they want to choose, follow [style.md](style.md), then come back here.

## 6. Safe folder

The package holds personal data. It must not end up in a public repository by mistake.

- Default folder: next to CV.md, named after the package (for example `MyCv/ada-lovelace-cv/`).
- Run `git -C <parent-of-folder> rev-parse --is-inside-work-tree`. If it is not a git repo, the folder is safe.
- If it is a repo, run `git -C <parent-of-folder> check-ignore -q <folder-name>/`. Exit code 0 means git ignores it: safe. Keep the trailing `/`: the folder does not exist yet, and without the slash a `.gitignore` rule like `ada-cv/` does not match.
- If git does not ignore it, ask: "This folder is inside your git project, so it could be pushed to GitHub by mistake. Should I add it to `.gitignore`? (default: yes) Or should I put it outside the project?" Then do what the user chose.

## 7. Pack and test

1. Ask for the GitHub repo where the CV will live (`user/repo`), or "later". Default: later.
2. Run `CVCLI pack <CV.md> --yes --out <folder> [--include-phone] [--repo user/repo] [--layout <name>] [--accent <color>]`. Add `--force` only to update a folder that cvcli made before. It keeps the version, the README, `.git` and the saved look, unless you pass new look flags.
   `--yes` includes every contact detail except the phone. If the user wants to hide another one (for example LinkedIn), delete that field from `meta` in `<folder>/cv.json` right after packing, and do it again after every `--force` update.
3. Run the local test: `npx --yes ./<folder> --print`. Check that the hidden details do not appear.
4. Report in plain words: where the folder is, that the test worked, the first 2 lines of the output, which contact details are included, and the look.

If pack fails, read the error, fix the cause (for example a bad package name: pass `--name`), and try again. Tell the user only if you need their decision.

## 8. Next steps

Explain the three levels in plain words. Do them only when the user asks, one step at a time:

1. **See it yourself**: open a separate terminal window and run `npx ./<folder>` (show this command, because the user must run it: it is interactive).
2. **Share it from GitHub**: put the folder in a public GitHub repo. Then anyone can run `npx github:<user>/<repo>`. You may create the repo and push, but only after the user says yes to each push.
3. **Publish it on npm** (optional): then anyone can run `npx <package-name>`. Follow `<folder>/PUBLISHING.md`.

Never run `git push` or `npm publish` without the user's explicit yes for that step.
