const KEY = 'resumelens:history';
export const getHistory = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
export const saveReport = (r) => {
  const list = [r, ...getHistory().filter((x) => x.id !== r.id)].slice(0, 50);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
};
export const getReport = (id) => getHistory().find((r) => r.id === id) || null;
export const deleteReport = (id) => localStorage.setItem(KEY, JSON.stringify(getHistory().filter((r) => r.id !== id)));
export const clearHistory = () => localStorage.removeItem(KEY);
