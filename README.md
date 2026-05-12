# AI Boxing Instructor

Instrutor virtual de boxe com análise de pose em tempo real via MediaPipe e coaching inteligente via Claude AI.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Pose Detection:** MediaPipe Pose Landmarker (client-side, WASM)
- **Voice Feedback:** Web Speech API
- **AI Coaching:** Claude API (Haiku / Sonnet) *(Phase 4)*
- **Database:** Neon (PostgreSQL serverless) *(Phase 5)*
- **Backend:** Vercel Functions (`/api/*.ts`)
- **PWA:** vite-plugin-pwa

## Setup local

```bash
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev          # frontend (Vite) em http://localhost:5173
```

Para rodar frontend + funções `api/` juntos localmente (com mesma origem, como em produção):

```bash
npm i -g vercel
vercel dev           # serve frontend + funções api/
```

## Scripts

- `npm run dev` — Development server (Vite, só frontend)
- `npm run build` — Production build (tsc -b + vite build)
- `npm run lint` — ESLint check (src/ + api/)
- `npm run preview` — Preview production build

## Deploy (Vercel)

1. Conecte o repositório no painel da Vercel (auto-detecta Vite).
2. Em **Settings → Environment Variables**, defina:
   - `ANTHROPIC_API_KEY` *(necessário a partir da Phase 4)*
   - `DATABASE_URL` *(necessário a partir da Phase 5 — preenchido automaticamente se usar a integração Neon da Vercel)*
3. Push em `main` dispara deploy de produção; push em outras branches gera preview deploys.

## Estrutura

```
src/                React app (Vite)
  components/       UI components
  engine/           Boxing analysis (stance, guard, base, punches)
  hooks/            Camera, MediaPipe, voice coach
  pages/            HomePage, TrainingPage
api/                Vercel Functions (Node 22)
  health.ts         GET /api/health — sanity check
```
