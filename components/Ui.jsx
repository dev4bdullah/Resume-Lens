'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export const tone = (v) => (v >= 75 ? 'var(--ok)' : v >= 50 ? 'var(--warn)' : 'var(--bad)');
export const verdict = (v) => (v >= 80 ? 'Strong match' : v >= 65 ? 'Good, with gaps' : v >= 45 ? 'Needs work' : 'Unlikely to pass');

export function Navbar() {
  const path = usePathname();
  const [installEvt, setInstallEvt] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onDone = () => setInstallEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onDone);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onDone); };
  }, []);
  const install = async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); };
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="ResumeLens home">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="11" cy="11" r="8" fill="none" stroke="var(--lens)" strokeWidth="2.4" /><path d="M17 17l6 6" stroke="var(--lens)" strokeWidth="2.4" strokeLinecap="round" /><path d="M7 9h8M7 13h5" stroke="var(--mark)" strokeWidth="2" strokeLinecap="round" /></svg>
        ResumeLens
      </Link>
      <nav>
        <Link href="/" className={path === '/' ? 'on' : ''}>Analyze</Link>
        <Link href="/history" className={path === '/history' ? 'on' : ''}>History</Link>
        {installEvt && <button className="btn sm" onClick={install}>Install app</button>}
      </nav>
    </header>
  );
}

export function ScoreGauge({ value, size = 200, label = 'ATS score' }) {
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(value), 80); return () => clearTimeout(t); }, [value]);
  const r = 78, c = 2 * Math.PI * r;
  return (
    <div className="gauge" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value} out of 100`}>
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} className="g-track" />
        <circle cx="100" cy="100" r={r} className="g-fill" stroke={tone(value)} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 100 100)" />
      </svg>
      <div className="g-text"><b style={{ color: tone(value) }}>{value}</b><span>{verdict(value)}</span></div>
    </div>
  );
}

export function Bar({ label, value }) {
  if (value === null || value === undefined) return null;
  return (
    <div className="bar">
      <div className="bar-top"><span>{label}</span><b>{value}</b></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${value}%`, background: tone(value) }} /></div>
    </div>
  );
}

export function Chips({ items, kind }) {
  if (!items?.length) return <p className="muted">Nothing here.</p>;
  return <div className="chips">{items.map((k) => <span key={k} className={`chip ${kind}`}>{kind === 'miss' ? '＋ ' : '✓ '}{k}</span>)}</div>;
}

export function CopyBtn({ text, label = 'Copy', className = 'btn ghost sm' }) {
  const [done, setDone] = useState(false);
  const [fallback, setFallback] = useState('');
  const [error, setError] = useState('');
  const fallbackRef = useRef(null);
  const go = async () => {
    const value = String(typeof text === 'function' ? text() : text);
    setError('');
    setFallback('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
        return;
      }
    } catch {}

    try {
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (copied) {
        setDone(true);
        setTimeout(() => setDone(false), 1600);
        return;
      }
    } catch {}

    setFallback(value);
    setError('Copy was blocked. Select and copy the text below.');
    requestAnimationFrame(() => {
      fallbackRef.current?.focus();
      fallbackRef.current?.select();
    });
  };
  return (
    <span className="copy-control">
      <button type="button" className={className} onClick={go}>{done ? 'Copied' : label}</button>
      {fallback && (
        <>
          <input ref={fallbackRef} className="copy-fallback" value={fallback} readOnly aria-label={`${label} text to copy manually`} onFocus={(e) => e.currentTarget.select()} />
          <span className="copy-help" role="status">{error}</span>
        </>
      )}
    </span>
  );
}

export function BulletDiff({ b }) {
  return (
    <article className="diff">
      <div className="diff-col before"><small>Before</small><p>{b.original}</p></div>
      <div className="diff-col after"><small>After</small><p>{b.improved}</p></div>
      <div className="diff-foot"><span className="muted">{b.reason}</span><CopyBtn text={b.improved} label="Copy rewrite" /></div>
    </article>
  );
}
