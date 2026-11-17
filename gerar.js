import { GoogleGenAI } from '@google/genai';

const WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = 5;
const rateLimits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now - entry.start >= WINDOW_MS) rateLimits.delete(key);
  }
  const current = rateLimits.get(ip);
  if (!current) {
    rateLimits.set(ip, { start: now, count: 1 });
    return false;
  }
  if (current.count >= MAX_CALLS_PER_WINDOW) return true;
  current.count += 1;
  return false;
}

function validateReading(leitura) {
  if (typeof leitura !== 'string') return null;
  const match = leitura
    .trim()
    .match(/^Salmos\s+(\d{1,3})\s*,\s*Provérbios\s+(\d{1,2})\s*,\s*Eclesiastes\s+(\d{1,2})$/);
  if (!match) return null;

  const salmos = Number(match[1]);
  const proverbios = Number(match[2]);
  const eclesiastes = Number(match[3]);

  if (salmos < 1 || salmos > 150) return null;
  if (proverbios < 1 || proverbios > 31) return null;
  if (eclesiastes < 1 || eclesiastes > 12) return null;

  return `Salmos ${salmos}, Provérbios ${proverbios}, Eclesiastes ${eclesiastes}`;
}

function sanitizeOutput(raw) {
  const reflexao = String(raw?.reflexao || '').trim();
  let frase = String(raw?.frase || '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (frase.length > 140) {
    frase = frase.slice(0, 139).trimEnd() + '…';
  }

  const tags = String(raw?.hashtags || '')
    .match(/#[\p{L}\p{N}_]+/gu) || [];
  const uniqueTags = [];
  const seen = new Set();

  const addTag = (tag) => {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTags.push(tag);
    }
  };

  addTag('#GotasdeCHAbedoria');
  for (const t of tags) {
    if (uniqueTags.length >= 6) break;
    addTag(t);
  }

  return {
    reflexao,
    frase,
    hashtags: uniqueTags.join(' ')
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Muitas tentativas em sequência. Aguarde um minuto e tente novamente.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Corpo da requisição inválido.' });
    }
  }

  const reading = validateReading(body?.leitura);
  if (!reading) {
    return res.status(400).json({
      error: 'Leitura inválida. Informe Salmos (1–150), Provérbios (1–31) e Eclesiastes (1–12).'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chave da API Gemini não configurada no servidor.' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const prompt = [
    `Você escreve para o projeto devocional "Gotas de CHAbedoria".`,
    `Leitura de hoje: ${reading}.`,
    `Escreva em português do Brasil, em tom acolhedor e direto.`,
    `Parafraseie as ideias sem citar versículos longos e sem inventar conteúdo; se não tiver certeza do que há num capítulo, seja mais geral.`,
    `Responda SOMENTE em JSON válido com as chaves:`,
    `- "reflexao": 3 parágrafos curtos separados por uma linha em branco (o que os capítulos ensinam juntos, uma conexão ou contraste entre eles, e uma aplicação prática para hoje).`,
    `- "frase": frase de impacto para o Instagram, com até 140 caracteres, sem aspas e sem hashtags.`,
    `- "hashtags": 6 hashtags separadas por espaço, incluindo #GotasdeCHAbedoria.`
  ].join('\n');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model,
      input: prompt,
      store: false,
      generation_config: {
        max_output_tokens: 700,
        temperature: 0.7
      },
      response_format: {
        type: 'object',
        properties: {
          reflexao: { type: 'string' },
          frase: { type: 'string' },
          hashtags: { type: 'string' }
        },
        required: ['reflexao', 'frase', 'hashtags']
      }
    });

    const text = (interaction.output_text || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    const result = sanitizeOutput(parsed);

    if (!result.reflexao || !result.frase) {
      return res.status(502).json({ error: 'A IA retornou uma resposta incompleta. Tente novamente.' });
    }

    return res.status(200).json(result);
  } catch (err) {
    const status = err?.status === 429 ? 429 : err?.status === 503 ? 503 : 502;
    const message =
      status === 429
        ? 'Limite de uso da IA atingido no momento. Tente novamente em instantes.'
        : status === 503
          ? 'O serviço de IA está temporariamente sobrecarregado. Tente novamente em instantes.'
          : 'Não foi possível gerar a reflexão agora. Tente novamente.';
    return res.status(status).json({ error: message });
  }
}
