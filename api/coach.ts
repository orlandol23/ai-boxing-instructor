import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

/**
 * POST /api/coach
 *
 * Receives a SessionSummary-shaped payload from the frontend at the end of
 * a round or session and returns a natural-language coaching message in
 * PT-BR. Uses Claude Haiku 4.5 with prompt caching on the system prompt
 * so repeated requests in the same session burn 90% less input tokens.
 *
 * Graceful degradation: if ANTHROPIC_API_KEY is not set in the environment,
 * the endpoint returns 503 with a stable error code. The frontend hides
 * the coaching UI in that case so the rest of the app keeps working.
 */

type CoachType = 'round' | 'session';

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
}

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS = 400;

const SYSTEM_PROMPT = `Você é um treinador de boxe brasileiro experiente, com mais de 20 anos formando atletas amadores e profissionais. Seu papel é dar coaching curto e útil em português brasileiro, baseado em métricas estruturadas que um sistema de visão computacional extraiu de um round ou de uma sessão de treino.

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

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isPunchBreakdown(value: unknown): value is PunchBreakdown {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    isPositiveNumber(v.jab) &&
    isPositiveNumber(v.cross) &&
    isPositiveNumber(v.lead_hook) &&
    isPositiveNumber(v.rear_hook) &&
    isPositiveNumber(v.lead_uppercut) &&
    isPositiveNumber(v.rear_uppercut)
  );
}

function isValidBody(value: unknown): value is CoachRequestBody {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.type !== 'round' && v.type !== 'session') return false;
  if (v.roundNumber !== undefined && !isPositiveNumber(v.roundNumber)) return false;
  if (!v.summary || typeof v.summary !== 'object') return false;
  const s = v.summary as Record<string, unknown>;
  return (
    isPositiveNumber(s.duration) &&
    isPositiveNumber(s.rounds) &&
    isPositiveNumber(s.totalPunches) &&
    isPunchBreakdown(s.punchBreakdown) &&
    isPositiveNumber(s.avgGuardScore) &&
    isPositiveNumber(s.avgBaseScore) &&
    isStringArray(s.corrections) &&
    isStringArray(s.highlights)
  );
}

function formatUserMessage(body: CoachRequestBody): string {
  const { type, summary, roundNumber } = body;
  const durationS = Math.round(summary.duration / 1000);

  const punchLines = (Object.entries(summary.punchBreakdown) as [string, number][])
    .filter(([, count]) => count > 0)
    .map(([t, count]) => `  ${t}: ${count}`)
    .join('\n');

  const correctionLines =
    summary.corrections.length > 0
      ? summary.corrections.map((c) => `  - ${c}`).join('\n')
      : '  (nenhuma)';

  const highlightLines =
    summary.highlights.length > 0
      ? summary.highlights.map((h) => `  - ${h}`).join('\n')
      : '  (nenhum)';

  return `type: ${type}${roundNumber !== undefined ? `, roundNumber: ${roundNumber}` : ''}
duration: ${durationS}s
rounds completed: ${summary.rounds}
totalPunches: ${summary.totalPunches}
avgGuardScore: ${Math.round(summary.avgGuardScore)}
avgBaseScore: ${Math.round(summary.avgBaseScore)}
punchBreakdown:
${punchLines || '  (nenhum golpe registrado)'}
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

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: formatUserMessage(req.body),
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
    console.error('[api/coach] upstream error:', err);
    res.status(status >= 500 ? 502 : status).json({
      error: 'coaching_failed',
      message: isAnthropic ? err.message : 'unknown',
    });
  }
}
