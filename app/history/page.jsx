'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getHistory, deleteReport, clearHistory } from '@/lib/storage';
import { tone } from '@/components/Ui';

function Trend({ items }) {
  const pts = [...items].reverse();
  const W = 640, H = 190, P = 28;
  if (pts.length < 2) return <p className="muted">Run at least two analyses to see your progress over time.</p>;
  const x = (i) => P + (i * (W - 2 * P)) / (pts.length - 1);
  const y = (v) => H - P - (v / 100) * (H - 2 * P);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.score)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Score history chart">
      {[0, 50, 100].map((g) => <g key={g}><line x1={P} x2={W - P} y1={y(g)} y2={y(g)} className="grid" /><text x={4} y={y(g) + 4} className="axis">{g}</text></g>)}
      <path d={d} fill="none" stroke="var(--lens)" strokeWidth="2.5" />
      {pts.map((p, i) => <circle key={p.id} cx={x(i)} cy={y(p.score)} r="5" fill={tone(p.score)}><title>{p.score} on {new Date(p.createdAt).toLocaleDateString()}</title></circle>)}
    </svg>
  );
}

export default function History() {
  const [items, setItems] = useState(null);
  useEffect(() => setItems(getHistory()), []);
  if (!items) return <p className="muted">Loading…</p>;
  if (!items.length) return (
    <div className="card empty"><h2>No reports yet</h2><p className="muted">Your analyses will appear here, saved only in this browser.</p><Link className="btn" href="/">Analyze a resume</Link></div>
  );
  return (
    <div className="stack">
      <div className="row"><h1>History</h1><button className="btn ghost sm" onClick={() => { if (confirm('Delete all saved reports?')) { clearHistory(); setItems([]); } }}>Clear all</button></div>
      <section className="card"><h2>Score over time</h2><Trend items={items} /></section>
      <div className="list">
        {items.map((r) => (
          <div key={r.id} className="card item">
            <b className="mini" style={{ color: tone(r.score), borderColor: tone(r.score) }}>{r.score}</b>
            <div className="grow"><b>{r.fileName}</b><p className="muted">{new Date(r.createdAt).toLocaleString()} · {r.matched.length} keywords matched, {r.missing.length} missing</p></div>
            <Link className="btn sm" href={`/report?id=${r.id}`}>Open</Link>
            <button className="btn ghost sm" onClick={() => { deleteReport(r.id); setItems(getHistory()); }}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
