# Roadmap: Prime Project 🥊

Evolution plan for the AI Boxing Instructor towards a top-tier product,
organised into prioritised phases. Every item has objective **definition of
done (DoD)** criteria so a phase can be closed with confidence.

> Current state (sep/2026): React 19 + Vite 8 PWA with client-side MediaPipe
> Pose, analysis engine (guard/base/punches), voice coach, sessions with
> rounds and a summary, the `/api/coach` endpoint backed by Claude (Phase 4),
> gamification + history (Phase 6), profiles + kids theme (Phase 7) and a
> quality foundation (CI, tests, Error Boundary). **Full i18n delivered in
> jul/2026** (outside the numbered phases): app in EN by default with PT-BR
> available, a language selector in the header, the engine emitting stable
> i18n keys and the coach answering in the user's language. **Hardening in
> sep/2026** (PR #22, from the audit in [`AUDIT-2026-09.md`](AUDIT-2026-09.md)):
> `/api/coach` validates in a fixed order with a hard cap on every field and
> returns closed errors; corrupted stored history can no longer take the app
> down; every route has an error boundary; CI runs with a read-only token.

> **Design System v2 (foundation) applied:** themable tokens
> (`adult`/`kids` via `data-theme`), self-hosted Saira fonts, and the
> existing screens migrated to the Fight Night look. Full specs in
> [`docs/design-system/SPECS.md`](design-system/SPECS.md). Gamification
> (XP/levels/quests/badges), the profile selector and the kids theme "Arcade
> Royale" (Phases 6/7) are to be built on top of this kit.

---

## Phase 5: visible AI coach + deploy (top priority)

The coach backend already exists; what is missing is the user seeing the value.

### 5.1 Frontend integration of the AI coach ✅ Delivered
- [x] `useCoachingFeedback` hook that sends the round/session summary to
  `/api/coach` (15s timeout, abort on leaving, at most 1 retry).
- [x] Coach bubble (DS v2, SPECS §6) at the end of every round (rest) and in
  the session summary, with insights in the app's language (EN/PT-BR since
  the i18n work of jul/2026).
- [x] Graceful loading/error states; with no API key or offline, a friendly
  fallback and local training stays 100% functional.
- [x] Optional voice: with the Voice Coach on, the coach feedback is read out
  loud when it arrives.

**DoD met:** finishing a round with the API configured makes the coach
feedback card appear within seconds; with no API, the local summary carries
on as before.

### 5.2 Vercel deploy with `ANTHROPIC_API_KEY` (pending: the owner's step)
- Project connected on Vercel, `ANTHROPIC_API_KEY` variable configured.
- `/api/health` green in production; installable PWA served over HTTPS.

> **Note:** the coach frontend (5.1) is ready and degrades gracefully. For
> the AI coach to actually work, the Vercel deploy with the
> `ANTHROPIC_API_KEY` env var is still missing: a manual step for the repo
> owner.

**DoD:** public URL working on a phone (camera + pose + AI coach).

---

## Phase 6: gamification + training history ✅ Delivered

Without history there is no visible progress, which is essential to keep the
motivation up. **Local-first** architecture: persistence in localStorage
behind the `HistoryStore` interface (`src/services/historyStore.ts`), with a
JSON document **versioned by schema** and partitioned by `profileId`, so F7
(profiles) will not require a data migration.

- [x] Gamification engine (`src/engine/gamification/`, pure functions,
  SPECS §5): XP per punch (good +10 · fair +5 · poor +2) and round bonus
  (+30 average guard ≥ 80, +20 average base ≥ 80); level N = 250×N XP; ranks
  by level (1 Bronze · 10 Silver · 20 Gold · 35 Champion, names per theme,
  the kids skin ready for F7); streak of consecutive days expiring at local
  midnight; 8 permanent badges; 3 deterministic daily quests (seed = local
  date) checked against the day's aggregate.
- [x] Per-session history (date, duration, rounds, punches by type/quality,
  guard/base averages, XP, AI coach feedback when there is one) + daily
  aggregates for the weekly chart.
- [x] Integration: "+XP" in the punch feed; XP bar + LVL chip + streak on the
  Home; session summary with the XP earned (breakdown), level-up, new badges
  (medal) and the day's quests.
- [x] `/progress` screen (SPECS §7): level/rank + XP bar, chart of the last
  7 days (colour by score band, always with the number), badge grid (locked
  in grayscale) and the next quest.

**DoD met:** finishing a workout credits XP, persists the session and updates
streak/badges/quests; `/progress` shows the week's evolution.

### 6b: cloud sync (Neon PostgreSQL), future
The `HistoryStore` interface was designed to gain a remote implementation
without touching the UI or the engine:
- Neon database (serverless PostgreSQL) with profile/session/round tables.
- `api/sessions` endpoints (upsert at the end of the session, list the
  history) and local ↔ remote reconciliation (local-first stays the offline
  source).

