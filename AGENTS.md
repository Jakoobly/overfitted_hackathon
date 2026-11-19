# Hackathon workflow

We are a team of three with one day to deliver a working prototype and demo.

## Work in short cycles

- Break work into slices of roughly 30–60 minutes. Give each slice one owner and a clear outcome. Coordinate before editing shared files or interfaces.
- Prioritize the end-to-end demo path. When time is tight, cut optional scope and keep a working version on `main`.
- Run the quickest relevant check and commit each coherent, verified slice. Push completed slices promptly so teammates can build on them.

## Work on main

- Work on `main` and push verified commits directly to `origin/main` by default. Create a separate branch only when explicitly requested.
- Before starting or resuming a task, before pushing, and at the end of each work cycle, run `git fetch origin` and check `git status -sb`. Fast-forward `main` with `git pull --ff-only origin main` when it is behind. If local commits and `origin/main` diverge, preserve local changes, coordinate any conflicts with the team, and rerun the relevant checks after integrating.
- Use normal pushes and avoid rewriting shared history. When a separate branch is explicitly requested, start from updated `main` and use the pull request workflow in the README.

## Commit messages

- Use Conventional Commits in the form `<type>: <short imperative summary>`, for example `feat: add demo walkthrough`, `fix: handle empty input`, or `docs: record setup steps`.
- Use `feat` for features, `fix` for bug fixes, `docs` for documentation, `refactor` for behavior-preserving code changes, `test` for tests, and `chore` for maintenance.
