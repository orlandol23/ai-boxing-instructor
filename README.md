# AI Boxing Instructor 🥊

> Instrutor de boxe que analisa sua pose pela webcam **em tempo real** (MediaPipe, client-side) e devolve **coaching em PT-BR gerado por IA** (Claude), com gamificação e funcionamento offline (PWA).

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

**🔗 Demo:** _<!-- TODO: colar a URL da Vercel aqui depois do deploy, ex.: https://ai-boxing-instructor.vercel.app -->_

<!-- TODO: adicionar mídia em docs/ e referenciar aqui:
![Detecção de pose + coach](docs/demo.gif)
![Tela de treino](docs/screenshot-training.png)
-->

---

## O que faz

- **Análise de pose em tempo real** pela câmera, 100% no navegador (MediaPipe Pose Landmarker via WASM, sem enviar vídeo para servidor).
- **Avaliação técnica por frame:** guarda, base e *stance* (orthodox/southpaw) pontuadas de 0 a 100; classificação de golpes (jab, cross, hook e uppercut, lead/rear) por velocidade e extensão do braço.
- **Coaching por IA em PT-BR:** ao fim de cada round/sessão, as métricas viram um texto curto e motivacional de um "treinador" (Claude Haiku), sem jargão técnico.
- **Voz:** o coaching é lido em voz alta (Web Speech API).
- **Gamificação:** XP, níveis, streaks, missões diárias e medalhas — tudo com lógica determinística e testada.
- **Multi-perfil + tema kids** ("Arcade Royale") com copy alternativa para crianças.
- **Offline-first (PWA):** o app abre e treina sem rede; só o coaching por IA exige conexão.

## Arquitetura

Separação em camadas, cada uma testável de forma isolada:

| Camada | Pasta | Responsabilidade |
|---|---|---|
| **Engine** | `src/engine/` | Lógica de boxe **pura** (stance, guarda, base, golpes, ângulos) + gamificação. Sem React, sem I/O → testável com fixtures. |
| **Hooks** | `src/hooks/` | Ciclo de vida do MediaPipe, câmera, sessão, voz, coaching. Faz a ponte entre o mundo imperativo (RAF/WASM) e o React. |
| **Services** | `src/services/` | Módulos puros de I/O: cliente do `/api/coach` e armazenamento local-first (perfis e histórico). |
| **API** | `api/` | Vercel Functions (Node). `POST /api/coach` chama o Claude; `GET /api/health` é sanity check. |
| **UI** | `src/components/`, `src/pages/` | Componentes apresentacionais, sem regra de negócio. |

### Decisões técnicas (resumo)

- **Engine puro e sem estado de React** → a lógica difícil (heurísticas de pose, fórmulas de XP) é coberta por testes determinísticos com fixtures, não por testes de UI frágeis.
- **`BoxingEngine.analyze()` é idempotente** para a mesma referência de `landmarks` → seguro chamar de `useMemo` mesmo sob React Strict Mode (double-invoke).
- **Loop de detecção desacoplado do React:** roda em `requestAnimationFrame` usando `ref`s, com *frame skip* configurável e atualização de estado **throttled a ~30fps** — evita re-render a cada frame da câmera.
- **Fallback GPU→CPU** na inicialização do MediaPipe → funciona em dispositivos sem WebGL.
- **Cliente de IA resiliente e puro** (`coachClient.ts`): erros tipados com `reason` discriminado, *retry* só em falhas transitórias (rede/timeout/5xx), `AbortController` para timeout e cancelamento no unmount.
- **Prompt caching** no system prompt do Claude (`cache_control: ephemeral`) → ~90% menos input tokens em chamadas repetidas na mesma sessão.
- **Degradação graciosa:** sem `ANTHROPIC_API_KEY`, o `/api/coach` responde 503 e o app **esconde só a UI de coaching** — o resto continua funcionando.
- **Storage local-first versionado:** documentos JSON em `localStorage` com `schemaVersion` + migração defensiva (dado corrompido cai em documento vazio, sem quebrar o app); deletar perfil não destrói o histórico.

## Testes

Suíte em **Vitest** com **18 arquivos de teste** cobrindo o que importa: heurísticas do engine (stance, guarda, base, ângulos, classificação de golpes), motor de gamificação (XP, streak, missões, medalhas), storage (perfis e histórico, incluindo migração de schema) e o cliente de IA (classificação de erro, retry, timeout, saneamento de payload). CI no GitHub Actions roda `lint` + `typecheck` + `test` + `build`.

```bash
npm run test       # Vitest
npm run lint       # ESLint (src/ + api/)
npm run typecheck  # tsc --noEmit
```

## Rodando localmente

```bash
npm install --legacy-peer-deps
cp .env.example .env.local      # defina ANTHROPIC_API_KEY para habilitar o coaching por IA
npm run dev                     # frontend (Vite) em http://localhost:5173
```

Para rodar o frontend **junto com as funções `api/`** (mesma origem, como em produção):

```bash
npm i -g vercel
vercel dev
```

> Sem `ANTHROPIC_API_KEY`, o app roda normalmente — apenas a faixa de coaching por IA fica oculta (degradação graciosa).

## Deploy (Vercel)

1. Importe o repositório no painel da Vercel (auto-detecta Vite).
2. Em **Settings → Environment Variables**, defina `ANTHROPIC_API_KEY`.
3. Push em `main` → deploy de produção; push em outras branches → preview deploys.

## Stack

- **Frontend:** React 19 + TypeScript (strict) + Vite + Tailwind CSS
- **Visão computacional:** MediaPipe Pose Landmarker (client-side, WASM, GPU→CPU)
- **IA:** Claude (Haiku) via Vercel Function `api/coach.ts`, com prompt caching
- **Voz:** Web Speech API
- **PWA:** vite-plugin-pwa (precache offline)
- **Testes:** Vitest + Testing Library · **CI:** GitHub Actions

## Estrutura

```
src/
  components/   UI (Camera, HUD, Layout, Progress, Profiles)
  contexts/     ProfileContext (perfil ativo + tema)
  engine/       Análise de boxe (pura) + gamification/ (XP, streak, missões, medalhas)
  hooks/        useMediaPipe, useCamera, useSession, useCoachingFeedback, useVoiceCoach...
  pages/        Home, Training, Progress, Profiles
  services/     coachClient, profileStore, historyStore (módulos puros)
  theme/        tokens de tema + copy (adulto / kids)
api/
  coach.ts      POST /api/coach — coaching por IA (Claude + prompt caching)
  health.ts     GET  /api/health — sanity check
```

## Status & roadmap

- **Implementado:** análise de pose, scoring de guarda/base/stance, classificação de golpes, coaching por IA (PT-BR) + voz, gamificação, multi-perfil + tema kids, PWA offline.
- **Futuro:** sincronização de progresso em nuvem (Neon/PostgreSQL) — hoje o armazenamento é local-first.

---

_Projeto de portfólio. Roda inteiramente no cliente para análise de pose; nenhum vídeo sai do navegador._
