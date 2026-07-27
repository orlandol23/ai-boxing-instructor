# AI Boxing Instructor 🥊

> A boxing coach that analyzes your form from the webcam **in real time** (MediaPipe, client-side) and returns **AI-generated coaching in Brazilian Portuguese** (Claude), with gamification and offline support (PWA).

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

**🔗 Live demo:** **[ai-boxing-instructor.vercel.app](https://ai-boxing-instructor.vercel.app)**

---

## What it does

- **Real-time pose analysis** from the camera, 100% in the browser (MediaPipe Pose Landmarker via WASM — no video ever leaves the device).
- **Per-frame technical scoring:** guard, base, and stance (orthodox/southpaw) scored 0–100; punch classification (jab, cross, hook, uppercut — lead/rear) from arm velocity and extension.
- **AI coaching in Brazilian Portuguese:** at the end of each round/session, the metrics become a short, motivational message from a "coach" (Claude Haiku), with no technical jargon.
- **Voice:** the coaching is read aloud (Web Speech API).
- **Gamification:** XP, levels, streaks, daily quests, and badges — all with deterministic, tested logic.
- **Multi-profile + kids theme** ("Arcade Royale") with alternative copy for children.
- **Offline-first (PWA):** the app opens and trains with no network; only the AI coaching requires a connection.

## Architecture

Layered separation — each layer is testable in isolation:

| Layer | Folder | Responsibility |
|---|---|---|
| **Engine** | `src/engine/` | Pure boxing logic (stance, guard, base, punches, angles) + gamification. No React, no I/O → testable with fixtures. |
| **Hooks** | `src/hooks/` | MediaPipe, camera, session, voice, and coaching lifecycle. Bridges the imperative world (RAF/WASM) to React. |
| **Services** | `src/services/` | Pure I/O modules: the `/api/coach` client and local-first storage (profiles and history). |
| **API** | `api/` | Vercel Functions (Node). `POST /api/coach` calls Claude; `GET /api/health` is a sanity check. |
| **UI** | `src/components/`, `src/pages/` | Presentational components, no business logic. |

### Technical decisions (summary)

- **Pure, React-free engine** → the hard logic (pose heuristics, XP formulas) is covered by deterministic fixture-based tests, not by brittle UI tests.
- **`BoxingEngine.analyze()` is idempotent** for the same `landmarks` reference → safe to call from `useMemo` even under React Strict Mode (double-invoke).
- **Detection loop decoupled from React:** it runs in `requestAnimationFrame` using refs, with a configurable frame skip and React state updates **throttled to ~30fps** — avoiding a re-render on every camera frame.
- **GPU→CPU fallback** on MediaPipe init → works on devices without WebGL.
- **Resilient, pure AI client** (`coachClient.ts`): typed errors with a discriminated `reason`, retries only on transient failures (network/timeout/5xx), and uses `AbortController` for both timeout and unmount cancellation.
- **Prompt caching** on the Claude system prompt (`cache_control: ephemeral`) → ~90% fewer input tokens on repeated calls within the same session.
- **Graceful degradation:** without `ANTHROPIC_API_KEY`, `/api/coach` returns 503 and the app **hides only the coaching UI** — everything else keeps working.
- **Versioned local-first storage:** JSON documents in `localStorage` with a `schemaVersion` + defensive migration (corrupt data falls back to an empty document without breaking the app); deleting a profile does not destroy its history.

## Tests

A **Vitest** suite with **222 tests across 18 test files** covering what matters: engine heuristics (stance, guard, base, angles, punch classification), the gamification engine (XP, streaks, quests, badges), storage (profiles and history, including schema migration), and the AI client (error classification, retry, timeout, payload sanitization). CI on GitHub Actions runs `lint` + `typecheck` + `test` + `build`.

```bash
npm run test       # Vitest
npm run lint       # ESLint (src/ + api/)
npm run typecheck  # tsc --noEmit
```

## Running locally

```bash
npm ci
cp .env.example .env.local      # set ANTHROPIC_API_KEY to enable AI coaching
npm run dev                     # frontend (Vite) at http://localhost:5173
```

To run the frontend **together with the `api/` functions** (same origin, like production):

```bash
npm i -g vercel
vercel dev
```

> Without `ANTHROPIC_API_KEY`, the app still runs — only the AI coaching panel is hidden (graceful degradation).

## Deploy (Vercel)

1. Import the repository in the Vercel dashboard (Vite is auto-detected).
2. Under **Settings → Environment Variables**, set `ANTHROPIC_API_KEY`.
3. Pushing to `main` triggers a production deploy; pushing to other branches creates preview deploys.

## Stack

- **Frontend:** React 19 + TypeScript (strict) + Vite + Tailwind CSS
- **Computer vision:** MediaPipe Pose Landmarker (client-side, WASM, GPU→CPU)
- **AI:** Claude (Haiku) via the `api/coach.ts` Vercel Function, with prompt caching
- **Voice:** Web Speech API
- **PWA:** vite-plugin-pwa (offline precache)
- **Tests:** Vitest + Testing Library · **CI:** GitHub Actions

## Project structure

```
src/
  components/   UI (Camera, HUD, Layout, Progress, Profiles)
  contexts/     ProfileContext (active profile + theme)
  engine/       Boxing analysis (pure) + gamification/ (XP, streaks, quests, badges)
  hooks/        useMediaPipe, useCamera, useSession, useCoachingFeedback, useVoiceCoach...
  pages/        Home, Training, Progress, Profiles
  services/     coachClient, profileStore, historyStore (pure modules)
  theme/        theme tokens + copy (adult / kids)
api/
  coach.ts      POST /api/coach — AI coaching (Claude + prompt caching)
  health.ts     GET  /api/health — sanity check
```

## Status & roadmap

- **Implemented:** pose analysis, guard/base/stance scoring, punch classification, AI coaching (Brazilian Portuguese) + voice, gamification, multi-profile + kids theme, offline PWA.
- **Planned:** cloud sync of progress (Neon/PostgreSQL) — storage is currently local-first.

---

_Portfolio project. Pose analysis runs entirely on the client; no video ever leaves the browser._
