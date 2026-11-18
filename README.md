# cvcli

**Turn your real code into honest CV bullets, a LinkedIn post and an X post, with one command and no fake metrics.**

![Demo GIF placeholder](docs/demo.gif)
<!-- TODO: record a short GIF of "/cvcli" running on a repo and save it as docs/demo.gif -->

cvcli is an open-source [Agent Skill](https://agentskills.io) for Claude Code. It scans a git repository (languages, frameworks, Docker/CI/Kubernetes/Terraform, tests, git history), shows you a fact sheet, asks up to 3 questions, and then writes:

- 3-5 ATS-friendly CV bullets (English or French)
- a LinkedIn post (link goes in the first comment)
- an X post + first reply (or a short thread)
- a portfolio card

It is not magic. It gives you **consistency**: the same workflow every time, platform rules stored as Markdown files you can edit, and every claim checked against your actual repo.

## Install (30 seconds)

Copy the `cvcli/` folder into your skills folder.

**For all your projects** (personal skill):

```bash
git clone https://github.com/YasserYG8/cvcli-skill.git
cp -r cvcli-skill/cvcli ~/.claude/skills/
```

**For one project only** (project skill, can be committed with the project):

```bash
cp -r cvcli-skill/cvcli <your-project>/.claude/skills/
```

Windows (PowerShell):

```powershell
git clone https://github.com/YasserYG8/cvcli-skill.git
Copy-Item -Recurse cvcli-skill\cvcli "$HOME\.claude\skills\"
```

Requirements: Python 3.9+ and git. No pip install, no API keys, no external services.

## Usage

In Claude Code, inside your project:

```
/cvcli
```

Or just ask in plain words; the skill loads by itself:

```
Turn this repo into 4 CV bullets for a junior DevOps job.
Write a LinkedIn post about ~/code/shop-api, in French.
Give me an X post and a portfolio card for this project.
```

What happens:

1. **Scan**: runs `scripts/scan_repo.py` and reads the JSON.
2. **Fact sheet**: what the project is, stack, scale, infra, tests, contributors.
3. **Ask**: at most 3 questions the code cannot answer (users, results, your role, target job). Say "skip" to any of them.
4. **Generate**: only the outputs you asked for.
5. **Self-check**: every claim is checked against the fact sheet and your answers. Anything unsupported is removed.

See [examples/](examples/) for a full dry run on this repo.

You can also run the scanner alone:

```bash
python3 cvcli/scripts/scan_repo.py /path/to/repo
```

## No fake metrics

Most AI-written CV bullets say things like "improved performance by 40% for 10,000 users". Recruiters see this all the time, and an interviewer can ask you about it. cvcli follows strict rules:

- **No invented numbers.** No users, stars, speedups or savings that you did not give. A missing number stays visible as `[metric?]`, so you can fill it in or delete it.
- **No fake solo work.** If git history shows other people with a real share of the commits (10% or more, bots excluded), cvcli asks what *your* role was before writing "built".
- **No README hype.** If the README says "Kubernetes-ready" but there is no Kubernetes manifest, cvcli flags it instead of repeating it.
- **Commit share is not code share.** cvcli does not turn "60% of commits" into "wrote 60% of the code".

## Project layout

```
cvcli/                  # the skill (this is what you install)
├── SKILL.md            # workflow + honesty rules (short)
├── references/         # platform rules, loaded only when needed
│   ├── cv-rules.md
│   ├── linkedin.md
│   ├── x.md
│   └── style-guide.md
├── templates/          # output templates
│   ├── cv-section.md
│   └── portfolio-card.md
└── scripts/
    └── scan_repo.py    # stdlib-only repo scanner (JSON output)
examples/               # dry run output
tests/                  # pytest tests for the scanner
```

## Contributing new platform rules

Platform rules are plain Markdown. You can add a new platform or language without touching Python:

- **New platform** (e.g. `references/devto.md`, `references/github-profile.md`): copy the shape of `references/x.md` (Last reviewed date, rules, output format, example), then add one row to the "Generate" table in `SKILL.md`.
- **New CV language** (e.g. German, Spanish): add a verb list to `references/cv-rules.md`, banned phrases to `references/style-guide.md`, and a block to `templates/cv-section.md`.
- **New framework or infra detection**: add an entry to `KNOWN_FRAMEWORKS` (or the infra rules) in `scripts/scan_repo.py`, plus a test.

Details in [CONTRIBUTING.md](CONTRIBUTING.md).

## Run the tests

```bash
pip install pytest
python -m pytest -q
```

## License

[MIT](LICENSE)
