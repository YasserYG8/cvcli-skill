# X (Twitter) post rules

Last reviewed: 2026-11-18. Platform behavior changes; check these rules again if this date is old.

## Main post

- **Hook first.** The first line carries the post. Lead with the concrete thing: what it does, or a surprising fact from the repo.
- **Short and punchy.** Aim for under 280 characters, even if the account allows longer posts. One idea per post.
- **No external link in the main post.** Put it in the first reply. Links in the main post usually reduce reach.
- **Native media.** A screenshot, a short video or a GIF of the tool running works better than a link card.
- **0-2 hashtags**, or none. Emojis: 0-2 max (see style-guide.md).
- Plain words. No "🚀 Thrilled to share".

## First reply

- The link (GitHub, demo, write-up). Use `[link?]` if unknown.
- Optional: one extra fact (stack, license, "open source, MIT").

## Thread format (optional, for longer stories)

Use a thread only if the user asks, or if there is a real story (problem → attempts → solution).
- 3-6 posts. Each post must make sense alone.
- Post 1: the hook + "🧵" or "A thread:" (optional).
- Middle posts: one step or lesson each, with real details from the repo.
- Last post: the result (or `[metric?]`), then the link, or put the link in a reply to the last post.
- Number posts (1/5, 2/5) only if the thread has 4 or more posts.

## Output format

```
**X post**
<post text>

**First reply**
<link + optional extra fact>

**Media idea**
<one line>
```

## Example

```
X post:
I got tired of writing CV bullets that said "worked on various projects".

So I made a Claude Code skill that reads your repo and writes bullets backed by your actual code and git history. No made-up metrics.

First reply:
Open source (MIT): [link?]
Python stdlib scanner + Markdown rules you can edit.
```
