#!/usr/bin/env node
/**
 * One-off check from the terminal.
 *   npm run check -- --business "Acme Co" --niche "plumbing" --city "Omaha, NE"
 */
import { upsertBusiness, recordRun } from './db.js';
import { runCheck } from './providers/index.js';
import { DIAGNOSIS_TEXT } from './citations.js';

const args = process.argv.slice(2);
const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };

const name  = get('--business');
const niche = get('--niche');
const city  = get('--city');
const domain= get('--domain') ?? null;

if (!name || !niche || !city) {
  console.error('usage: npm run check -- --business "Name" --niche "plumbing" --city "Omaha, NE" [--domain example.com]');
  process.exit(1);
}

const business = upsertBusiness({ name, niche, city, domain });
const results = await runCheck({ name, niche, city, domain });

for (const r of results) {
  recordRun(business.id, r);
  console.log(`\n── ${r.provider} (${r.model}) ──`);
  if (r.error) { console.log(`  ERROR: ${r.error}`); continue; }
  console.log(`  mentioned : ${r.mentioned ? 'YES' : 'no'}`);
  console.log(`  citations : ${r.summary.total}  ${JSON.stringify(r.summary.counts)}`);
  console.log(`  diagnosis : ${DIAGNOSIS_TEXT[r.summary.diagnosis]}`);
}
console.log();
