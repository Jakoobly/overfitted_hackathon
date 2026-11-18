# Hackathon workflow

We are a team of three with one day to deliver a working prototype and demo.

## Work in short cycles

- Break work into slices of roughly 30–60 minutes. Give each slice one owner and a clear outcome. Coordinate before editing shared files or interfaces.
- Prioritize the end-to-end demo path. When time is tight, cut optional scope and keep a working version on `main`.
- Run the quickest relevant check and commit each coherent, verified slice. Push completed slices promptly so teammates can build on them.

## Keep your branch current

- Before starting or resuming a task and before pushing, run `git fetch origin` and check `git status -sb`. On a feature branch, compare against `origin/main` as well. Repeat at the end of each work cycle.
- Start new branches from an updated `main` using `git pull --ff-only origin main`. On an active feature branch, integrate `origin/main` when it advances, then rerun the relevant checks. Preserve local changes and coordinate with the team if branches diverge or conflicts affect someone else's work.
- Follow the pull request and teammate review workflow in the README. A direct push to `main` requires an explicit request. Use normal pushes and avoid rewriting shared history.

## Commit messages

- Use Conventional Commits in the form `<type>: <short imperative summary>`, for example `feat: add demo walkthrough`, `fix: handle empty input`, or `docs: record setup steps`.
- Use `feat` for features, `fix` for bug fixes, `docs` for documentation, `refactor` for behavior-preserving code changes, `test` for tests, and `chore` for maintenance.
