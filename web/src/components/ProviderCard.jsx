const LABELS = { first_party: 'First-party', directory: 'Directory', social: 'Social', platform: 'Platform', other: 'Other' };

export default function ProviderCard({ run }) {
  if (run.error) {
    return (
      <div className="card provider err">
        <header><h3>{run.provider}</h3><span className="pill pill-err">error</span></header>
        <p className="muted">{run.error}</p>
        <p className="small muted">Recorded as an error, not as “not mentioned”. An API failure is not a finding.</p>
      </div>
    );
  }

  const counts = run.citations.reduce((acc, c) => ({ ...acc, [c.category]: (acc[c.category] ?? 0) + 1 }), {});

  return (
    <div className="card provider">
      <header>
        <h3>{run.provider} <span className="muted small">{run.model}</span></h3>
        <span className={`pill ${run.mentioned ? 'pill-yes' : 'pill-no'}`}>
          {run.mentioned ? 'mentioned' : 'not mentioned'}
        </span>
      </header>

      <p className="diagnosis">{run.diagnosis_text}</p>

      <div className="bar">
        {Object.entries(counts).map(([cat, n]) => (
          <span key={cat} className={`seg seg-${cat}`} style={{ flexGrow: n }} title={`${LABELS[cat] ?? cat}: ${n}`} />
        ))}
      </div>

      <ul className="citations">
        {run.citations.length === 0 && <li className="muted">No citations returned.</li>}
        {run.citations.map((c, i) => (
          <li key={i}>
            <span className={`dot dot-${c.category}`} />
            <a href={c.url} target="_blank" rel="noreferrer">{c.host}</a>
            <span className="muted small"> {LABELS[c.category] ?? c.category}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
