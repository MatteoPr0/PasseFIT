import React, { useState, useRef, useEffect } from 'react';
import { useStore } from './hooks/useStore';
import { Icon } from './components/ui/Icon';
import { HomeView } from './views/HomeView';
import { WorkoutView } from './views/WorkoutView';
import { RoutinesView } from './views/RoutinesView';
import { StatsView } from './views/StatsView';
import { LoginView } from './views/LoginView';
import { Modals } from './components/Modals';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const store = useStore();
  const [activeTabState, setActiveTabState] = useState('home');
  const [direction, setDirection] = useState(0);

  const setActiveTab = (newTab: string) => {
    const order = ['home', 'routines', 'stats', 'workout'];
    const currentIndex = order.indexOf(activeTabState);
    const newIndex = order.indexOf(newTab);
    setDirection(newIndex > currentIndex ? 1 : -1);
    setActiveTabState(newTab);
  };

  const activeTab = activeTabState;

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
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200, 100, 400]); 
          playBeep();
          
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('PasseFIT', {
                body: 'Tempo di recupero terminato! Preparati per la prossima serie.',
                icon: '/PasseFIT/pwa-192x192.png',
                vibrate: [200, 100, 200, 100, 200, 100, 400],
                requireInteraction: true
              });
            } catch (e) {
              if (navigator.serviceWorker) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification('PasseFIT', {
                    body: 'Tempo di recupero terminato! Preparati per la prossima serie.',
                    icon: '/PasseFIT/pwa-192x192.png',
                    vibrate: [200, 100, 200, 100, 200, 100, 400],
                    requireInteraction: true
                  });
                });
              }
            }
          }
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [store.activeWorkout?.startTime, isTimerOpen]);

  if (!store.isAuthReady) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 space-y-4">
        <Icon name="loader-2" size={32} className="text-sky-500 animate-spin" />
        <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Caricamento...</div>
      </div>
    );
  }

  if (!store.user) {
    return <LoginView />;
  }

  if (!store.isDataLoaded) {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 space-y-4">
        <Icon name="loader-2" size={32} className="text-sky-500 animate-spin" />
        <div className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Sincronizzazione DB...</div>
      </div>
    );
  }

  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? '150%' : '-150%',
    }),
    in: {
      x: 0,
    },
    out: (direction: number) => ({
      x: direction > 0 ? '-150%' : '150%',
    })
  };

  const pageTransition = {
    type: "tween",
    ease: [0.4, 0.0, 0.2, 1], // Standard material design easing (snappy but smooth)
    duration: 0.35
  };

  return (
    <div className="max-w-md mx-auto min-h-screen px-4 pb-36 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[130vw] h-[130vw] bg-sky-600/[0.08] rounded-full blur-[150px]" />
      </div>
      
      <div className="relative z-10">
        <AnimatePresence mode="popLayout" custom={direction}>
          {activeTab === 'home' && (
            <motion.div key="home" className="w-full" custom={direction} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <HomeView 
                store={store} 
                setActiveTab={setActiveTab} 
                setModal={setModal} 
              />
            </motion.div>
          )}

          {activeTab === 'workout' && store.activeWorkout && (
            <motion.div key="workout" className="w-full" custom={direction} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <WorkoutView 
                store={store} 
                setActiveTab={setActiveTab} 
                setModal={setModal}
                sessionDuration={sessionDuration}
                timerEndTimeRef={timerEndTimeRef}
                setTimerVal={setTimerVal}
                setIsTimerOpen={setIsTimerOpen}
              />
            </motion.div>
          )}

          {activeTab === 'routines' && (
            <motion.div key="routines" className="w-full" custom={direction} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <RoutinesView 
                store={store} 
                setActiveTab={setActiveTab} 
                setModal={setModal} 
              />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div key="stats" className="w-full" custom={direction} initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
              <StatsView 
                store={store} 
                setModal={setModal} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <nav className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-50 transition-transform duration-500 ${activeTab === 'workout' ? 'translate-y-32 opacity-0 pointer-events-none' : ''}`}>
        <div className="bg-[#1C1C21]/90 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
          <motion.div 
            className="absolute top-2 bottom-2 bg-sky-500 rounded-full shadow-md"
            initial={false}
            animate={{
              width: 'calc(33.333% - 5.33px)',
              left: activeTab === 'home' ? '8px' : activeTab === 'routines' ? 'calc(33.333% + 2.66px)' : 'calc(66.666% - 2.66px)'
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button onClick={() => setActiveTab('home')} className={`relative z-10 flex-1 flex justify-center py-3 rounded-full transition-colors ${activeTab === 'home' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}><Icon name="home" size={22} /></button>
          <button onClick={() => setActiveTab('routines')} className={`relative z-10 flex-1 flex justify-center py-3 rounded-full transition-colors ${activeTab === 'routines' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}><Icon name="clipboard-list" size={22} /></button>
          <button onClick={() => setActiveTab('stats')} className={`relative z-10 flex-1 flex justify-center py-3 rounded-full transition-colors ${activeTab === 'stats' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}><Icon name="database" size={22} /></button>
        </div>
      </nav>

      <Modals 
        modal={modal} 
        setModal={setModal} 
        store={store} 
        setActiveTab={setActiveTab} 
      />

      <AnimatePresence>
        {isTimerOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-sky-500 text-white px-6 py-3 rounded-full font-black text-xl shadow-[0_10px_30px_rgba(14,165,233,0.5)] z-[9999] flex items-center gap-3"
          >
            <Icon name="clock" size={20} />
            {Math.floor(timerVal / 60)}:{(timerVal % 60).toString().padStart(2, '0')}
            <button onClick={() => setIsTimerOpen(false)} className="ml-2 bg-white/20 p-1 rounded-full"><Icon name="x" size={16}/></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
