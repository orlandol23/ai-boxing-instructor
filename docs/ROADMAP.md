# Roadmap — Projeto Prime 🥊

Plano de evolução do AI Boxing Instructor rumo a um produto top de linha,
organizado em fases priorizadas. Cada item tem **critérios de pronto (DoD)**
objetivos para fechar a fase com confiança.

> Estado atual (jul/2026): PWA React 19 + Vite 8 + MediaPipe Pose client-side,
> engine de análise (guarda/base/golpes), coach de voz, sessões com rounds e
> resumo, endpoint `/api/coach` com Claude (Fase 4), gamificação + histórico
> (Fase 6), perfis + tema kids (Fase 7) e fundação de qualidade (CI, testes,
> Error Boundary). **i18n completo entregue em jul/2026** (fora das fases
> numeradas): app EN por padrão com PT-BR disponível, seletor de idioma no
> header, engine emitindo chaves i18n estáveis e coach respondendo no idioma
> do usuário.

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
  resumo da sessão, com insights no idioma do app (EN/PT-BR desde o i18n
  de jul/2026).
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

## Fase 7 — Perfis e família ✅ Entregue

Projeto é dele **e da filha** — multiusuário é diferencial central.
O storage do F6 já era particionado por `profileId`, então a fase foi
UI + seleção + tema.

- [x] Perfis múltiplos locais (`src/services/profileStore.ts`, mesmo
  padrão do HistoryStore: localStorage, schema versionado, mutações
  puras): nome, avatar de set curado, modo kids, perfil ativo. O 1º
  perfil adota o id `default` e herda o histórico/XP pré-F7.
- [x] Tela `/profiles` (SPECS §7): Profile cards (avatar com borda
  accent, LVL chip do snapshot de gamificação do perfil, selecionado com
  glow), card "novo perfil", criação/edição (nome, avatar, toggle "Modo
  kids 👑") e exclusão com confirmação dupla. Primeiro uso cai no
  seletor; avatar do perfil ativo no Header abre a tela.
- [x] Sessões/histórico/gráficos por pessoa: `useGamification` lê e
  escreve na partição do perfil ativo (`ProfileContext`); trocar de
  perfil troca XP, badges, missões e histórico juntos.
- [x] **Deletar perfil não apaga o histórico** no HistoryStore — só o
  esconde (exclusão acidental não destrói meses de treino; o F6b pode
  reconciliar).
- [x] Boot sem flash: script inline no `index.html` aplica o tema do
  último perfil ativo antes do primeiro paint.

**DoD atendido:** dois perfis usados em sequência geram históricos
separados; cada perfil vê seu progresso e seu tema.

### 7.1 Modo kids ✅ Entregue (skin)
- [x] Tema Arcade Royale aplicado ao app inteiro via tokens quando o
  perfil ativo é kids; medal/badge com a skin sticker (radius 24, glow,
  rotate −3° — `[data-theme='kids']`, 100% por tokens).
- [x] Copy por tema em dicionário central (`src/theme/copy.ts`, SPECS
  §8.3): ranks Cinturões vs Coroas (Bronze→Rainha do Ringue), skin RPG
  das 8 missões diárias ("Defenda o castelo: guarda ≥ 80 no round"),
  saudação da Home e nomes de badge onde a metáfora cabe. Feedback
  técnico de treino é idêntico nos dois temas (precisão > tema).
- Pendente p/ fase futura: rounds mais curtos por padrão no perfil kids
  (depende das configurações de round do F8).

**DoD atendido:** perfil kids vê conquistas/streak com a skin Arcade
Royale e a copy RPG das missões diárias.

---

## Fase 8 — Modos de treino (próxima fase)

Modo Técnica/Drill + tela de configurações.

- **Modo Técnica/Drill** (card hoje desabilitado na home): sequências guiadas
  (ex.: jab-jab-cross), o engine valida cada golpe da sequência e dá feedback
  por repetição.
- **Tela de configurações:** volume e voz do coach (seleção de voz da Web
  Speech API), sensibilidade de detecção de golpe, duração de round/descanso.
  (Idioma EN/PT-BR já foi entregue fora desta fase — seletor no header,
  jul/2026; a tela pode no máximo reexpor a mesma preferência.)

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
| Rounds mais curtos por padrão no perfil kids | `useSession` + configurações | 8 |
| Histórico de perfil deletado fica órfão no localStorage (decisão: nunca apagar) | `profileStore` / futura "limpeza" em configurações | 8+ |
| ~~Coach IA sem UI (endpoint pronto, frontend pendente)~~ ✅ entregue (5.1) | `useCoachingFeedback` + `CoachBubble` | 5 |

---

## Princípios

1. **Mobile-first:** todo recurso é validado no celular antes de fechar.
2. **Degradação graciosa:** sem rede/API, o treino local nunca quebra.
3. **Privacidade:** vídeo nunca sai do dispositivo; só métricas agregadas
   vão ao backend.
4. **Qualidade contínua:** nada mergeia sem CI verde (lint, tsc, testes,
   build) e revisão humana.
