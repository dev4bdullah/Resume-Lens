import { NextResponse } from 'next/server';
import { llm, llmProvider } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Lets the UI know whether the coach can run (it needs an API key).
export async function GET() {
  return NextResponse.json({ enabled: Boolean(llmProvider()) });
}

export async function POST(req) {
  if (!llmProvider()) return NextResponse.json({ error: 'The coach needs GEMINI_API_KEY in .env.local.' }, { status: 503 });
  try {
    const { messages, report, context } = await req.json();
    if (!Array.isArray(messages) || !messages.length) return NextResponse.json({ error: 'No message sent.' }, { status: 400 });

    const msgs = messages.slice(-12).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 1500),
    }));
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return NextResponse.json({ error: 'Invalid conversation.' }, { status: 400 });

    const system = `You are ResumeLens Coach, a friendly, practical resume and ATS advisor.
Rules:
- Base advice on the report data and the resume and job excerpts below. If something is not there, say so instead of guessing.
- You may quote the user's own resume text when rewriting or reviewing it.
- If asked for a mock interview, ask ONE question at a time, wait for the answer, then give short feedback and the next question.
- Never invent experience, employers, skills or numbers. Use placeholders like [X%] when a metric is unknown.
- Only suggest adding a keyword if the user can honestly claim it.
- Keep answers short (under 150 words) unless the user asks for a rewrite. Use plain text, no markdown tables.
- Stay on topic: resumes, job applications, ATS, interviews.

REPORT DATA (JSON):
${JSON.stringify(report || {}).slice(0, 5000)}

RESUME EXCERPT (may be trimmed):
${String(context?.resume || '(not available)').slice(0, 4000)}

JOB DESCRIPTION EXCERPT:
${String(context?.jd || '(none provided)').slice(0, 2000)}`;

    const reply = await llm({ system, messages: msgs, maxTokens: 900 });
    if (!reply) return NextResponse.json({ error: 'The AI service returned an error. Check your API key, model name and free-tier limits.' }, { status: 502 });
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
  }
}
