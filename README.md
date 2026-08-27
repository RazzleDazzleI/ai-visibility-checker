# ai-visibility-checker

Does an AI assistant recommend your business when someone asks it for one?

Traditional rank tracking answers "where am I on Google." It doesn't answer that question, because assistants synthesize an answer from grounded search rather than returning a ranked list. This tool asks the assistants directly, with web grounding on, and reports whether a business is named — and which sources the model actually cited.

**Full-stack:** Node/Express API + React dashboard.

---

## What it does

1. Takes a business name, niche, and city
2. Issues natural buyer-intent queries ("best mobile detailer in Omaha") to **two independent providers** with web grounding enabled
3. Parses each response for a mention of the business
4. **Extracts the citation URLs the model grounded on** — this is the actionable part
5. Filters citations into *directories* (Yelp, BBB, Angi, Nextdoor…) vs *first-party sources*, which tells you whether the model is finding the business itself or only aggregators talking about it
6. Persists results to SQLite so change over time is visible
7. Renders it as a dashboard with per-provider history

## The dashboard

React + Vite. Three views:

- **Overview** — current mention status per provider, with the trend line
- **Citations** — what each model grounded on, split directory vs first-party
- **History** — results over time, since a single run is a snapshot and the trend is what matters

State via TanStack Query, charts via Recharts, no component library — the CSS is hand-written and small.

## Provider strategy

Two providers, deliberately tiered by cost:

| Provider | Model | When |
|---|---|---|
| Google | `gemini-2.5-flash` with Google Search grounding | **Always.** Grounding is included on the free tier |
| OpenAI | `gpt-5-nano` with the `web_search` tool | **Behind a flag** (`USE_OPENAI=1`) — cheapest model carrying the search tool |

*(Model IDs current as of August 2026.)*

Running the free-tier provider on every check and gating the paid one keeps a scheduled job over many businesses affordable. Cost per run is a design constraint here, not an afterthought.

## Why citations matter more than the mention

A yes/no mention is a vanity metric. The citation list is diagnostic:

- Cited **only via directories** → the model knows the *category* but not the *business*; the fix is first-party content and structured data
- Cited via **first-party pages** → the site is being retrieved directly; the fix is different
- **Not cited at all** while competitors are → a retrieval problem, not a ranking problem

That distinction is the difference between a report someone can act on and a number they can't.

## Running it

```bash
cp .env.example .env      # add GEMINI_API_KEY; OPENAI_API_KEY optional
npm install
npm run dev               # API on :3001, dashboard on :5173
npm run check -- --business "Example Co" --niche "plumbing" --city "Omaha, NE"
```

## Stack

**Backend** Node.js 22 · Express · SQLite · native `https` (no SDK — the request shapes are small and the dependency isn't worth it)
**Frontend** React 19 · Vite · TanStack Query · Recharts
**Testing** Vitest, with recorded provider fixtures so tests don't burn API quota

## Notes

Ships with synthetic fixtures. Real provider calls need your own API keys.
