// Small wrapper for the Gemini API (free tier available). Needs GEMINI_API_KEY.
// Returns the reply text, or null on any failure.
export const llmProvider = () => (process.env.GEMINI_API_KEY ? 'gemini' : null);

export async function llm({ system, messages, maxTokens = 900, json = false, maxAttempts = 2, requestTimeoutMs = 12_000 }) {
  if (!llmProvider()) return null;
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const fallbackModel = 'gemini-3.6-flash';
  const models = model === fallbackModel ? [model] : [model, fallbackModel];
  const retryableStatuses = new Set([429, 500, 502, 503, 504]);
  for (const currentModel of models) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`, {
          method: 'POST',
          signal: AbortSignal.timeout(requestTimeoutMs),
          headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body: JSON.stringify({
            ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
            contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            generationConfig: { maxOutputTokens: maxTokens * 3, ...(json ? { responseMimeType: 'application/json' } : {}) },
          }),
        });

        if (!res.ok) {
          const details = (await res.text()).slice(0, 300);
          if (retryableStatuses.has(res.status) && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
          console.error('[llm] Gemini error', res.status, details);
          if ([429, 503].includes(res.status) && currentModel !== fallbackModel && models.includes(fallbackModel)) break;
          return null;
        }

        const data = await res.json();
        return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim() || null;
      } catch (e) {
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        console.error('[llm] request failed', e?.name === 'TimeoutError' ? 'Gemini request timed out' : e?.message);
        return null;
      }
    }
  }
  return null;
}
