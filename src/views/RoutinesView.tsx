import React from 'react';
import { Icon } from '../components/ui/Icon';
import { genId } from '../utils';

export const RoutinesView = ({ store, setActiveTab, setModal }: any) => {
  const { routines, setRoutines, muscleMap, setActiveWorkout } = store;

  const startWorkout = (r: any = null) => {
    setActiveWorkout({
      id: genId(), name: r ? r.name : "Sessione Libera", date: new Date().toISOString(), startTime: Date.now(),
      exercises: r ? (r.exs || []).map((e: any) => ({ name: (typeof e === 'string' ? e : e?.name || ''), rest: 90, notes: "", sets: [{ kg: '', reps: '', note: '', w: false, d: false }] })) : []
    });
    setActiveTab('workout');
    if (!r) setModal({ type: 'exercise-select', mode: 'active', routineExs: [] });
  };

  return (
    <div className="space-y-6 pt-4 view-animate text-left">
      <h1 className="text-[2.5rem] font-black tracking-tight text-white px-2">Schede</h1>
      <div className="space-y-4">
        {routines.map((r: any, i: number) => (
          <div key={i} className="surface-card p-6 rounded-[2.2rem] space-y-5 shadow-lg">
            <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1 pr-2">
                    <h3 className="text-[1.3rem] font-black uppercase text-white tracking-tight mb-3 truncate">{r.name}</h3>
                    {r.exs && r.exs.length > 0 ? (
                        <div className="space-y-2">
                            {Object.entries(
                                r.exs.reduce((acc: any, ex: string) => {
                                    const safeEx = ex || '';
                                    if(!safeEx) return acc;
                                    const cat = muscleMap[safeEx.toLowerCase()] || 'Altro';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(safeEx);
                                    return acc;
                                }, {})
                            ).map(([cat, list]: [string, any]) => (
                                <div key={cat} className="break-words leading-snug">
                                    <span className="text-indigo-400 uppercase text-[9px] tracking-widest font-black mr-2">{cat}</span>
                                    <span className="text-gray-300 text-[12px] font-bold">{list.join(' • ')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[12px] font-bold text-gray-600">Nessun esercizio.</p>
                    )}
                </div>
                <button onClick={() => setModal({type:'confirm', confirmAction: () => setRoutines(routines.filter((_: any,idx: number)=>idx!==i)), data: `Eliminare ${r.name}?`})} className="text-gray-500 bg-white/5 p-2.5 rounded-full shrink-0 active:bg-red-500/20 active:text-red-400 transition-colors"><Icon name="trash-2" size={18}/></button>
            </div>
            <div className="flex gap-3 pt-3">
              <button onClick={() => setModal({ type: 'edit-routine', data: r.id })} className="flex-1 bg-white/5 border border-white/10 py-4 rounded-full font-bold uppercase text-[11px] text-gray-300 active:bg-white/10">Modifica</button>
              <button onClick={() => startWorkout(r)} className="flex-1 bg-indigo-500 py-4 rounded-full font-bold uppercase text-[11px] text-white shadow-lg active:scale-[0.98]">Avvia</button>
            </div>
          </div>
        ))}
        <button onClick={() => setModal({type: 'name-routine'})} className="w-full surface-card border-dashed border-white/20 py-10 flex flex-col items-center gap-3 text-gray-400 rounded-[2.2rem] active:bg-white/5">
          <Icon name="plus-circle" size={32}/> 
          <span className="text-[12px] font-bold uppercase tracking-widest">Nuova Scheda</span>
        </button>
      </div>
    </div>
  );
};
