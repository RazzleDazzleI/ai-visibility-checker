/**
 * Google Gemini with Search grounding.
 *
 * Runs on every check: grounding is included on the free tier, which is what
 * makes a scheduled job over many businesses affordable at all.
 * Model ID current as of August 2026.
 */
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function queryGemini(prompt, { apiKey = process.env.GEMINI_API_KEY, signal } = {}) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
    signal,
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return parseGemini(await res.json());
}

/** Exported so tests can run against recorded fixtures without network. */
export function parseGemini(body) {
  const cand = body?.candidates?.[0];
  const answer = cand?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') ?? '';

  // Grounding metadata is where the real signal lives — the URLs the model
  // actually retrieved, not URLs it wrote into prose.
  const chunks = cand?.groundingMetadata?.groundingChunks ?? [];
  const citations = chunks
    .map(c => c.web?.uri)
    .filter(Boolean);

  return { provider: 'gemini', model: MODEL, answer, citations };
}
