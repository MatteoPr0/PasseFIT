import React, { useRef } from 'react';
import { Icon } from '../components/ui/Icon';

export const StatsView = ({ store, setModal }: any) => {
  const { history, routines, customs } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8 pt-4 view-animate pb-12 text-left">
      <h1 className="text-[2.5rem] font-black tracking-tight text-white px-2">Dati</h1>
      <div className="surface-card p-6 rounded-[2.2rem] space-y-6 shadow-lg">
        <h3 className="text-[11px] font-extrabold uppercase text-indigo-400 tracking-[0.2em]">Manutenzione</h3>
        <div className="space-y-3">
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
