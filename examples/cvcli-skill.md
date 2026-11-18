# Dry run: cvcli on its own repo

This is a full run of the cvcli workflow on this repository (`cvcli-skill`), done on 2026-11-18.
The raw scan output is in [cvcli-skill.scan.json](cvcli-skill.scan.json). The local path and git email are replaced with placeholders there.

Note: the repo had **0 commits** at the time of the run. So git dates and contributor shares are empty. This is a real result, not a bug. It also shows how cvcli handles missing data.

**Request:** "Turn this repo into CV bullets (English and French), a LinkedIn post, an X post and a portfolio card."

---

## 1. Scan

```bash
python3 cvcli/scripts/scan_repo.py .
```

Key fields from the JSON:

| Field | Value |
| --- | --- |
| `languages` | Python: 2 files, 993 lines (100% of code) · Markdown: 9 files, 547 lines |
| `manifests` / `frameworks` | none (no dependencies) |
| `infra` | nothing found |
| `tests` | present: 1 test file, framework: pytest |
| `license` | MIT |
| `git` | repo: yes, `total_commits`: 0, contributors: none yet |
| `errors` | none |

## 2. Fact sheet

**Fact sheet: cvcli-skill**
- What: an open-source Agent Skill for Claude Code that turns a repo into CV bullets, a LinkedIn post, an X post and a portfolio card (README).
- Stack: Python (100% of code) · no frameworks or dependencies · Markdown rule files
- Scale: 993 lines of Python in 2 files · 0 commits (no dates yet)
- Infra & tests: no Docker / CI / Kubernetes / Terraform · tests: yes (pytest)
- Contributors: unknown (no commits yet); you: unknown
- Notable features (README): stdlib-only scanner; fact sheet + max 3 questions; English and French output; `[metric?]` placeholders; contributor check before "built"; editable Markdown platform rules
- Flags: README shows a demo GIF (`docs/demo.gif`), but this file does not exist yet.

## 3. Ask

| Question | Answer |
| --- | --- |
| Who used it, and is there a measurable result? | "Only me so far." |
| What job or audience is it for? | "Developers on social media." |
| What was your role? | "Solo, and mention the AI help (built with Claude Code)." |

---

## Before: a typical unchecked AI draft

*This is an illustration written for this example, not real output. It shows the problems cvcli is built to stop.*

> 🚀 Thrilled to announce **CVCLI**, a revolutionary AI-powered career tool! 🎉
> Already used by 500+ developers, it boosts interview callbacks by 70% and leverages cutting-edge NLP to seamlessly craft the perfect resume. 💡🔥
>
> - Architected a scalable, enterprise-grade platform serving thousands of users
> - Improved resume quality by 85% using advanced machine learning
> - Led a cross-functional team to deliver a game-changing product

What is wrong:
- **Invented numbers:** "500+ developers", "70%", "85%", "thousands of users". None of them come from the repo or the user. The real answer is "only me so far".
- **Invented features:** "NLP", "machine learning", "platform". The repo is a Python script plus Markdown files.
- **Invented team:** "Led a cross-functional team". The user worked alone.
- **Banned phrases:** thrilled, revolutionary, cutting-edge, seamlessly, game-changing, leverages.
- **Emoji spam:** 5 emojis.

---

## After: cvcli output

### CV bullets (English)

```
cvcli — open-source Agent Skill for Claude Code                     [dates?]
Solo project, built with Claude Code as an AI pair programmer
Tech: Python (standard library), pytest, Markdown, Agent Skills, Git
- Built cvcli, an open-source Agent Skill that turns a git repository into CV bullets, LinkedIn and X posts, and portfolio cards in English or French.
- Developed a dependency-free Python repo scanner that reports languages, frameworks, Docker/CI/Kubernetes/Terraform files, tests and git history as JSON.
- Designed a 5-step workflow (scan, fact sheet, questions, generation, self-check) that removes unsupported claims and marks missing numbers as [metric?].
- Covered the scanner with a pytest suite of [metric?] tests.
github.com/YasserYG8/cvcli-skill
```

### CV bullets (French)

