
import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, User, ArrowLeft, Loader2, 
  AlertCircle, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { authService } from './services/authService';
import { Guardiao } from './types';
import AdminDashboard from './components/AdminDashboard';
import GuardiaoApp from './components/GuardiaoApp';

const App: React.FC = () => {
  const [user, setUser] = useState<Guardiao | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = authService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await authService.login(firebaseUser.email!, ""); // This is a placeholder, real login happens in handleLogin
          // Actually, onAuthStateChange should just fetch the profile if user exists
        } catch (err) {
          // If profile fetch fails, logout
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Improved Auth State Sync
    const syncProfile = async () => {
      const firebaseUser = authService.onAuthStateChange(async (fUser) => {
        if (fUser) {
          const { guardiaoService } = await import('./services/guardiaoService');
          const profile = await guardiaoService.getGuardiao(fUser.uid);
          if (profile) setUser(profile);
          setLoading(false);
        } else {
          setUser(null);
          setLoading(false);
        }
      });
    };
    syncProfile();

    return () => {};
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const profile = await authService.login(email, password);
      setUser(profile);
    } catch (err: any) {
      setError("Credenciais inválidas ou erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Iniciando GuardSystem Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full space-y-12"
        >
          <div className="text-center space-y-6">
            <div className="inline-flex p-6 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-200">
              <Shield size={64} className="text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">GuardSystem Pro</h1>
              <p className="text-slate-500 mt-4 font-medium">Monitoramento Real-Time & Gestão Patrimonial</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="bg-white p-10 rounded-[3.5rem] shadow-xl border border-slate-100 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">E-mail de Acesso</label>
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@empresa.com"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Senha</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-3">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              disabled={loading}
              className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "AUTENTICANDO..." : "ENTRAR NO SISTEMA"}
            </button>
          </form>

          <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            © 2026 GuardSystem Pro • Segurança de Elite
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {user.tipoUsuario === 'Administrador' ? (
        <AdminDashboard user={user} />
      ) : (
        <GuardiaoApp user={user} />
      )}
    </div>
  );
};

export default App;
