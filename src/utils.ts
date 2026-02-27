export const toNum = (x: any): number => {
  if (x === null || x === undefined || x === '') return NaN;
  const n = Number(String(x).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export const genId = (): string => {
  try { if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch (e) {}
  return 'w_' + Date.now() + '_' + Math.random().toString(16).slice(2);
};

export const deepClone = <T>(obj: T): T => {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
};

export const fmtWeekday = (d: Date): string => {
  try { return new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(d).replace('.', '').slice(0, 3); } 
  catch { return ['dom','lun','mar','mer','gio','ven','sab'][d.getDay()]; }
};
