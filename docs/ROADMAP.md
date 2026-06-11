# Roadmap — Projeto Prime 🥊

Plano de evolução do AI Boxing Instructor rumo a um produto top de linha,
organizado em fases priorizadas. Cada item tem **critérios de pronto (DoD)**
objetivos para fechar a fase com confiança.

> Estado atual: PWA React 19 + Vite 8 + MediaPipe Pose client-side, engine de
> análise (guarda/base/golpes), coach de voz, sessões com rounds e resumo,
> endpoint `/api/coach` com Claude já mergeado (Fase 4). Fundação de
> qualidade (CI, testes do engine, Error Boundary) entregue neste PR.

> **Design System v2 (fundação) aplicado:** tokens themáveis
> (`adult`/`kids` via `data-theme`), fontes Saira self-host, e as telas
> existentes migradas para o visual Fight Night. Specs completas em
> [`docs/design-system/SPECS.md`](design-system/SPECS.md) — gamificação
> (XP/níveis/missões/badges), seletor de perfis e o tema kids "Arcade
> Royale" (Fases 6/7) devem ser construídos sobre este kit.

---

## Fase 5 — Coach IA visível + Deploy (prioridade máxima)

O backend do coach já existe; falta o usuário ver o valor.

### 5.1 Integração frontend do coach IA ✅ Entregue
- [x] Hook `useCoachingFeedback` que envia o resumo do round/sessão para
  `/api/coach` (timeout 15s, abort ao sair, máx. 1 retry).
- [x] Coach bubble (DS v2, SPECS §6) ao fim de cada round (descanso) e no
  resumo da sessão, com insights em PT-BR.
- [x] Estados de carregamento/erro elegantes; sem chave de API ou offline,
  fallback amigável e o treino local segue 100% funcional.
- [x] Voz opcional: com o Voice Coach ativado, o feedback do coach é lido
  em voz alta ao chegar.

**DoD atendido:** ao terminar um round com a API configurada, o card de
feedback do coach aparece em segundos; sem API, o resumo local continua
como antes.

### 5.2 Deploy Vercel com `ANTHROPIC_API_KEY` (pendente — passo do dono)
- Projeto conectado na Vercel, variável `ANTHROPIC_API_KEY` configurada.
- `/api/health` verde em produção; PWA instalável servida por HTTPS.

> **Nota:** o frontend do coach (5.1) já está pronto e degrada
> graciosamente; para o coach IA funcionar de verdade, falta o deploy na
> Vercel com a env var `ANTHROPIC_API_KEY` — passo manual do dono do repo.

**DoD:** URL pública funcionando no celular (câmera + pose + coach IA).

---

## Fase 6 — Gamificação + histórico de treinos ✅ Entregue

Sem histórico não há progresso visível — essencial para manter a motivação.
Arquitetura **local-first**: persistência em localStorage atrás da interface
`HistoryStore` (`src/services/historyStore.ts`), com documento JSON
**versionado por schema** e particionado por `profileId` — o F7 (perfis) não
exigirá migração de dados.

- [x] Motor de gamificação (`src/engine/gamification/`, funções puras,
  SPECS §5): XP por golpe (good +10 · fair +5 · poor +2) e bônus de round
  (+30 guarda média ≥ 80, +20 base média ≥ 80); nível N = 250×N XP; ranks
  por nível (1 Bronze · 10 Prata · 20 Ouro · 35 Campeão, nomes por tema —
  skin kids pronta p/ o F7); streak de dias consecutivos com expiração à
  meia-noite local; 8 badges permanentes; 3 missões diárias determinísticas
  (seed = data local) verificadas contra o agregado do dia.
- [x] Histórico por sessão (data, duração, rounds, golpes por tipo/qualidade,
  médias de guarda/base, XP, feedback do coach IA quando houver) + agregados
  diários para o gráfico semanal.
- [x] Integração: "+XP" no punch feed; XP bar + LVL chip + streak na Home;
  resumo de sessão com XP ganho (breakdown), level-up, badges novas (medal)
  e missões do dia.
- [x] Tela `/progress` (SPECS §7): nível/rank + XP bar, gráfico dos últimos
  7 dias (cor pela faixa de score, sempre com número), grid de badges
  (locked em grayscale) e próxima missão.

**DoD atendido:** terminar um treino credita XP, persiste a sessão e
atualiza streak/badges/missões; `/progress` mostra a evolução da semana.

### 6b — Sync na nuvem (Neon PostgreSQL) — futuro
A interface `HistoryStore` foi desenhada para ganhar uma implementação
remota sem tocar na UI nem no motor:
- Banco Neon (PostgreSQL serverless) com tabelas de perfis/sessões/rounds.
- Endpoints `api/sessions` (upsert ao fim da sessão, listar histórico) e
  reconciliação local ↔ remoto (local-first continua sendo a fonte offline).

**DoD:** o mesmo histórico aparece em dois dispositivos logados; offline
tudo continua funcionando só com o storage local.

---

## Fase 7 — Perfis e família (próxima fase)

Projeto é dele **e da filha** — multiusuário é diferencial central.
O storage do F6 já é particionado por `profileId` e os ranks já têm nomes
por tema (`adult`/`kids`), então esta fase é sobretudo UI + seleção.

- Perfis múltiplos locais (nome + avatar), seleção na home.
- Sessões associadas ao perfil; histórico e gráficos por pessoa.
- Métricas comparativas amigáveis (sem competição tóxica: "seu melhor", metas
  pessoais por perfil).
- Metas semanais por perfil (ex.: 3 treinos/semana, guarda média ≥ 80).

**DoD:** dois perfis usados em sequência geram históricos separados; cada
perfil vê suas metas e progresso.

### 7.1 Modo kids
- ~~Conquistas e streaks~~ → motor entregue no F6 (8 badges + streak);
  falta a skin kids (sticker com glow, copy RPG das missões — SPECS §5/§6).
- Linguagem e visual adaptados para criança no perfil kids (fontes maiores,
  feedback mais encorajador, rounds mais curtos por padrão).

**DoD:** perfil kids vê as conquistas/streak com a skin Arcade Royale e a
copy RPG das missões diárias.

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
| ~~Coach IA sem UI (endpoint pronto, frontend pendente)~~ ✅ entregue (5.1) | `useCoachingFeedback` + `CoachBubble` | 5 |

---

## Princípios

1. **Mobile-first:** todo recurso é validado no celular antes de fechar.
2. **Degradação graciosa:** sem rede/API, o treino local nunca quebra.
3. **Privacidade:** vídeo nunca sai do dispositivo; só métricas agregadas
   vão ao backend.
4. **Qualidade contínua:** nada mergeia sem CI verde (lint, tsc, testes,
   build) e revisão humana.
