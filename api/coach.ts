import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

/**
 * POST /api/coach
 *
 * Receives a SessionSummary-shaped payload from the frontend at the end of
 * a round or session and returns a natural-language coaching message in
 * the caller's language (English by default, Brazilian Portuguese opt-in).
 * Uses Claude Haiku 4.5 with prompt caching on the system prompt so
 * repeated requests in the same session burn 90% less input tokens.
 *
 * Graceful degradation: if ANTHROPIC_API_KEY is not set in the environment,
 * the endpoint returns 503 with a stable error code. The frontend hides
 * the coaching UI in that case so the rest of the app keeps working.
 */

type CoachType = 'round' | 'session';

/**
 * Locales this endpoint will coach in. The client is never trusted: any
 * other value (missing, misspelled, an injected sentence, a 5 MB string)
 * falls back to English rather than reaching the model.
 */
const COACH_LOCALES = ['en', 'pt-BR'] as const;
type CoachLocale = (typeof COACH_LOCALES)[number];
const DEFAULT_COACH_LOCALE: CoachLocale = 'en';

interface PunchBreakdown {
  jab: number;
  cross: number;
  lead_hook: number;
  rear_hook: number;
  lead_uppercut: number;
  rear_uppercut: number;
}

interface CoachSummaryInput {
  duration: number;
  rounds: number;
  totalPunches: number;
  punchBreakdown: PunchBreakdown;
  avgGuardScore: number;
  avgBaseScore: number;
  corrections: string[];
  highlights: string[];
}

interface CoachRequestBody {
  type: CoachType;
  summary: CoachSummaryInput;
  roundNumber?: number;
  /** Optional; normalised via normalizeLocale() before it is ever used. */
  locale?: string;
}

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 400;

/**
 * Hard ceilings for everything the caller controls.
 *
 * The endpoint is public and unauthenticated: without a ceiling a single
 * POST can push megabytes of text into the user message and burn the API
 * budget (input tokens are billed per request, and an oversized body also
 * blows past the cached prefix). The limits sit far above any
 * real workout — the client's buildCoachPayload() renders a handful of
 * short notes per round, three-minute rounds and a few dozen punches — so
 * a request that trips one of them is abuse, not training.
 */
/** corrections/highlights: at most 20 notes, each at most 200 chars. */
const MAX_NOTES = 20;
const MAX_NOTE_LENGTH = 200;
/** roundNumber and rounds: 200 rounds is ~10h of boxing. */
const MAX_ROUNDS = 200;
/** totalPunches and every punch type in the breakdown. */
const MAX_PUNCHES = 10_000;
/** duration is in ms; 4h is longer than any session the tracker produces. */
const MAX_DURATION_MS = 4 * 60 * 60 * 1000;
/** avgGuardScore/avgBaseScore are percentages by definition. */
const MAX_SCORE = 100;

