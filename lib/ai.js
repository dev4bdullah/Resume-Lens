import { llm, llmProvider } from './llm';
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

export function localRewrite(text) {
  let t = text.replace(WEAK_START, '').trim() || text;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/^(led|built|designed|developed|created|launched|improved|reduced|increased|optimized|implemented|delivered|automated|managed)/i.test(t)) t = `Delivered ${lower(t)}`;
  if (!/\d/.test(t)) t = t.replace(/\.$/, '') + ', improving [metric] by [X%]';
  return t;
}
const WEAK_START = /^(responsible for|worked on|helped to|helped|assisted with|assisted in|involved in|tasked with|duties included)\s+/i;

export function localEnhance({ matched, missing }) {
  const top = matched.slice(0, 4).join(', ') || 'modern web technologies';
  return {
    source: 'local',
    summary: `Results-driven professional with hands-on experience in ${top}. Known for shipping reliable work, learning quickly and collaborating across teams. Looking to contribute to [Company] as [Role].`,
    coverLetter: `Dear Hiring Manager,\n\nI am excited to apply for the [Role] position at [Company]. My background in ${top} matches the skills your team is looking for, and I enjoy turning requirements into polished, measurable results.\n\nIn my recent work I [describe your strongest achievement with a number]. I would bring the same focus to [Company], and I am eager to grow in ${missing.slice(0, 2).join(' and ') || 'new areas'}.\n\nThank you for your time. I would welcome the chance to discuss how I can help.\n\nSincerely,\n[Your name]`,
    interviewQuestions: [
      ...matched.slice(0, 4).map((k) => `Tell me about a project where you used ${k}. What was your role and the outcome?`),
      ...missing.slice(0, 2).map((k) => `The role mentions ${k}. How would you get up to speed quickly?`),
      'Describe a time you improved something and how you measured it.',
    ],
  };
}

export async function aiEnhance({ resume, jd, bullets }) {
  if (!llmProvider()) return null;
  const prompt = `You are an expert resume coach. Using ONLY facts in the resume, return JSON and nothing else.
Rewrite each bullet below to start with a strong action verb, be specific and concise (max 25 words). Never invent numbers; use placeholders like [X%] when a metric is missing. Keep the same order and count.

Schema: {"bullets":[{"improved":"","reason":""}],"summary":"3 sentence professional summary tailored to the job","coverLetter":"short cover letter with [Company] and [Role] placeholders","interviewQuestions":["6 likely interview questions"]}

BULLETS:
${bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')}

RESUME:
${resume.slice(0, 6000)}

JOB DESCRIPTION:
${jd ? jd.slice(0, 3000) : '(none provided)'}`;
  const text = await llm({ messages: [{ role: 'user', content: prompt }], maxTokens: 2500, json: true });
  if (!text) return null;
  try {
    const json = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    return { ...json, source: 'ai' };
  } catch {
    return null;
  }
}
