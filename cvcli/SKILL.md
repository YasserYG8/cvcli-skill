---
name: cvcli
description: Turns a git repository into honest, evidence-based CV bullets, a resume entry, a LinkedIn post, an X/Twitter post (with first reply) or a portfolio card, in English or French. Scans the code, languages, frameworks, infra and git history, then writes only claims that the repo or the user can back up. Use when the user asks to turn a project, repo or codebase into CV or resume bullets, a resume or portfolio entry, a LinkedIn post, a tweet or X thread, or a project description for a job application.
license: MIT
compatibility: Needs Python 3.9+ and git on PATH. Built for Claude Code; works in any Agent Skills client that can run scripts.
metadata:
  version: "0.1.0"
---

# cvcli

Turn a developer's real code into CV and social content. Every claim must come from the repo or from the user.

## Honesty rules (non-negotiable)

1. Never invent numbers, users, customers, performance gains, stars, downloads or features.
2. A missing number becomes a visible placeholder: `[metric?]`. Never fill it with a guess.
3. Never claim sole authorship ("built", "designed and built alone") if git shows another non-bot contributor with 10% or more of commits (`git.significant_contributors` > 1). Ask the user's role first.
4. Commit share is not code ownership. Do not turn "60% of commits" into "wrote 60% of the code".
5. If the README claims something the scan does not support (e.g. "Kubernetes-ready" but `infra.kubernetes` is empty, "fully tested" but `tests.present` is false), do not repeat it. Put it under **Flags**.
6. Use the user's answers as facts only for what they actually said.

## Workflow

Copy this checklist and tick it as you go:

```
cvcli progress:
- [ ] 1. Scan
- [ ] 2. Fact sheet
- [ ] 3. Ask (max 3 questions)
- [ ] 4. Generate (only the asked outputs)
- [ ] 5. Self-check
```

### 1. Scan

Run the scanner on the repo (default: the current project folder):

```bash
python3 ${CLAUDE_SKILL_DIR}/scripts/scan_repo.py <repo-path>
```

Use `python` if `python3` is not found (common on Windows). Outside Claude Code, the script is `scripts/scan_repo.py` in this skill's folder. Read the JSON. If `readme.truncated` is true and you need more context, read the README file itself. Do not read the script source; run it.

### 2. Fact sheet

Show this short fact sheet. Use only the scan JSON and the README. Write "unknown" when a field is null.

```
**Fact sheet: <repo_name>**
- What: <one sentence from README; "unknown" if no README>
- Stack: <top code languages with share> · <frameworks>
- Scale: <code lines> lines of code in <files> files · <total_commits> commits, <first_commit date> → <last_commit date>
- Infra & tests: <Docker / CI / K8s / Terraform / Ansible found> · tests: <yes (frameworks) / no>
- Contributors: <n significant>; you: <current_user.share as %> of commits
- Notable features: <only items named in the README or visible from file names>
- Flags: <README claims not backed by the scan; scan errors>
```

### 3. Ask

Ask at most 3 questions, only about what the code cannot show. Pick the most useful:
- Who used it, and how many? (real users, team, class, just you)
- Any measurable result? (time saved, speed, cost, uptime, grade, feedback)
- Your exact role, if there is more than one significant contributor.
- Target job or audience (e.g. "junior DevOps roles", "French recruiters").

Also confirm which outputs and which language (English or French) if the request does not say. Accept "skip" for any question; keep `[metric?]` placeholders then.

### 4. Generate

Produce only the outputs the user asked for. Before writing, read the matching files:

| Output | Read |
| --- | --- |
| CV bullets / resume entry | [references/cv-rules.md](references/cv-rules.md) and [templates/cv-section.md](templates/cv-section.md) |
| LinkedIn post | [references/linkedin.md](references/linkedin.md) |
| X post + first reply (or thread) | [references/x.md](references/x.md) |
| Portfolio card | [templates/portfolio-card.md](templates/portfolio-card.md) |
| Any output | [references/style-guide.md](references/style-guide.md) (always) |

Language: write in the language the user asked for (English or French). For French, use the French verb list in cv-rules.md and the French banned phrases in style-guide.md. Keep tech names in their original form (Docker, GitHub Actions).

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
- <README claims not backed by the code>
- <placeholders the user should fill, e.g. [metric?] in bullet 2>
```

Keep the flags list short. Write "none" if empty.
