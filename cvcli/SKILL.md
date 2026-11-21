---
name: cvcli
description: Builds an honest, evidence-based developer CV as a CV.md file, turns one git repository into CV bullets, a portfolio card, a LinkedIn post or an X/Twitter post, in English or French, and turns CV.md into a terminal CV that people run with npx. Commands - /cvcli (start menu), /cvcli cv, /cvcli project, /cvcli post, /cvcli style, /cvcli share. Scans repos (languages, frameworks, infra, tests, git history), reads the user's old CV, website or profile text, asks a few questions, then writes only claims the sources or the user can back up. Use when the user asks to write, build, update or check their CV or resume, create a CV.md, turn a project, repo or codebase into CV or resume bullets, a portfolio entry, a LinkedIn post, a tweet or X thread, or make, style or share a terminal CV.
license: MIT
compatibility: Needs Python 3.9+ and git on PATH; the optional terminal CV also needs Node.js 18+. Built for Claude Code; works in any Agent Skills client that can run scripts.
metadata:
  version: "0.4.0"
---

# cvcli

Turn a developer's real work into a CV and social content. Every claim must come from a source (code, git history, a document the user gave) or from the user.

## How to talk to the user

The user talks to you, not to a terminal. Many users do not know programming; they want the result.

1. **Results, not commands.** Run every command yourself and report what you made, in plain words ("Your terminal CV is ready in `MyCv/ada-cv/`, and the test worked."). Do not show flags or ask the user to run a command. Show a shell command only when the user asks for it, or when they must run it themselves: the interactive viewer (`view`, `--gallery`, `npx ./<folder>` without `--print`) needs a real, separate terminal window, because your shell is not interactive (Claude Code's `!` is not either).
2. **Every question has a default.** Each question says what happens by default. "skip", "I don't know" and "you choose" are always valid: use the default and say in one line why it fits. For a missing fact, the default is a visible placeholder (`[metric?]`), never a guess (honesty rules below).
3. **Language.** Write CVs and posts in English or French. Default: the language the user writes in.
4. **Show what you found.** When you ask about a fact you found in a source (old CV, website, profile text, repo), show the value and say where it came from, so the user does not think it was missed: "Your PDF has the phone +216 …. Show it on the CV? (default: no)". If no source has it, say so. Show found values only in the conversation.

## Commands

Pick the workflow from the first word after `/cvcli`. In Claude Code it arrives as an `ARGUMENTS:` line at the end of this file; in other clients, read the start of the user's message. Ignore case. The other words are the user's request (`/cvcli post linkedin, in French`).

| Word | Workflow | Read first |
| --- | --- | --- |
| `cv` | **Full CV**: make or update `CV.md`. Follow the full-cv.md workflow. | [references/full-cv.md](references/full-cv.md), [templates/cv-full.md](templates/cv-full.md), [references/cv-rules.md](references/cv-rules.md), [references/style-guide.md](references/style-guide.md) |
| `project` | **Project workflow** below. Outputs: CV bullets + portfolio card, unless the user asks for others. | the "Generate" table below |
| `post` | **Project workflow** below. Outputs: a LinkedIn post and/or an X post. If the user did not name one, ask which (default: both). | the "Generate" table below |
| `style` | **Look of the terminal CV**: the user describes it in their own words. | [references/style.md](references/style.md) |
| `share` | **Share the CV**: make, test and share the terminal CV package. | [references/share.md](references/share.md) |

- **No word, clear request** ("Write a LinkedIn post about this repo"): run the matching workflow directly.
- **No word and no clear request** (just `/cvcli`, or "help me with my CV stuff"): show the start menu.
- **Any other word**: treat the whole text as a plain request ("resume please" → `cv`). Never fail because a word is not a command.

`style` and `share` use the CLI bundled with this skill: `node ${CLAUDE_SKILL_DIR}/cli/bin/cvcli.js check|view|pack <CV.md>`. Run it; do not read its source.

### Start menu

Ask once, in one message, in the user's language:

```
What would you like to do?
1. Make or update your CV: I read your old CV, website and repos, and write CV.md.   (/cvcli cv)
2. CV lines for a project: bullets and a portfolio card from one repo.               (/cvcli project)
3. A post about a project: for LinkedIn, X or both.                                  (/cvcli post)
4. The look of your terminal CV: tell me how it should feel.                         (/cvcli style)
5. Share your CV: a version people open in their terminal with one command.          (/cvcli share)

Answer with a number, a command or your own words. Not sure? Start with 1.
```

## Honesty rules (non-negotiable)

1. Never invent numbers, users, customers, performance gains, stars, downloads, dates, employers or features.
2. A missing fact becomes a visible placeholder: `[metric?]`, `[dates?]`, `[role?]`. Never fill it with a guess.
3. Never claim sole authorship ("built", "designed and built alone") if git shows another non-bot contributor with 10% or more of commits or added lines (`git.significant_contributors` > 1). Ask the user's role first. Owning the GitHub repo is not the same as writing the code: if others wrote most of it, name them ("co-developed with X") and base the bullets on the user's own commits.
4. Commit share is not code ownership. Do not turn "60% of commits" into "wrote 60% of the code". `lines_added_share` is a rough hint, not proof.
5. If a README, an old CV or a website claims something the code does not support (e.g. "Kubernetes-ready" but `infra.kubernetes` is empty, "cuts costs by 70%" with no number in the repo), do not repeat it. Put it under **Flags**.
6. Use the user's answers as facts only for what they actually said.

## Scan a repo

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_repo.py <repo-path>
```

Use `python` if `python3` is not found (common on Windows). Outside Claude Code, the script is `scripts/scan_repo.py` in this skill's folder. It prints JSON. If you save that JSON to a file, save it in the system temp folder (or your client's scratch folder), never in the scanned repo, the CV folder or any other user folder. Git-ignored files and packed terminal CVs are not counted; `skipped` says what was left out. If `readme.truncated` is true and you need more context, read the README file itself. Do not read the script source; run it.

For a GitHub URL, clone it first into a temporary folder (outside the user's project): `git clone --quiet <url> <tmp>/<name>`, then scan that folder. Only read and scan cloned code; never run it.

## Project workflow

Copy this checklist and tick it as you go:

```
cvcli project progress:
- [ ] 1. Scan
- [ ] 2. Fact sheet
- [ ] 3. Ask (max 3 questions)
- [ ] 4. Generate (only the asked outputs)
- [ ] 5. Self-check
```

### 1. Scan

Scan the repo (default: the current project folder; the user may give another path or a GitHub URL). See "Scan a repo".

### 2. Fact sheet

Show this short fact sheet. Use only the scan JSON and the README. Write "unknown" when a field is null.

```
**Fact sheet: <repo_name>**
- What: <one sentence from README; "unknown" if no README>
- Stack: <top code languages with share> · <frameworks>
- Scale: <code lines> lines of code in <files> files · <total_commits> commits, <first_commit date> → <last_commit date>
- Infra & tests: <Docker / CI / K8s / Terraform / Ansible found> · tests: <yes (frameworks) / no>
- Contributors: <n significant, with names>; you: <current_user.share>% of commits, <current_user.lines_added_share>% of added lines
- Notable features: <only items named in the README or visible from file names>
- Flags: <README claims not backed by the scan; scan errors; folders in skipped.cv_packages: "generated terminal CV, not counted">
```

### 3. Ask

Ask at most 3 questions, only about what the code cannot show. Pick the most useful:
- Who used it, and how many? (real users, team, class, just you)
- Any measurable result? (time saved, speed, cost, uptime, grade, feedback)
- Your exact role, if there is more than one significant contributor.
- Target job or audience (e.g. "junior DevOps roles", "French recruiters").

Accept "skip" for any question; keep placeholders then.

### 4. Generate

Produce only the outputs the user asked for, or the defaults of the command (`project`: CV bullets + portfolio card; `post`: the platforms chosen, default LinkedIn + X). Before writing, read the matching files:

| Output | Read |
| --- | --- |
| CV bullets / resume entry | [references/cv-rules.md](references/cv-rules.md) and [templates/cv-section.md](templates/cv-section.md) |
| LinkedIn post | [references/linkedin.md](references/linkedin.md) |
| X post + first reply (or thread) | [references/x.md](references/x.md) |
| Portfolio card | [templates/portfolio-card.md](templates/portfolio-card.md) |
| Any output | [references/style-guide.md](references/style-guide.md) (always) |

Language: write in the language the user asked for (default: the language they write in). For French, use the French verb list in cv-rules.md and the French banned phrases in style-guide.md. Keep tech names in their original form (Docker, GitHub Actions).

### 5. Self-check

Before showing the output, check every sentence:
1. Each claim maps to a source: a scan field, a README line, or a user answer. No source → remove it.
2. Every number comes from the scan or the user. Otherwise use `[metric?]`.
3. Authorship wording matches rule 3.
4. No banned phrase from style-guide.md; emoji count within limits.
5. Format rules of the target platform are met (length, hashtags, link placement).

If a check fails, fix the text and check again. Then show the outputs, followed by:

```
**Flags**
- <claims not backed by the code>
- <placeholders the user should fill, e.g. [metric?] in bullet 2>
```

Keep the flags list short. Write "none" if empty.