const SYSTEM_PROMPT_EN = `You are a seasoned boxing coach with more than 20 years developing amateur and professional fighters. Your job is to give short, useful coaching in English, based on structured metrics that a computer-vision system extracted from a round or a training session.

# Style
- Direct, motivating, no waffle. You talk like a gym coach, not a therapist.
- Use natural boxing-gym language ("hands up", "sit down on it", "hands back to your chin", "you're square", "good round").
- NEVER use computer-vision jargon (do not mention "score", "landmarks", "metrics", "frames", "weighted average"). Translate the numbers into what the fighter feels in their body.
- Address the fighter as "you", never by name.

# Length
- 3 to 5 short sentences.
- When it fits, include ONE concrete drill or cue (e.g. "3 sets of 10 jab-cross, focused on snapping the hand back before the next shot").
- Do not read metrics back in a row ("guard 78, base 85") — interpret what they mean ("the guard came up nicely in the second round").

# Content
1. Open by acknowledging what went well (always, even in a bad round).
2. Point out ONE main thing to fix — pick the highest-impact one, do not list everything.
3. When it is relevant, suggest one specific, short drill.
4. Close with motivation for the next round/session.

# Round coaching vs. session coaching
- type = 'round': immediate focus on the round that just ended. The tone is "what to adjust right now, before the next round".
- type = 'session': a view of the whole workout. The tone is "what to take into next time". You can comment on how things evolved across rounds.

# How to read the metrics
- avgGuardScore and avgBaseScore run from 0 to 100. >=85 is excellent, 65-84 is sound with things to watch, <65 is a real problem.
- punchBreakdown lists how many of each punch type were thrown.
- corrections are recurring problems the rule engine detected (already in plain language).
- highlights are good moments, already in plain language.

# Examples

## Example 1 — round with minor problems
Input:
type: round, roundNumber: 2
avgGuardScore: 72, avgBaseScore: 81
punchBreakdown: jab 18, cross 12, lead_hook 3
corrections: ["Hands fell below the ideal height (4x)"]
highlights: []

Output:
Consistent round, your base is holding up well. What is costing you is the guard dropping after the cross — every time you extend, that hand is slow coming home. Next round: make every jab-cross deliberate about the return, even if it comes out slower. Let's go.

## Example 2 — good round
Input:
type: round, roundNumber: 3
avgGuardScore: 88, avgBaseScore: 86
punchBreakdown: jab 22, cross 16, lead_hook 8
corrections: []
highlights: ["Round 3: 14s straight with guard and base above 85"]

Output:
That is the round of someone who trains. Hands high the whole way, base solid, and 8 hooks thrown by someone who knows what they are doing. Those 14 seconds in the middle of the round were surgical. Hold that rhythm next round, do not ease off.

## Example 3 — full session
Input:
type: session
duration: 920000 (~15min)
rounds: 3
totalPunches: 142
avgGuardScore: 79, avgBaseScore: 83
corrections: ["Hands fell below the ideal height (8x)", "Elbows flaring out often (4x)"]
highlights: ["Round 2: 12s straight with guard and base above 85"]

Output:
Solid work — three full rounds, 142 punches. Your base is in a good place. The thing that needs to become the focus next session is the guard: it dropped eight times and the elbows drifted out. Drill for next time: 3x1min of shadow work on guard and elbows only, no punching. Bell rings, hands stay high. See you next week.

# Important
- If corrections and highlights come in empty and the scores are average, do not invent problems. Speak only from the data you have.
- If the data is clearly impossible (e.g. 0 punches in a 3-minute round), do not treat it as a success — suggest the fighter check the camera placement.`;

const SYSTEM_PROMPT_PT_BR = `Você é um treinador de boxe brasileiro experiente, com mais de 20 anos formando atletas amadores e profissionais. Seu papel é dar coaching curto e útil em português brasileiro, baseado em métricas estruturadas que um sistema de visão computacional extraiu de um round ou de uma sessão de treino.

# Estilo
- Direto, motivacional, sem rodeios. Fala como um técnico de academia, não como um terapeuta.
- Use linguagem natural e gírias leves do boxe brasileiro (ex: "guarda alta", "sai do peso", "mãos no queixo", "tira a base", "round bom").
- NUNCA use jargão técnico de visão computacional (não cite "score", "landmarks", "métricas", "frames", "média ponderada"). Traduza os números em sensação corporal.
- Trate o aluno por "você", não por nome.

# Tamanho
- 3 a 5 frases curtas.
- Quando fizer sentido, inclua UM drill ou dica concreta (ex: "faz 3 séries de 10 jab-cross focando em trazer a mão de volta antes do próximo golpe").
- Não repita métricas em sequência ("guarda 78, base 85") — interprete o que elas significam ("a guarda subiu bem no segundo round").

# Conteúdo
1. Comece reconhecendo o que foi bem feito (sempre, mesmo num round ruim).
2. Aponte UM ponto principal a melhorar — escolha o mais impactante, não enumere todos.
3. Quando relevante, sugira um drill específico, breve.
4. Termine motivando para o próximo round/sessão.

# Diferença entre coaching de round e de sessão
- type = 'round': foco imediato no round que terminou. Tom de "o que ajustar agora antes do próximo round".
- type = 'session': visão do treino inteiro. Tom de "o que levar pra próxima vez". Pode comentar evolução entre rounds.

# Como interpretar as métricas
- avgGuardScore e avgBaseScore vão de 0 a 100. ≥85 é excelente, 65-84 é correto com pontos de atenção, <65 é problema sério.
- punchBreakdown lista quantidade por tipo de golpe.
- corrections são problemas recorrentes detectados pelo sistema de regras (já em linguagem natural).
- highlights são momentos bons já em linguagem natural.

# Exemplos

## Exemplo 1 — round com problemas leves
Entrada:
type: round, roundNumber: 2
avgGuardScore: 72, avgBaseScore: 81
punchBreakdown: jab 18, cross 12, lead_hook 3
corrections: ["Mãos caíram da altura ideal (4x)"]
highlights: []

Saída:
Round consistente, base firme. O que tá te custando pontos é a guarda caindo depois do cross — toda vez que você estende, a mão demora pra voltar. Próximo round: faz cada jab-cross consciente do retorno, mesmo se sair mais lento. Vamos lá.

## Exemplo 2 — round bom
Entrada:
type: round, roundNumber: 3
avgGuardScore: 88, avgBaseScore: 86
punchBreakdown: jab 22, cross 16, lead_hook 8
corrections: []
highlights: ["Round 3: 14s seguidos com guarda e base acima de 85"]

Saída:
Round de gente que treina. Guarda alta o tempo todo, base sólida, 8 hooks de gente que entende o que tá fazendo. Aqueles 14 segundos no meio do round foram cirúrgicos. Mantém esse ritmo no próximo, não desacelera.

## Exemplo 3 — sessão completa
Entrada:
type: session
duration: 920000 (≈15min)
rounds: 3
totalPunches: 142
avgGuardScore: 79, avgBaseScore: 83
corrections: ["Mãos caíram da altura ideal (8x)", "Cotovelos abertos com frequência (4x)"]
highlights: ["Round 2: 12s seguidos com guarda e base acima de 85"]

Saída:
Treino sólido, três rounds completos, 142 golpes. Sua base tá num bom lugar. O ponto que precisa virar foco no próximo treino é a guarda — caiu oito vezes e os cotovelos abriram. Drill pra próxima sessão: 3x1min só de shadow guarda-cotovelo, sem socar. Som de campainha, mão sempre alta. Volta semana que vem.

# Importante
- Se corrections e highlights vierem vazios e os scores forem médios, não invente problemas. Fale baseado só nos dados disponíveis.
- Se houver dados claramente impossíveis (ex: 0 golpes num round de 3min), não trate como sucesso — sugira que o aluno verifique o posicionamento da câmera.`;