```
cvcli — Agent Skill open source pour Claude Code                     [dates ?]
Projet personnel, réalisé avec Claude Code comme assistant de programmation IA
Technologies : Python (bibliothèque standard), pytest, Markdown, Agent Skills, Git
- Développé cvcli, un Agent Skill open source qui transforme un dépôt git en points de CV, posts LinkedIn et X, et fiches portfolio, en anglais ou en français.
- Conçu un scanner de dépôt en Python sans dépendance qui extrait en JSON les langages, frameworks, fichiers Docker/CI/Kubernetes/Terraform, tests et l'historique git.
- Mis en place un workflow en 5 étapes (scan, fiche de faits, questions, génération, auto-vérification) qui supprime les affirmations sans preuve et signale les chiffres manquants par [métrique ?].
- Couvert le scanner par une suite de [métrique ?] tests pytest.
github.com/YasserYG8/cvcli-skill
```

### LinkedIn post

**LinkedIn post**

```
I built a tool that refuses to invent numbers for my CV.

It's called cvcli: an open-source Agent Skill for Claude Code. You point it at a git repo, and it writes CV bullets, a LinkedIn post, an X post or a portfolio card about that project.

How it works:
→ A Python script (standard library only) scans the repo: languages, frameworks, Docker/CI/Kubernetes/Terraform, tests, git history
→ You get a short fact sheet and at most 3 questions the code can't answer
→ It writes the content, then checks every claim against the fact sheet

When a number is missing, it writes [metric?] instead of a guess. If git shows other people with a real share of the commits, it asks about your role before it writes "built".

The platform rules (hook, link placement, a list of banned marketing phrases) are plain Markdown files. You can edit them or add a new platform without touching Python.

I built it with Claude Code as a pair programmer. Right now I'm the only user, which is why this post has no usage numbers.

What phrase would you ban from developer posts on LinkedIn?

#OpenSource #Python #ClaudeCode #DeveloperTools
```

**First comment**

```
Code (MIT): https://github.com/YasserYG8/cvcli-skill
```

**Visual idea**: a short screen recording of `/cvcli` on a repo: fact sheet → 3 questions → bullets with `[metric?]`.

### X post

**X post**

```
I made a Claude Code skill that writes CV bullets from your actual repo.

It scans the code and git history, asks you up to 3 questions, and writes [metric?] instead of inventing a number.
```

**First reply**

```
Open source (MIT), Python standard library only: https://github.com/YasserYG8/cvcli-skill
```

**Media idea**: a GIF of the fact sheet and the final bullets side by side.

### Portfolio card

```markdown
### cvcli

An open-source Agent Skill for Claude Code that turns a git repo into honest CV bullets, LinkedIn and X posts, and portfolio cards, in English or French.

**Stack:** Python (standard library) · pytest · Markdown · Agent Skills
**My role:** Solo project, built with Claude Code as an AI pair programmer

**Highlights**
- Repo scanner with no dependencies: languages, frameworks, Docker/CI/Kubernetes/Terraform, tests, git history
- Self-check step: every claim needs a source; missing numbers stay as [metric?]
- Platform rules in editable Markdown files

**Links:** [Code](https://github.com/YasserYG8/cvcli-skill)
```

---

## 5. Self-check

| Claim | Source |
| --- | --- |
| Open-source Agent Skill for Claude Code | README · `license.spdx_guess` = MIT |
| Outputs: CV bullets, LinkedIn, X, portfolio card; English or French | README |
| Python, standard library only / no dependencies | `languages` · `manifests` = [] · README "No pip install" |
| Scans languages, frameworks, Docker/CI/Kubernetes/Terraform, tests, git history | README |
| 5-step workflow, max 3 questions, `[metric?]`, role check | README ("What happens", "No fake metrics") |
| Rules in editable Markdown files | README · `languages`: Markdown, 9 files |
| pytest | `tests.frameworks` = ["pytest"] |
| Solo, built with Claude Code | user answer 3 |
| "Only user so far", no usage numbers | user answer 1 |
| GitHub link | given by the user |

Removed during the check:
- "about 1,000 lines of Python": true (993 lines), but it counts the tests too, so it could mislead. Removed.
- "12 tests": the scan only counts test *files* (1), not test functions. Replaced with `[metric?]`.

**Flags**
- README shows `docs/demo.gif`, but the file does not exist yet. Record the GIF or remove the image line.
- `[dates?]` in the CV header: the repo has no commits yet. Run the scan again after your first commit, or add the dates yourself.
- `[metric?]` in CV bullet 4: the number of tests. `python -m pytest -q` showed 12 passed on 2026-11-18, if you want to use it.
- The GitHub repo was still empty on 2026-11-18. Push before you post the link.
