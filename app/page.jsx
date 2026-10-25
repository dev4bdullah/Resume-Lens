'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveReport } from '@/lib/storage';

const STEPS = ['Reading your resume', 'Matching keywords', 'Scoring sections and bullets', 'Writing improvements'];

export default function Home() {
  const router = useRouter();
  const inp = useRef(null);
  const [mode, setMode] = useState('pdf');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [jd, setJd] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');

  const pick = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) return setError('Choose a PDF file.');
    if (f.size > 5 * 1024 * 1024) return setError('The file must be under 5 MB.');
    setError(''); setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'pdf' && !file) return setError('Upload your resume PDF first.');
    if (mode === 'text' && text.trim().length < 150) return setError('Paste your full resume text (at least a few lines).');
    setBusy(true); setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1600);
    try {
      const fd = new FormData();
      if (mode === 'pdf') fd.append('file', file); else fd.append('resumeText', text);
      fd.append('jobDescription', jd);
      const res = await fetch('/api/analyze', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      saveReport(data);
      router.push(`/report?id=${data.id}`);
    } catch (err) {
      setError(err.message); setBusy(false);
    } finally { clearInterval(timer); }
  };

  return (
    <div className="hero">
      <div className="hero-copy">
        <h1>See your resume the way an ATS does.</h1>
        <p className="lead">Get a score out of 100, the keywords you are missing, and stronger rewrites for your weakest bullets. Free, private, no sign-up.</p>
      </div>

      <form className="card form" onSubmit={submit}>
        <div className="seg" role="tablist" aria-label="Resume input">
          <button type="button" className={mode === 'pdf' ? 'on' : ''} onClick={() => setMode('pdf')}>Upload PDF</button>
          <button type="button" className={mode === 'text' ? 'on' : ''} onClick={() => setMode('text')}>Paste text</button>
        </div>

        {mode === 'pdf' ? (
          <div
            className={`drop ${drag ? 'over' : ''} ${file ? 'has' : ''}`}
            onClick={() => inp.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inp.current?.click()}
          >
            <input ref={inp} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
            {file ? <><b>{file.name}</b><span>{(file.size / 1024).toFixed(0)} KB · click to replace</span></> : <><b>Drop your resume here</b><span>PDF only, up to 5 MB</span></>}
          </div>
        ) : (
          <textarea className="area" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume text here" aria-label="Resume text" />
        )}

        <label className="lbl" htmlFor="jd">Job description <span className="muted">(recommended)</span></label>
        <textarea id="jd" className="area" rows={6} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job posting to see keyword matches and gaps" />

        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn big" disabled={busy}>{busy ? STEPS[step] + '…' : 'Analyze my resume'}</button>
        {busy && <div className="prog"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>}
      </form>
    </div>
  );
}
