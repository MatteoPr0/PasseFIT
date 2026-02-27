import { useState, useEffect, useMemo, useRef } from 'react';
import * as idbKeyval from 'idb-keyval';
import { genId, deepClone } from '../utils';
import { INITIAL_LIB } from '../constants';
import { WorkoutData, RoutineData, CustomExercises } from '../types';

export const useStore = () => {
  const [history, setHistory] = useState<WorkoutData[]>([]);
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [customs, setCustoms] = useState<CustomExercises>({});
  const [activeWorkout, setActiveWorkout] = useState<WorkoutData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const loadAndMigrateData = async () => {
      try {
        let storedHistory = await idbKeyval.get('af_v57_h');
        let storedRoutines = await idbKeyval.get('af_v57_r');
        let storedCustoms = await idbKeyval.get('af_v57_c');
        let storedActiveWorkout = await idbKeyval.get('af_v57_aw');

        if (storedHistory === undefined) {
          storedHistory = JSON.parse(localStorage.getItem('af_v57_h') || '[]');
          if (storedHistory.length > 0) await idbKeyval.set('af_v57_h', storedHistory);
        }
        if (storedRoutines === undefined) {
          storedRoutines = JSON.parse(localStorage.getItem('af_v57_r') || '[]');
          if (storedRoutines.length > 0) await idbKeyval.set('af_v57_r', storedRoutines);
        }
        if (storedCustoms === undefined) {
          storedCustoms = JSON.parse(localStorage.getItem('af_v57_c') || '{}');
          if (Object.keys(storedCustoms).length > 0) await idbKeyval.set('af_v57_c', storedCustoms);
        }
        if (storedActiveWorkout === undefined) {
          storedActiveWorkout = JSON.parse(localStorage.getItem('af_v57_aw') || 'null');
          if (storedActiveWorkout) await idbKeyval.set('af_v57_aw', storedActiveWorkout);
        }

        let historyToSet = storedHistory || [];
        let changed = false;
        const normalizedHistory = historyToSet.map((w: any) => {
          if (w && w.id) return w;
          changed = true;
          return { ...w, id: genId() };
        });
        if (changed) { historyToSet = normalizedHistory; await idbKeyval.set('af_v57_h', historyToSet); }

        setHistory(historyToSet);
        setRoutines(storedRoutines || []);
        setCustoms(storedCustoms || {});
        setActiveWorkout(storedActiveWorkout || null);
      } catch (error) { 
        console.error("Errore IndexedDB:", error); 
      } finally { 
        setIsDataLoaded(true); 
      }
    };
    loadAndMigrateData();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    idbKeyval.set('af_v57_h', history);
    idbKeyval.set('af_v57_r', routines);
    idbKeyval.set('af_v57_c', customs);
    idbKeyval.set('af_v57_aw', activeWorkout);
  }, [history, routines, customs, activeWorkout, isDataLoaded]);

  const mergedLibrary = useMemo(() => {
    const out: Record<string, string[]> = {};
    Object.keys(INITIAL_LIB).forEach(cat => { out[cat] = [...(INITIAL_LIB[cat] || []), ...(customs?.[cat] || [])]; });
    Object.keys(customs || {}).forEach(cat => { if (!out[cat]) out[cat] = [...(customs?.[cat] || [])]; });
    Object.keys(out).forEach(cat => {
        const seen = new Set();
        out[cat] = out[cat].filter(x => {
            const k = (x || "").trim().toLowerCase();
            if (!k || seen.has(k)) return false;
            seen.add(k); return true;
        }).sort((a,b)=>a.localeCompare(b,'it',{sensitivity:'base'}));
    });
    return out;
  }, [customs]);

  const muscleMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(mergedLibrary).forEach(([cat, exs]) => {
        exs.forEach(ex => {
            map[ex.toLowerCase()] = cat;
        });
    });
    return map;
  }, [mergedLibrary]);

  const lastByExercise = useMemo(() => {
    const map = new Map();
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i];
      for (const ex of (h.exercises || [])) {
        const key = (ex.name || '').trim().toLowerCase();
        if (key && !map.has(key)) map.set(key, ex);
      }
    }
    return map;
  }, [history]);

  return {
    history, setHistory,
    routines, setRoutines,
    customs, setCustoms,
    activeWorkout, setActiveWorkout,
    isDataLoaded,
    mergedLibrary,
    muscleMap,
    lastByExercise
  };
};
