# Waypoint

I kept losing track of which LeetCode problems I had solved, which ones I was
supposed to revise, and whether any of it showed up on my GitHub. So I built
this to keep all of it in one place.

## What it is

Three things that talk to each other:

- A web dashboard. Track solved problems by topic and difficulty, set targets,
  follow a roadmap, import your LeetCode history from CSV, and see a
  leaderboard if you add friends.
- A browser extension. When LeetCode accepts your submission, it commits the
  solution to your GitHub repo (like LeetHub) and syncs the solve back to the
  dashboard, so everything stays current without me doing anything.
- An ATS score evaluator (new). Paste your resume, get a score out of 100 with
  the specific fixes that will move it. Paste the job description too and it
  scores keyword match against what the ATS is actually filtering for. If you
  score under 90, it points you at a free ATS-safe builder instead of letting
  you apply with a losing resume.

## Repo layout

```
apps/web        React + Vite + TypeScript + Tailwind dashboard
apps/extension  Chrome extension that watches leetcode.com submissions
packages/shared Types and utilities shared between the two
supabase        Migrations plus edge functions (daily-import, leetcode-proxy)
```

## Running the web app

```
cd apps/web
npm install
npm run dev
```

Copy `apps/web/.env.example` and fill in your Supabase URL and anon key.

## Optional: AI-written resume feedback

The ATS evaluator works fully offline — the score, the breakdown, and the fix
list are all computed in the browser with plain rules. If you also want a
second opinion written by a model, get a free key at console.groq.com (no
card needed) and add it to `apps/web/.env`:

```
VITE_GROQ_API_KEY=gsk_...
```

That turns on a second-opinion feedback block on the ATS page (and the
floating assistant widget's chat). Without the key, the page works exactly
the same minus that one block. Fair warning: the key lives in the browser
bundle, so do not ship this to real users as-is — the Groq call should move
behind a Supabase edge function first.

Optionally add `VITE_GEMINI_API_KEY` too (free at aistudio.google.com/apikey)
as a fallback — it's only called if the Groq request comes back with nothing,
which covers Groq rate limits or Groq moving a model off its free tier out
from under you (this has happened before).

## Things I still want to do

- PDF/DOCX upload on the ATS page instead of copy-paste
- Move the Groq call into an edge function
- Per-topic revision reminders based on how long since I last solved something
- Dark mode that does not hurt my eyes

## Why it exists

Every tracker I tried either wanted a subscription, needed manual entry after
every solve, or looked abandoned. I wanted something I could actually hack on,
so here we are. It is rough in places. It gets better when I notice the rough
parts.