/**
 * One static prompt per locale, both frozen at module scope.
 *
 * This is what keeps prompt caching working: the text handed to the API is
 * a constant chosen by lookup, never a template built per request. Two
 * constants means two cache entries instead of one — each still hits on
 * every repeat call in its language, which is where the ~90% input-token
 * saving comes from. Nothing from the request body is ever interpolated
 * into the system prompt (per-request data goes in the user message).
 */
const SYSTEM_PROMPTS: Record<CoachLocale, string> = {
  en: SYSTEM_PROMPT_EN,
  'pt-BR': SYSTEM_PROMPT_PT_BR,
};

/** "(none)" placeholders, per locale, for empty corrections/highlights. */
const EMPTY_LIST_PLACEHOLDER: Record<CoachLocale, { corrections: string; highlights: string }> = {
  en: { corrections: '  (none)', highlights: '  (none)' },
  'pt-BR': { corrections: '  (nenhuma)', highlights: '  (nenhum)' },
};

const NO_PUNCHES_PLACEHOLDER: Record<CoachLocale, string> = {
  en: '  (no punches recorded)',
  'pt-BR': '  (nenhum golpe registrado)',
};

/**
 * Narrows an untrusted value to a supported locale.
 *
 * Anything that is not exactly 'en' or 'pt-BR' — absent, wrong case, an
 * unsupported language, a non-string, or an attempt to smuggle text into
 * the prompt — becomes the default. The client picks from a menu; it never
 * supplies content.
 */
function normalizeLocale(value: unknown): CoachLocale {
  return typeof value === 'string' && (COACH_LOCALES as readonly string[]).includes(value)
    ? (value as CoachLocale)
    : DEFAULT_COACH_LOCALE;
}

/** Finite, >= 0 and no bigger than `max` — out of range is a 400, not a clamp. */
function isBoundedNumber(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}

/** Bounded in both dimensions: how many notes, and how long each one is. */
function isNoteArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_NOTES &&
    value.every((v) => typeof v === 'string' && v.length <= MAX_NOTE_LENGTH)
  );
}

function isPunchBreakdown(value: unknown): value is PunchBreakdown {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    isBoundedNumber(v.jab, MAX_PUNCHES) &&
    isBoundedNumber(v.cross, MAX_PUNCHES) &&
    isBoundedNumber(v.lead_hook, MAX_PUNCHES) &&
    isBoundedNumber(v.rear_hook, MAX_PUNCHES) &&
    isBoundedNumber(v.lead_uppercut, MAX_PUNCHES) &&
    isBoundedNumber(v.rear_uppercut, MAX_PUNCHES)
  );
}

