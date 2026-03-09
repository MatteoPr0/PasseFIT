import { useState, useEffect, useMemo, useRef } from 'react';
import * as idbKeyval from 'idb-keyval';
import { genId, deepClone } from '../utils';
import { INITIAL_LIB } from '../constants';
import { WorkoutData, RoutineData, CustomExercises } from '../types';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const useStore = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [history, setHistory] = useState<WorkoutData[]>([]);
  const [routines, setRoutines] = useState<RoutineData[]>([]);
  const [customs, setCustoms] = useState<CustomExercises>({});
  const [activeWorkout, setActiveWorkout] = useState<WorkoutData | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setIsDataLoaded(false);
      return;
    }

    const loadAndMigrateData = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        let storedHistory = await idbKeyval.get('af_v57_h');
        let storedRoutines = await idbKeyval.get('af_v57_r');
        let storedCustoms = await idbKeyval.get('af_v57_c');
        let storedActiveWorkout = await idbKeyval.get('af_v57_aw');

        if (storedHistory === undefined) storedHistory = JSON.parse(localStorage.getItem('af_v57_h') || '[]');
        if (storedRoutines === undefined) storedRoutines = JSON.parse(localStorage.getItem('af_v57_r') || '[]');
        if (storedCustoms === undefined) storedCustoms = JSON.parse(localStorage.getItem('af_v57_c') || 'null');
        if (storedActiveWorkout === undefined) storedActiveWorkout = JSON.parse(localStorage.getItem('af_v57_aw') || 'null');

        let libraryToSet = storedCustoms || {};
        const isOldCustoms = !libraryToSet["Petto"] || libraryToSet["Petto"].length < 5;
        if (isOldCustoms) {
            const newLib = deepClone(INITIAL_LIB);
            Object.keys(libraryToSet).forEach(cat => {
                if (!newLib[cat]) newLib[cat] = [];
                newLib[cat].push(...libraryToSet[cat]);
            });
            libraryToSet = newLib;
        }

        Object.keys(libraryToSet).forEach(cat => {
            const seen = new Set();
            libraryToSet[cat] = libraryToSet[cat].filter((x: string) => {
                const k = (x || "").trim().toLowerCase();
                if (!k || seen.has(k)) return false;
                seen.add(k); return true;
            }).sort((a: string,b: string)=>a.localeCompare(b,'it',{sensitivity:'base'}));
        });

        let historyToSet = storedHistory || [];
        const normalizedHistory = historyToSet.map((w: any) => {
          if (w && w.id) return w;
          return { ...w, id: genId() };
        });
        historyToSet = normalizedHistory;

        if (!docSnap.exists()) {
          // Migrate local data to Firestore
          await setDoc(userDocRef, {
            history: JSON.stringify(historyToSet),
            routines: JSON.stringify(storedRoutines || []),
            customs: JSON.stringify(libraryToSet),
            activeWorkout: JSON.stringify(storedActiveWorkout || null)
          });
        }
      } catch (error) { 
        console.error("Errore migrazione:", error); 
      }
    };

    loadAndMigrateData().then(() => {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          try {
            setHistory(JSON.parse(data.history || '[]'));
            setRoutines(JSON.parse(data.routines || '[]'));
            setCustoms(JSON.parse(data.customs || '{}'));
            setActiveWorkout(JSON.parse(data.activeWorkout || 'null'));
          } catch (e) {
            console.error("Error parsing firestore data", e);
          }
        }
        setIsDataLoaded(true);
      }, (error) => {
        console.error("Firestore Error: ", error);
      });

      return () => unsubscribe();
    });
  }, [user, isAuthReady]);

  // Sync to Firestore when state changes
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    const syncData = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          history: JSON.stringify(history),
          routines: JSON.stringify(routines),
          customs: JSON.stringify(customs),
          activeWorkout: JSON.stringify(activeWorkout)
        }, { merge: true });
      } catch (error) {
        console.error("Error syncing to firestore", error);
      }
    };
    syncData();
  }, [history, routines, customs, activeWorkout, isDataLoaded, user]);

  const mergedLibrary = useMemo(() => {
    return customs;
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
    user, isAuthReady,
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
