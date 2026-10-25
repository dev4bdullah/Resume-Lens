import { SKILLS, STOP } from './keywords';

const STRONG = 'led,built,designed,developed,created,launched,improved,reduced,increased,optimized,implemented,delivered,automated,managed,architected,migrated,analyzed,drove,shipped,scaled,streamlined,mentored,established,engineered,integrated,resolved,generated,boosted,cut,saved,refactored,deployed,trained,negotiated,won'.split(',');
const WEAK = /^(responsible for|worked on|helped( to)?|assisted (with|in)|involved in|tasked with|duties included)\b/i;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (text, term) => new RegExp(`(^|[^a-z0-9+#])${esc(term)}($|[^a-z0-9+#])`, 'i').test(text);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

export function extractKeywords(jd) {
  if (!jd || jd.trim().length < 30) return [];
  const found = SKILLS.filter((s) => has(jd, s));
  const counts = {};
  (jd.toLowerCase().match(/[a-z][a-z0-9+#.]{2,}/g) || []).forEach((w) => {
    w = w.replace(/\.+$/, '');
    if (w.length > 3 && !STOP.has(w)) counts[w] = (counts[w] || 0) + 1;
  });
  const extra = Object.entries(counts)
    .filter(([w, c]) => c >= 2 && !found.some((f) => f.includes(w) || w.includes(f)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([w]) => w);
  return [...new Set([...found, ...extra])].slice(0, 35);
}

export function extractResumeKeywords(resume) {
  if (!resume) return [];
  const terms = [...SKILLS, 'mern', 'restful api', 'full stack', 'frontend', 'backend', 'oop'];
  const normalized = resume.replace(/\brestful\s+apis\b/gi, 'restful api').replace(/\bfull-stack\b/gi, 'full stack');
  return [...new Set(terms.filter((term) => has(normalized, term)))];
}

const SECTION_DEFS = [
  { name: 'Summary', re: /^(professional\s+)?(summary|objective|profile|about( me)?)\b/i, required: true },
  { name: 'Experience', re: /^(work\s+|professional\s+|relevant\s+)?(experience|employment|work history|internships?)\b/i, required: true },
  { name: 'Education', re: /^(education|academic)\b/i, required: true },
  { name: 'Skills', re: /^(technical\s+|core\s+|key\s+)?(skills|technologies|competencies)\b/i, required: true },
  { name: 'Projects', re: /^(personal\s+|selected\s+)?projects?\b/i, required: false },
];

function analyzeSections(lines) {
  const marks = [];
  lines.forEach((l, i) => {
    const t = l.replace(/[:\-–_*#]/g, '').trim();
    if (t.length > 0 && t.length < 40) {
      const def = SECTION_DEFS.find((d) => d.re.test(t));
      if (def && !marks.some((m) => m.name === def.name)) marks.push({ name: def.name, i });
    }
  });
  marks.sort((a, b) => a.i - b.i);
  return SECTION_DEFS.map((d) => {
    const idx = marks.findIndex((m) => m.name === d.name);
    if (idx === -1) return { name: d.name, found: false, score: 0, required: d.required };
    const end = marks[idx + 1] ? marks[idx + 1].i : lines.length;
    const words = lines.slice(marks[idx].i + 1, end).join(' ').split(/\s+/).filter(Boolean).length;
    return { name: d.name, found: true, score: clamp(35 + words * 1.6), required: d.required };
  });
}

function analyzeBullets(lines) {
  const bulletRe = /^[-•*–·▪●◦▶➢]\s*/;
  let cands = lines.filter((l) => bulletRe.test(l)).map((l) => l.replace(bulletRe, '').trim());
  if (cands.length < 4) {
    const more = lines.filter((l) => {
      const w = l.split(/\s+/).length;
      return w >= 8 && w <= 45 && !bulletRe.test(l) && !/[:@]$/.test(l);
    });
    cands = [...cands, ...more];
  }
  return [...new Set(cands)].filter((t) => t.length > 20).slice(0, 40).map((text) => {
    const words = text.split(/\s+/);
    const first = words[0].toLowerCase().replace(/[^a-z]/g, '');
    const issues = [];
    let score = 40;
    if (WEAK.test(text)) { score -= 20; issues.push('Weak opening phrase'); }
    else if (STRONG.includes(first) || /ed$/.test(first)) score += 20;
    else issues.push('Does not start with an action verb');
    if (/\d/.test(text)) score += 25; else issues.push('No numbers or results');
    if (words.length > 28) issues.push('Too long (over 28 words)');
    else if (words.length < 8) issues.push('Too short');
    else score += 15;
    if (/\b(various|many|several|etc)\b/i.test(text)) { score -= 5; issues.push('Vague wording'); }
    return { text, score: clamp(score + 10), issues };
  });
}

export function scoreResume(resume, jd) {
  const lines = resume.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const words = resume.split(/\s+/).filter(Boolean).length;
  const keywords = extractKeywords(jd);
  const resumeKeywords = extractResumeKeywords(resume);
  const matched = keywords.filter((k) => has(resume, k));
  const missing = keywords.filter((k) => !has(resume, k));
  const keywordScore = keywords.length ? clamp((matched.length / keywords.length) * 100) : null;

  const sections = analyzeSections(lines);
  const req = sections.filter((s) => s.required);
  const sectionScore = clamp(req.reduce((a, s) => a + s.score, 0) / req.length);

  const bullets = analyzeBullets(lines);
  const bulletScore = bullets.length ? clamp(bullets.reduce((a, b) => a + b.score, 0) / bullets.length) : 30;

  const tableLines = lines.filter((l) => (l.match(/\||\t/g) || []).length >= 2).length;
  const checks = [
    { label: 'Email address found', pass: /[\w.+-]+@[\w-]+\.[\w.]+/.test(resume), tip: 'Add a professional email at the top.' },
    { label: 'Phone number found', pass: /(\+?\d[\d\s().-]{8,}\d)/.test(resume), tip: 'Add a phone number recruiters can call.' },
    { label: 'LinkedIn, GitHub or portfolio link', pass: /(linkedin|github|portfolio|https?:\/\/)/i.test(resume), tip: 'Link to your LinkedIn, GitHub or portfolio.' },
    { label: 'Length is 250 to 900 words', pass: words >= 250 && words <= 900, tip: words < 250 ? 'Add detail: aim for at least 250 words.' : 'Trim to one or two pages (under 900 words).' },
    { label: 'Uses bullet points', pass: bullets.length >= 4, tip: 'Use bullet points for achievements.' },
    { label: 'No table or column layout', pass: tableLines < 3, tip: 'Tables and columns can scramble ATS parsing. Use a single column.' },
    { label: 'Shows measurable results', pass: bullets.filter((b) => /\d/.test(b.text)).length >= 3, tip: 'Add numbers (%, time saved, users) to at least 3 bullets.' },
  ];
  const formatScore = clamp((checks.filter((c) => c.pass).length / checks.length) * 100);

  const score = keywordScore === null
    ? clamp(sectionScore * 0.3 + bulletScore * 0.4 + formatScore * 0.3)
    : clamp(keywordScore * 0.4 + sectionScore * 0.2 + bulletScore * 0.2 + formatScore * 0.2);

  return {
    score,
    breakdown: { keywords: keywordScore, sections: sectionScore, bullets: bulletScore, format: formatScore },
    resumeKeywords, matched, missing, sections, checks, bullets,
    stats: { words, pages: Math.max(1, Math.ceil(words / 500)), bulletCount: bullets.length, strongBullets: bullets.filter((b) => b.score >= 70).length },
  };
}
