import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

/** A single run is a snapshot. The trend is the thing worth looking at. */
export default function HistoryChart({ history }) {
  if (!history?.length) return <p className="muted">No runs recorded yet.</p>;

  const byDate = {};
  for (const h of [...history].reverse()) {
    const day = h.ran_at.slice(0, 10);
    byDate[day] ??= { day };
    byDate[day][h.provider] = (byDate[day][h.provider] ?? 0) + (h.mentioned ? 1 : 0);
  }
  const data = Object.values(byDate);
  const providers = [...new Set(history.map(h => h.provider))];
  const colors = { gemini: '#2f6fed', openai: '#12a37a' };

  return (
    <div className="card">
      <h2>Mentions over time</h2>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {providers.map(p => (
              <Line key={p} type="monotone" dataKey={p} stroke={colors[p] ?? '#888'} strokeWidth={2} dot />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
