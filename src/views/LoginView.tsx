import React from 'react';
import { Icon } from '../components/ui/Icon';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export const LoginView = () => {
  const [error, setError] = React.useState('');

  const handleLogin = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Errore durante il login:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setError(`Dominio non autorizzato. Devi aggiungere "${window.location.hostname}" ai domini autorizzati nella console di Firebase (Authentication > Settings > Authorized domains).`);
      } else {
        setError(`Errore: ${error.message || "Riprova più tardi."}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 bg-sky-500/20 rounded-full flex items-center justify-center mb-4 relative">
          <div className="absolute inset-0 bg-sky-500/20 rounded-full animate-ping" />
          <Icon name="dumbbell" size={48} className="text-sky-400 relative z-10" />
        </div>
        <h1 className="text-[3rem] font-black tracking-tight text-white leading-none">PasseFIT</h1>
        <p className="text-gray-400 font-bold max-w-xs">Accedi per salvare i tuoi allenamenti in cloud e sincronizzarli su tutti i tuoi dispositivi.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-xl text-center text-sm font-bold">{error}</div>}
        <button 
          onClick={handleLogin}
          className="w-full bg-white text-black py-4 rounded-full font-black uppercase text-[14px] flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
        >
          <Icon name="log-in" size={20} />
          Accedi con Google
        </button>
      </div>
    </div>
  );
};
