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

  const lastLoadedData = useRef<string | null>(null);
  const isSyncEnabled = useRef(false);

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
      isSyncEnabled.current = false;
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;

    const initAndListen = async () => {
      try {
        // --- STEP 1: LOAD FROM LOCAL CACHE FIRST (OFFLINE-FIRST) ---
        let storedHistory = await idbKeyval.get('af_v57_h');
        let storedRoutines = await idbKeyval.get('af_v57_r');
        let storedCustoms = await idbKeyval.get('af_v57_c');
        let storedActiveWorkout = await idbKeyval.get('af_v57_aw');

        if (storedHistory === undefined || storedHistory === null) storedHistory = JSON.parse(localStorage.getItem('af_v57_h') || '[]');
        if (storedRoutines === undefined || storedRoutines === null) storedRoutines = JSON.parse(localStorage.getItem('af_v57_r') || '[]');
        if (storedCustoms === undefined || storedCustoms === null) storedCustoms = JSON.parse(localStorage.getItem('af_v57_c') || 'null');
        if (storedActiveWorkout === undefined || storedActiveWorkout === null) storedActiveWorkout = JSON.parse(localStorage.getItem('af_v57_aw') || 'null');

        let libraryToSet = storedCustoms || {};
        const isOldCustoms = !libraryToSet["Petto"] || libraryToSet["Petto"].length < 5;
        if (isOldCustoms) {
            const newLib = deepClone(INITIAL_LIB);
            Object.keys(libraryToSet).forEach(cat => {
                if (!newLib[cat]) newLib[cat] = [];
                if (Array.isArray(libraryToSet[cat])) {
                    newLib[cat].push(...libraryToSet[cat]);
                }
            });
            libraryToSet = newLib;
        }

        Object.keys(libraryToSet).forEach(cat => {
            const seen = new Set();
            if (Array.isArray(libraryToSet[cat])) {
                libraryToSet[cat] = libraryToSet[cat].filter((x: string) => {
                    const k = (x || "").trim().toLowerCase();
                    if (!k || seen.has(k)) return false;
                    seen.add(k); return true;
                }).sort((a: string, b: string) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
            } else {
                libraryToSet[cat] = [];
            }
        });

        let historyToSet = storedHistory || [];
        if (Array.isArray(historyToSet)) {
            const normalizedHistory = historyToSet.map((w: any) => {
              if (w && w.id) return w;
              return { ...w, id: genId() };
            });
            historyToSet = normalizedHistory;
        } else {
            historyToSet = [];
        }

        let finalHistory = historyToSet;
        let finalRoutines = Array.isArray(storedRoutines) ? storedRoutines : [];
        let finalCustoms = libraryToSet;
        let finalActiveWorkout = storedActiveWorkout;

        if (active) {
          // Sync state to local variables immediately so UI is loaded and ready!
          lastLoadedData.current = JSON.stringify({
            history: JSON.stringify(finalHistory),
            routines: JSON.stringify(finalRoutines),
            customs: JSON.stringify(finalCustoms),
            activeWorkout: JSON.stringify(finalActiveWorkout)
          });

          setHistory(finalHistory);
          setRoutines(finalRoutines);
          setCustoms(finalCustoms);
          setActiveWorkout(finalActiveWorkout);

          setIsDataLoaded(true);
          isSyncEnabled.current = true;
        }

        // --- STEP 2: ATTEMPT TO CONNECT AND MERGE WITH FIRESTORE (NON-BLOCKING) ---
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (!active) return;

          let finalMergedHistory = finalHistory;
          let finalMergedRoutines = finalRoutines;
          let finalMergedCustoms = finalCustoms;
          let finalMergedActiveWorkout = finalActiveWorkout;
          let shouldWriteToFirestore = !docSnap.exists();

          if (docSnap.exists()) {
            const fsData = docSnap.data();
            const firestoreHistory = JSON.parse(fsData.history || '[]');
            const firestoreRoutines = JSON.parse(fsData.routines || '[]');
            let firestoreCustoms = JSON.parse(fsData.customs || '{}');
            const firestoreActiveWorkout = JSON.parse(fsData.activeWorkout || 'null');

            // Robust merging for history: deduplicate by ID and match by startTime/date if missing ID
            const localHist: any[] = Array.isArray(finalHistory) ? finalHistory : [];
            const fsHist: any[] = Array.isArray(firestoreHistory) ? firestoreHistory : [];
            
            const mergedHistMap = new Map<string, any>();
            localHist.forEach((w: any) => {
              if (w) {
                const cleanW = { ...w };
                if (!cleanW.id) cleanW.id = genId();
                mergedHistMap.set(cleanW.id, cleanW);
              }
            });

            fsHist.forEach((w: any) => {
              if (w) {
                const cleanW = { ...w };
                if (!cleanW.id) {
                  // Try matching on startTime or date
                  let matchId: string | null = null;
                  for (const [, existing] of mergedHistMap) {
                    const matchTime = cleanW.startTime && existing.startTime && cleanW.startTime === existing.startTime;
                    const matchDate = cleanW.date && existing.date && cleanW.date === existing.date;
                    if (matchTime || matchDate) {
                      matchId = existing.id;
                      break;
                    }
                  }
                  cleanW.id = matchId || genId();
                }

                const existing = mergedHistMap.get(cleanW.id);
                if (!existing || (cleanW.exercises && existing.exercises && cleanW.exercises.length >= existing.exercises.length)) {
                  mergedHistMap.set(cleanW.id, cleanW);
                }
              }
            });
            
            let mergedHistList = Array.from(mergedHistMap.values());
            
            // Safe sort relative to real times and datetimes, avoiding numeric subtractions on ISO strings
            mergedHistList.sort((a: any, b: any) => {
              const d1 = new Date(a.date || a.startTime || 0).getTime();
              const d2 = new Date(b.date || b.startTime || 0).getTime();
              return d1 - d2;
            });
            
            finalMergedHistory = mergedHistList;
            
            if (JSON.stringify(finalMergedHistory) !== JSON.stringify(firestoreHistory)) {
              shouldWriteToFirestore = true;
            }

            // Robust merging for routines: deduplicate by ID
            const localRoutines: any[] = Array.isArray(finalRoutines) ? finalRoutines : [];
            const fsRoutines: any[] = Array.isArray(firestoreRoutines) ? firestoreRoutines : [];
            
            const mergedRoutinesMap = new Map<string, any>();
            localRoutines.forEach((r: any) => {
              if (r && r.id) mergedRoutinesMap.set(r.id, r);
            });
            fsRoutines.forEach((r: any) => {
              if (r && r.id) mergedRoutinesMap.set(r.id, r);
            });
            
            finalMergedRoutines = Array.from(mergedRoutinesMap.values());
            if (JSON.stringify(finalMergedRoutines) !== JSON.stringify(firestoreRoutines)) {
              shouldWriteToFirestore = true;
            }

            // Robust merging for customs: union categories and their arrays
            const localCustoms = finalCustoms || {};
            const fsCustoms = firestoreCustoms || {};
            const mergedCustomAll: Record<string, string[]> = {};
            const allCats = new Set([...Object.keys(localCustoms), ...Object.keys(fsCustoms)]);
            
            allCats.forEach((cat) => {
              const localArr = Array.isArray(localCustoms[cat]) ? localCustoms[cat] : [];
              const fsArr = Array.isArray(fsCustoms[cat]) ? fsCustoms[cat] : [];
              const seenEx = new Set<string>();
              const uniqArr: string[] = [];
              
              [...localArr, ...fsArr].forEach((x: string) => {
                const k = (x || "").trim().toLowerCase();
                const clean = (x || "").trim();
                if (clean && !seenEx.has(k)) {
                  seenEx.add(k);
                  uniqArr.push(clean);
                }
              });
              
              mergedCustomAll[cat] = uniqArr.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
            });
            
            finalMergedCustoms = mergedCustomAll;
            if (JSON.stringify(finalMergedCustoms) !== JSON.stringify(firestoreCustoms)) {
              shouldWriteToFirestore = true;
            }

            // Simple preference for activeWorkout
            if (firestoreActiveWorkout) {
              finalMergedActiveWorkout = firestoreActiveWorkout;
            } else if (finalActiveWorkout) {
              finalMergedActiveWorkout = finalActiveWorkout;
              shouldWriteToFirestore = true;
            }
          }

          if (shouldWriteToFirestore) {
            await setDoc(userDocRef, {
              history: JSON.stringify(finalMergedHistory),
              routines: JSON.stringify(finalMergedRoutines),
              customs: JSON.stringify(finalMergedCustoms),
              activeWorkout: JSON.stringify(finalMergedActiveWorkout)
            });
          }

          if (active) {
            lastLoadedData.current = JSON.stringify({
              history: JSON.stringify(finalMergedHistory),
              routines: JSON.stringify(finalMergedRoutines),
              customs: JSON.stringify(finalMergedCustoms),
              activeWorkout: JSON.stringify(finalMergedActiveWorkout)
            });

            setHistory(finalMergedHistory);
            setRoutines(finalMergedRoutines);
            setCustoms(finalMergedCustoms);
            setActiveWorkout(finalMergedActiveWorkout);

            // Keep caches synchronized
            idbKeyval.set('af_v57_h', finalMergedHistory).catch(() => {});
            idbKeyval.set('af_v57_r', finalMergedRoutines).catch(() => {});
            idbKeyval.set('af_v57_c', finalMergedCustoms).catch(() => {});
            idbKeyval.set('af_v57_aw', finalMergedActiveWorkout).catch(() => {});

            localStorage.setItem('af_v57_h', JSON.stringify(finalMergedHistory));
            localStorage.setItem('af_v57_r', JSON.stringify(finalMergedRoutines));
            localStorage.setItem('af_v57_c', JSON.stringify(finalMergedCustoms));
            localStorage.setItem('af_v57_aw', JSON.stringify(finalMergedActiveWorkout));
          }

          // Subscribe and listen to changes
          if (active) {
            unsubscribe = onSnapshot(userDocRef, (snapshot) => {
              if (!snapshot.exists()) return;
              if (snapshot.metadata.hasPendingWrites) return;

              const data = snapshot.data();
              try {
                const h = JSON.parse(data.history || '[]');
                const r = JSON.parse(data.routines || '[]');
                let c = JSON.parse(data.customs || '{}');
                const aw = JSON.parse(data.activeWorkout || 'null');

                let finalSnapshotC = c;
                if (!finalSnapshotC || typeof finalSnapshotC !== 'object') {
                  finalSnapshotC = deepClone(INITIAL_LIB);
                } else {
                  const isOldCustoms = !finalSnapshotC["Petto"] || finalSnapshotC["Petto"].length < 5;
                  if (isOldCustoms) {
                    const newLib = deepClone(INITIAL_LIB);
                    Object.keys(finalSnapshotC).forEach(cat => {
                      if (!newLib[cat]) newLib[cat] = [];
                      if (Array.isArray(finalSnapshotC[cat])) {
                        finalSnapshotC[cat].forEach((ex: string) => {
                          if (!newLib[cat].includes(ex)) {
                            newLib[cat].push(ex);
                          }
                        });
                      }
                    });
                    finalSnapshotC = newLib;
                  }
                }

                // Guard against overwriting local storage / state with identical data
                const snapObj = {
                  history: JSON.stringify(h),
                  routines: JSON.stringify(r),
                  customs: JSON.stringify(finalSnapshotC),
                  activeWorkout: JSON.stringify(aw)
                };
                const snapStr = JSON.stringify(snapObj);

                if (lastLoadedData.current === snapStr) {
                  return; // Server/stale cache trigger has identical data, skip
                }

                lastLoadedData.current = snapStr;

                setHistory(h);
                setRoutines(r);
                setCustoms(finalSnapshotC);
                setActiveWorkout(aw);

                // Also keep local storage caches synchronized in real time
                idbKeyval.set('af_v57_h', h).catch(() => {});
                idbKeyval.set('af_v57_r', r).catch(() => {});
                idbKeyval.set('af_v57_c', finalSnapshotC).catch(() => {});
                idbKeyval.set('af_v57_aw', aw).catch(() => {});

                localStorage.setItem('af_v57_h', JSON.stringify(h));
                localStorage.setItem('af_v57_r', JSON.stringify(r));
                localStorage.setItem('af_v57_c', JSON.stringify(finalSnapshotC));
                localStorage.setItem('af_v57_aw', JSON.stringify(aw));
              } catch (err) {
                console.error("Errore nel parsing dell'onSnapshot in tempo reale:", err);
              }
            }, (err) => {
              console.error("Errore onSnapshot:", err);
            });
          }

        } catch (cloudError) {
          console.error("Errore non bloccante durante la connessione a Firestore:", cloudError);
          // Non bloccante: isSyncEnabled remains true and the user continues with IndexedDB local cache!
          // Whenever the internet is recovered, standard Firebase SDK offline queuing handles sync.
        }

      } catch (error) {
        console.error("Errore irreversibile in initAndListen:", error);
        // Fallback robustissimo: l'utente vede almeno una libreria di default se tutto dovesse fallire
        if (active) {
          const fallbackCustoms = deepClone(INITIAL_LIB);
          setCustoms(fallbackCustoms);
          setIsDataLoaded(true);
        }
      }
    };

    initAndListen();

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isAuthReady]);

  // Sync to Firestore when state changes
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (!isSyncEnabled.current) return;

    const currentObj = {
      history: JSON.stringify(history),
      routines: JSON.stringify(routines),
      customs: JSON.stringify(customs),
      activeWorkout: JSON.stringify(activeWorkout)
    };

    const currentStr = JSON.stringify(currentObj);

    if (lastLoadedData.current === currentStr) {
      return;
    }

    const syncData = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), currentObj, { merge: true });
        lastLoadedData.current = currentStr;

        // Also update local cache for robust offline and cross-session support
        await idbKeyval.set('af_v57_h', history);
        await idbKeyval.set('af_v57_r', routines);
        await idbKeyval.set('af_v57_c', customs);
        await idbKeyval.set('af_v57_aw', activeWorkout);

        localStorage.setItem('af_v57_h', JSON.stringify(history));
        localStorage.setItem('af_v57_r', JSON.stringify(routines));
        localStorage.setItem('af_v57_c', JSON.stringify(customs));
        localStorage.setItem('af_v57_aw', JSON.stringify(activeWorkout));
      } catch (error) {
        console.error("Error syncing to firestore & local storage:", error);
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
        if (Array.isArray(exs)) {
            exs.forEach(ex => {
                map[ex.toLowerCase()] = cat;
            });
        }
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
