import React, { useState, useRef } from 'react';
import { Icon } from '../components/ui/Icon';
import { EtherInput, NoteArea } from '../components/ui/Shared';
import { deepClone, genId, toNum } from '../utils';

export const WorkoutView = ({ store, setActiveTab, setModal, sessionDuration, timerEndTimeRef, setTimerVal, setIsTimerOpen }: any) => {
  const { activeWorkout, setActiveWorkout, history, setHistory, lastByExercise } = store;
  const exCardRefs = useRef<any[]>([]);
  const dragRef = useRef({ active:false, from:-1, over:-1, pointerId:null as number | null });
  const [dragUI, setDragUI] = useState({ active:false, from:-1, over:-1 });
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({});

  const getGhostSet = (exName: string, setIdx: number) => lastByExercise.get((exName || '').trim().toLowerCase())?.sets?.[setIdx] || null;
  const getGhostExerciseNotes = (exName: string) => lastByExercise.get((exName || '').trim().toLowerCase())?.notes || null;

  const getExerciseHistory = (exName: string) => {
    const name = (exName || '').trim().toLowerCase();
    const past = (history || []).filter((w: any) => 
      (w.exercises || []).some((e: any) => (e.name || '').trim().toLowerCase() === name)
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return past.slice(0, 3);
  };

  const getLastPerformanceSummary = (exName: string) => {
    const past = getExerciseHistory(exName);
    if (past.length === 0) return null;
    const lastWorkout = past[0];
    const ex = lastWorkout.exercises.find((e: any) => (e.name || '').trim().toLowerCase() === (exName || '').trim().toLowerCase());
    if (!ex || !ex.sets) return null;
    const validSets = ex.sets.filter((s: any) => s.d && s.kg && s.reps);
    if (validSets.length === 0) return null;
    const bestSet = validSets.reduce((best: any, current: any) => {
      const current1RM = parseFloat(current.kg) * (1 + parseInt(current.reps) / 30);
      const best1RM = parseFloat(best.kg) * (1 + parseInt(best.reps) / 30);
      return current1RM > best1RM ? current : best;
    }, validSets[0]);
    return `Ultima volta: ${validSets.length} serie (Max: ${bestSet.kg}kg x ${bestSet.reps})`;
  };

  const computeOverIndex = (clientY: number) => {
      const refs = exCardRefs.current || [];
      let over = -1;
      for (let i = 0; i < refs.length; i++) {
          const el = refs[i];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (clientY < r.top + (r.height / 2)) { over = i; break; }
          over = i;
      }
      return over;
  };

  const reorderExercises = (fromIdx: number, toIdx: number) => {
      if (!activeWorkout || !activeWorkout.exercises) return;
      const n = activeWorkout.exercises.slice();
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= n.length || toIdx >= n.length || fromIdx === toIdx) return;
      const moved = n.splice(fromIdx, 1)[0];
      n.splice(toIdx, 0, moved);
      setActiveWorkout({ ...activeWorkout, exercises: n });
  };

  const dragStart = (fromIdx: number, pointerId: number, clientY: number) => {
      dragRef.current = { active:true, from:fromIdx, over:fromIdx, pointerId };
      setDragUI({ active:true, from:fromIdx, over:fromIdx });
      if (navigator && navigator.vibrate) navigator.vibrate(10);
  };

  const dragMove = (clientY: number) => {
      if (!dragRef.current.active) return;
      const over = computeOverIndex(clientY);
      if (over >= 0 && over !== dragRef.current.over) {
          dragRef.current.over = over;
          setDragUI({ active:true, from:dragRef.current.from, over });
      }
  };

  const dragEnd = () => {
      if (!dragRef.current.active) return;
      const {from, over} = dragRef.current;
      dragRef.current = { active:false, from:-1, over:-1, pointerId:null };
      setDragUI({ active:false, from:-1, over:-1 });
      reorderExercises(from, over);
  };

  const onDragPointerDown = (fromIdx: number) => (e: React.PointerEvent) => {
      try { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}
      document.body.classList.add('select-none');
      dragStart(fromIdx, e.pointerId, e.clientY);
      window.addEventListener('pointermove', onDragPointerMove, { passive: false });
      window.addEventListener('pointerup', onDragPointerUp, { passive: false });
      window.addEventListener('pointercancel', onDragPointerUp, { passive: false });
  };
  const onDragPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active || (dragRef.current.pointerId !== null && e.pointerId !== dragRef.current.pointerId)) return;
      try { e.preventDefault(); } catch(err) {}
      dragMove(e.clientY);
  };
  const onDragPointerUp = (e: PointerEvent) => {
      if (!dragRef.current.active || (dragRef.current.pointerId !== null && e.pointerId !== dragRef.current.pointerId)) return;
      try { e.preventDefault(); } catch(err) {}
      document.body.classList.remove('select-none');
      window.removeEventListener('pointermove', onDragPointerMove);
      window.removeEventListener('pointerup', onDragPointerUp);
      window.removeEventListener('pointercancel', onDragPointerUp);
      try { (e.currentTarget as any)?.releasePointerCapture(e.pointerId); } catch(err) {}
      dragEnd();
  };

  const handleSetDone = (exI: number, sI: number) => {
    if (!activeWorkout) return;
    const n = deepClone(activeWorkout.exercises);
    const s = n[exI].sets[sI];
    
    if (!s.d) {
      const ghost = getGhostSet(n[exI].name, sI);
      if (ghost) {
        if (!s.kg && ghost.kg) s.kg = ghost.kg;
        if (!s.reps && ghost.reps) s.reps = ghost.reps;
      }
    }

    s.d = !s.d;
    if (s.d) {
      try {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      } catch (e) {}
      
      const r = parseInt(n[exI].rest) || 90;
      timerEndTimeRef.current = Date.now() + (r * 1000);
      setTimerVal(r);
      setIsTimerOpen(true);
    }
    setActiveWorkout({ ...activeWorkout, exercises: n });
  };

  const updateSetData = (exI: number, sI: number, field: string, val: any) => {
    if (!activeWorkout) return;
    const n = deepClone(activeWorkout.exercises);
    (n[exI].sets[sI] as any)[field] = val;
    setActiveWorkout({ ...activeWorkout, exercises: n });
  };

  const removeSet = (exI: number, sI: number) => {
    if (!activeWorkout) return;
    const n = deepClone(activeWorkout.exercises);
    const sets = n[exI].sets || [];
    if (sets.length <= 1) {
      n[exI].sets = [{ kg: '', reps: '', note: '', w: false, d: false }];
    } else {
      sets.splice(sI, 1);
      n[exI].sets = sets;
    }
    setActiveWorkout({ ...activeWorkout, exercises: n });
  };

  const updateExNote = (exI: number, val: string) => {
    if (!activeWorkout) return;
    const n = deepClone(activeWorkout.exercises);
    n[exI].notes = val;
    setActiveWorkout({ ...activeWorkout, exercises: n });
  };

  const finishWorkout = () => {
    if (!activeWorkout) return;
    let vol = 0;
    let totalSets = 0;
    const prs: any[] = [];
    
    (activeWorkout.exercises || []).forEach((ex: any) => {
      const validSets = (ex.sets || []).filter((s: any) => s.d && s.kg && s.reps);
      totalSets += validSets.length;
      
      validSets.forEach((s: any) => {
        if (!s.w && Number.isFinite(toNum(s.kg)) && Number.isFinite(toNum(s.reps)) && toNum(s.reps) > 0) vol += (toNum(s.kg) * toNum(s.reps));
      });

      if (validSets.length > 0) {
        const currentBest1RM = Math.max(...validSets.map((s: any) => parseFloat(s.kg) * (1 + parseInt(s.reps) / 30)));
        let historicalBest1RM = 0;
        history.forEach((h: any) => {
          const pastEx = h.exercises?.find((e: any) => e.name === ex.name);
          if (pastEx && pastEx.sets) {
            pastEx.sets.forEach((s: any) => {
              if (s.d && s.kg && s.reps) {
                const e1rm = parseFloat(s.kg) * (1 + parseInt(s.reps) / 30);
                if (e1rm > historicalBest1RM) historicalBest1RM = e1rm;
              }
            });
          }
        });
        if (currentBest1RM > historicalBest1RM && historicalBest1RM > 0) {
          prs.push({ name: ex.name, old1RM: historicalBest1RM, new1RM: currentBest1RM });
        }
      }
    });
    
    const completedWorkout = { ...activeWorkout, id: activeWorkout.id || genId(), vol, sets: totalSets, prs, duration: sessionDuration, date: new Date().toISOString(), endTime: Date.now() };
    setHistory([...history, completedWorkout]);
    setActiveWorkout(null); 
    setActiveTab('home');
    setModal({type: 'workout-summary', data: completedWorkout});
  };

  return (
    <div className="space-y-6 view-animate pb-6 pt-8">
      <header className="sticky top-0 z-50 flex justify-between items-center gap-3 px-1 py-4 -mx-2 bg-[#000000]/80 backdrop-blur-xl rounded-b-3xl">
        <div className="w-1/4 pl-2">
          <button onClick={() => setModal({type:'confirm', confirmAction: () => {setActiveWorkout(null); setActiveTab('home'); setModal({type:null});}, data: "Annullare sessione?"})} className="text-gray-400 text-[11px] font-extrabold uppercase bg-white/5 px-4 py-2.5 rounded-full border border-white/10 active:bg-white/10 active:scale-95 transition-transform">Esci</button>
        </div>
        <div className="flex-1 text-center min-w-0">
          <div onClick={() => setModal({type:'rename', mode:'active', data:{ current: activeWorkout?.name || '' }})} className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-2 active:bg-white/10 active:scale-95 transition-transform cursor-pointer">
              <Icon name="pencil" size={12} className="text-sky-400" />
              <span className="text-[10px] font-extrabold text-sky-300 uppercase tracking-widest truncate max-w-[120px]">{activeWorkout.name}</span>
          </div>
          <p className="text-[2.2rem] font-black tabular-nums text-white leading-none">{sessionDuration}</p>
        </div>
        <div className="w-1/4 flex justify-end pr-2">
          <button onClick={() => setModal({type:'confirm', confirmAction: finishWorkout, data: "Concludere allenamento?"})} className="bg-sky-500 px-5 py-2.5 rounded-full text-[11px] font-black text-white shadow-lg shadow-sky-500/30 whitespace-nowrap active:scale-95 transition-transform">Fine</button>
        </div>
      </header>

      <div className="space-y-5 text-left">
        {activeWorkout.exercises.map((ex: any, exI: number) => {
          const isCompleted = ex.sets.every((s: any) => s.d);
          const isActive = !isCompleted && (exI === 0 || activeWorkout.exercises.slice(0, exI).every((prevEx: any) => prevEx.sets.every((s: any) => s.d)));
          
          return (
            <div key={exI} ref={(el)=>{exCardRefs.current[exI]=el;}} className={`surface-card p-5 rounded-3xl space-y-4 shadow-lg transition-all duration-300 ${dragUI.active && dragUI.over===exI ? "ring-2 ring-sky-500" : ""} ${isActive ? "ring-2 ring-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.3)] bg-sky-900/10" : ""}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 onClick={() => { const nn = prompt("Rinomina esercizio", ex.name); if(nn){ const n=[...activeWorkout.exercises]; n[exI].name = nn.trim(); setActiveWorkout({...activeWorkout, exercises:n}); } }} className="text-[1.2rem] font-black uppercase text-white leading-tight break-words active:text-sky-300 cursor-pointer">{ex.name}</h3>
                  {getLastPerformanceSummary(ex.name) && (
                    <p className="text-[11px] font-bold text-sky-400 mt-0.5">{getLastPerformanceSummary(ex.name)}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-black/40 inline-flex px-3 py-1.5 rounded-lg border border-white/5 items-center gap-2">
                      <Icon name="clock" size={12} className="text-sky-400" />
                      <input type="number" value={ex.rest} onChange={(e) => { const n = deepClone(activeWorkout.exercises); n[exI].rest = e.target.value; setActiveWorkout({...activeWorkout, exercises: n}); }} className="w-8 bg-transparent text-[11px] font-black text-white outline-none text-center" />
                      <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">sec rest</span>
                    </div>
                    {getExerciseHistory(ex.name).length > 0 && (
                      <button 
                        onClick={() => setExpandedHistory(prev => ({...prev, [exI]: !prev[exI]}))}
                        className={`bg-black/40 inline-flex px-3 py-1.5 rounded-lg border border-white/5 items-center gap-2 transition-colors ${expandedHistory[exI] ? 'bg-sky-500/20 border-sky-500/30' : ''}`}
                      >
                        <Icon name="history" size={12} className={expandedHistory[exI] ? "text-sky-400" : "text-gray-400"} />
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${expandedHistory[exI] ? "text-sky-400" : "text-gray-400"}`}>Storico</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button onClick={() => { const n = activeWorkout.exercises.filter((_: any, i: number) => i !== exI); setActiveWorkout({...activeWorkout, exercises: n}); }} className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 active:bg-red-500/30 shrink-0"><Icon name="trash-2" size={18}/></button>
                  <button onPointerDown={onDragPointerDown(exI)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 touch-none active:bg-white/10 cursor-grab shrink-0"><Icon name="grip-horizontal" size={18}/></button>
                </div>
              </div>

              {expandedHistory[exI] && (
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-sky-400 mb-2">Ultime sessioni</h4>
                  {getExerciseHistory(ex.name).map((hw: any, hwI: number) => {
                    const hex = hw.exercises.find((e: any) => (e.name || '').trim().toLowerCase() === (ex.name || '').trim().toLowerCase());
                    if (!hex) return null;
                    return (
                      <div key={hwI} className="flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="text-[10px] font-bold text-gray-500">{new Date(hw.date).toLocaleDateString('it-IT', {day:'2-digit', month:'short', year:'numeric'})}</span>
                        <div className="flex flex-wrap gap-2">
                          {hex.sets.map((hs: any, hsI: number) => (
                            <span key={hsI} className={`text-[11px] font-bold px-2 py-1 rounded bg-white/5 ${hs.w ? 'text-amber-400/70' : 'text-gray-300'}`}>
                              {hs.kg || '-'}kg x {hs.reps || '-'}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <NoteArea initialValue={ex.notes} onCommit={(v) => updateExNote(exI, v)} ghost={getGhostExerciseNotes(ex.name) || "Note (es. Focus eccentrica)..."} />
              
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-extrabold text-gray-500 text-center uppercase tracking-widest px-1">
                  <span className="col-span-1">S</span>
                  <span className="col-span-3">KG</span>
                  <span className="col-span-2">Rip</span>
                  <span className="col-span-4 text-left pl-2">Note</span>
                  <span className="col-span-2">Esito</span>
                </div>
                {ex.sets.map((s: any, sI: number) => {
                  const setGhost = getGhostSet(ex.name, sI);
                  return (
                    <div key={sI} className={`grid grid-cols-12 gap-2 items-center transition-opacity duration-300 ${s.d ? 'opacity-50' : 'opacity-100'}`}>
                      <div className="col-span-1 flex flex-col items-center gap-1">
                          <span className="text-[14px] font-black text-sky-400">{sI+1}</span>
                          <button onClick={() => { const n = deepClone(activeWorkout.exercises); n[exI].sets[sI].w = !n[exI].sets[sI].w; setActiveWorkout({...activeWorkout, exercises: n}); }} className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${s.w ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-500'}`}>{s.w ? 'W' : 'A'}</button>
                      </div>
                      <div className="col-span-3"><EtherInput ghost={setGhost?.kg} initialValue={s.kg} onCommit={(v) => updateSetData(exI, sI, 'kg', v)} /></div>
                      <div className="col-span-2"><EtherInput ghost={setGhost?.reps} initialValue={s.reps} onCommit={(v) => updateSetData(exI, sI, 'reps', v)} /></div>
                      <div className="col-span-4"><NoteArea ghost={setGhost?.note} initialValue={s.note} onCommit={(v) => updateSetData(exI, sI, 'note', v)} className="!text-[11px] !py-2.5" /></div>
                      <div className="col-span-2 flex items-center justify-between gap-1">
                          <button onClick={() => handleSetDone(exI, sI)} className={`check-box flex-1 !h-10 ${s.d ? 'checked' : ''}`}><Icon name="check" size={18} className={s.d ? 'text-white' : 'opacity-0'} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                  <button onClick={() => { const n = deepClone(activeWorkout.exercises); const last = n[exI].sets[n[exI].sets.length-1] || {kg:'', reps:'', w:false}; n[exI].sets.push({kg: last.kg, reps: '', note: '', w: last.w, d:false}); setActiveWorkout({...activeWorkout, exercises: n}); }} className="flex-1 py-3 bg-white/5 rounded-2xl text-[11px] font-extrabold uppercase border border-white/10 active:bg-white/10 text-gray-300 tracking-wider">+ Serie</button>
                  <button onClick={() => removeSet(exI, ex.sets.length-1)} className="w-14 py-3 bg-white/5 rounded-2xl text-[11px] font-extrabold border border-white/10 active:bg-red-500/20 text-gray-400 flex items-center justify-center">-</button>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setModal({ type: 'exercise-select', mode: 'active', routineExs: [] })} className="w-full bg-[#131316] border-2 border-dashed border-white/15 py-12 flex flex-col items-center gap-4 text-gray-400 rounded-[2.5rem] active:bg-white/5 transition-all">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center"><Icon name="plus" size={32} className="text-sky-400" /></div>
        <span className="font-bold text-[13px] uppercase tracking-widest">Aggiungi Esercizio</span>
      </button>
    </div>
  );
};
