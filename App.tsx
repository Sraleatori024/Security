
import React, { useState, useEffect } from 'react';
import { db } from './services/storage';
import { AppState, Employee } from './types';
import AdminDashboard from './components/AdminDashboard';
import EmployeeApp from './components/EmployeeApp';
import { Shield, Lock, User, ArrowLeft } from 'lucide-react';

const ADMIN_PASSWORD = "Adm!n@2026#Secure";

const App: React.FC = () => {
  const [view, setView] = useState<'SELECT' | 'ADMIN_LOGIN' | 'ADMIN' | 'EMPLOYEE'>('SELECT');
  const [state, setState] = useState<AppState>(db.get());
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    db.save(state);
  }, [state]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === ADMIN_PASSWORD) {
      setView('ADMIN');
      setError('');
      setAdminPass('');
    } else {
      setError('Senha incorreta. Acesso negado.');
    }
  };

  const goBackToSelect = () => {
    setView('SELECT');
    setError('');
    setAdminPass('');
  };

  if (view === 'SELECT') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <div className="inline-flex p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200 mb-4">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">GuardSystem Pro</h1>
            <p className="text-slate-500 mt-2 font-medium">Controle de Rondas e Efetivo</p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => setView('EMPLOYEE')}
              className="group p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left shadow-sm"
            >
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-100 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                  <User className="w-8 h-8 text-slate-600 group-hover:text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Sou Funcionário</h3>
                  <p className="text-slate-500 text-sm">Acessar meus postos e registrar rondas</p>
                </div>
              </div>
            </button>

            <button 
              onClick={() => setView('ADMIN_LOGIN')}
              className="group p-6 bg-white border-2 border-slate-100 rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left shadow-sm"
            >
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-100 rounded-2xl group-hover:bg-blue-100 transition-colors">
                  <Lock className="w-8 h-8 text-slate-600 group-hover:text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Administrador</h3>
                  <p className="text-slate-500 text-sm">Gerenciar postos, escalas e monitoramento</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_LOGIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl p-8 shadow-2xl relative">
          <button 
            onClick={goBackToSelect}
            className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center mb-8 pt-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm">Apenas para gestores autorizados</p>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Senha do Sistema</label>
              <input 
                type="password" 
                autoFocus
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all font-mono"
                placeholder="••••••••••••"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
            <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200">
              Desbloquear Painel
            </button>
            <button 
              type="button" 
              onClick={goBackToSelect}
              className="w-full text-slate-400 text-sm font-medium hover:text-slate-600 mt-2"
            >
              Voltar ao Início
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {view === 'ADMIN' ? (
        <AdminDashboard state={state} setState={setState} onLogout={goBackToSelect} />
      ) : (
        <EmployeeApp state={state} setState={setState} onLogout={goBackToSelect} />
      )}
    </div>
  );
};

export default App;
