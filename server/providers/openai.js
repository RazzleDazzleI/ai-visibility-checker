/**
 * OpenAI with the web_search tool.
 *
 * Flag-gated behind USE_OPENAI because it bills per call. The cheapest model
 * carrying the search tool is used deliberately — cost per run is a design
 * constraint when the job sweeps many businesses on a schedule.
 * Model ID current as of August 2026.
 */
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-nano';
const ENDPOINT = 'https://api.openai.com/v1/responses';

export async function queryOpenAI(prompt, { apiKey = process.env.OPENAI_API_KEY, signal } = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, input: prompt, tools: [{ type: 'web_search' }] }),
    signal,
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return parseOpenAI(await res.json());
}

export function parseOpenAI(body) {
  const messages = (body?.output ?? []).filter(o => o.type === 'message');
  const parts = messages.flatMap(m => m.content ?? []);
  const answer = parts.map(p => p.text).filter(Boolean).join('\n');

  const citations = parts
    .flatMap(p => p.annotations ?? [])
    .filter(a => a.type === 'url_citation')
    .map(a => a.url)
    .filter(Boolean);

  return { provider: 'openai', model: MODEL, answer, citations };
}
