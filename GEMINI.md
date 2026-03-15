# GistLedger Agent Notes

## Project Identity
- English name: `GistLedger`
- Chinese name: `云笺账本`
- This project is a private cloud ledger built on GitHub Gist, focused on lightweight UX, serverless architecture, user-owned data, and responsive desktop/mobile layouts.

## Current Working Memory
- The repository currently supports bilingual UI (`中文` / `English`), light/dark theme, monthly budget tracking, responsive desktop layouts, and localized date/amount/export formatting.
- Data is currently split into `ledger_data.json` for entries and `ledger_settings.json` for budget settings.

## Required Workflow Rules
- After every real code or documentation change, create a `git commit` immediately instead of leaving multiple rounds of work uncommitted.
- If a turn includes both product work and workflow/documentation updates, prefer separate commits so history stays readable.
- Any change that affects product capability, naming, workflow, or usage must update `README.md`.
- Any change that affects agent collaboration rules must update both `AGENTS.md` and `GEMINI.md`.
- Temporary files such as `tmp*.json` must stay out of version control.

## Commit Guidance
- Keep commit messages short and explicit, preferably using prefixes like `feat:`, `fix:`, `docs:`, `refactor:`, or `chore:`.
- Before committing, make sure `bun run lint` and `bun run build` pass locally.

## Stack
- Package manager: `bun`
- Frontend: `React` + `TypeScript` + `Vite`
- Styling: `Tailwind CSS v4`
- Icons: `lucide-react`
- Data access: `octokit`
- Deployment: `Cloudflare Workers`
