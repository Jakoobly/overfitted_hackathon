# Overfitted

![Team size: 3](https://img.shields.io/badge/team-3-blue)
![Status: Demo ready](https://img.shields.io/badge/status-demo%20ready-brightgreen)

We are **Overfitted**, a team of three Business Informatics students at the University of Hohenheim. We explore how AI can help solve challenges in continuing education.

This repository is our shared workspace for the **KI-Hackathon für Weiterbildungsanbieter**. It contains our prototype, the VHS-Förderfinder, and the handoff documentation for the Volkshochschulverband Baden-Württemberg.

- [Team schedule and deadlines](docs/hackathon-zeitplan.md)
- [Official hackathon website](https://ki-hackathon.com/)
- [Official agenda](https://ki-hackathon.com/ki-hackathon-fuer-weiterbildungsanbieter-agenda/)

## Challenge

The VHS-Förderfinder helps adult education centres describe a project in chat and find relevant funding programmes. After choosing a programme, they receive a checklist of requirements, documents and next steps in the same chat. The [hackathon specification](docs/vhs-foerderfinder.md) defines the MVP, Excel data flow and demo acceptance criteria.

## Tech stack

Next.js App Router (16), React 19 and TypeScript. The chat route calls `gpt-5.1` through Langdock's OpenAI-compatible Responses API with the OpenAI SDK, and validates requests and model output with Zod. SheetJS CE imports the Excel catalogue locally. The programme page scraper and the app share a SQLite database through Node's built-in `node:sqlite`. See the [architecture overview](docs/architecture.md).

## Repository structure

```text
src/app/                   Next.js pages and layout
src/app/api/chat/          Chat route
src/components/            Chat and funding result UI
src/lib/chat/              Shared API contract (types, Zod schemas)
src/lib/server/            Langdock access, chat logic, catalogue, checklist, application interview, request guard, scraper database reader
scripts/                   Excel import, programme page scraper, extraction review, live smoke test
raw/                       Source documents (Excel, Word)
data/json/                 Runtime JSON catalogue
data/ergaenzungen/         Verified application documents per programme
data/database.sqlite       Scraper database (page snapshots, extractions, review state)
mockups/                   Static UI drafts from the first hour
docs/                      Specification, API contract, architecture, decisions, VHS handoff
tests/                     Tests
```

## Setup

Use Node.js 22.13+ (22.x) or 24.x and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the Förderfinder. On Windows PowerShell, use `npm.cmd` if script execution is restricted.

For chat and funding results, copy `.env.example` to `.env.local`. All configuration names are listed there. Set `LANGDOCK_API_KEY` to a VHS Langdock workspace key with Completion API access and `LANGDOCK_MODEL` to an available model ID. The template uses Langdock Cloud's EU base URL. For a dedicated Langdock deployment, set `LANGDOCK_BASE_URL` to the corresponding OpenAI-compatible endpoint root. Keep the key on the server and out of Git. Restart the dev server after changing these values. [VHS handoff](docs/uebergabe-vhs.md)

Run `npm run lint` and `npm run typecheck` before committing. Use `npm run build` to check the production build and `npm start` to serve it locally.

Run `npm test` without a Langdock key. It tests the chat route against a simulated Langdock (matching, checklist, application interview, abuse limits, KI outage fallback, scraper database), checks that the catalogue matches the import, and runs the flows of the static mockups. Stop `npm run dev` first, because the tests start their own dev server. GitHub Actions runs the tests and the Next.js build on pushes and pull requests to `main`. `npm run smoke:chat` replays the demo live against a running app with the real key and uses tokens.

Further scripts: `npm run import:catalog` (Excel and Word to JSON catalogue), `npm run scrape` (programme pages into the SQLite database, `--extract` with Langdock, `--report` for the current state) and `npm run review` (approve or discard extracted facts). Details in the [VHS handoff](docs/uebergabe-vhs.md).

## Collaboration

1. Agree on a small task, create an issue, and assign one owner.
2. Work on `main` by default. Check the current state and fast-forward before starting:
   ```sh
   git switch main
   git fetch origin
   git status -sb
   git pull --ff-only origin main
   ```
3. Run the quickest relevant check and make a focused commit using the conventions in [AGENTS.md](AGENTS.md), such as `docs: add challenge overview`.
4. Fetch again and check `git status -sb` before pushing directly with `git push origin main`. If `origin/main` has advanced, integrate it and rerun the relevant checks before pushing.

Create a separate branch only when explicitly requested. For that workflow, open a pull request using the template, link the issue, describe how you tested the change, and ask a teammate to review before merging.

Use Discord for quick coordination and debugging. Keep tasks in issues and record important technical decisions in [the decision log](docs/decisions.md). This workflow is a team convention; branch protection is not configured by these files.

## Results

The VHS-Förderfinder runs end to end locally (19 November 2026):

1. A VHS describes its project in free text. The chat asks one targeted follow-up question and extracts a project profile (shown and editable as „Projekteckdaten“).
2. The server sends the profile and the whole catalogue of 24 programmes to `gpt-5.1`. It keeps only catalogue IDs, drops programmes without an open call or outside the region, and shows up to three matches with status and reasoning.
3. „Antrag vorbereiten“ adds a checklist with requirements, documents, deadline and sources from the catalogue to the chat. Free questions about the selected programme are answered from its catalogue entry.
4. „Antrag erfassen“ runs a fixed interview (14 questions for the ESF-Fachkursförderung, 10 general ones otherwise) with format checks and a summary.
5. Each programme card shows when the scraper last checked the official programme page. Reviewed facts from those pages can close a programme.
6. If the AI is unavailable, the chat says so and lists the whole catalogue.

Verified with `npm test`, two full live smoke runs, and in the browser on desktop and phone width. No public deployment yet. Known limitations and open points for the VHS: [VHS handoff](docs/uebergabe-vhs.md#bekannte-einschränkungen).
