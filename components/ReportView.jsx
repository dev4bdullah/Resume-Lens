'use client';
import { useState } from 'react';
import { ScoreGauge, Bar, Chips, BulletDiff, CopyBtn, verdict } from './Ui';
import Coach from './Coach';
import { downloadReportPdf } from '@/lib/downloadReportPdf';

const TABS = ['Overview', 'Keywords', 'Bullets', 'AI tools', 'Coach'];

export default function ReportView({ report: r }) {
  const [tab, setTab] = useState('Overview');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const tabs = TABS;
  const summary = () => `ResumeLens report: ${r.score}/100 (${verdict(r.score)})\nMatched: ${r.matched.join(', ') || '-'}\nMissing: ${r.missing.join(', ') || '-'}\nFix first: ${r.checks.filter((c) => !c.pass).map((c) => c.tip).join(' ') || 'Nothing urgent.'}`;
  const savePdf = async () => {
    setPdfBusy(true);
    setPdfError('');
    try {
      await downloadReportPdf(r);
    } catch (error) {
      console.error('[report] PDF export failed', error);
      setPdfError('Could not create the PDF. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="report">
      <div className="r-head card">
        <ScoreGauge value={r.score} />
        <div className="r-title">
          <h1>{r.fileName}</h1>
          <p className="muted">{new Date(r.createdAt).toLocaleString()} · {r.hasJob ? 'Scored against a job description' : 'General ATS score (no job description)'}</p>
          <div className="actions no-print">
            <CopyBtn text={summary} label="Copy summary" />
            <button className="btn ghost sm" onClick={savePdf} disabled={pdfBusy}>{pdfBusy ? 'Preparing PDF…' : 'Save as PDF'}</button>
          </div>
          {pdfError && <p className="err" role="alert">{pdfError}</p>}
          <div className="bars">
            <Bar label="Keyword match" value={r.breakdown.keywords} />
            <Bar label="Sections" value={r.breakdown.sections} />
            <Bar label="Bullet strength" value={r.breakdown.bullets} />
            <Bar label="Formatting" value={r.breakdown.format} />
          </div>
        </div>
      </div>

      <div className="tabs no-print" role="tablist">
        {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Overview' && (
        <div className="grid2">
          <section className="card">
            <h2>Sections</h2>
            {r.sections.map((s) => <Bar key={s.name} label={`${s.name}${s.found ? '' : ' (missing)'}${s.required ? '' : ' · optional'}`} value={s.score} />)}
          </section>
          <section className="card">
            <h2>ATS checks</h2>
            <ul className="checks">
              {r.checks.map((c) => (
                <li key={c.label} className={c.pass ? 'pass' : 'fail'}>
                  <span className="dot">{c.pass ? '✓' : '!'}</span>
                  <div><b>{c.label}</b>{!c.pass && <p className="muted">{c.tip}</p>}</div>
                </li>
              ))}
            </ul>
            <p className="muted">{r.stats.words} words · about {r.stats.pages} page(s) · {r.stats.strongBullets} of {r.stats.bulletCount} bullets are strong</p>
          </section>
        </div>
      )}

      {tab === 'Keywords' && (
        <div className="grid2">
          <section className="card"><h2>Matched ({r.matched.length})</h2><Chips items={r.matched} kind="hit" /></section>
          <section className="card">
            <h2>Missing ({r.missing.length})</h2>
            <Chips items={r.missing} kind="miss" />
            {r.missing.length > 0 && <p className="muted">Add these only where they are true. Put them in your Skills section and in bullets that show real use.</p>}
            {!r.hasJob && <p className="muted">Paste a job description on the Analyze page to see keyword gaps.</p>}
          </section>
        </div>
      )}

      {tab === 'Bullets' && (
        <section>
          <p className="muted">Your {r.bullets.length} weakest bullets, rewritten. Replace [X%] and [metric] with your real numbers.</p>
          {r.bullets.length ? r.bullets.map((b, i) => <BulletDiff key={i} b={b} />) : <p className="card">No bullet points were found. Add achievements as bullets.</p>}
        </section>
      )}

      {tab === 'Coach' && <Coach report={r} />}

      {tab === 'AI tools' && (
        <div className="stack">
          {r.ai.source === 'local' && <div className="banner">Template mode. Add GEMINI_API_KEY (free) to .env.local for AI-written rewrites, summary and cover letter.</div>}
          <section className="card"><div className="row"><h2>Professional summary</h2><CopyBtn text={r.ai.summary} /></div><p>{r.ai.summary}</p></section>
          {r.ai.coverLetter && <section className="card"><div className="row"><h2>Cover letter draft</h2><CopyBtn text={r.ai.coverLetter} /></div><p className="pre">{r.ai.coverLetter}</p></section>}
          <section className="card"><h2>Likely interview questions</h2><ol className="qs">{r.ai.interviewQuestions.map((q, i) => <li key={i}>{q}</li>)}</ol></section>
        </div>
      )}
    </div>
  );
}
