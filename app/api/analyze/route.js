import { NextResponse } from 'next/server';
import { scoreResume } from '@/lib/scoreResume';
import { aiEnhance, localEnhance, localRewrite } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_BYTES = 5 * 1024 * 1024;
const fail = (error, status) => NextResponse.json({ error }, { status });

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const jd = String(form.get('jobDescription') || '').slice(0, 8000);
    let text = String(form.get('resumeText') || '');
    let fileName = 'Pasted resume';

    if (file && typeof file === 'object' && file.size > 0) {
      if (file.size > MAX_BYTES) return fail('That file is larger than 5 MB.', 413);
      if (!(file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf'))) return fail('Only PDF files are supported.', 415);
      const mod = await import('pdf-parse/lib/pdf-parse.js');
      const pdfParse = mod.default || mod;
      text = (await pdfParse(Buffer.from(await file.arrayBuffer()))).text;
      fileName = file.name;
    }
    text = text.replace(/\u0000/g, '').trim();
    if (text.length < 150) return fail('Not enough readable text. If this is a scanned PDF, switch to "Paste text" instead.', 422);

    const result = scoreResume(text, jd);
    const weak = [...result.bullets].sort((a, b) => a.score - b.score).slice(0, 6);
    const ai = (await aiEnhance({ resume: text, jd, bullets: weak.map((b) => b.text) })) || localEnhance(result);

    const bullets = weak.map((b, i) => ({
      original: b.text,
      improved: ai.bullets?.[i]?.improved || localRewrite(b.text),
      reason: ai.bullets?.[i]?.reason || b.issues.join('. ') || 'Tighten the wording.',
      score: b.score,
      issues: b.issues,
    }));

    const { bullets: _drop, ...rest } = result;
    return NextResponse.json({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      fileName,
      hasJob: jd.trim().length >= 30,
      context: { resume: text.slice(0, 4000), jd: jd.slice(0, 2000) },
      ...rest,
      bullets,
      ai: {
        source: ai.source,
        summary: ai.summary || localEnhance(result).summary,
        coverLetter: ai.coverLetter || localEnhance(result).coverLetter,
        interviewQuestions: ai.interviewQuestions?.length ? ai.interviewQuestions : localEnhance(result).interviewQuestions,
      },
    });
  } catch (e) {
    console.error(e);
    return fail('Could not analyze this file. Try another PDF or paste the text.', 500);
  }
}
