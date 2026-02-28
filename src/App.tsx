import React, { useState, useRef, useEffect } from 'react';
import { useStore } from './hooks/useStore';
import { Icon } from './components/ui/Icon';
import { HomeView } from './views/HomeView';
import { WorkoutView } from './views/WorkoutView';
import { RoutinesView } from './views/RoutinesView';
import { StatsView } from './views/StatsView';
import { Modals } from './components/Modals';

export default function App() {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState<any>({ type: null });
  const [sessionDuration, setSessionDuration] = useState("00:00:00");
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [timerVal, setTimerVal] = useState(0);
  const timerEndTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const playBeep = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch(e) {}
    };

    const interval = setInterval(() => {
      if (store.activeWorkout && store.activeWorkout.startTime) {
        const diff = Date.now() - store.activeWorkout.startTime;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setSessionDuration(`${h}:${m}:${s}`);
      }
      if (isTimerOpen && timerEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - Date.now()) / 1000));
        setTimerVal(remaining);
        if (remaining <= 0) { 
          setIsTimerOpen(false); 
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]); 
          playBeep();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [store.activeWorkout?.startTime, isTimerOpen]);

  if (!store.isDataLoaded) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 space-y-4">
        <Icon name="loader-2" size={32} className="text-indigo-500 animate-spin" />
        <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Sincronizzazione DB...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen px-4 pb-36">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[130vw] h-[130vw] bg-indigo-600/[0.08] rounded-full blur-[150px]" />
      </div>
      
      <div className="relative z-10 pt-8">
        {activeTab === 'home' && (
          <HomeView 
            store={store} 
            setActiveTab={setActiveTab} 
            setModal={setModal} 
          />
        )}

        {activeTab === 'workout' && store.activeWorkout && (
          <WorkoutView 
            store={store} 
            setActiveTab={setActiveTab} 
            setModal={setModal}
            sessionDuration={sessionDuration}
            timerEndTimeRef={timerEndTimeRef}
            setTimerVal={setTimerVal}
            setIsTimerOpen={setIsTimerOpen}
          />
        )}

        {activeTab === 'routines' && (
          <RoutinesView 
            store={store} 
            setActiveTab={setActiveTab} 
            setModal={setModal} 
          />
        )}

        {activeTab === 'stats' && (
          <StatsView 
            store={store} 
            setModal={setModal} 
          />
        )}
      </div>
      
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50 transition-transform duration-500 ${activeTab === 'workout' ? 'translate-y-32 opacity-0 pointer-events-none' : ''}`}>
        <div className="bg-[#1C1C21]/90 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <button onClick={() => setActiveTab('home')} className={`flex-1 flex justify-center py-3 rounded-full transition-all ${activeTab === 'home' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500'}`}><Icon name="home" size={22} /></button>
          <button onClick={() => setActiveTab('routines')} className={`flex-1 flex justify-center py-3 rounded-full transition-all ${activeTab === 'routines' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500'}`}><Icon name="clipboard-list" size={22} /></button>
          <button onClick={() => setActiveTab('stats')} className={`flex-1 flex justify-center py-3 rounded-full transition-all ${activeTab === 'stats' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500'}`}><Icon name="database" size={22} /></button>
        </div>
      </nav>

      <Modals 
        modal={modal} 
        setModal={setModal} 
        store={store} 
        setActiveTab={setActiveTab} 
      />

      {isTimerOpen && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-6 py-3 rounded-full font-black text-xl shadow-[0_10px_30px_rgba(99,102,241,0.5)] z-[9999] flex items-center gap-3 animate-in slide-in-from-top-10">
          <Icon name="clock" size={20} />
          {Math.floor(timerVal / 60)}:{(timerVal % 60).toString().padStart(2, '0')}
          <button onClick={() => setIsTimerOpen(false)} className="ml-2 bg-white/20 p-1 rounded-full"><Icon name="x" size={16}/></button>
        </div>
      )}
    </div>
  );
}
