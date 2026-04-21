import React, { useState } from 'react';
import { Icon } from './ui/Icon';
import { genId, deepClone, toggleSupersetAction } from '../utils';
import { INITIAL_LIB } from '../constants';

export const Modals = ({ modal, setModal, store, setActiveTab }: any) => {
  const { routines, setRoutines, history, setHistory, activeWorkout, setActiveWorkout, mergedLibrary, customs, setCustoms } = store;
  const [searchQuery, setSearchQuery] = useState('');
  const [customForm, setCustomForm] = useState({ open:false, name:'', cat:'Petto' });
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const safeAddExerciseToRoutine = (rId: string, name: string) => setRoutines((prev: any) => (prev || []).map((r: any) => {
    if(String(r.id) !== String(rId)) return r;
    const exs = Array.isArray(r.exs) ? r.exs : [];
    if(exs.some(n => typeof n === 'string' ? String(n).toLowerCase() === String(name).toLowerCase() : String(n.name).toLowerCase() === String(name).toLowerCase())) return r; 
    return { ...r, exs: [...exs, { name }] };
  }));

  const safeAddExerciseToActive = (name: string) => setActiveWorkout((prev: any) => {
    const base = prev || { id: genId(), name: "Sessione Libera", date: new Date().toISOString(), startTime: Date.now(), exercises: [] };
    return { ...base, exercises: [...(base.exercises || []), { name, rest: 90, notes: "", sets: [{ kg:'', reps:'', note:'', w:false, d:false }] }] };
  });

  const addCustomExercise = (cat: string, name: string) => {
      const clean = (name || '').trim();
      if (!clean) return false;
      const group = (cat || 'Altro').trim();
      const base = (INITIAL_LIB[group] || []);
      const existing = new Set([...(customs[group] || []), ...base].map(s => s.toLowerCase()));
      if (existing.has(clean.toLowerCase())) return false;
      setCustoms((prev: any) => {
          const next = { ...(prev || {}) };
          const arr = Array.isArray(next[group]) ? [...next[group]] : [];
          arr.push(clean);
          arr.sort((a: string,b: string)=>a.localeCompare(b,'it',{sensitivity:'base'}));
          next[group] = arr;
          return next;
      });
      return true;
  };

  if (!modal || !modal.type) return null;

  if (modal.type === 'edit-routine') {
    const r = (routines || []).find((x: any) => String(x.id) === String(modal.data));
    if(!r) return (
      <div className="fixed inset-0 z-[2000] bg-[#000000]/95 backdrop-blur-xl p-5 flex items-center justify-center">
          <span className="text-gray-500 font-bold text-xs uppercase animate-pulse">Caricamento scheda...</span>
      </div>
    );
    return (
      <div className="fixed inset-0 z-[2000] bg-[#000000]/95 backdrop-blur-xl p-5 flex flex-col animate-in fade-in">
        <div className="flex justify-between items-center mb-6 pt-4 text-left">
          <div>
            <p className="text-[10px] font-extrabold uppercase text-sky-400 tracking-widest">Configura Scheda</p>
            <h2 className="text-[2rem] font-black uppercase text-white tracking-tight truncate max-w-[250px]">{r.name}</h2>
          </div>
          <button onClick={(e) => { e.preventDefault(); setModal({type:null,data:null}); }} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white active:scale-95 shrink-0"><Icon name="x" size={24}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pb-32">
          {(r.exs || []).length === 0 && (
            <div className="surface-card p-8 rounded-[2rem] text-center border-dashed border-white/10">
              <Icon name="list-plus" size={32} className="text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-[13px] font-bold">Nessun esercizio presente.<br/>Costruisci la tua scheda.</p>
            </div>
          )}
          
          <div className="flex flex-col gap-4">
          {(() => {
            const normalizedExs = (r.exs || []).map((e: any) => typeof e === 'string' ? { name: e } : e);
            const routineExGroups: { items: { ex: any, i: number }[], isSuperset: boolean }[] = [];
            let currentRGroup: { ex: any, i: number }[] = [];
            
            normalizedExs.forEach((ex: any, i: number) => {
                if (currentRGroup.length === 0) {
                    currentRGroup.push({ ex, i });
                } else {
                    const prevEx = currentRGroup[0].ex;
                    if (ex.supersetId && ex.supersetId === prevEx.supersetId) {
                        currentRGroup.push({ ex, i });
                    } else {
                        routineExGroups.push({ items: currentRGroup, isSuperset: currentRGroup.length > 1 });
                        currentRGroup = [{ ex, i }];
                    }
                }
            });
            if (currentRGroup.length > 0) routineExGroups.push({ items: currentRGroup, isSuperset: currentRGroup.length > 1 });

            return routineExGroups.map((group, groupIdx) => {
              const firstI = group.items[0].i;
              return (
                  <React.Fragment key={groupIdx}>
                      {groupIdx > 0 && (
                          <div className="flex justify-center relative z-10 shrink-0 -my-2 opacity-100">
                              <button onClick={() => setRoutines((prev: any) => prev.map((x: any) => x.id === r.id ? { ...x, exs: toggleSupersetAction(firstI, false, normalizedExs) } : x))} 
                                className="w-8 h-8 rounded-full flex items-center justify-center border-[3px] bg-[#000000] border-white/10 text-gray-600 active:bg-white/5 transition-all">
                                <Icon name="link" size={14} />
                              </button>
                          </div>
                      )}
                      {group.isSuperset ? (
                          <div className="surface-card p-3 rounded-[2rem] shadow-lg border border-amber-500/30 bg-amber-900/10">
                              <div className="flex items-center gap-2 mb-2 px-2 pt-1">
                                  <Icon name="link" size={14} className="text-amber-500" />
                                  <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Superset</span>
                                  <div className="flex-1 border-b border-amber-500/20" />
                              </div>
                              <div className="flex flex-col gap-2">
                                  {group.items.map(({ex, i}, idx) => (
                                      <div key={i} className="relative">
                                          {idx > 0 && (
                                              <div className="absolute -top-4 left-6 flex justify-center w-6 h-6 z-10">
                                                <button onClick={() => setRoutines((prev: any) => prev.map((x: any) => x.id === r.id ? { ...x, exs: toggleSupersetAction(i, true, normalizedExs) } : x))}
                                                  className="w-6 h-6 rounded-full flex items-center justify-center border-[2px] bg-amber-500 border-[#1C1C21] text-black shadow-[0_0_10px_rgba(245,158,11,0.4)] transition-transform active:scale-95">
                                                  <Icon name="link" size={10} />
                                                </button>
                                              </div>
                                          )}
                                          <div className="bg-[#131316] p-4 rounded-[1.2rem] flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 font-black text-[10px] shrink-0">{i+1}</div>
                                            <span className="text-white font-bold text-[13px] uppercase truncate flex-1">{ex.name}</span>
                                            <button onClick={() => {
                                              setRoutines((prev: any) => (prev || []).map((x: any) => {
                                                if(String(x.id) !== String(r.id)) return x;
                                                return { ...x, exs: (x.exs || []).filter((_: any, idx: number) => idx !== i) };
                                              }));
                                            }} className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 active:bg-red-500/30 shrink-0"><Icon name="trash-2" size={16} /></button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <div className="surface-card p-4 rounded-[1.5rem] flex items-center gap-3 shadow-lg">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 font-black text-[10px] shrink-0">{group.items[0].i+1}</div>
                            <span className="text-white font-bold text-[13px] uppercase truncate flex-1">{group.items[0].ex.name}</span>
                            <button onClick={() => {
                              setRoutines((prev: any) => (prev || []).map((x: any) => {
                                if(String(x.id) !== String(r.id)) return x;
                                return { ...x, exs: (x.exs || []).filter((_: any, idx: number) => idx !== group.items[0].i) };
                              }));
                            }} className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 active:bg-red-500/30 shrink-0"><Icon name="trash-2" size={16} /></button>
                          </div>
                      )}
                  </React.Fragment>
              );
            });
          })()}
          </div>
          
          <button onClick={(e) => { e.preventDefault(); setModal({ type: 'exercise-select', target: 'routine', data: r.id }); }} className="w-full bg-[#131316] border-2 border-dashed border-sky-500/30 py-8 flex flex-col items-center gap-2 text-sky-400 rounded-[2rem] active:bg-sky-500/10 transition-all mt-4">
            <Icon name="plus" size={24} />
            <span className="font-bold text-[11px] uppercase tracking-widest">Aggiungi Esercizio</span>
          </button>
        </div>

        <div className="mt-auto pt-4 pb-6 flex gap-3 bg-gradient-to-t from-black via-black to-transparent">
          <button onClick={(e) => { e.preventDefault(); setModal({type:null,data:null}); }} className="w-full py-4 bg-sky-500 text-white rounded-full font-bold uppercase text-[12px] shadow-lg shadow-sky-500/30 active:scale-95">Salva e Chiudi</button>
        </div>
      </div>
    );
  }

  if (modal.type === 'exercise-select') {
    return (
      <div className="fixed inset-0 z-[3000] bg-[#000000]/98 backdrop-blur-xl p-5 flex flex-col overflow-y-auto animate-in fade-in">
        <div className="flex justify-between items-center mb-6 pt-4">
          <h2 className="text-[2rem] font-black uppercase text-white tracking-tight">
            {modal.target === 'replace' ? 'Sostituisci' : 'Libreria'}
          </h2>
          <div className="flex gap-2">
            <button onClick={(e) => { e.preventDefault(); setEditMode(!editMode); }} className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${editMode ? 'bg-amber-500 text-white' : 'bg-white/10 text-gray-400'}`}><Icon name="pencil" size={20}/></button>
            <button onClick={(e) => { e.preventDefault(); setEditMode(false); setModal(modal?.target === 'routine' ? { type: 'edit-routine', data: modal.data } : {type:null}); }} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white shrink-0"><Icon name="x" size={24}/></button>
          </div>
        </div>
        
        {modal.target === 'replace' && modal.originalName && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              setActiveWorkout((prev: any) => {
                if (!prev) return prev;
                const n = [...prev.exercises];
                const oldEx = n[modal.exIndex];
                n[modal.exIndex] = {
                  ...oldEx,
                  name: modal.originalName,
                  originalName: undefined
                };
                return { ...prev, exercises: n };
              });
              setModal({type: null});
            }}
            className="mb-6 w-full bg-sky-500/20 border border-sky-500/30 rounded-3xl px-5 py-4 flex items-center justify-between text-left active:bg-sky-500/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon name="rotate-ccw" size={20} className="text-sky-400" />
              <span className="text-[12px] font-bold uppercase tracking-widest text-sky-400">Ripristina: {modal.originalName}</span>
            </div>
          </button>
        )}

        <div className="relative mb-6">
          <Icon name="search" size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cerca esercizio..." className="w-full pl-14 pr-6 py-4 bg-[#1C1C21] border border-white/10 rounded-full text-[15px] font-bold text-white outline-none focus:border-sky-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="mb-6 space-y-3">
          <button onClick={(e) => { e.preventDefault(); setCustomForm(f => ({...f, open: !f.open})); }} className="w-full bg-[#1C1C21] border border-white/10 rounded-3xl px-5 py-4 flex items-center justify-between text-left">
            <div className="flex items-center gap-3"><Icon name="plus-circle" size={20} className="text-sky-400" /><span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Nuovo Personalizzato</span></div>
            <Icon name="chevron-down" size={20} className={`text-sky-400 transition-transform ${customForm.open ? 'rotate-180' : ''}`} />
          </button>
          {customForm.open && (
            <div className="bg-[#1C1C21] border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <select value={customForm.cat} onChange={(e) => setCustomForm(f => ({...f, cat: e.target.value}))} className="w-full bg-[#131316] border border-white/10 rounded-2xl px-4 py-3 text-[14px] font-bold text-white outline-none">
                  {Object.keys(INITIAL_LIB).map(c => (<option key={c} value={c}>{c}</option>))}
                  <option value="Altro">Altro</option>
                </select>
                <input value={customForm.name} onChange={(e) => setCustomForm(f => ({...f, name: e.target.value}))} placeholder="Es. Pulldown monolaterale" className="w-full bg-[#131316] border border-white/10 rounded-2xl px-4 py-3 text-[14px] font-bold text-white outline-none" />
              </div>
              <button onClick={(e) => { e.preventDefault(); if(addCustomExercise(customForm.cat, customForm.name)) setCustomForm(f => ({...f, name:''})); }} className="w-full bg-sky-500 text-white py-3.5 rounded-2xl font-bold uppercase text-[12px] tracking-wider">Salva in Libreria</button>
            </div>
          )}
        </div>

        <div className="space-y-3 pb-32">
          {Object.entries(mergedLibrary).map(([cat, exs]: [string, any]) => {
            const filtered = exs.filter((e: string) => e.toLowerCase().includes(searchQuery.toLowerCase()));
            if (filtered.length === 0) return null;
            const isOpen = searchQuery.length > 0 || expandedCats[cat];
            return (
              <div key={cat} className="surface-card rounded-3xl overflow-hidden">
                <div onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))} className="p-5 flex justify-between items-center bg-[#1C1C21] cursor-pointer"><span className="font-extrabold text-[12px] uppercase text-gray-300 tracking-widest">{cat}</span><Icon name="chevron-down" className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} size={18} /></div>
                {isOpen && (
                  <div className="p-3 space-y-2 bg-[#131316]">
                    {filtered.map((ex: string) => (
                      <button key={ex} onClick={(e) => { 
                        e.preventDefault();
                        if (editMode) {
                          setModal({ type: 'edit-exercise', data: { cat, name: ex }, prevModal: modal });
                        } else {
                          if (modal?.target === 'routine') {
                            safeAddExerciseToRoutine(modal.data, ex);
                            setModal({ type: 'edit-routine', data: modal.data });
                          } else if (modal?.target === 'replace') {
                            setActiveWorkout((prev: any) => {
                              if (!prev) return prev;
                              const n = [...prev.exercises];
                              const oldEx = n[modal.exIndex];
                              n[modal.exIndex] = {
                                ...oldEx,
                                name: ex,
                                originalName: oldEx.originalName || oldEx.name
                              };
                              return { ...prev, exercises: n };
                            });
                            setModal({type: null});
                          } else {
                            safeAddExerciseToActive(ex);
                            setModal({type: null});
                          }
                        }
                      }} className={`w-full p-4 text-left font-bold bg-[#1C1C21] rounded-2xl flex justify-between items-center uppercase text-[12px] text-gray-200 ${editMode ? 'active:bg-amber-500/20' : 'active:bg-sky-500'}`}>
                        <span>{ex}</span><Icon name={editMode ? "pencil" : "plus"} size={18} className={editMode ? "text-amber-400" : "text-sky-400"} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (modal.type === 'edit-exercise') {
    return (
      <div className="fixed inset-0 z-[4000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-[#1C1C21] border border-white/10 p-8 w-full max-w-sm rounded-[2.5rem] space-y-6 shadow-2xl">
          <h2 className="text-[1.5rem] font-black uppercase text-center text-white">Modifica Esercizio</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-extrabold uppercase text-gray-500 tracking-widest ml-2 mb-1 block">Nome Esercizio</label>
              <input id="edit-ex-name" type="text" defaultValue={modal.data.name} className="w-full text-sm font-bold bg-[#131316] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="text-[10px] font-extrabold uppercase text-gray-500 tracking-widest ml-2 mb-1 block">Gruppo Muscolare</label>
              <select id="edit-ex-cat" defaultValue={modal.data.cat} className="w-full text-sm font-bold bg-[#131316] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500">
                {Object.keys(INITIAL_LIB).map(c => (<option key={c} value={c}>{c}</option>))}
                <option value="Altro">Altro</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={(e) => { e.preventDefault(); setModal(modal.prevModal); }} className="flex-1 py-3.5 bg-white/5 rounded-full text-[11px] font-bold uppercase text-gray-400">Annulla</button>
            <button onClick={(e) => { 
              e.preventDefault();
              const newName = (document.getElementById('edit-ex-name') as HTMLInputElement)?.value?.trim();
              const newCat = (document.getElementById('edit-ex-cat') as HTMLSelectElement)?.value;
              if (newName && newCat) {
                const newCustoms = { ...customs };
                // Remove from old category
                if (newCustoms[modal.data.cat]) {
                  newCustoms[modal.data.cat] = newCustoms[modal.data.cat].filter((x: string) => x !== modal.data.name);
                }
                // Add to new category
                if (!newCustoms[newCat]) newCustoms[newCat] = [];
                newCustoms[newCat].push(newName);
                
                // Sort
                newCustoms[newCat] = newCustoms[newCat].sort((a: string,b: string)=>a.localeCompare(b,'it',{sensitivity:'base'}));
                
                setCustoms(newCustoms);
                setModal(modal.prevModal);
              }
            }} className="flex-1 py-3.5 bg-amber-500 text-white rounded-full text-[11px] font-bold uppercase">Salva</button>
          </div>
          
          <button onClick={(e) => {
            e.preventDefault();
            if (confirm("Sei sicuro di voler eliminare questo esercizio?")) {
              const newCustoms = { ...customs };
              if (newCustoms[modal.data.cat]) {
                newCustoms[modal.data.cat] = newCustoms[modal.data.cat].filter((x: string) => x !== modal.data.name);
                setCustoms(newCustoms);
              }
              setModal(modal.prevModal);
            }
          }} className="w-full py-3.5 bg-red-500/10 text-red-500 rounded-full text-[11px] font-bold uppercase border border-red-500/20 mt-2">Elimina Esercizio</button>
        </div>
      </div>
    );
  }

  if (modal.type === 'name-routine') {
    return (
      <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-[#1C1C21] border border-white/10 p-8 w-full max-w-sm rounded-[2.5rem] space-y-6 shadow-2xl">
          <h2 className="text-[1.5rem] font-black uppercase text-center text-white">Nuova Scheda</h2>
          <input id="rn-in" type="text" placeholder="Es. Upper Body" className="w-full text-lg font-bold bg-[#131316] border border-white/10 rounded-2xl p-4 text-center text-white outline-none focus:border-sky-500" autoFocus />
          <div className="flex gap-3">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModal({type:null}); }} className="flex-1 py-3.5 bg-white/5 rounded-full text-[11px] font-bold uppercase text-gray-400">Annulla</button>
            <button onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation();
              const val = (document.getElementById('rn-in') as HTMLInputElement)?.value?.trim(); 
              if(val) { 
                const newId = String(Date.now());
                const r = { id: newId, name: val, exs: [], createdAt: Date.now() }; 
                setRoutines((prev: any) => [r, ...(prev || [])]); 
                setModal({ type: 'edit-routine', data: newId }); 
              } 
            }} className="flex-1 py-3.5 bg-sky-500 text-white rounded-full text-[11px] font-bold uppercase">Crea</button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'confirm') {
    return (
      <div className="fixed inset-0 z-[4000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-[#1C1C21] border border-white/10 p-8 w-full max-w-xs rounded-[2.5rem] space-y-6 text-center shadow-2xl">
          <p className="text-[15px] font-bold text-gray-200">{modal.data}</p>
          <div className="flex gap-3">
            <button onClick={(e) => { e.preventDefault(); setModal({type:null}); }} className="flex-1 py-3.5 bg-white/5 rounded-full text-[12px] font-bold uppercase text-gray-400">No</button>
            <button onClick={(e) => { e.preventDefault(); modal.confirmAction(); }} className="flex-1 py-3.5 bg-sky-500 rounded-full text-[12px] font-bold uppercase text-white">Sì</button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'history' && modal.data) {
    return (
      <div className="fixed inset-0 z-[3500] bg-black/95 backdrop-blur-xl p-6 overflow-y-auto view-animate">
        <div className="max-w-md mx-auto space-y-4 pt-6 pb-20">
          <div className="flex justify-between items-center">
            <div className="min-w-0">
              <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-[0.3em]">Sessione</p>
              <h2 className="text-[1.8rem] font-black uppercase tracking-tight text-white truncate">{modal.data.name}</h2>
              <p className="text-[11px] font-bold uppercase text-sky-400 mt-1">
                {new Date(modal.data.date || modal.data.startTime || Date.now()).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })} {new Date(modal.data.date || modal.data.startTime || Date.now()).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} • Serie {modal.data.sets || 0} • Durata {modal.data.duration || '--'}
              </p>
            </div>
            <button onClick={(e) => { e.preventDefault(); setModal({type:null}); }} className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white active:bg-white/10 shrink-0">
              <Icon name="x" size={24}/>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 mb-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                const src = modal.data;
                const ws = {
                  id: genId(),
                  name: src.name || "Sessione Libera",
                  date: new Date().toISOString(),
                  startTime: Date.now(),
                  exercises: (src.exercises || []).map((e: any) => ({
                    name: e.name,
                    originalName: e.originalName,
                    rest: e.rest || 90,
                    notes: "",
                    sets: Array.from({ length: Math.max(1, (e.sets || []).length) }, () => ({ kg: '', reps: '', note: '', w: false, d: false }))
                  }))
                };
                setActiveWorkout(ws);
                setActiveTab('workout');
                setModal({type:null,data:null});
              }}
              className="py-4 bg-sky-500 text-white rounded-full font-bold uppercase text-[11px] tracking-wider active:scale-[0.98] shadow-lg"
            >
              Ripeti Workout
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setModal({type:'rename', mode:'history', data:{ id: modal.data?.id, current: modal.data?.name || '' }}); }}
              className="py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold uppercase text-[11px] tracking-wider active:bg-white/10"
            >
              Rinomina
            </button>
          </div>
          <div className="surface-card p-6 rounded-[2.2rem] space-y-6 shadow-xl">
            {(modal.data.exercises || []).map((ex: any, exI: number) => (
              <div key={exI} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-black uppercase text-white tracking-tight truncate">{ex.name}</h3>
                    {ex.originalName && (
                      <p className="text-[10px] font-bold text-amber-500 mt-0.5 uppercase tracking-wider">Sostituisce: {ex.originalName}</p>
                    )}
                    {ex.notes ? <p className="text-[12px] text-gray-400 whitespace-pre-wrap mt-1">{ex.notes}</p> : null}
                  </div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 whitespace-nowrap bg-white/5 px-2 py-1 rounded-lg">
                    Rest {ex.rest || 90}s
                  </div>
                </div>
                <div className="space-y-2">
                  {(ex.sets || []).map((s: any, sI: number) => (
                    <div key={sI} className="grid grid-cols-12 gap-2 items-center bg-[#1C1C21] border border-white/5 rounded-2xl px-3 py-2.5">
                      <div className="col-span-1 text-sky-400 font-black text-center text-sm">{sI+1}</div>
                      <div className="col-span-3 text-center font-bold tabular-nums text-white">{s.kg || '--'} kg</div>
                      <div className="col-span-3 text-center font-bold tabular-nums text-white">{s.reps || '--'} reps</div>
                      <div className="col-span-2 text-center text-[10px] font-bold uppercase text-gray-500">{s.w ? 'W' : 'A'}</div>
                      <div className="col-span-3 text-left text-[11px] text-gray-400 truncate">{s.note || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                setModal({type:'confirm', confirmAction: () => {
                  setHistory((prev: any) => (prev || []).filter((h: any) => h.id !== modal.data.id));
                  setModal({type:null,data:null});
                }, data: "Eliminare questo allenamento dalla cronologia?"});
              }}
              className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full font-bold uppercase text-[11px] tracking-wider active:bg-red-500/20"
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'rename') {
    return (
      <div className="fixed inset-0 z-[4000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-[#1C1C21] border border-white/10 p-8 w-full max-w-sm rounded-[2.5rem] space-y-6 shadow-2xl">
          <h2 className="text-[1.5rem] font-black uppercase text-center text-white">Rinomina</h2>
          <input id="rename-in" type="text" defaultValue={modal.data.current} className="w-full text-lg font-bold bg-[#131316] border border-white/10 rounded-2xl p-4 text-center text-white outline-none focus:border-sky-500" autoFocus />
          <div className="flex gap-3">
            <button onClick={(e) => { e.preventDefault(); setModal({type:null}); }} className="flex-1 py-3.5 bg-white/5 rounded-full text-[11px] font-bold uppercase text-gray-400">Annulla</button>
            <button onClick={(e) => { 
              e.preventDefault();
              const val = (document.getElementById('rename-in') as HTMLInputElement)?.value?.trim(); 
              if(val) { 
                if (modal.mode === 'active') {
                  setActiveWorkout((prev: any) => prev ? ({ ...prev, name: val }) : prev);
                } else if (modal.mode === 'history') {
                  setHistory((prev: any) => (prev || []).map((h: any) => (h.id === modal.data.id ? { ...h, name: val } : h)));
                }
                setModal({type:null}); 
              } 
            }} className="flex-1 py-3.5 bg-sky-500 text-white rounded-full text-[11px] font-bold uppercase">Salva</button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.type === 'workout-summary') {
    const w = modal.data;
    const durationMs = w.endTime - w.startTime;
    const h = Math.floor(durationMs / 3600000).toString().padStart(2, '0');
    const m = Math.floor((durationMs % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((durationMs % 60000) / 1000).toString().padStart(2, '0');
    
    let totalSets = w.sets || 0;
    if (!totalSets) {
      (w.exercises || []).forEach((ex: any) => {
        (ex.sets || []).forEach((set: any) => {
          if (set.d) totalSets++;
        });
      });
    }
    
    const prs = w.prs || [];

    return (
      <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
          <div className="w-24 h-24 bg-sky-500/20 rounded-full flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping" />
            <Icon name="trophy" size={48} className="text-sky-400 relative z-10" />
          </div>
          
          <div>
            <h2 className="text-[2.5rem] font-black uppercase text-white leading-tight">Workout<br/>Completato!</h2>
            <p className="text-sky-400 font-bold mt-2">{w.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-[#1C1C21] border border-white/10 rounded-3xl p-6 flex flex-col items-center">
              <Icon name="clock" size={24} className="text-gray-400 mb-2" />
              <span className="text-[2rem] font-black text-white">{h}:{m}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mt-1">Durata</span>
            </div>
            <div className="bg-[#1C1C21] border border-white/10 rounded-3xl p-6 flex flex-col items-center">
              <Icon name="check-circle-2" size={24} className="text-gray-400 mb-2" />
              <span className="text-[2rem] font-black text-white">{totalSets}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500 mt-1">Serie Allenanti</span>
            </div>
          </div>

          {prs.length > 0 && (
            <div className="bg-[#1C1C21] border border-amber-500/20 rounded-3xl p-6 w-full text-left">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="zap" size={18} className="text-amber-400" />
                <h3 className="text-[12px] font-black uppercase text-amber-400 tracking-widest">Nuovi Record (1RM)</h3>
              </div>
              <div className="space-y-2">
                {prs.map((pr: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-black/30 p-3 rounded-2xl">
                    <span className="text-[13px] font-bold text-white truncate pr-2">{pr.name}</span>
                    <span className="text-[13px] font-black text-amber-400 whitespace-nowrap">{Math.round(pr.new1RM)} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => { setModal({type:null}); setActiveTab('home'); }} className="w-full py-5 bg-sky-500 text-white rounded-full font-black uppercase text-[14px] tracking-wider shadow-[0_10px_30px_rgba(14,165,233,0.3)] active:scale-95 transition-transform mt-8">
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return null;
};
