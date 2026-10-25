'use client';
import { useEffect, useRef, useState } from 'react';
import { CopyBtn } from './Ui';

const GROUPS = [
  { title: 'Fix', items: ['Why is my score low?', 'What should I fix first?', 'Fix my weakest bullet'] },
  { title: 'Tailor', items: ['Tailor my summary to this job', 'Which missing keywords can I honestly add?', 'Review my skills section'] },
  { title: 'Practice', items: ['Start a mock interview for this job', 'Write a short cover letter opening', 'How should I answer "Tell me about yourself"?'] },
];
const MAX_USER_MSGS = 25;

export default function Coach({ report: r }) {
  const [enabled, setEnabled] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef(null);

  useEffect(() => {
    fetch('/api/chat').then((x) => x.json()).then((d) => setEnabled(d.enabled)).catch(() => setEnabled(false));
  }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs, busy]);

  const ctx = {
    score: r.score, breakdown: r.breakdown, hasJob: r.hasJob, matched: r.matched, missing: r.missing,
    failedChecks: r.checks.filter((c) => !c.pass).map((c) => c.tip),
    weakBullets: r.bullets.map((b) => ({ original: b.original, suggested: b.improved, issues: b.issues })),
  };
  const used = msgs.filter((m) => m.role === 'user').length;

  const send = async (text) => {
    const content = text.trim().slice(0, 500);
    if (!content || busy) return;
    if (used >= MAX_USER_MSGS) return setError('Message limit reached for this report. Clear the chat to start again.');
    const next = [...msgs, { role: 'user', content }];
    setMsgs(next); setInput(''); setError(''); setBusy(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: next, report: ctx, context: r.context }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      setMsgs([...next, { role: 'assistant', content: data.reply }]);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (enabled === null) return <p className="muted">Loading coach…</p>;
  if (!enabled) return (
    <div className="card empty">
      <h2>Coach is off</h2>
      <p className="muted">Add GEMINI_API_KEY (free) to .env.local and restart the dev server to chat about this report.</p>
    </div>
  );

  return (
    <section className="card coach">
      <div className="row">
        <span className="muted">{r.context ? 'Knows your report, a trimmed copy of your resume, and the job description.' : 'Knows your report only. Re-analyze to give it your resume text.'}</span>
        {msgs.length > 0 && <button className="btn ghost sm" onClick={() => { setMsgs([]); setError(''); }}>Clear chat</button>}
      </div>
      <div className="chat" aria-live="polite">
        {!msgs.length && (
          <div className="intro">
            <b>Ask me anything about this report.</b>
            <p className="muted">Chats are not saved. Reload the page and they are gone.</p>
            {GROUPS.map((g) => (
              <div key={g.title} className="grp">
                <small>{g.title}</small>
                <div className="chips">{g.items.map((s) => <button key={s} className="chip hit sug" onClick={() => send(s)}>{s}</button>)}</div>
              </div>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content}
            {m.role === 'assistant' && <div className="mtools"><CopyBtn text={m.content} label="Copy" className="link" /></div>}
          </div>
        ))}
        {busy && <div className="msg assistant typing"><i /><i /><i /></div>}
        <div ref={end} />
      </div>
      {error && <div className="err" role="alert">{error}</div>}
      <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder="Ask the coach…" aria-label="Message to the coach" />
        <button className="btn" disabled={busy || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
