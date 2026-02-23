
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
  const [loginMode, setLoginMode] = useState<'GUARDIAN' | 'ADMIN'>('GUARDIAN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing Firebase Auth session (Admin)
    const unsub = authService.onAuthStateChange(async (fUser) => {
      if (fUser) {
        const { guardiaoService } = await import('./services/guardiaoService');
        const profile = await guardiaoService.getGuardiao(fUser.uid);
        if (profile && profile.tipoUsuario === 'Administrador') {
          setUser(profile);
        } else {
          await authService.logout();
        }
      } else {
        // If no Firebase Auth, check for Guardian session in localStorage
        const savedGuardian = localStorage.getItem('guardiao_name');
        if (savedGuardian) {
          try {
            const profile = await authService.validateGuardianByName(savedGuardian);
            setUser(profile);
          } catch (err) {
            localStorage.removeItem('guardiao_name');
          }
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const profile = await authService.login(email, password);
      if (profile.tipoUsuario !== 'Administrador') {
        await authService.logout();
        throw new Error("Acesso restrito a administradores.");
      }
      setUser(profile);
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardianLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const profile = await authService.validateGuardianByName(guardianName);
      setUser(profile);
      localStorage.setItem('guardiao_name', profile.nomeCompleto);
    } catch (err: any) {
      setError(err.message || "Erro ao validar guardião.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    if (user?.tipoUsuario === 'Administrador') {
      await authService.logout();
    } else {
      localStorage.removeItem('guardiao_name');
      setUser(null);
    }
    setLoading(false);
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
          className="max-w-md w-full space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-200">
              <Shield size={48} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter">GuardSystem Pro</h1>
              <p className="text-slate-500 font-medium text-sm">Monitoramento Real-Time</p>
            </div>
          </div>

          <div className="flex p-1 bg-slate-200 rounded-2xl">
            <button 
              onClick={() => { setLoginMode('GUARDIAN'); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${loginMode === 'GUARDIAN' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Guardião
            </button>
            <button 
              onClick={() => { setLoginMode('ADMIN'); setError(null); }}
              className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${loginMode === 'ADMIN' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Admin
            </button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            {loginMode === 'GUARDIAN' ? (
              <form onSubmit={handleGuardianLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      required
                      placeholder="Digite seu nome completo"
                      className="w-full pl-12 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold transition-all"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                    />
                  </div>
                </div>
                <button className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                  ACESSAR PAINEL RONDA
                </button>
              </form>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">E-mail Admin</label>
                    <input 
                      type="email" 
                      required
                      placeholder="admin@empresa.com"
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-bold transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <button className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                  ENTRAR COMO ADMIN
                </button>
              </form>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-3"
              >
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}
          </div>

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
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <GuardiaoApp user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
