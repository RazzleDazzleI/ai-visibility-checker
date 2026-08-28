import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import CheckForm from './components/CheckForm.jsx';
import ProviderCard from './components/ProviderCard.jsx';
import HistoryChart from './components/HistoryChart.jsx';

export default function App() {
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [detail, setDetail]         = useState(null);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState(null);
  const [providers, setProviders]   = useState([]);

  const loadBusinesses = useCallback(async () => {
    try { setBusinesses(await api.businesses()); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    loadBusinesses();
    api.health().then(h => setProviders(h.providers)).catch(() => {});
  }, [loadBusinesses]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    api.business(selected).then(setDetail).catch(e => setError(e.message));
  }, [selected]);

  async function handleCheck(form) {
    setBusy(true); setError(null);
    try {
      const { business } = await api.check(form);
      await loadBusinesses();
      setSelected(business.id);
      setDetail(await api.business(business.id));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>AI Visibility Checker</h1>
          <p className="muted">Does an AI assistant recommend this business — and what did it read to decide?</p>
        </div>
        <div className="providers">
          {providers.map(p => <span key={p} className="pill pill-muted">{p}</span>)}
        </div>
      </header>

      {error && <div className="card err-banner">{error}</div>}

      <CheckForm onSubmit={handleCheck} busy={busy} />

      {businesses.length > 0 && (
        <nav className="tabs">
          {businesses.map(b => (
            <button key={b.id}
              className={b.id === selected ? 'tab active' : 'tab'}
              onClick={() => setSelected(b.id)}>
              {b.name}<span className="muted small"> {b.run_count} runs</span>
            </button>
          ))}
        </nav>
      )}

      {detail && (
        <>
          <section className="cards">
            {detail.latest.map(r => <ProviderCard key={r.id} run={r} />)}
          </section>
          <HistoryChart history={detail.history} />
        </>
      )}

      {!businesses.length && !busy && (
        <p className="muted empty">No checks yet. Run one above to get started.</p>
      )}
    </div>
  );
}
