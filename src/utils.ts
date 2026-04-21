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

export const toggleSupersetAction = (idx: number, isLinked: boolean, items: any[]): any[] => {
  const newItems = deepClone(items).map(item => typeof item === 'string' ? { name: item } : item);
  
  if (isLinked) {
    const oldId = newItems[idx].supersetId;
    const newId = genId();
    newItems[idx].supersetId = undefined;
    for(let j = idx; j < newItems.length; j++) {
      if(newItems[j].supersetId === oldId) newItems[j].supersetId = newId;
      else break;
    }
    for (let j = 0; j < newItems.length; j++) {
       const sid = newItems[j].supersetId;
       if (sid && newItems.filter(x => x.supersetId === sid).length === 1) {
          newItems[j].supersetId = undefined;
       }
    }
  } else {
    const targetId = newItems[idx-1].supersetId || genId();
    newItems[idx-1].supersetId = targetId;
    const oldId = newItems[idx].supersetId;
    for(let j = idx; j < newItems.length; j++) {
      if(newItems[j].supersetId === oldId || j === idx) {
        newItems[j].supersetId = targetId;
      } else break;
    }
  }
  return newItems;
};
