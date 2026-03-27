# AI Boxing Instructor

Instrutor virtual de boxe com análise de pose em tempo real via MediaPipe e coaching inteligente via Claude AI.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Pose Detection:** MediaPipe Pose Landmarker (client-side, WASM)
- **Voice Feedback:** Web Speech API *(planned — Phase 3)*
- **AI Coaching:** Claude API (Haiku / Sonnet) *(planned — Phase 4)*
- **Database:** Neon (PostgreSQL serverless) *(planned — Phase 5)*
- **PWA:** vite-plugin-pwa

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Scripts

- `npm run dev` — Development server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run preview` — Preview production build