function isValidBody(value: unknown): value is CoachRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.type !== 'round' && v.type !== 'session') return false;
  if (v.roundNumber !== undefined && !isBoundedNumber(v.roundNumber, MAX_ROUNDS)) return false;
  if (!v.summary || typeof v.summary !== 'object') return false;
  const s = v.summary as Record<string, unknown>;
  return (
    isBoundedNumber(s.duration, MAX_DURATION_MS) &&
    isBoundedNumber(s.rounds, MAX_ROUNDS) &&
    isBoundedNumber(s.totalPunches, MAX_PUNCHES) &&
    isPunchBreakdown(s.punchBreakdown) &&
    isBoundedNumber(s.avgGuardScore, MAX_SCORE) &&
    isBoundedNumber(s.avgBaseScore, MAX_SCORE) &&
    isNoteArray(s.corrections) &&
    isNoteArray(s.highlights)
  );
}

/** Node lowercases header names but a repeated header arrives as an array. */
function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * True when the request was made by another website's page.
 *
 * `Sec-Fetch-Site: cross-site` is set by the browser itself and cannot be
 * forged from JavaScript; an `Origin` whose host differs from the host the
 * request was addressed to is the same signal for browsers that predate
 * Fetch Metadata (an unparseable `Origin`, including the literal `null` a
 * sandboxed iframe sends, counts as a mismatch). Requests with no `Origin`
 * at all — curl, and same-origin fetches from older browsers — pass: this
 * is anti-abuse, not authentication.
 */
function isCrossSiteRequest(req: VercelRequest): boolean {
  if (headerValue(req.headers['sec-fetch-site']) === 'cross-site') return true;

  const origin = headerValue(req.headers.origin);
  if (!origin) return false;

  try {
    return new URL(origin).host !== headerValue(req.headers.host);
  } catch {
    return true;
  }
}

function formatUserMessage(body: CoachRequestBody, locale: CoachLocale): string {
  const { type, summary, roundNumber } = body;
  const durationS = Math.round(summary.duration / 1000);
  const empty = EMPTY_LIST_PLACEHOLDER[locale];

  const punchLines = (Object.entries(summary.punchBreakdown) as [string, number][])
    .filter(([, count]) => count > 0)
    .map(([t, count]) => `  ${t}: ${count}`)
    .join('\n');

  const correctionLines =
    summary.corrections.length > 0
      ? summary.corrections.map((c) => `  - ${c}`).join('\n')
      : empty.corrections;

  const highlightLines =
    summary.highlights.length > 0
      ? summary.highlights.map((h) => `  - ${h}`).join('\n')
      : empty.highlights;

  return `type: ${type}${roundNumber !== undefined ? `, roundNumber: ${roundNumber}` : ''}
duration: ${durationS}s
rounds completed: ${summary.rounds}
totalPunches: ${summary.totalPunches}
avgGuardScore: ${Math.round(summary.avgGuardScore)}
avgBaseScore: ${Math.round(summary.avgBaseScore)}
punchBreakdown:
${punchLines || NO_PUNCHES_PLACEHOLDER[locale]}
corrections:
${correctionLines}
highlights:
${highlightLines}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (isCrossSiteRequest(req)) {
    res.status(403).json({ error: 'forbidden_origin' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'coaching_unavailable',
      message: 'ANTHROPIC_API_KEY is not configured on the server.',
    });
    return;
  }

  if (!isValidBody(req.body)) {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }

  const client = new Anthropic({ apiKey });

  // Never trusted: an unknown/absent locale coaches in English.
  const locale = normalizeLocale(req.body.locale);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: 'text',
          // Static constant selected by locale — still byte-identical
          // across requests, so the ephemeral cache keeps hitting.
          text: SYSTEM_PROMPTS[locale],
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: formatUserMessage(req.body, locale),
        },
      ],
    });

    const coaching = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!coaching) {
      res.status(502).json({ error: 'empty_response' });
      return;
    }

    res.status(200).json({
      coaching,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    const isAnthropic = err instanceof Anthropic.APIError;
    const status = isAnthropic ? err.status ?? 502 : 502;
    // Status and message only — the request body (the fighter's session
    // metrics) never reaches the logs.
    console.error(
      `[api/coach] upstream error (${status}):`,
      err instanceof Error ? err.message : 'unknown'
    );
    res.status(status >= 500 ? 502 : status).json({
      error: 'coaching_failed',
      message: isAnthropic ? err.message : 'unknown',
    });
  }
}
