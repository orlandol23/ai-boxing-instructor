# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commit and PR conventions

Do not include Co-Authored-By or "Generated with Claude Code" lines in commit
messages or PR descriptions.

Commits are authored as `Orlando Fernandes
<27815856+orlandol23@users.noreply.github.com>` (configured in
`.claude/settings.json`).

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
npm run test       # Vitest — 222 tests across 18 files
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
| `src/engine/`     | Pure boxing + gamification logic. No React, no I/O.        |
| `src/hooks/`      | MediaPipe, camera, session, voice, coaching lifecycle.     |
| `src/services/`   | `/api/coach` client, local-first profile/history storage.  |
| `api/`            | Vercel Functions: `POST /api/coach`, `GET /api/health`.    |
| `src/components/` | Presentational only, no business logic.                    |

Keep the engine free of React and I/O — it is covered by deterministic
fixture-based tests, which is why the suite is fast and stable.

## Notes

- Without `ANTHROPIC_API_KEY`, `/api/coach` returns 503 and the app hides only
  the coaching UI. Everything else keeps working; do not break that path.
- Pose analysis runs entirely client-side. No video should ever leave the
  browser.
