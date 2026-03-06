import React, { useRef, useState, useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const StatsView = ({ store, setModal }: any) => {
  const { history, routines, customs } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEx, setSelectedEx] = useState<string>('');

  const historyExercises = useMemo(() => {
    const exs = new Set<string>();
    history.forEach((h: any) => {
      (h.exercises || []).forEach((ex: any) => {
        if (ex.name) exs.add(ex.name.trim());
      });
    });
    return Array.from(exs).sort();
  }, [history]);

  if (!selectedEx && historyExercises.length > 0) {
    setSelectedEx(historyExercises[0]);
  }

  const chartData = useMemo(() => {
    if (!selectedEx) return [];
    const data: any[] = [];
    
    const sortedHistory = [...history].sort((a, b) => {
      const d1 = new Date(a.date || a.startTime || 0).getTime();
      const d2 = new Date(b.date || b.startTime || 0).getTime();
      return d1 - d2;
    });

    sortedHistory.forEach((h: any) => {
      const ex = (h.exercises || []).find((e: any) => e.name?.trim().toLowerCase() === selectedEx.toLowerCase());
      if (ex) {
        let maxKg = 0;
        let totalVol = 0;
        (ex.sets || []).forEach((s: any) => {
          const kg = Number(String(s.kg).replace(',', '.'));
          const reps = Number(s.reps);
          if (!s.w && Number.isFinite(kg) && Number.isFinite(reps) && reps > 0) {
            if (kg > maxKg) maxKg = kg;
            totalVol += (kg * reps);
          }
        });
        
        if (maxKg > 0 || totalVol > 0) {
          const d = new Date(h.date || h.startTime || Date.now());
          data.push({
            date: d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
            maxKg,
            totalVol
          });
        }
      }
    });
    return data;
  }, [history, selectedEx]);

  const exportCSV = () => {
    const rows = [
      ['Data', 'Ora', 'Allenamento', 'Esercizio', 'Serie', 'Kg', 'Reps', 'Tipo', 'Note']
    ];
    
    history.forEach((h: any) => {
      const d = new Date(h.date || h.startTime || Date.now());
      const dateStr = d.toLocaleDateString('it-IT');
      const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      
      (h.exercises || []).forEach((ex: any) => {
        (ex.sets || []).forEach((s: any, sI: number) => {
          rows.push([
            dateStr,
            timeStr,
            `"${(h.name || '').replace(/"/g, '""')}"`,
            `"${(ex.name || '').replace(/"/g, '""')}"`,
            (sI + 1).toString(),
            s.kg || '',
            s.reps || '',
            s.w ? 'W' : 'A',
            `"${(s.note || '').replace(/"/g, '""')}"`
          ]);
        });
      });
    });

    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passefit_history.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pt-8 view-animate pb-12 text-left">
      <header className="sticky top-0 z-50 px-2 py-4 -mx-2 bg-[#000000]/80 backdrop-blur-xl rounded-b-3xl">
        <h1 className="text-[2.5rem] font-black tracking-tight text-white pl-2">Dati</h1>
      </header>
      
      {historyExercises.length > 0 && (
        <div className="surface-card p-6 rounded-[2.2rem] space-y-6 shadow-lg">
          <h3 className="text-[11px] font-extrabold uppercase text-sky-400 tracking-[0.2em]">Progressione Esercizi</h3>
          
          <select 
            value={selectedEx} 
            onChange={(e) => setSelectedEx(e.target.value)}
            className="w-full bg-[#131316] border border-white/10 rounded-2xl px-4 py-3 text-[14px] font-bold text-white outline-none"
          >
            {historyExercises.map(ex => (
              <option key={ex} value={ex}>{ex}</option>
            ))}
          </select>

          {chartData.length > 0 ? (
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#38bdf8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#34d399" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="maxKg" name="Max KG" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="totalVol" name="Volume (KG)" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-500 text-xs font-bold uppercase">
              Dati insufficienti
            </div>
          )}
        </div>
      )}

      <div className="surface-card p-6 rounded-[2.2rem] space-y-6 shadow-lg">
        <h3 className="text-[11px] font-extrabold uppercase text-sky-400 tracking-[0.2em]">Manutenzione</h3>
        <div className="space-y-3">
          <button onClick={exportCSV} className="w-full bg-sky-500 text-white py-4 rounded-full font-bold uppercase text-[12px] flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-sky-500/30">
            <Icon name="file-spreadsheet" size={18} /> Esporta in CSV
          </button>

          <button onClick={() => {
            const data = JSON.stringify({ version: 'v1.0-passefit', exportedAt: new Date().toISOString(), history, routines, customs }, null, 2);
            const blob = new Blob([data], {type: 'application/json'}); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `passefit_backup.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          }} className="w-full bg-white text-black py-4 rounded-full font-bold uppercase text-[12px] flex items-center justify-center gap-3 active:scale-[0.98]"><Icon name="download" size={18} /> Backup Dati</button>
          
          <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/10 text-white py-4 rounded-full font-bold uppercase text-[12px] flex items-center justify-center gap-3 active:bg-white/20"><Icon name="upload" size={18} /> Ripristina Dati</button>
          <input type="file" ref={fileInputRef} onChange={(ev) => {
            const file = ev.target.files?.[0]; if(!file) return;
            const reader = new FileReader(); reader.onload = (e) => {
              try {
                const d = JSON.parse(e.target?.result as string);
                setModal({type:'confirm', confirmAction: () => {
                    store.setHistory(Array.isArray(d.history) ? d.history : []);
                    store.setRoutines(Array.isArray(d.routines) ? d.routines : []);
                    store.setCustoms(d.customs || {});
                }, data: "Sovrascrivere il database attuale con il backup?"});
              } catch(err) { alert("File backup non valido."); } finally { ev.target.value = ''; }
            }; reader.readAsText(file);
          }} className="hidden" accept=".json" />
          <p className="text-[10px] font-bold uppercase text-gray-500 tracking-widest text-center pt-2">Storage Sicuro: IndexedDB</p>
        </div>
      </div>
    </div>
  );
};
