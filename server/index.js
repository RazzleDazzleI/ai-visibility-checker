import express from 'express';
import { upsertBusiness, recordRun, queries } from './db.js';
import { runCheck, providersEnabled } from './providers/index.js';
import { DIAGNOSIS_TEXT } from './citations.js';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, providers: providersEnabled() }));

app.get('/api/businesses', (_req, res) => res.json(queries.businesses()));

app.get('/api/businesses/:id', (req, res) => {
  const id = Number(req.params.id);
  const latest = queries.latestByProvider(id).map(r => ({
    ...r,
    mentioned: !!r.mentioned,
    diagnosis_text: DIAGNOSIS_TEXT[r.diagnosis],
    citations: queries.citationsFor(r.id),
  }));
  if (!latest.length && !queries.businesses().some(b => b.id === id)) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({
    latest,
    history: queries.history(id).map(h => ({ ...h, mentioned: !!h.mentioned })),
    rollup: queries.citationRollup(id),
  });
});

app.post('/api/check', async (req, res) => {
  const { name, niche, city, domain } = req.body ?? {};
  if (!name || !niche || !city) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'name, niche and city are required',
    });
  }
  try {
    const business = upsertBusiness({ name, niche, city, domain });
    const results = await runCheck({ name, niche, city, domain });
    for (const r of results) recordRun(business.id, r);
    res.json({ business, results });
  } catch (err) {
    res.status(500).json({ error: 'check_failed', message: err.message });
  }
});

const PORT = process.env.PORT ?? 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`[api] http://localhost:${PORT}`));
}
export { app };
