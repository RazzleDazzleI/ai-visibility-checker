import { useState } from 'react';

export default function CheckForm({ onSubmit, busy }) {
  const [form, setForm] = useState({ name: '', niche: '', city: '', domain: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const valid = form.name && form.niche && form.city;

  return (
    <form
      className="card check-form"
      onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit(form); }}
    >
      <h2>Run a check</h2>
      <div className="grid">
        <label>Business<input value={form.name} onChange={set('name')} placeholder="Acme Detailing" /></label>
        <label>Niche<input value={form.niche} onChange={set('niche')} placeholder="mobile detailing" /></label>
        <label>City<input value={form.city} onChange={set('city')} placeholder="Omaha, NE" /></label>
        <label>Domain <span className="muted">(optional)</span>
          <input value={form.domain} onChange={set('domain')} placeholder="acme.com" /></label>
      </div>
      <button disabled={!valid || busy}>{busy ? 'Asking the models…' : 'Check visibility'}</button>
      <p className="muted small">
        Asks each provider a buyer-intent question with web grounding on, then reports
        whether the business is named and which sources the model actually retrieved.
      </p>
    </form>
  );
}
