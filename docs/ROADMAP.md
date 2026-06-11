# Roadmap — Projeto Prime 🥊

Plano de evolução do AI Boxing Instructor rumo a um produto top de linha,
organizado em fases priorizadas. Cada item tem **critérios de pronto (DoD)**
objetivos para fechar a fase com confiança.

> Estado atual: PWA React 19 + Vite 8 + MediaPipe Pose client-side, engine de
> análise (guarda/base/golpes), coach de voz, sessões com rounds e resumo,
> endpoint `/api/coach` com Claude já mergeado (Fase 4). Fundação de
> qualidade (CI, testes do engine, Error Boundary) entregue neste PR.

---

## Fase 5 — Coach IA visível + Deploy (prioridade máxima)

O backend do coach já existe; falta o usuário ver o valor.

### 5.1 Integração frontend do coach IA
- Hook `useCoachingFeedback` que envia o resumo do round/sessão para `/api/coach`.
- Painel de feedback do coach ao fim de cada round e no resumo da sessão
  (insights em PT-BR: o que foi bem, o que corrigir no próximo round).
- Estados de carregamento/erro elegantes; app continua 100% funcional offline
  ou sem chave de API (degradação graciosa).

**DoD:** ao terminar um round com a API configurada, um card de feedback do
coach aparece em até ~5s; sem API, o resumo local continua como hoje.

### 5.2 Deploy Vercel com `ANTHROPIC_API_KEY`
- Projeto conectado na Vercel, variável `ANTHROPIC_API_KEY` configurada.
- `/api/health` verde em produção; PWA instalável servida por HTTPS.

**DoD:** URL pública funcionando no celular (câmera + pose + coach IA).

---

## Fase 6 — Persistência e evolução (Neon PostgreSQL)

Sem histórico não há progresso visível — essencial para manter a motivação.

- Banco Neon (PostgreSQL serverless) com tabelas de sessões, rounds e golpes.
- Endpoints `api/sessions` (salvar ao fim da sessão, listar histórico).
- Tela de histórico: lista de treinos, médias de guarda/base, total de golpes.
- Gráficos de evolução ao longo do tempo (score médio por semana, volume de
  golpes, correções recorrentes diminuindo).

**DoD:** terminar um treino salva a sessão; tela de histórico mostra evolução
de pelo menos guarda média, base média e golpes por sessão.

---

## Fase 7 — Perfis e família

Projeto é dele **e da filha** — multiusuário é diferencial central.

- Perfis múltiplos locais (nome + avatar), seleção na home.
- Sessões associadas ao perfil; histórico e gráficos por pessoa.
- Métricas comparativas amigáveis (sem competição tóxica: "seu melhor", metas
  pessoais por perfil).
- Metas semanais por perfil (ex.: 3 treinos/semana, guarda média ≥ 80).

**DoD:** dois perfis usados em sequência geram históricos separados; cada
perfil vê suas metas e progresso.

### 7.1 Modo kids / gamificação
- Conquistas (primeiro treino, 100 jabs, guarda 90+ por um round inteiro).
- Streaks de treino (dias seguidos) com celebração visual.
- Linguagem e visual adaptados para criança no perfil kids (fontes maiores,
  feedback mais encorajador, rounds mais curtos por padrão).

**DoD:** perfil kids tem ao menos 6 conquistas desbloqueáveis e streak visível
na home.

---

## Fase 8 — Modos de treino

- **Modo Técnica/Drill** (card hoje desabilitado na home): sequências guiadas
  (ex.: jab-jab-cross), o engine valida cada golpe da sequência e dá feedback
  por repetição.
- **Tela de configurações:** volume e voz do coach (seleção de voz da Web
  Speech API), sensibilidade de detecção de golpe, idioma (PT-BR/EN), duração
  de round/descanso.

**DoD:** card de Técnica habilitado com pelo menos 3 drills; configurações
persistidas (localStorage) e respeitadas pelo coach de voz e pelo engine.

---

## Fase 9 — Engine v2 (precisão e robustez)

Dívidas técnicas conhecidas do engine — mudanças comportamentais, exigem
validação cuidadosa com vídeo real.

- **Frame-rate independence:** substituir contagem de frames (assume ~30fps)
  por timestamps reais em cooldowns e debounces (`PunchClassifier`,
  thresholds de voz). Hoje, em 60fps o cooldown dura metade do tempo esperado.
- **`returnSpeed` real no `PunchClassifier`:** medir a velocidade de retorno
  da mão à guarda (hoje hardcoded em `0`) e usá-la na qualidade do golpe e na
  regra `punch:fair`.
- Recalibrar thresholds de velocidade (hoje em unidades/frame → unidades/s).

**DoD:** suíte de testes atualizada cobrindo 30fps e 60fps simulados com os
mesmos resultados; `returnSpeed > 0` em golpes reais.

---

## Fase 10 — Performance e offline de verdade

- **Cache offline do modelo MediaPipe** (~10MB) via service worker
  (`workbox` runtime caching), para o PWA funcionar 100% sem rede.
- **Web Worker para a pose:** mover a inferência do MediaPipe para fora da
  main thread (OffscreenCanvas/`VideoFrame`), liberando a UI e melhorando FPS
  em celulares mais fracos.
- Métricas de FPS/latência no modo dev para validar o ganho.

**DoD:** treino completo em modo avião após primeira visita; main thread sem
long tasks > 50ms durante análise.

---

## Registro de dívidas conhecidas

| Item | Onde | Fase |
| --- | --- | --- |
| Cooldown/debounce por contagem de frames (~30fps) | `PunchClassifier`, voz | 9 |
| `returnSpeed` sempre `0` | `PunchClassifier` | 9 |
| Modelo MediaPipe baixado da CDN a cada visita | `useMediaPipe` | 10 |
| Card "Técnica" desabilitado na home | `HomePage` | 8 |
| Coach IA sem UI (endpoint pronto, frontend pendente) | `/api/coach` | 5 |

---

## Princípios

1. **Mobile-first:** todo recurso é validado no celular antes de fechar.
2. **Degradação graciosa:** sem rede/API, o treino local nunca quebra.
3. **Privacidade:** vídeo nunca sai do dispositivo; só métricas agregadas
   vão ao backend.
4. **Qualidade contínua:** nada mergeia sem CI verde (lint, tsc, testes,
   build) e revisão humana.
