# Boxing AI — Design System v2.0 · Specs de implementação

> Handoff para PR no repo `orlandol23/ai-boxing-instructor`.
> Referências visuais: `Design System v2.html` (fundações + kit) e `Telas v2.html` (telas em contexto).
> Tokens prontos: `tokens.css` (substitui `src/styles/globals.css`, Tailwind 4).

## 1. Conceito

Dois temas sobre **um único sistema de componentes**, trocados em runtime via `data-theme` no `<html>`:

| | Fight Night (`adult`) | Arcade Royale (`kids`) |
|---|---|---|
| Base | preto #0A0A0A | roxo profundo #140A20 |
| Ação (primary) | vermelho #DC2626 | rosa neon #FF3D9A |
| Acento | dourado #D4A843 | lilás #C084FC |
| XP | dourado | ouro-estrela #FFC83D |
| Glow | nenhum | `--glow-primary/accent` (box-shadow) |
| Rank | Cinturões (Bronze→Campeão) | Coroas (Bronze→Rainha do Ringue) |
| Copy | direta, esportiva | RPG lúdico (missões, dragões, castelo) |

Princípios: legível a 2–3 m (HUD ≥ 56px, texto de treino ≥ 18px) · dark-first (câmera domina) · HUD só nas bordas (centro = corpo do usuário) · gamificação compartilhada entre perfis.

## 2. Tokens

Arquivo completo em `tokens.css`. Resumo das variáveis semânticas (todas themáveis):

```
--bg --surface --surface-2 --border --border-strong --overlay
--text --text-muted --text-dim
--primary --primary-hover --primary-pressed --on-primary
--accent --accent-light --accent-deep
--xp --xp-track
--score-good #22C55E  --score-warn #EAB308  --score-bad #EF4444   ← idênticos nos 2 temas
--glow-primary --glow-accent --ring
```

Regras:
- Score: ≥90 good · 70–89 warn · <70 bad (mantém `getScoreColor` de `src/engine/constants.ts`). Nunca comunicar score só por cor — sempre número/rótulo junto.
- `--on-primary` é **branco** no adulto e **#2A0518 (escuro)** no kids — branco sobre rosa não passa AA em texto pequeno.
- Glow existe apenas como token; no adulto vale `none`. Componente nunca hard-coda sombra.

## 3. Tipografia

- **Display/números:** Saira Condensed 700–800, uppercase, `font-variant-numeric: tabular-nums` (classe `.num`).
- **Texto:** Saira 400–600. Fallback `ui-sans-serif, system-ui` (PWA offline — considerar self-host dos woff2).
- Escala: hud-timer 96 · hud-value 56 · display 48 · title 28 · lg 18 · base 16 · sm 14 · xs 12.
- Durante o treino nada renderiza abaixo de 18px.

## 4. Espaço, forma, toque

- Raio: sm 6 · md 10 · lg 14 · xl 20 (botões/cards) · full (pills/avatar).
- Toque: mínimo 48px; controles usados durante o treino (play/pause/stop, trocar câmera) 64px, espaçados ≥ 20px entre si.
- HUD: fundo `--overlay` (65% + blur 4px), raio 10–12.
- Foco visível: outline 2px `--ring` (já no tokens.css).

## 5. Gamificação (regras do motor)

- **XP por golpe:** good +10 · fair +5 · poor +2. Bônus de round: +30 se guarda média ≥ 80; +20 se base média ≥ 80.
- **Nível:** custo do nível N = `250 × N` XP (LVL 12→13 = 3.000).
- **Ranks por nível:** 1 Bronze · 10 Prata · 20 Ouro · 35 Campeão/Rainha do Ringue. Nome do rank vem do tema.
- **Streak:** dias consecutivos com ≥ 1 sessão; expira à meia-noite local. Ícone `flame`.
- **Missões diárias:** 3/dia, geradas por perfil (ex.: "30 jabs com boa extensão" +50 XP). No kids o mesmo objetivo ganha skin RPG ("Defenda o castelo: guarda ≥ 80 no round").
- **Badges:** conquistas permanentes (Guarda de Ferro, 100 Golpes, 7 Dias Seguidos…). Componente `medal`: círculo metálico no adulto; sticker arredondado, glow e rotação −3° no kids.

