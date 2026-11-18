# Overfitted

![Team size: 3](https://img.shields.io/badge/team-3-blue)
![Status: Preparing](https://img.shields.io/badge/status-preparing-orange)

We are **Overfitted**, a team of three Business Informatics students at the University of Hohenheim. We explore how AI can help solve challenges in continuing education.

This repository is our shared workspace for the **KI-Hackathon für Weiterbildungsanbieter**. It provides lightweight project organization so we can start building as soon as the challenge is announced.

- [Official hackathon website](https://ki-hackathon.com/)
- [Official agenda](https://ki-hackathon.com/ki-hackathon-fuer-weiterbildungsanbieter-agenda/)

## Challenge

TBD after the challenge announcement: problem, target users, success criteria, and minimum viable product (MVP).

## Tech stack

TBD once we have selected the challenge. No frameworks or dependencies are installed yet.

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
2. Keep `main` stable. Start each feature from the latest `main`:
   ```sh
   git switch main
   git pull --ff-only origin main
   git switch -c feature/description
   ```
3. Make small, focused commits using the conventions in [AGENTS.md](AGENTS.md), such as `docs: add challenge overview`.
4. Push your branch and open a pull request using the template. Link its issue and describe how you tested the change.
5. Ask one teammate to review, merge after resolving feedback, and delete the merged branch.

Use Discord for quick coordination and debugging. Keep tasks in issues and record important technical decisions in [the decision log](docs/decisions.md). This workflow is a team convention; branch protection is not configured by these files.

## Results

TBD: prototype summary, demo link, screenshots, validation against success criteria, known limitations, and final submission.
