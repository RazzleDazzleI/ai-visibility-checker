import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseGemini } from '../server/providers/gemini.js';
import { parseOpenAI } from '../server/providers/openai.js';
import { detectMention, buildPrompt } from '../server/providers/index.js';
import { summarise } from '../server/citations.js';

const fx = (n) => JSON.parse(readFileSync(new URL(`./fixtures/${n}.json`, import.meta.url)));

test('gemini: citations come from groundingChunks, not prose', () => {
  const r = parseGemini(fx('gemini-grounded'));
  assert.equal(r.citations.length, 3);
  assert.ok(r.answer.includes('Lakeside Auto Spa'));
});

test('openai: citations come from url_citation annotations', () => {
  const r = parseOpenAI(fx('openai-grounded'));
  assert.deepEqual(r.citations.map(u => new URL(u).hostname), ['www.angi.com', 'www.bbb.org']);
});

test('parsers tolerate an empty/degenerate response', () => {
  assert.deepEqual(parseGemini({}).citations, []);
  assert.deepEqual(parseOpenAI({}).citations, []);
  assert.equal(parseGemini({}).answer, '');
});

test('mention detection ignores a trailing entity suffix', () => {
  const answer = parseGemini(fx('gemini-grounded')).answer;
  assert.equal(detectMention(answer, 'Lakeside Auto Spa LLC'), true);
  assert.equal(detectMention(answer, 'Nowhere Detailing'), false);
});

test('end-to-end shape: grounded gemini fixture diagnoses retrieved_directly', () => {
  const r = parseGemini(fx('gemini-grounded'));
  const s = summarise(r.citations, 'lakesideautospa.example');
  assert.equal(s.counts.first_party, 1);
  assert.equal(s.counts.directory, 1);
  assert.equal(s.counts.social, 1);
  assert.equal(s.diagnosis, 'retrieved_directly');
});

test('prompt is buyer-intent, never brand-name lookup', () => {
  const p = buildPrompt({ niche: 'plumbing', city: 'Omaha, NE' });
  assert.ok(p.includes('plumbing') && p.includes('Omaha, NE'));
  assert.ok(!p.toLowerCase().includes('tell me about'), 'must not name the business');
});
