# Full CV template (CV.md)

Copy everything inside the outer fence into the CV.md file. Rules:
- Keep the front matter keys and the `##` section names exactly as written, in this order. A future CLI or PDF/HTML export reads them.
- Remove a whole section only if it would be empty. Remove a front matter key if the value is unknown.
- Keep placeholders like `[dates?]` or `[metric?]` visible when a fact is missing.
- Plain Markdown only: no tables, no images, no emoji, no HTML.
- French CV: keep the front matter keys in English (programs read them), write all values and text in French, and use the French section names listed at the end.

````markdown
---
name: <Full Name>
title: <Short title, e.g. Junior DevOps Engineer>
location: <City>
country: <Country>
remote: <yes | no | hybrid>
relocation: <yes | no>
status: <e.g. Open to an internship from June 2027 (6 months)>
email: <email>
phone: <only if the user agreed>
website: <url>
github: <url>
linkedin: <url>
language: <en | fr>
updated: <YYYY-MM-DD>
---

# <Full Name>

<Title> · <City>, <Country>

## Summary

<2-3 sentences: who you are, what you build with which tech, what you are looking for.>

## Experience

### <Role> — <Company>
<City or Remote> · <Mon YYYY> – <Mon YYYY or Present>

- <Action verb + what + tech + result or [metric?]>
- <...>

## Projects

### <Project name> — <one-line description>
<Solo project | Co-developed with <name> | Contributor> · <Mon YYYY> – <Mon YYYY> · <link>

Tech: <tech 1>, <tech 2>, <tech 3>

- <Action verb + what + tech + result or [metric?]>
- <...>

## Open Source

### <owner/repo> — <one-line description>
<n merged PRs, only if a source says so> · <link>

- <What you contributed (PR numbers if known)>

## Skills

- **<Domain, e.g. DevOps & Infrastructure>:** <skill>, <skill>, <skill>
- **<Domain>:** <skill>, <skill>

## Education

### <Degree or program> — <School>
<City> · <YYYY> – <YYYY or Present>

## Languages

- <Language>: <level as the user stated it>

## Interests

<One line, only from the sources or the user.>
````

French section names: Résumé, Expériences, Projets, Open Source, Compétences, Formation, Langues, Centres d'intérêt.
