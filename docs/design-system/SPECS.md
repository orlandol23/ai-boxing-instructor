# Boxing AI · Design System v2.0 · Implementation specs

> Handoff for a PR on the `orlandol23/ai-boxing-instructor` repo.
> Visual references: `Design System v2.html` (foundations + kit) and `Telas v2.html` (screens in context).
> Tokens ready to use: `tokens.css` (replaces `src/styles/globals.css`, Tailwind 4).

## 1. Concept

Two themes over **a single component system**, swapped at runtime through `data-theme` on `<html>`:

| | Fight Night (`adult`) | Arcade Royale (`kids`) |
|---|---|---|
| Base | black #0A0A0A | deep purple #140A20 |
| Action (primary) | red #DC2626 | neon pink #FF3D9A |
| Accent | gold #D4A843 | lilac #C084FC |
| XP | gold | star gold #FFC83D |
| Glow | none | `--glow-primary/accent` (box-shadow) |
| Rank | Belts (Bronze→Champion) | Crowns (Bronze→Ring Royalty) |
| Copy | direct, sporty | playful RPG (quests, dragons, castle) |

Principles: legible at 2–3 m (HUD ≥ 56px, training text ≥ 18px) · dark-first (the camera dominates) · HUD only along the edges (centre = the user's body) · gamification shared across profiles.

## 2. Tokens

Full file in `tokens.css`. Summary of the semantic variables (all themable):

```
--bg --surface --surface-2 --border --border-strong --overlay
--text --text-muted --text-dim
--primary --primary-hover --primary-pressed --on-primary
--accent --accent-light --accent-deep
--xp --xp-track
--score-good #22C55E  --score-warn #EAB308  --score-bad #EF4444   ← identical in both themes
--glow-primary --glow-accent --ring
```

Rules:
- Score: ≥90 good · 70–89 warn · <70 bad (keeps `getScoreColor` from `src/engine/constants.ts`). Never communicate a score by colour alone: always with the number/label next to it.
- `--on-primary` is **white** in the adult theme and **#2A0518 (dark)** in the kids theme: white on pink does not pass AA in small text.
- Glow exists only as a token; in the adult theme it is `none`. A component never hard-codes a shadow.

## 3. Typography

- **Display/numbers:** Saira Condensed 700–800, uppercase, `font-variant-numeric: tabular-nums` (class `.num`).
- **Text:** Saira 400–600. Fallback `ui-sans-serif, system-ui` (PWA offline: consider self-hosting the woff2 files).
- Scale: hud-timer 96 · hud-value 56 · display 48 · title 28 · lg 18 · base 16 · sm 14 · xs 12.
- During training nothing renders below 18px.

## 4. Space, shape, touch

- Radius: sm 6 · md 10 · lg 14 · xl 20 (buttons/cards) · full (pills/avatar).
- Touch: 48px minimum; controls used during training (play/pause/stop, switch camera) 64px, spaced ≥ 20px apart.
- HUD: `--overlay` background (65% + blur 4px), radius 10–12.
- Visible focus: 2px `--ring` outline (already in tokens.css).

## 5. Gamification (engine rules)

- **XP per punch:** good +10 · fair +5 · poor +2. Round bonus: +30 if the average guard is ≥ 80; +20 if the average base is ≥ 80.
- **Level:** cost of level N = `250 × N` XP (LVL 12→13 = 3,000).
- **Ranks by level:** 1 Bronze · 10 Silver · 20 Gold · 35 Champion/Ring Royalty. The rank name comes from the theme.
- **Streak:** consecutive days with ≥ 1 session; expires at local midnight. Icon `flame`.
- **Daily quests:** 3/day, generated per profile (e.g. "30 jabs with good extension" +50 XP). In the kids theme the same goal gets an RPG skin ("Defend the castle: guard ≥ 80 in a round").
- **Badges:** permanent achievements (Iron Guard, 100 Punches, 7 Days in a Row…). `medal` component: metallic circle in the adult theme; rounded sticker, glow and −3° rotation in the kids theme.

## 6. Components (specs)

| Component | Spec |
|---|---|
| **Button primary** | bg `--primary`, text `--on-primary`, Saira Cond 700 18px uppercase, radius 20, h 56 (xl: 64/22px), hover `--primary-hover`, active scale .96, shadow `--glow-primary`, disabled opacity .4 |
| **Button secondary** | bg `--surface-2`, `--border-strong` border, hover `--accent` border |
| **Button ghost** | transparent, `--text-muted` → `--text` |
| **Button icon** | 48px circle, bg `--overlay`; active bg `--primary` |
| **ScoreBar (v2)** | `--overlay` pill, 14px uppercase label, 8px track, `.num` 22px value in the score colour. Minimum track width 64px |
| **Timer HUD** | top-centre, `.num` 96px (mock: 40px proportional), "ROUND n/m" sub-label 12px tracking-widest |
| **Punch feed** | right-hand corner; a new punch enters at 18px + "+XP", scale/opacity decay (.7/.4); at most 3 items |
| **Round controls** | footer-centre: stop 52–64 · pause/play primary 64–80 · voice 52–64; SVG progress ring in `--primary` over `--surface-2` |
| **XP bar** | `--xp-track` track 12px, `--xp` fill + `--glow-accent` |
| **LVL chip** | pill with `--accent` border, `--accent-light` text, star icon |
| **Quest card** | dashed `--border-strong` border, radius 14; done: solid `--accent` border, check bg `--xp`; XP on the right in `.num` |
| **Medal/badge** | 76px; adult: gold radial + `--accent-deep` border; kids: radius 24, lilac→pink radial, glow, rotate −3°; locked: grayscale + opacity .35 |
| **Coach bubble** | `--accent` border, radius 16 (top-left corner 4), bg `--surface-2`, `volume-2` avatar alongside |
| **Profile card** | radius 20, avatar 64–72 with `--accent` border, display uppercase name, LVL chip; selected: `--accent` border + glow |
| **Setting row** | h ≥ 56, top border `--border`; switch 48×28, on = `--primary` |
| **Weekly chart** | 7 bars radius 6, colour by the day's score band, empty day `--surface-2` at 8%; large `.num` average value in the header |
| **States** | loading: full overlay + `--accent` spinner + `--accent-light` text; no pose: bottom strip in `--overlay` with `--score-warn` text 16px; camera denied: full-screen `camera-off` + "Try again" CTA (never a toast) |

## 7. Screens (inventory)

`/profiles` selector (sets the app theme) · `/` home (greeting, XP, CTA, modes, quests, streak) · `/training` HUD + controls · `/summary` summary (XP hero, averages, breakdown, AI coach, new achievement) · `/progress` (level/rank, 7-day chart, badges, next quest) · `/settings` (round, rest, voice, AI summary, kids mode, profile, camera). Layouts: `Telas v2.html`.

## 8. Implementation: notes for the PR

1. Replace `src/styles/globals.css` with `tokens.css` (keep `@import 'tailwindcss'`). The existing `boxing-*`/`score-*` classes can be mapped as aliases during the migration.
2. Theme: `document.documentElement.dataset.theme = profile.isKid ? 'kids' : 'adult'` when a profile is selected; persist it with the profile (zustand).
3. Copy per theme: a `pt-BR` dictionary with paired keys (`adult`/`kids`). Do not branch on strings inside the components.
4. `lucide-react` is already a dependency; new icons: timer, play, pause, square, trophy, flame, star, crown, sparkles, trending-up, user, volume-2, camera-off, shield, zap, check, medal, award.
5. Fonts: prefer self-hosting (vite + `@fontsource/saira-condensed`, `@fontsource/saira`) so the PWA works offline.
6. The names "Orlando"/"Alice" in the mocks are placeholders.
7. `prefers-reduced-motion`: turn off the punch feed animation and the pulsing glow (if there is one).
