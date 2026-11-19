# Architecture

Stand 19. November 2026.

## Overview

The VHS-Förderfinder is a single Next.js app. The browser holds the conversation, project profile, selected programme and application interview state, and sends them with every request to one server route, `POST /api/chat`. The server combines the JSON catalogue, the scraper database and Langdock (`gpt-5.1`) and returns a reply, the updated profile and, after a new search, matches.

```text
Browser (src/components/funding-workspace.tsx)
   │  POST /api/chat  { action, message, history, profile, selectedProgrammeId, application }
   ▼
Route (src/app/api/chat/route.ts) ── request-guard.ts: origin, size, rate limit
   ▼
chat.ts ──► langdock.ts ──► Langdock Responses API (gpt-5.1, structured output, store: false)
   │   ├── catalog.ts ◄── data/json/foerderprogramme.json  ◄── npm run import:catalog ◄── raw/ (Excel, Word)
   │   │       └──── scraper-db.ts ◄── data/database.sqlite ◄── npm run scrape / npm run review
   │   ├── checklist.ts   (application checklist from catalogue facts)
   │   └── application.ts (fixed application interview, no model call)
   ▼
{ reply, profile, matches?, selectedProgramme?, application? }   or 503 with the whole catalogue
```

## Technologies

- **Next.js 16 (App Router), React 19, TypeScript** for UI and API in one app.
- **OpenAI SDK** against Langdock's OpenAI-compatible endpoint (EU cloud), model `gpt-5.1`.
- **Zod** for the API contract and to validate model output (`src/lib/chat/contract.ts`).
- **SheetJS CE** for the local Excel import.
- **`node:sqlite`** (built into Node 22.13+) for the scraper database, read-only in the app.
- **node:test** and **jsdom** for tests, GitHub Actions for CI.

## Components

| Component | Responsibility |
| --- | --- |
| `src/components/funding-workspace.tsx` | Chat, quick replies, project details form, match cards, page status hints |
| `src/app/api/chat/route.ts` | Parses the request, applies the guard, maps errors to HTTP status codes |
| `src/lib/server/request-guard.ts` | Allowed origins, 100 KB limit, 20 requests per minute and IP |
| `src/lib/server/chat.ts` | Prompting, profile extraction, filtering of matches (catalogue IDs, open call, region) |
| `src/lib/server/catalog.ts` | Catalogue access, availability rules, search context |
| `src/lib/server/scraper-db.ts` | Live, cached read of page status and reviewed extractions |
| `src/lib/server/checklist.ts` | Checklist with requirements backed by the profile, documents and deadline from the catalogue |
| `src/lib/server/application.ts` | Application interview with format checks, ESF-specific and general question sets |
| `scripts/import-catalog.mjs` | Excel and Word documents to `data/json/foerderprogramme.json` |
| `scripts/scrape-sources.mjs` | Polite fetch of programme pages (robots.txt, crawl delay), change detection, optional extraction |
| `scripts/review-extraction.mjs` | Human approval or rejection of extracted facts |

## Data flow

1. The catalogue is built offline from `raw/` and committed as JSON. It is bundled into the app at build time.
2. The scraper stores page snapshots and extraction proposals in `data/database.sqlite`. A person reviews them. The app reads the database at runtime and refreshes at most once a minute. Reviewed facts can only close a programme, never open one.
3. For a message, the model receives the profile, the history and the full catalogue with availability and reviewed page facts. The server validates its structured output and keeps at most three matches.
4. Nothing is stored on the server. Conversation and interview answers live in the browser only.

## External interfaces

- **Langdock Responses API**: `LANGDOCK_API_KEY`, `LANGDOCK_BASE_URL`, `LANGDOCK_MODEL`. Timeout 45 s, then HTTP 503 with the catalogue.
- **Official programme pages**: fetched only by the scraper, never by the app at request time. `SCRAPER_CONTACT` goes into the user agent.
- **Embedding**: `CHAT_ALLOWED_ORIGINS` for additional origins. An iframe embed would also need a `frame-ancestors` header, which is not set.

All names are in `.env.example`. API details: [api-chat.md](api-chat.md).
