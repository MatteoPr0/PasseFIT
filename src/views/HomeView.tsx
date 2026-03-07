import React, { useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import { MiniBarChart } from '../components/ui/Shared';
import { fmtWeekday, genId } from '../utils';

export const HomeView = ({ store, setActiveTab, setModal }: any) => {
  const { history, activeWorkout, setActiveWorkout } = store;

  const getSets = (h: any) => {
    if (h.sets !== undefined) return h.sets;
    let s = 0;
    (h.exercises || []).forEach((ex: any) => {
      (ex.sets || []).forEach((set: any) => { if (set.d) s++; });
    });
    return s;
  };

  const acwr = useMemo(() => {
    if (!history.length) return "1.00";
    const daily = new Map();
    for (const h of history) {
      const day = (h.date || '').slice(0, 10);
      if (!day) continue;
      daily.set(day, (daily.get(day) || 0) + getSets(h));
    }
    const days = [...daily.keys()].sort();
    const lastDay = days[days.length - 1];
    if (!lastDay) return "1.00";
    const lastTs = Date.parse(lastDay + "T00:00:00Z");
    const sumWindow = (lenDays: number) => {
      let s = 0;
      for (let i = 0; i < lenDays; i++) s += daily.get(new Date(lastTs - i * 86400000).toISOString().slice(0, 10)) || 0;
      return s;
    };
    const ratio = sumWindow(7) / ((sumWindow(28) / 4) || 1);
    return Number.isFinite(ratio) ? ratio.toFixed(2) : "1.00";
  }, [history]);

  const trend = useMemo(() => {
      const keyLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const now = new Date();
      const byDay: any = {};
      for (const h of history) {
          const k = keyLocal(new Date(h.date || h.startTime || Date.now()));
          if (!byDay[k]) byDay[k] = { sets: 0, count: 0 };
          byDay[k].sets += getSets(h);
          byDay[k].count += 1;
      }
      const out = [];
      for (let i = 13; i >= 0; i--) {
          const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
          const k = keyLocal(d);
          out.push({ date: d, key: k, label: fmtWeekday(d), value: byDay[k]?.sets || 0, count: byDay[k]?.count || 0 });
      }
      let streak = 0;
      for (let i = out.length - 1; i >= 0; i--) { if (out[i].count > 0) streak++; else break; }
      return { last14: out, totalSessions7: out.slice(7).reduce((a, c) => a + c.count, 0), streak };
  }, [history]);

  const startWorkout = (r: any = null) => {
    setActiveWorkout({
      id: genId(), name: r ? r.name : "Sessione Libera", date: new Date().toISOString(), startTime: Date.now(),
      exercises: r ? (r.exs || []).map((e: any) => ({ name: (typeof e === 'string' ? e : e?.name || ''), rest: 90, notes: "", sets: [{ kg: '', reps: '', note: '', w: false, d: false }] })) : []
    });
    setActiveTab('workout');
    if (!r) setModal({ type: 'exercise-select', mode: 'active', routineExs: [] });
  };

  return (
    <div className="space-y-6 view-animate pt-8">
      <header className="sticky top-0 z-50 flex justify-between items-center px-2 py-4 -mx-2 bg-[#000000]/80 backdrop-blur-xl rounded-b-3xl">
        <div className="pl-2">
          <p className="text-sky-400 text-[10px] font-extrabold uppercase tracking-[0.3em]">v1.0-passefit</p>
          <h1 className="text-[2.5rem] font-black tracking-tight mt-1 text-white">PasseFIT</h1>
        </div>
        <div className="w-14 h-14 surface-card flex items-center justify-center rounded-[1.2rem] shadow-2xl mr-2">
          <Icon name="dumbbell" size={26} className="text-sky-400" />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="surface-card p-5 rounded-[2rem] shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">ACWR (7/28)</p>
          <div className="flex items-center gap-2">
            <span className="text-[2rem] font-black tabular-nums leading-none">{acwr}</span>
            <div className={`w-2.5 h-2.5 rounded-full ${parseFloat(acwr) > 1.5 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
          </div>
        </div>
        <div className="surface-card p-5 rounded-[2rem] shadow-lg flex flex-col justify-center">
          <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest truncate">Ultime Serie</p>
          <span className="text-[2rem] font-black tabular-nums leading-none truncate">{history.length ? getSets(history[history.length-1]) : 0}</span>
        </div>
      
        <div className="col-span-2 surface-card p-6 rounded-[2.2rem] shadow-xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest">Attività</p>
                    <p className="text-gray-300 text-[13px] font-bold mt-1">Ultimi 14 giorni</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Streak</p>
                        <p className="text-2xl font-black tabular-nums leading-none">{trend.streak}</p>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">7G</p>
                        <p className="text-2xl font-black tabular-nums leading-none">{trend.totalSessions7} <span className="text-gray-500 text-[10px] font-black uppercase">all.</span></p>
                    </div>
                </div>
            </div>
            <div className="mt-6">
              <MiniBarChart data={trend.last14.map(d => ({ value: d.value, label: fmtWeekday(d.date) }))} height={72} />
              <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-x-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none">
                {trend.last14.map((b, i) => ( <div key={i} className="text-center"><span className={i % 2 === 0 ? "" : "opacity-0"}>{b.label}</span></div> ))}
              </div>
            </div>
        </div>
      </div>

      <button onClick={() => activeWorkout ? setActiveTab('workout') : startWorkout()} className="w-full bg-sky-500 text-white py-6 rounded-[2rem] flex items-center justify-center gap-3 font-black text-xl shadow-[0_10px_30px_rgba(14,165,233,0.3)] active:scale-[0.98] transition-all">
        <Icon name={activeWorkout ? "play-circle" : "zap"} size={26} /> {activeWorkout ? 'Riprendi Sessione' : 'Inizia Allenamento'}
      </button>

      <div className="space-y-3 pt-4 text-left">
        <h3 className="text-gray-400 font-extrabold text-[11px] uppercase tracking-[0.2em] px-3 mb-4">Cronologia Recente</h3>
        {history.slice().reverse().map((h: any, i: number) => {
          const d = new Date(h.date || h.startTime || Date.now());
          const dateStr = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={h.id || i} onClick={() => setModal({type:'history', data:h})} className="surface-card p-5 rounded-[1.8rem] flex justify-between items-center active:bg-white/5 transition-all cursor-pointer">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[15px] text-gray-100 truncate pr-2">{h.name}</p>
                <p className="text-[11px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{dateStr} {timeStr} • {getSets(h)} Serie • {h.duration || '--'}</p>
              </div>
              <Icon name="chevron-right" className="text-gray-600" size={20} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
