/**
 * Orchestration: build the prompt, run the enabled providers, classify what
 * came back, and hand a uniform result to the caller.
 */
import { queryGemini } from './gemini.js';
import { queryOpenAI } from './openai.js';
import { summarise } from '../citations.js';

/**
 * Buyer-intent phrasing, not brand phrasing. Asking "tell me about Acme Co"
 * guarantees a mention and measures nothing. The question worth answering is
 * whether the business surfaces when someone describes a need.
 */
export function buildPrompt({ niche, city }) {
  return `I'm looking for a ${niche} in ${city}. Which specific businesses would you recommend, and why?`;
}

/** Substring match is intentional — models abbreviate and reformat names. */
export function detectMention(answer, name) {
  const hay = answer.toLowerCase();
  const full = name.toLowerCase();
  if (hay.includes(full)) return true;

  // "Lakeside Auto Spa LLC" should still match "Lakeside Auto Spa".
  const trimmed = full.replace(/\b(llc|inc|co|company|ltd)\b\.?/g, '').trim();
  return trimmed.length > 3 && hay.includes(trimmed);
}

export function providersEnabled() {
  const list = ['gemini'];
  if (process.env.USE_OPENAI === '1') list.push('openai');
  return list;
}

export async function runCheck({ name, niche, city, domain = null }) {
  const prompt = buildPrompt({ niche, city });
  const runners = { gemini: queryGemini, openai: queryOpenAI };

  const results = [];
  for (const provider of providersEnabled()) {
    try {
      const raw = await runners[provider](prompt);
      results.push({
        ...raw,
        prompt,
        mentioned: detectMention(raw.answer, name),
        summary: summarise(raw.citations, domain),
      });
    } catch (err) {
      // A provider failure is recorded, never scored as "not mentioned" —
      // an API error is not a finding, and conflating the two silently
      // corrupts the trend line.
      results.push({
        provider, model: '-', prompt, answer: null, citations: [],
        mentioned: false, error: err.message,
        summary: summarise([], domain),
      });
    }
  }
  return results;
}