**DoD:** the same history shows up on two signed-in devices; offline,
everything keeps working on local storage alone.

---

## Phase 7: profiles and family ✅ Delivered

The project is his **and his daughter's**: multi-user is a central
differentiator. F6 storage was already partitioned by `profileId`, so the
phase was UI + selection + theme.

- [x] Multiple local profiles (`src/services/profileStore.ts`, same pattern
  as the HistoryStore: localStorage, versioned schema, pure mutations):
  name, avatar from a curated set, kids mode, active profile. The 1st
  profile takes the id `default` and inherits the pre-F7 history/XP.
- [x] `/profiles` screen (SPECS §7): profile cards (avatar with accent
  border, LVL chip from the profile's gamification snapshot, the selected
  one with a glow), "new profile" card, creation/editing (name, avatar,
  "Kids mode 👑" toggle) and deletion with double confirmation. First use
  lands on the selector; the active profile's avatar in the Header opens the
  screen.
- [x] Sessions/history/charts per person: `useGamification` reads and writes
  in the active profile's partition (`ProfileContext`); switching profile
  switches XP, badges, quests and history together.
- [x] **Deleting a profile does not erase its history** in the HistoryStore,
  it only hides it (an accidental deletion does not destroy months of
  training; F6b can reconcile it).
- [x] Boot with no flash: an inline script in `index.html` applies the last
  active profile's theme before the first paint.

**DoD met:** two profiles used one after the other produce separate
histories; each profile sees its own progress and its own theme.

### 7.1 Kids mode ✅ Delivered (skin)
- [x] Arcade Royale theme applied to the whole app through tokens when the
  active profile is a kid; medal/badge with the sticker skin (radius 24,
  glow, rotate −3°, `[data-theme='kids']`, 100% through tokens).
- [x] Copy per theme in a central dictionary (`src/theme/copy.ts`, SPECS
  §8.3): Belts vs Crowns ranks (Bronze→Ring Royalty), RPG skin for the 8
  daily quests ("Defend the castle: guard ≥ 80 in a round"), the Home
  greeting and badge names where the metaphor fits. Technical training
  feedback is identical in both themes (precision > theme).
