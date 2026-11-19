# Full CV workflow

Build a complete `CV.md` from the user's real sources. Output format: `templates/cv-full.md` (linked from SKILL.md).

## Contents
- Checklist
- 1. Collect sources
- 2. Scan repos
- 3. Profile sheet
- 4. Ask
- 5. Write CV.md (section rules)
- 6. Self-check
- 7. Save and report
- 8. Next step (offer)
- Privacy

## Checklist

```
cvcli full CV progress:
- [ ] 1. Collect sources
- [ ] 2. Scan repos
- [ ] 3. Profile sheet
- [ ] 4. Ask (max 5 questions)
- [ ] 5. Write CV.md
- [ ] 6. Self-check
- [ ] 7. Save and report
- [ ] 8. Offer the next step (style, share or nothing)
```

## 1. Collect sources

If the user has not named any sources, ask once which ones you can use: an old CV file, a website, LinkedIn text, GitHub repos or a GitHub profile. Default: the git repos in the current folder. Use every source the user gives. Read each one fully. Give each a short tag; you will cite tags in the profile sheet.

| Source | How to read | Tag |
| --- | --- | --- |
| Old CV (PDF, DOCX, MD, TXT) | Read the file | `[cv]` |
| Personal website / portfolio | Fetch the page(s) with a web fetch tool | `[site]` |
| LinkedIn | Ask the user to paste the text or a PDF export (LinkedIn blocks fetching) | `[linkedin]` |
| GitHub profile or repo URLs | Clone into a temp folder, then scan (step 2) | `[repo:<name>]` |
| User answers | From step 4 | `[user]` |

If a tool is missing (no web fetch, no PDF reader), ask the user to paste the text. Never guess what a source says.

An old CV, a website and a LinkedIn profile are the user's own **claims**. Use them for facts only the user can know (name, contact, dates, employers, education, languages). For claims about projects (features, numbers, tech), check them against the repos (honesty rule 5).

## 2. Scan repos

Scan every project repo the sources link to, plus any repo the user names. If there are many (more than ~8), ask which ones matter most.

For each repo, keep a 2-3 line fact sheet (stack, scale, infra/tests, contributors and the user's share). Then check the claims the old CV and the website make about it:
- Every number (users, %, pages, tests): find it in the repo or mark it unsupported.
- Every feature: find it in the README or the code (a quick `grep` is fine).
- The user's role: compare with `git.contributors` (honesty rule 3).

Also note strong facts the old CV **misses** (e.g. an eBPF engine, release packaging, CI with tests). These are often the best additions.

## 3. Profile sheet

Show the user a short profile sheet before writing. One line per item, each with its source tags:

```
**Profile sheet: <full name>**
- Title / target: ...                          [cv][site]
- Location: <city>, <country> · remote/relocation: ...   [cv]
- Status: open to <internship/job>, from <date?>          [cv]
- Experience: <n> items: <company — role (dates)>, ...    [cv][linkedin]
- Projects found: <name (main tech, solo/team)>, ...      [repo:*][site]
- Open source: <repo — what, count claimed>               [cv]
- Education / languages: ...                              [cv]
- Interests: <unknown>
- Flags: <claims not backed by code; conflicts between sources>
```

When two sources disagree (e.g. different dates on the CV and LinkedIn), list it under Flags and ask.

## 4. Ask

Ask at most 5 questions, in one message, only about gaps the sources cannot fill. Pick the most useful:
- Target: which job or internship, which country or company type?
- Availability: start date and duration (for an internship).
- Role in team projects (when git shows other significant contributors).
- Measurable results only the user knows (users, grades, time saved).
- Interests outside work (optional; skip the section if none).
- Contact details: which ones to include (phone? full address? only city and country?).

Accept "skip". Keep placeholders for skipped facts.

**Follow up instead of guessing.** If an answer is empty or unclear (e.g. the user picked an option but typed nothing), ask again once, with concrete choices built from the sources (e.g. interests that match their projects). Also ask when you find a new gap while writing (e.g. a project with no dates). Ask in short rounds; do not silently fill a gap.

## 5. Write CV.md (section rules)

Fill `templates/cv-full.md`. Keep the section names and their order: a future CLI or PDF/HTML export reads them. Leave out a section only if it would be empty, and never invent content to fill it. Apply `cv-rules.md` and `style-guide.md`.

**Length.** Junior / student: one page (about 500-750 words). Experienced: two pages max.

**Front matter.** Plain facts only: name, title, location, country, status, contact links. No marketing words.

**Summary.** 2-3 sentences. Who you are (study or role), what you build (real tech from the repos), what you look for (from the sources or the user). No "passionate", no "hard-working", no years of experience the sources do not show.

**Experience.** Most recent first. For each: role, company, city/remote, dates, 1-3 bullets. Use only what the old CV, LinkedIn or the user says; a company's internal work cannot be checked, so do not add details.

**Projects.** Pick the 3-4 strongest for the target. Order by relevance to the target, not by date. For each: name, one-line description, role (solo / co-developed with X / contributor), dates from git (first-last commit) unless the user gave dates, a tech line, 2-4 bullets, link. Base bullets on verified facts from step 2.

**Open source.** Repo, what the user did, PR count only if a source states it (mark `[cv]`-only counts as unverified in Flags).

**Skills.** Group by domain (e.g. DevOps & Infra, Languages, Frameworks, Data & Testing). Put first the skills seen in the scanned repos. Keep skills that only the old CV lists, but name them in Flags ("no evidence in the scanned repos; keep only if you can discuss them in an interview"). Never add a skill that no source mentions.

**Education, Languages.** From the sources. Language levels as the user stated them.

**Interests.** Only from the sources or the user. 1 line. Skip if unknown.

**Contact.** Only what the user agreed to show (see Privacy).

## 6. Self-check

Check every line of CV.md:
1. It has a source: `[cv]`, `[site]`, `[linkedin]`, `[repo:*]` or `[user]`. No source → remove it.
2. Every number has a source. Project numbers must come from a repo or the user, not only from the old CV or the website.
3. Roles in team projects follow honesty rule 3.
4. No banned phrase (style-guide.md), no emoji, no tables inside sections (ATS).
5. Section names and order match the template.

If a check fails, fix it and check again.

## 7. Save and report

- Save to the path the user chose; default `CV.md` in the current folder. If the file exists, ask before overwriting.
- Do not put source tags in the saved file. Show them in the report instead.
- Report in chat: the path, a short **Changes vs old CV** list (removed claims, added strengths), and **Flags** (unsupported claims, unverified counts, placeholders to fill, source conflicts).

## 8. Offer the next step

After the report, offer what can come next, in plain words, in one message:

```
Your CV is ready. What next?
- Choose how your terminal CV looks (/cvcli style)
- Share it: a version people open in their terminal with one command (/cvcli share)
- Nothing for now
```

Run no cvcli command without a yes. Default: nothing for now. If the user picks one, follow [style.md](style.md) or [share.md](share.md).

## Privacy

- A CV holds personal data. Ask before including a phone number or a street address; city and country are usually enough.
- If the user's project is a public git repo, warn them before saving CV.md inside it, or suggest adding it to `.gitignore`.
- Never send CV content to any service the user did not ask for.
