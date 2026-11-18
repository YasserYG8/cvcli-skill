# LinkedIn post rules

Last reviewed: 2026-11-18. Platform behavior changes; check these rules again if this date is old.

## Structure

1. **Hook (line 1-2).** Only about the first 2-3 lines (~200 characters) show before "...see more". The hook must make a developer want to click. Use a concrete fact, a problem, or a short story start. No "I'm excited to announce".
2. **Body: short paragraphs.** 1-2 sentences each, a blank line between them. Easy to read on a phone.
   - The problem you solved (why the project exists).
   - What you built: the real stack from the scan.
   - One interesting technical detail or lesson (a bug, a trade-off, a DevOps step).
   - Result, only if the user gave one. Otherwise `[metric?]` or skip.
3. **End with 1 specific question.** Not "Thoughts?". Ask something a developer can answer, e.g. "How do you test your Docker images in CI?"
4. **3-5 hashtags max**, on the last line. Specific beats generic: `#GitHubActions` beats `#Tech`.

## Links and media

- Put external links (GitHub, demo) in the **first comment**, not in the post body. Write "Link in the first comment" in the post.
- Native media (an image, a short screen recording, a document/carousel) is preferred over a link preview.
- Suggest a visual: a screenshot of the app, a diagram of the pipeline, or a GIF of the CLI.

## Length

- 600-1,300 characters is a good target for a project post. Hard limit: 3,000 characters.
- Cut every sentence that does not add a fact.

## Output format

```
**LinkedIn post**
<post text>

**First comment**
<link line, e.g. "Code: https://github.com/<user>/<repo>"; use [link?] if unknown>

**Visual idea**
<one line>
```

## Example (English)

```
My CI pipeline used to take [metric?] minutes. Most of it was rebuilding the same Docker layers.

So I rebuilt my side project, a Flask + React shop API, around one goal: fast feedback.

What changed:
- Multi-stage Dockerfile, so dependencies are cached
- GitHub Actions runs pytest and Jest on every push
- One docker compose up for the whole stack

The biggest lesson: order your Dockerfile from "rarely changes" to "often changes".

What is the one change that made your CI faster?

#Docker #GitHubActions #DevOps #Python
```
