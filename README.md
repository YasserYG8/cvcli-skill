# cvcli

**Turn your real code into honest CV bullets, a LinkedIn post and an X post, with one command and no fake metrics.**

![Demo GIF placeholder](docs/demo.gif)
<!-- TODO: record a short GIF of "/cvcli" running on a repo and save it as docs/demo.gif -->

cvcli is an open-source [Agent Skill](https://agentskills.io) for Claude Code. It has two modes.

**Full CV.** Give it your sources: an old CV (PDF), your website, your GitHub repos. It scans every repo, checks what your old CV claims against the code, asks about what it cannot know (availability, interests, which contact details to show), and writes a complete `CV.md`: summary, experience, projects, open source, skills, education, languages, interests. The file has a fixed structure (YAML front matter + fixed section names), so other tools can read it.

**One project.** It scans a git repository (languages, frameworks, Docker/CI/Kubernetes/Terraform, tests, git history), shows you a fact sheet, asks up to 3 questions, and then writes:

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

Requirements: Python 3.9+ and git. The optional terminal CV also needs Node.js 18+. No pip or npm install, no API keys, no external services.

## Usage

In Claude Code, inside your project, type `/cvcli` and a word, or just `/cvcli` to see a menu:

| Command | You get |
| --- | --- |
| `/cvcli` | a short menu of everything below |
| `/cvcli cv` | a complete `CV.md` from your old CV, website and repos |
| `/cvcli project` | CV bullets and a portfolio card for one repo |
| `/cvcli post` | a LinkedIn post, an X post, or both |
| `/cvcli style` | the look of your terminal CV, described in your own words ("calm", "like an old hacker screen") |
| `/cvcli share` | a terminal CV people open with one command, tested, plus the steps to share it on GitHub or npm |

You can add details after the word: `/cvcli post linkedin, in French`. You never need to run a command yourself: the AI runs them and tells you the result. Any question can be answered with "skip", "I don't know" or "you choose".

Or just ask in plain words; the skill loads by itself:

```
Build my full CV. Here is my old CV (cv.pdf), my site example.dev and my GitHub github.com/me.
Turn this repo into 4 CV bullets for a junior DevOps job.
Write a LinkedIn post about ~/code/shop-api, in French.
Give me an X post and a portfolio card for this project.
```

What happens with `/cvcli project` and `/cvcli post`:

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

## Terminal CV

After writing your `CV.md`, cvcli can turn it into a CV that people run in their terminal. The CLI comes with the skill (no install), and you can also run it straight from GitHub:

```bash
npx github:YasserYG8/cvcli-skill check CV.md     # check the format and list [placeholders?]
npx github:YasserYG8/cvcli-skill view CV.md      # preview it (letters jump to sections, t changes the layout, q quits)
npx github:YasserYG8/cvcli-skill pack CV.md      # make a shareable folder, e.g. ./ada-lovelace-cv/
```

**Choose a look.** There are 3 layouts and 5 accent colors:

| Layout | Looks like |
| --- | --- |
| `sidebar` (default) | a framed card: the section list on the left, one section on the right |
| `classic` | a paper CV: contact, skills and languages in a left column, the rest on the right, one page you scroll |
| `manpage` | a Unix manual page: `NAME`, `DESCRIPTION`, `EXPERIENCE`… |

Accents: `teal` (default), `blue`, `violet`, `green`, `amber`. Everything else is neutral gray, and colors adapt to your terminal (truecolor, 256 or 16 colors; `NO_COLOR` turns them off).

```bash
cvcli view CV.md --gallery                          # try every layout (t) and accent (a) on your real CV, Enter to choose
cvcli view CV.md --layout classic --accent violet   # preview one look
cvcli pack CV.md --layout classic --accent violet   # save it as the default of your package
```

The look is saved in the package's `cv.json`, not in `CV.md`. People who run your CV can press `t` to switch layouts. `--print` is always plain text, the same for every layout.

`pack` asks which contact details to include (the phone is off by default), then creates a small package with **no dependencies and no build step**. You can share it at three levels:

| Level | People run | You need |
| --- | --- | --- |
| 1. Test on your computer | `npx ./ada-lovelace-cv` | Node.js |
| 2. Share from GitHub | `npx github:<you>/ada-lovelace-cv` | a public GitHub repo (no npm account) |
| 3. Publish on npm | `npx ada-lovelace-cv` | an npm account; the generated `PUBLISHING.md` walks you through it |

The folder includes two GitHub Actions workflows. `check.yml` runs on every push and fails if the package would not run. `publish.yml` publishes to npm when you push a version tag, with npm trusted publishing, so no token is stored in your repo.

**Why "no build step" matters:** `npx github:...` runs the files that are in git. If a package's `bin` points to a build folder that is gitignored (like `dist/`), it works from npm but fails from GitHub with `command not found`. cvcli packages are plain JavaScript files, so the same folder works at all three levels.

## No fake metrics

Most AI-written CV bullets say things like "improved performance by 40% for 10,000 users". Recruiters see this all the time, and an interviewer can ask you about it. cvcli follows strict rules:

- **No invented numbers.** No users, stars, speedups or savings that you did not give. A missing number stays visible as `[metric?]`, so you can fill it in or delete it.
- **No fake solo work.** If git history shows other people with a real share of the commits or added lines (10% or more, bots excluded), cvcli asks what *your* role was before writing "built". Your commits are matched by email or git user name, so GitHub "noreply" merges still count as yours.
- **No README hype.** If the README says "Kubernetes-ready" but there is no Kubernetes manifest, cvcli flags it instead of repeating it.
- **Commit share is not code share.** cvcli does not turn "60% of commits" into "wrote 60% of the code".

## Project layout

```
cvcli/                  # the skill (this is what you install)
├── SKILL.md            # workflow + honesty rules (short)
├── references/         # platform rules, loaded only when needed
│   ├── full-cv.md      # full CV workflow
│   ├── style.md        # /cvcli style: the look of the terminal CV
│   ├── share.md        # /cvcli share: pack, test and share the terminal CV
│   ├── cv-rules.md
│   ├── linkedin.md
│   ├── x.md
│   └── style-guide.md
├── templates/          # output templates
│   ├── cv-full.md      # CV.md format (front matter + fixed sections)
│   ├── cv-section.md
│   └── portfolio-card.md
├── scripts/
│   └── scan_repo.py    # stdlib-only repo scanner (JSON output)
└── cli/                # terminal CV: check, view, pack (Node.js, no dependencies)
    ├── bin/cvcli.js
    ├── lib/            # parse.js, viewer.js (also the generated bin/cli.js), pack.js
    ├── templates/      # files of the generated package (workflows, README, PUBLISHING.md)
    └── test/           # node:test tests
package.json            # makes `npx github:YasserYG8/cvcli-skill` work
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
python -m pytest -q   # scanner
npm test              # terminal CV CLI (Node.js 18+)
```

## License

[MIT](LICENSE)