- Pending for a future phase: shorter rounds by default on the kids profile
  (depends on F8's round settings).

**DoD met:** a kids profile sees achievements/streak with the Arcade Royale
skin and the RPG copy for the daily quests.

---

## Phase 8: training modes (next phase)

Technique/Drill mode + settings screen.

- **Technique/Drill mode** (card currently disabled on the home): guided
  sequences (e.g. jab-jab-cross), the engine validates each punch of the
  sequence and gives feedback per repetition.
- **Settings screen:** coach volume and voice (voice selection from the Web
  Speech API), punch detection sensitivity, round/rest duration. (EN/PT-BR
  language was already delivered outside this phase: selector in the header,
  jul/2026; at most the screen can re-expose the same preference.)

**DoD:** Technique card enabled with at least 3 drills; settings persisted
(localStorage) and respected by the voice coach and the engine.

---

## Phase 9: engine v2 (precision and robustness)

Known technical debt in the engine. These are behavioural changes and need
careful validation against real video.

- **Frame-rate independence:** replace frame counting (assumes ~30fps) with
  real timestamps in cooldowns and debounces (`PunchClassifier`, voice
  thresholds). Today, at 60fps the cooldown lasts half the expected time.
- **Real `returnSpeed` in `PunchClassifier`:** measure the speed of the hand
  returning to the guard (hardcoded to `0` today) and use it in punch
  quality and in the `punch:fair` rule.
- Recalibrate the velocity thresholds (today in units/frame → units/s).

**DoD:** test suite updated covering simulated 30fps and 60fps with the same
results; `returnSpeed > 0` on real punches.

---

## Phase 10: performance and real offline

- [x] **Offline cache of the MediaPipe model** (~10MB) via service worker ✅
  delivered: workbox `runtimeCaching` in `vite.config.ts` with two
  `CacheFirst` routes (the WASM runtime on jsDelivr and the pose `.task` on
  storage.googleapis.com), `cacheableResponse` accepting opaque responses
  (status 0) and a 60-day expiry. After the first visit, the PWA opens and
  trains with no network.
- **Web Worker for the pose:** move MediaPipe inference off the main thread
  (OffscreenCanvas/`VideoFrame`), freeing the UI and improving FPS on weaker
  phones.
- FPS/latency metrics in dev mode to validate the gain.

**DoD:** full workout in airplane mode after the first visit; main thread
with no long tasks > 50ms during analysis.

---

## Phase 11: security and operations (from the September 2026 audit)

The one HIGH finding in [`AUDIT-2026-09.md`](AUDIT-2026-09.md) and the
operational gaps a public PWA with a paid endpoint has to close. Scheduled
**ahead of Phase 8**: features on top of an endpoint anyone can drain is the
wrong order.

- **Rate limit on `/api/coach`.** Per-IP (Vercel Firewall rules, or
  `@upstash/ratelimit` backed by Vercel KV) plus a daily ceiling on total
  calls. Both fail closed to the existing 503 path, which the coach bubble
  already handles with friendly copy. Tests in `api/__tests__` for
  "limit hit" and "ceiling hit", asserting that no model call was made.
- **Transport and content security.** `Strict-Transport-Security` in
  `vercel.json`. `Content-Security-Policy` first as `Report-Only`, with
  explicit sources for the MediaPipe WASM (jsDelivr) and the pose model
  (Google Cloud Storage), then enforced once a full workout produces zero
  violations.
- **Error visibility.** Forward function errors and PWA runtime errors to a
  sink (Sentry, or a Vercel log drain). Today the coach's failure rate is
  invisible: a broken key or a model rename would only show up as users seeing
  the fallback copy.
- **Tests where there are none.** `selectors.ts` and `BoxingEngine.ts`; remove
  the dead `gamification/index.ts` barrel.
- **Hygiene.** Rename `.github/instructions/*.instructions.md` (a literal `*`
  breaks `git clone` on Windows); `npm audit fix` without `--force`.
- **Privacy, said where it matters.** A one-line note at the moment the camera
  permission is requested: video never leaves the device; only aggregate
  metrics go to `/api/coach`. The README says it; the app should too.

**DoD:** 100 requests in a minute from one IP get 429 with no model call; the
daily ceiling trips in a test; CSP enforced with zero console violations
across a full workout; the error sink shows one deliberately thrown error
from each of the function and the PWA.

---

## Known debt register

| Item | Where | Phase |
| --- | --- | --- |
| Cooldown/debounce by frame count (~30fps) | `PunchClassifier`, voice | 9 |
| `returnSpeed` always `0` | `PunchClassifier` | 9 |
| ~~MediaPipe model downloaded from the CDN on every visit~~ ✅ delivered (10) | `useMediaPipe` + `runtimeCaching` (`vite.config.ts`) | 10 |
| "Technique" card disabled on the home | `HomePage` | 8 |
| Shorter rounds by default on the kids profile | `useSession` + settings | 8 |
| The history of a deleted profile is orphaned in localStorage (decision: never erase) | `profileStore` / future "cleanup" in settings | 8+ |
| ~~AI coach with no UI (endpoint ready, frontend pending)~~ ✅ delivered (5.1) | `useCoachingFeedback` + `CoachBubble` | 5 |
| `/api/coach` has no rate limit or daily ceiling (audit H1) | `api/coach.ts` | 11 |
| No HSTS, no CSP | `vercel.json` | 11 |
| No error reporting for the function or the PWA | `api/`, `src/main.tsx` | 11 |
| `selectors.ts`, `BoxingEngine.ts` untested; `gamification/index.ts` dead barrel | `src/engine/` | 11 |
| Literal `*` in `.github/instructions/*.instructions.md` breaks Windows clones | `.github/instructions/` | 11 |

---

## Plan review, 2026-09-07

This roadmap read against the September 2026 audit and against what a
reviewer expects from a shipped PWA. What it did not cover, and what changed:

1. **Security and operations had no phase.** Added as Phase 11, ahead of
   Phase 8.
2. **Phase 9 is a correctness bug in production, not debt.** At 60 fps the
   punch cooldown lasts half the intended time, today, on every 60 fps phone.
   Schedule it before Phase 8 features. It needs a validation protocol the
   roadmap did not have: three recorded sessions (a 30 fps phone, a 60 fps
   phone, a laptop) replayed through the engine as fixtures, with identical
   classification results as the DoD. Without the recordings the phase cannot
   be closed with confidence.
3. **No accessibility pass anywhere.** Contrast in the kids theme, focus order
   in the profile selector, the punch feed for screen readers. Add to Phase 8
   alongside the settings screen, where the UI is being touched anyway.
4. **No performance budget in CI**, despite "mobile-first" being principle 1.
   Lighthouse CI on the built PWA with thresholds, so Phase 10's "no long
   tasks > 50 ms" has a measurement and can actually be closed.
5. **Owner step still open:** `ANTHROPIC_API_KEY` on Vercel (5.2). Until it is
   set, the coach is in fallback for every user and Phase 5 is not closable.

Recommended order from here: **11 → 9 → 8 → 10 → 6b.**

---

## Principles

1. **Mobile-first:** every feature is validated on a phone before it closes.
2. **Graceful degradation:** with no network/API, local training never breaks.
3. **Privacy:** video never leaves the device; only aggregate metrics go to
   the backend.
4. **Continuous quality:** nothing merges without green CI (lint, tsc, tests,
   build) and a human review.
