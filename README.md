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

The [technology proposal](docs/vhs-foerderfinder.md#technikvorschlag) uses Next.js, TypeScript, a JSON catalogue imported from Excel, and an AI wrapper for extracting project details from chat.

## Repository structure

```text
.github/
  ISSUE_TEMPLATE/           Task and bug templates
  pull_request_template.md Pull request checklist
docs/
  architecture.md          Architecture outline
  decisions.md             Technical decision log
src/                       Application code (to be added)
tests/                     Tests (to be added)
.env.example               Environment variable template
.gitignore                 Local files and secrets to exclude
README.md                  Project overview and workflow
```

## Setup

```sh
git clone https://github.com/Jakoobly/overfitted_hackathon.git
cd overfitted_hackathon
```

TBD: prerequisites, dependency installation, run commands, and test commands after choosing the stack. If environment variables are needed, copy `.env.example` to `.env` and fill in values locally. Document variable names in `.env.example`; never add real credentials to Git, issues, or Discord.

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
