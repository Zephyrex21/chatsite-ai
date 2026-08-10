# Demo Video Script

Target: 60-90 seconds. Nobody watches a 5-minute project demo all the
way through — tight and confident beats comprehensive.

## Recommended tools

- **Screen recording:** OBS Studio (free) or the built-in Windows
  Game Bar (`Win+G`) — either is fine for this length.
- **No need to record audio/narration** if you're not comfortable with
  it — text captions or just letting the UI speak for itself both work.
  If you do narrate, write out what you'll say first; reading naturally
  off a script beats improvising.
- **Trim/export:** Clipchamp (built into Windows, free) is enough —
  you don't need professional editing software for this.

## The shot list

Follow this order — it's structured to show the product working, then
one technical detail that proves it's not a toy.

**1. (0:00–0:08) Cold open on the landing page**
Just let it sit for a couple seconds — the claymorphic hero, the blob
animation. This is your first impression; don't rush past it.

**2. (0:08–0:20) Paste a real URL, hit "Start chatting"**
Pick something with actual content — a real blog post, a docs page, a
product page. Not `example.com` (too obviously a placeholder for a real
demo). Let the loading state show — it's designed, not a spinner.

**3. (0:20–0:40) Ask a real question, let the answer stream in**
Type it live rather than pasting — watching the streaming response
land is more convincing than a jump-cut to a finished answer. Ask
something the page actually covers, so the answer is visibly accurate.

**4. (0:40–0:50) One follow-up question**
This is the one non-obvious thing worth 10 seconds: ask something that
only makes sense if it remembers the earlier exchange (e.g. "what about
X" without re-stating context). Proves it's a real conversation, not
independent Q&A.

**5. (0:50–1:05) Quick feature tour**
Fast cuts, ~3-4 seconds each: dark mode toggle, the session sidebar
with a couple past conversations, the share button (show the copied
link, maybe paste it in a new tab briefly), the export download.

**6. (1:05–1:15) Close**
Either: end on the chat screen looking clean, or a 2-second title card
with the GitHub link. Don't fade to a generic "thanks for watching" —
just stop on something good-looking.

## What to skip

- Don't demo sign-in/OAuth flow on camera — third-party auth screens
  look identical to every other app's and add nothing.
- Don't show terminal/code in this video — this is the _product_ demo.
  A separate, optional "how it's built" walkthrough (screen-sharing the
  README/architecture diagram) is a different, lower-priority video if
  you want one later.
- Don't apologize for anything on camera ("sorry this is a bit slow" —
  just cut around slow moments instead).

## Where it goes

Once recorded:

1. Upload to GitHub directly (drag the file into a comment/README edit
   on GitHub — it hosts video files natively up to a decent size) _or_
   host on YouTube (unlisted is fine) and embed a thumbnail link.
2. Add it near the top of the README, right after the badges — that's
   prime real estate, higher-value there than buried at the bottom.
3. Link it from `docs/case-study.md`'s "Try it" section too.
