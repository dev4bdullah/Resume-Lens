'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReportView from '@/components/ReportView';
import { getReport } from '@/lib/storage';

export default function ReportPage() {
  const [state, setState] = useState({ loaded: false, report: null });
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    setState({ loaded: true, report: id ? getReport(id) : null });
  }, []);

  if (!state.loaded) return <p className="muted">Loading report…</p>;
  if (!state.report) return (
    <div className="card empty">
      <h2>Report not found</h2>
      <p className="muted">It may have been deleted, or it was created in a different browser.</p>
      <Link className="btn" href="/">Analyze a resume</Link>
    </div>
  );
  return <ReportView report={state.report} />;
}