## 6. Componentes (specs)

| Componente | Spec |
|---|---|
| **Button primary** | bg `--primary`, texto `--on-primary`, Saira Cond 700 18px uppercase, radius 20, h 56 (xl: 64/22px), hover `--primary-hover`, active scale .96, shadow `--glow-primary`, disabled opacity .4 |
| **Button secondary** | bg `--surface-2`, borda `--border-strong`, hover borda `--accent` |
| **Button ghost** | transparente, `--text-muted` → `--text` |
| **Button icon** | 48px círculo, bg `--overlay`; active bg `--primary` |
| **ScoreBar (v2)** | pill `--overlay`, label 14px uppercase, track 8px, valor `.num` 22px na cor do score. Largura mín. do track 64px |
| **Timer HUD** | topo-centro, `.num` 96px (mock: 40px proporcional), sub "ROUND n/m" 12px tracking-widest |
| **Punch feed** | canto direito; golpe novo entra 18px + "+XP", decai escala/opacidade (.7/.4); máx 3 itens |
| **Round controls** | rodapé-centro: stop 52–64 · pause/play primário 64–80 · voz 52–64; anel SVG de progresso `--primary` sobre `--surface-2` |
| **XP bar** | track `--xp-track` 12px, fill `--xp` + `--glow-accent` |
| **LVL chip** | pill borda `--accent`, texto `--accent-light`, ícone star |
| **Quest card** | borda dashed `--border-strong`, radius 14; done: borda sólida `--accent`, check bg `--xp`; XP à direita `.num` |
| **Medal/badge** | 76px; adulto: radial dourado + borda `--accent-deep`; kids: radius 24, radial lilás→rosa, glow, rotate −3°; locked: grayscale + opacity .35 |
| **Coach bubble** | borda `--accent`, radius 16 (canto sup. esq. 4), bg `--surface-2`, avatar `volume-2` ao lado |
| **Profile card** | radius 20, avatar 64–72 borda `--accent`, nome display uppercase, LVL chip; selected: borda `--accent` + glow |
| **Setting row** | h ≥ 56, borda sup. `--border`; switch 48×28, on = `--primary` |
| **Chart semanal** | 7 barras radius 6, cor pela faixa de score do dia, dia vazio `--surface-2` a 8%; valor médio `.num` grande no header |
| **Estados** | loading: overlay total + spinner `--accent` + texto `--accent-light`; sem pose: faixa inferior `--overlay` texto `--score-warn` 16px; câmera negada: tela cheia `camera-off` + CTA "Tentar de novo" (nunca toast) |

## 7. Telas (inventário)

`/profiles` seletor (define tema do app) · `/` home (saudação, XP, CTA, modos, missões, streak) · `/training` HUD + controles · `/summary` resumo (XP hero, médias, breakdown, coach IA, conquista nova) · `/progress` (nível/rank, gráfico 7 dias, badges, próxima missão) · `/settings` (round, descanso, voz, resumo IA, modo kids, perfil, câmera). Layouts: `Telas v2.html`.

## 8. Implementação — notas para o PR

1. Substituir `src/styles/globals.css` pelo `tokens.css` (manter `@import 'tailwindcss'`). Classes existentes `boxing-*`/`score-*` podem ser mapeadas como aliases durante a migração.
2. Tema: `document.documentElement.dataset.theme = profile.isKid ? 'kids' : 'adult'` ao selecionar perfil; persistir com o perfil (zustand).
3. Copy por tema: dicionário `pt-BR` com chaves duplas (`adult`/`kids`) — não condicionar strings dentro dos componentes.
4. `lucide-react` já é dependência; novos ícones: timer, play, pause, square, trophy, flame, star, crown, sparkles, trending-up, user, volume-2, camera-off, shield, zap, check, medal, award.
5. Fontes: preferir self-host (vite + `@fontsource/saira-condensed`, `@fontsource/saira`) para o PWA funcionar offline.
6. Nomes "Orlando"/"Alice" nos mocks são placeholders.
7. `prefers-reduced-motion`: desligar animação do punch feed e do glow pulsante (se houver).
