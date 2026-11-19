# Hackathon workflow

We are a team of three with one day to deliver a working prototype and demo.

## Work in short cycles

- Break work into slices of roughly 30–60 minutes. Give each slice one owner and a clear outcome. Coordinate before editing shared files or interfaces.
- Prioritize the end-to-end demo path. When time is tight, cut optional scope and keep a working version on `main`.
- Run the quickest relevant check and commit each coherent, verified slice. Push completed slices promptly so teammates can build on them.

## Keep the VHS handoff current

- Before closing each task, check whether its outcome changes anything the VHS needs to install, configure, deploy, operate, or verify the app. Update the relevant section of [the VHS handoff](docs/uebergabe-vhs.md) before closing the task.
- Capture changes to startup or deployment steps, website integration, catalogue updates, API settings and key expiry or rotation, verification results, known limitations, and ownership. Record variable names and where to configure them. Keep actual secrets in local or hosting secret storage.
- Replace outdated steps and mark pending or unverified items explicitly. Include the handoff update in the same commit as the relevant change where practical.

## Work on main

- Work on `main` and push verified commits directly to `origin/main` by default. Create a separate branch only when explicitly requested.
- Before starting or resuming a task, before pushing, and at the end of each work cycle, run `git fetch origin` and check `git status -sb`. Fast-forward `main` with `git pull --ff-only origin main` when it is behind. If local commits and `origin/main` diverge, preserve local changes, coordinate any conflicts with the team, and rerun the relevant checks after integrating.
- Use normal pushes and avoid rewriting shared history. When a separate branch is explicitly requested, start from updated `main` and use the pull request workflow in the README.

## Commit messages

- Use Conventional Commits in the form `<type>: <short imperative summary>`, for example `feat: add demo walkthrough`, `fix: handle empty input`, or `docs: record setup steps`.
- Use `feat` for features, `fix` for bug fixes, `docs` for documentation, `refactor` for behavior-preserving code changes, `test` for tests, and `chore` for maintenance.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
