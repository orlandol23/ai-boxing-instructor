# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commit and PR conventions

Commits are authored as `Orlando Fernandes
<27815856+orlandol23@users.noreply.github.com>`, set by `env` in
`.claude/settings.json`. Confirm it landed with
`git log -1 --format='%an <%ae>'`; if another identity got in, amend with
`--reset-author` instead of leaving it in the history.

Nothing in a commit message or a pull request body may name the tool or the
session that wrote it: no `Co-Authored-By:` trailer, no `Claude-Session:`
trailer, no "Generated with/by Claude Code" footer, and no `claude.ai/code`
link. Describe the change, not how it was produced.

PR bodies may be written in Portuguese. They are read by the repository owner,
not by visitors browsing the code.

## Language

The README is the reference, and it is in English. So is everything else a
visitor reads on GitHub: documentation, code comments, test names, commit
messages and PR titles.

Two things are **product content**, not documentation, and stay in Portuguese:
`src/i18n/locales/pt-BR.ts`, the text a pt-BR user reads on screen, and
`SYSTEM_PROMPT_PT_BR` in `api/coach.ts`, which is what makes the coach answer
in the user's language. A language pass never touches either.

## Install

```bash
npm ci
```

Use `npm ci`, not `npm install --legacy-peer-deps`. `@testing-library/react` v16
takes `@testing-library/dom` as a peer dependency; `--legacy-peer-deps` skips
peers, drops that package from the tree and rewrites the lockfile, which breaks
`typecheck`, `build` and two test suites.

## Commands

```bash
npm run dev        # Vite dev server on :5173
npm run test       # Vitest — 292 tests across 22 files
npm run lint       # ESLint over src/ and api/
npm run typecheck  # tsc -b
npm run build      # tsc -b && vite build
```

To run the frontend together with the `api/` functions on one origin, as in
production: `vercel dev`.

Keep the test count in `README.md` in sync when tests are added.

## Layout

| Path              | Responsibility                                            |
| ----------------- | --------------------------------------------------------- |
| `src/engine/`     | Pure boxing + gamification logic. No React, no I/O, no i18n.|
| `src/hooks/`      | MediaPipe, camera, session, voice, coaching lifecycle.     |
| `src/services/`   | `/api/coach` client, local-first profile/history storage.  |
| `api/`            | Vercel Functions: `POST /api/coach`, `GET /api/health`.    |
| `src/components/` | Presentational only, no business logic.                    |
| `src/i18n/`       | i18next setup + bundled `en` / `pt-BR` locale resources.    |

Keep the engine free of React and I/O — it is covered by deterministic
fixture-based tests, which is why the suite is fast and stable. Keep it free
of i18next too: the engine returns stable i18n **keys** (plus interpolation
params) and the UI translates them, so engine tests assert keys, not prose.

Copy has two axes: **language** (i18next resource bundles) and **theme**
(adult/kids, mapped to i18next's `context` suffix `_kids`). `src/theme/copy.ts`
owns the theme axis only. A missing `_kids` entry falls back to the adult copy
on purpose — never "fix" that by duplicating strings.

## Notes

- Without `ANTHROPIC_API_KEY`, `/api/coach` returns 503 and the coach bubble
  falls back to friendly "coach unavailable" copy. Everything else keeps
  working; do not break that path.
- `api/coach.ts` holds one **static** system prompt per locale, selected by a
  validated `locale` field. Keep them module-level constants — building the
  prompt per request would defeat `cache_control: ephemeral` (~90% input-token
  saving on repeat calls).
- `/api/coach` is public and unauthenticated, so it validates in a fixed order:
  method → origin → API key → body. Every caller-controlled field has a hard
  cap (`MAX_NOTES`, `MAX_NOTE_LENGTH`, `MAX_ROUNDS`, `MAX_PUNCHES`,
  `MAX_DURATION_MS`, `MAX_SCORE`) and cross-site browser calls get 403
  `forbidden_origin`. Never log the request body. `api/__tests__` pins all of
  it; `vitest.config.ts` includes `api/**/*.test.ts`.
- Locale files must stay key-for-key identical; `src/i18n/__tests__` fails the
  build on drift. Add new copy to both `en.ts` and `pt-BR.ts`.
- Pose analysis runs entirely client-side. No video should ever leave the
  browser.

## Plans and audits

- The plan is `docs/ROADMAP.md`. Nothing in it is ticked by intention: a box
  closes in the PR that closes it, with the PR linked.
- `docs/AUDIT-2026-09.md` is the September 2026 security and architecture
  audit with the status of every finding. A status changes only in the PR that
  changes the code. Later reviews go in a new dated file, never merged into it.
