/**
 * Persistence. A single check is a snapshot; the trend is what matters,
 * so every run is stored and nothing is overwritten.
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? 'data/visibility.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id       INTEGER PRIMARY KEY,
    name     TEXT NOT NULL,
    niche    TEXT NOT NULL,
    city     TEXT NOT NULL,
    domain   TEXT,
    created  TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(name, city)
  );

  CREATE TABLE IF NOT EXISTS runs (
    id          INTEGER PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    provider    TEXT NOT NULL,
    model       TEXT NOT NULL,
    prompt      TEXT NOT NULL,
    mentioned   INTEGER NOT NULL,
    diagnosis   TEXT NOT NULL,
    answer      TEXT,
    error       TEXT,
    ran_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS citations (
    id       INTEGER PRIMARY KEY,
    run_id   INTEGER NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    url      TEXT NOT NULL,
    host     TEXT NOT NULL,
    category TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_runs_business ON runs(business_id, ran_at DESC);
  CREATE INDEX IF NOT EXISTS idx_citations_run ON citations(run_id);
`);

export function upsertBusiness({ name, niche, city, domain = null }) {
  db.prepare(`INSERT INTO businesses (name,niche,city,domain) VALUES (?,?,?,?)
              ON CONFLICT(name,city) DO UPDATE SET niche=excluded.niche, domain=excluded.domain`)
    .run(name, niche, city, domain);
  return db.prepare('SELECT * FROM businesses WHERE name=? AND city=?').get(name, city);
}

export function recordRun(businessId, result) {
  const info = db.prepare(`INSERT INTO runs
      (business_id,provider,model,prompt,mentioned,diagnosis,answer,error)
      VALUES (?,?,?,?,?,?,?,?)`)
    .run(businessId, result.provider, result.model, result.prompt,
         result.mentioned ? 1 : 0, result.summary.diagnosis,
         result.answer ?? null, result.error ?? null);

  const ins = db.prepare('INSERT INTO citations (run_id,url,host,category) VALUES (?,?,?,?)');
  const many = db.transaction(rows => { for (const r of rows) ins.run(...r); });
  many(Object.entries(result.summary.buckets).flatMap(([cat, urls]) =>
    urls.map(u => [info.lastInsertRowid, u, new URL(u).hostname.replace(/^www\./, ''), cat])));

  return info.lastInsertRowid;
}

export const queries = {
  businesses: () => db.prepare(`
    SELECT b.*, COUNT(r.id) AS run_count, MAX(r.ran_at) AS last_run
    FROM businesses b LEFT JOIN runs r ON r.business_id=b.id
    GROUP BY b.id ORDER BY b.name`).all(),

  latestByProvider: (businessId) => db.prepare(`
    SELECT r.* FROM runs r
    JOIN (SELECT provider, MAX(ran_at) AS m FROM runs WHERE business_id=? GROUP BY provider) x
      ON x.provider=r.provider AND x.m=r.ran_at
    WHERE r.business_id=?`).all(businessId, businessId),

  history: (businessId, limit = 60) => db.prepare(`
    SELECT id,provider,model,mentioned,diagnosis,ran_at
    FROM runs WHERE business_id=? ORDER BY ran_at DESC LIMIT ?`).all(businessId, limit),

  citationsFor: (runId) => db.prepare(
    'SELECT url,host,category FROM citations WHERE run_id=?').all(runId),

  citationRollup: (businessId) => db.prepare(`
    SELECT c.category, COUNT(*) AS n, COUNT(DISTINCT c.host) AS hosts
    FROM citations c JOIN runs r ON r.id=c.run_id
    WHERE r.business_id=? GROUP BY c.category ORDER BY n DESC`).all(businessId),
};
