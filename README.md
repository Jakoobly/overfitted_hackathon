# Overfitted

![Team size: 3](https://img.shields.io/badge/team-3-blue)
![Status: Preparing](https://img.shields.io/badge/status-preparing-orange)

We are **Overfitted**, a team of three Business Informatics students at the University of Hohenheim. We explore how AI can help solve challenges in continuing education.

This repository is our shared workspace for the **KI-Hackathon für Weiterbildungsanbieter**. It provides lightweight project organization so we can start building as soon as the challenge is announced.

- [Team schedule and deadlines](docs/hackathon-zeitplan.md)
- [Official hackathon website](https://ki-hackathon.com/)
- [Official agenda](https://ki-hackathon.com/ki-hackathon-fuer-weiterbildungsanbieter-agenda/)

## Challenge

The VHS-Förderfinder helps adult education centres describe a project in chat and find relevant funding programmes. After choosing a programme, they receive a checklist of requirements, documents and next steps in the same chat. The [hackathon specification](docs/vhs-foerderfinder.md) defines the MVP, Excel data flow and demo acceptance criteria.

## Tech stack

The starter uses Next.js App Router, React and TypeScript. The OpenAI SDK and Zod are available for the Langdock chat integration. SheetJS CE is a development dependency for the local Excel import. See the [technology proposal](docs/vhs-foerderfinder.md#technikvorschlag) for the planned data flow.

## Repository structure

```text
src/app/                   Next.js pages and layout
src/app/api/chat/          Location for the chat route
src/components/            Chat and funding result UI
src/lib/funding/           Funding types and matching logic
src/lib/server/            Server-side OpenAI and catalogue access
scripts/                   Local Excel import scripts
raw/                       Existing source documents
data/json/                 Runtime JSON catalogue
mockups/                   Static UI drafts
docs/                      Specification and team schedule
tests/                     Tests
```

## Setup

Use Node.js 22.13+ (22.x) or 24.x and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the starter page. On Windows PowerShell, use `npm.cmd` if script execution is restricted.

For chat development, copy `.env.example` to `.env.local`. Set `LANGDOCK_API_KEY` to a VHS Langdock workspace key with Completion API access and `LANGDOCK_MODEL` to an available model ID. The template uses Langdock Cloud's EU base URL. For a dedicated Langdock deployment, set `LANGDOCK_BASE_URL` to the corresponding OpenAI-compatible endpoint root. Keep the key on the server and out of Git. The starter page runs without a key. [Langdock Responses API](https://docs.langdock.com/en/developer/completion-api/openai-responses)

Run `npm run lint` and `npm run typecheck` before committing. Use `npm run build` to check the production build and `npm start` to serve it locally.

Run `npm test` for the two core demo flows. They exercise funding matching (clarification, project adjustment, region exclusion) and programme-specific chat answers (document requirements after selecting and switching programmes). GitHub Actions runs these tests and the Next.js build on pushes and pull requests to `main`. The tests run against the current local mockups and use their simulated chat responses.

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

TBD: prototype summary, demo link, screenshots, validation against success criteria, known limitations, and final submission.
