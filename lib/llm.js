// Small wrapper for the Gemini API (free tier available). Needs GEMINI_API_KEY.
// Returns the reply text, or null on any failure.
export const llmProvider = () => (process.env.GEMINI_API_KEY ? 'gemini' : null);

export async function llm({ system, messages, maxTokens = 900, json = false }) {
  if (!llmProvider()) return null;
  try {
    const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens * 3, ...(json ? { responseMimeType: 'application/json' } : {}) },
      }),
    });
    if (!res.ok) {
      console.error('[llm] Gemini error', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim() || null;
  } catch (e) {
    console.error('[llm] request failed', e?.message);
    return null;
  }
}
