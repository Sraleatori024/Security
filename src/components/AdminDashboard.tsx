
import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, MapPin, Package, Activity, LogOut, 
  Plus, Search, Filter, Download, Printer, Trash2, 
  Edit2, CheckCircle2, XCircle, AlertCircle, 
  ChevronRight, Eye, FileText, PackagePlus, History,
  TrendingDown, UserCheck, Clock, Map as MapIcon,
  Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Guardiao, Posto, Material, Entrega, Ronda } from '../types';
import { guardiaoService } from '../services/guardiaoService';
import { postoService } from '../services/postoService';
import { materialService } from '../services/materialService';
import { entregaService } from '../services/entregaService';
import { rondaService } from '../services/rondaService';
import { authService } from '../services/authService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import UniformsMaterialsModule from './uniforms/UniformsMaterialsModule';

const AdminDashboard: React.FC<{ user: Guardiao; onLogout: () => void }> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'GUARDIOES' | 'POSTOS' | 'MATERIAIS' | 'ENTREGAS' | 'RONDAS'>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data States
  const [guardioes, setGuardioes] = useState<Guardiao[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [activeRondas, setActiveRondas] = useState<Ronda[]>([]);

  useEffect(() => {
    const unsubGuardioes = guardiaoService.subscribeToGuardioes(setGuardioes);
    const unsubPostos = postoService.subscribeToPostos(setPostos);
    const unsubMateriais = materialService.subscribeToMateriais(setMateriais);
    const unsubEntregas = entregaService.subscribeToEntregas(setEntregas);
    const unsubRondas = rondaService.subscribeToActiveRondas(setActiveRondas);

    return () => {
      unsubGuardioes();
      unsubPostos();
      unsubMateriais();
      unsubEntregas();
      unsubRondas();
    };
  }, []);

  const stats = {
    totalGuardioes: guardioes.filter(g => g.status === 'Ativo').length,
    onlineGuardioes: activeRondas.length,
    totalMateriais: materiais.length,
    lowStock: materiais.filter(m => m.quantidadeDisponivel <= m.quantidadeMinima).length,
    pendingEntregas: entregas.filter(e => e.statusEntrega === 'Pendente').length
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-800 flex items-center gap-4">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl leading-none tracking-tight">ADMIN</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">GuardSystem Pro</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<Activity />} label="Dashboard" />
          <NavItem active={activeTab === 'GUARDIOES'} onClick={() => setActiveTab('GUARDIOES')} icon={<Users />} label="Guardiões" />
          <NavItem active={activeTab === 'POSTOS'} onClick={() => setActiveTab('POSTOS')} icon={<MapPin />} label="Postos" />
          <NavItem active={activeTab === 'MATERIAIS'} onClick={() => setActiveTab('MATERIAIS')} icon={<Package />} label="Estoque" />
          <NavItem active={activeTab === 'ENTREGAS'} onClick={() => setActiveTab('ENTREGAS')} icon={<PackagePlus />} label="Entregas" />
          <NavItem active={activeTab === 'RONDAS'} onClick={() => setActiveTab('RONDAS')} icon={<History />} label="Rondas" />
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-4 text-slate-400 hover:text-white rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" /> <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 custom-scrollbar">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white shadow-sm border rounded-2xl">
              <Menu />
            </button>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {activeTab === 'DASHBOARD' && "Visão Geral"}
              {activeTab === 'GUARDIOES' && "Gestão de Guardiões"}
              {activeTab === 'POSTOS' && "Unidades Operacionais"}
              {activeTab === 'MATERIAIS' && "Controle de Estoque"}
              {activeTab === 'ENTREGAS' && "Controle de Entregas"}
              {activeTab === 'RONDAS' && "Histórico de Rondas"}
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900">{user.nomeCompleto}</p>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Administrador</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black">
              {user.nomeCompleto.charAt(0)}
            </div>
          </div>
        </header>

        {activeTab === 'DASHBOARD' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={<Users />} label="Guardiões Ativos" value={stats.totalGuardioes} color="blue" />
              <StatCard icon={<Activity />} label="Online Agora" value={stats.onlineGuardioes} color="emerald" pulse />
              <StatCard icon={<Package />} label="Itens em Estoque" value={stats.totalMateriais} color="slate" />
              <StatCard icon={<TrendingDown />} label="Estoque Baixo" value={stats.lowStock} color="amber" />
              <StatCard icon={<Clock />} label="Entregas Pendentes" value={stats.pendingEntregas} color="indigo" />
            </div>

            {/* Real-Time Monitoring */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-slate-900">Monitoramento em Tempo Real</h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Live Updates
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {activeRondas.map(ronda => (
                      <div key={ronda.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                            {ronda.guardiaoNome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{ronda.guardiaoNome}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posto: {ronda.postoNome}</p>
                            <div className="flex gap-1 mt-2">
                              {ronda.photos.slice(0, 3).map((photo, i) => (
                                <img key={i} src={photo} className="w-8 h-8 rounded-lg object-cover border border-slate-200" alt="Ronda" />
                              ))}
                              {ronda.photos.length > 3 && (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400">
                                  +{ronda.photos.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Início</p>
                            <p className="text-xs font-bold text-slate-900">{new Date(ronda.horarioInicio).toLocaleTimeString()}</p>
                          </div>
                          <a 
                            href={`https://www.google.com/maps?q=${ronda.latitudeInicio},${ronda.longitudeInicio}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-white text-blue-600 rounded-xl shadow-sm border border-slate-100 hover:bg-blue-600 hover:text-white transition-all"
                          >
                            <MapIcon size={18} />
                          </a>
                        </div>
                      </div>
                    ))}
                    {activeRondas.length === 0 && (
                      <div className="py-12 text-center text-slate-400 font-bold text-sm uppercase italic border-2 border-dashed border-slate-100 rounded-[2rem]">
                        Nenhum guardião online no momento
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-black text-slate-900 mb-6">Alertas de Estoque</h3>
                  <div className="space-y-4">
                    {materiais.filter(m => m.quantidadeDisponivel <= m.quantidadeMinima).map(m => (
                      <div key={m.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                          <TrendingDown size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-amber-900 text-sm">{m.nomeMaterial}</p>
                          <p className="text-[10px] font-black text-amber-600 uppercase">Restam apenas {m.quantidadeDisponivel} unidades</p>
                        </div>
                      </div>
                    ))}
                    {materiais.filter(m => m.quantidadeDisponivel <= m.quantidadeMinima).length === 0 && (
                      <div className="py-8 text-center text-slate-300 font-bold text-xs uppercase italic">
                        Estoque em níveis normais
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'UNIFORMS' && (
          <UniformsMaterialsModule />
        )}

        {activeTab === 'POSTOS' && (
          <PostosManager postos={postos} guardioes={guardioes} />
        )}

        {activeTab === 'GUARDIOES' && (
          <GuardioesManager guardioes={guardioes} postos={postos} />
        )}

        {activeTab === 'RONDAS' && (
          <RondasHistory />
        )}
      </main>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`
      w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all
      ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
    `}
  >
    <div className={`${active ? 'text-white' : 'text-slate-500'}`}>{icon}</div>
    <span>{label}</span>
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; pulse?: boolean }> = ({ icon, label, value, color, pulse }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100'
  };

  return (
    <div className={`p-6 rounded-[2rem] border-2 bg-white shadow-sm flex flex-col items-center text-center space-y-3 ${colors[color]}`}>
      <div className={`p-3 rounded-2xl bg-white shadow-sm ${pulse ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">{label}</p>
      </div>
    </div>
  );
};

const PostosManager: React.FC<{ postos: Posto[], guardioes: Guardiao[] }> = ({ postos, guardioes }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosto, setEditingPosto] = useState<Posto | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      nomePosto: fd.get('nomePosto') as string,
      latitude: parseFloat(fd.get('latitude') as string),
      longitude: parseFloat(fd.get('longitude') as string),
      descricao: fd.get('descricao') as string,
      guardioesAutorizados: Array.from(fd.getAll('guardioes')) as string[],
      manualCode: Math.floor(1000 + Math.random() * 9000).toString(),
      dataCadastro: new Date().toISOString()
    };

    if (editingPosto) {
      await postoService.updatePosto(editingPosto.id, data);
    } else {
      await postoService.createPosto(data);
    }
    setIsModalOpen(false);
  };

  const printQR = (posto: Posto) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center; padding: 40px;">
          <h1 style="font-size: 32px; margin-bottom: 10px;">${posto.nomePosto}</h1>
          <p style="color: #64748b; margin-bottom: 30px;">ID: ${posto.id}</p>
          <img src="${posto.qrUrl}" style="width: 400px; height: 400px; border: 20px solid white; box-shadow: 0 0 20px rgba(0,0,0,0.1);" />
          <div style="margin-top: 40px;">
            <p style="font-weight: bold; font-size: 24px;">CÓDIGO MANUAL: ${posto.manualCode}</p>
            <p style="color: #94a3b8; font-size: 14px; margin-top: 10px;">LAT: ${posto.latitude} | LONG: ${posto.longitude}</p>
          </div>
          <p style="margin-top: 60px; color: #cbd5e1;">GuardSystem Pro - Monitoramento Real-Time</p>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">Gestão de Unidades</h3>
        <button onClick={() => { setEditingPosto(null); setIsModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg">
          <Plus size={18} /> Novo Posto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {postos.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 group relative overflow-hidden">
            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingPosto(p); setIsModalOpen(true); }} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16} /></button>
              <button onClick={() => postoService.deletePosto(p.id)} className="p-2 bg-slate-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
            </div>
            <h4 className="text-xl font-black text-slate-900 mb-2">{p.nomePosto}</h4>
            <p className="text-xs text-slate-400 mb-6 uppercase font-bold tracking-widest">{p.descricao}</p>
            
            <div className="flex flex-col items-center bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 mb-6">
              <img src={p.qrUrl} className="w-32 h-32 mb-4" alt="QR" />
              <button onClick={() => printQR(p)} className="text-[10px] font-black text-blue-600 flex items-center gap-2 hover:underline">
                <Printer size={14} /> IMPRIMIR QR CODE
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Guardiões Autorizados</p>
              <div className="flex flex-wrap gap-1">
                {p.guardioesAutorizados.map((g, i) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-bold">{g}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">{editingPosto ? 'Editar Posto' : 'Novo Posto'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Posto</label>
                  <input required name="nomePosto" defaultValue={editingPosto?.nomePosto} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Latitude</label>
                    <input required name="latitude" type="number" step="any" defaultValue={editingPosto?.latitude} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Longitude</label>
                    <input required name="longitude" type="number" step="any" defaultValue={editingPosto?.longitude} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descrição</label>
                  <textarea name="descricao" defaultValue={editingPosto?.descricao} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold h-24" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Autorizar Guardiões</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                    {guardioes.map(g => (
                      <label key={g.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all shadow-sm">
                        <input type="checkbox" name="guardioes" value={g.id} defaultChecked={editingPosto?.guardioesAutorizados.includes(g.id)} className="w-5 h-5 rounded-lg text-blue-600" />
                        <span className="text-xs font-bold truncate text-slate-700">{g.nomeCompleto}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
                  SALVAR POSTO E GERAR QR
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const GuardioesManager: React.FC<{ guardioes: Guardiao[]; postos: Posto[] }> = ({ guardioes, postos }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuardiao, setEditingGuardiao] = useState<Guardiao | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const selectedPostos = Array.from(fd.getAll('postos')) as string[];
    
    const data = {
      nomeCompleto: fd.get('nomeCompleto') as string,
      QRA: fd.get('QRA') as string,
      email: fd.get('email') as string,
      telefone: fd.get('telefone') as string,
      status: (fd.get('status') as 'Ativo' | 'Inativo') || 'Ativo',
      tipoUsuario: 'Guardião' as const,
      postosAutorizados: selectedPostos,
      dataCadastro: editingGuardiao?.dataCadastro || new Date().toISOString()
    };

    if (editingGuardiao) {
      await guardiaoService.updateGuardiao(editingGuardiao.id, data);
    } else {
      await guardiaoService.createGuardiao(Math.random().toString(36).substr(2, 9), data);
    }
    setIsModalOpen(false);
    setEditingGuardiao(null);
  };

  const toggleStatus = async (g: Guardiao) => {
    const newStatus = g.status === 'Ativo' ? 'Inativo' : 'Ativo';
    await guardiaoService.updateGuardiao(g.id, { status: newStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-slate-900">Gestão de Guardiões</h3>
        <button onClick={() => { setEditingGuardiao(null); setIsModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg">
          <Plus size={18} /> Novo Guardião
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <th className="p-8">Guardião</th>
              <th>QRA</th>
              <th>Status</th>
              <th>Postos</th>
              <th className="p-8 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {guardioes.map(g => (
              <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 font-black">{g.nomeCompleto.charAt(0)}</div>
                    <div>
                      <p className="font-black text-slate-900 text-lg">{g.nomeCompleto}</p>
                      <p className="text-[10px] text-slate-400">{g.email}</p>
                    </div>
                  </div>
                </td>
                <td className="font-bold text-blue-600">{g.QRA || '---'}</td>
                <td>
                  <button 
                    onClick={() => toggleStatus(g)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${g.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                  >
                    {g.status}
                  </button>
                </td>
                <td>
                  <p className="text-xs font-bold text-slate-600">{g.postosAutorizados?.length || 0} postos</p>
                </td>
                <td className="p-8 text-right">
                  <button onClick={() => { setEditingGuardiao(g); setIsModalOpen(true); }} className="p-3 text-slate-400 hover:text-blue-600 transition-all"><Edit2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">{editingGuardiao ? 'Editar Guardião' : 'Novo Guardião'}</h3>
                <button onClick={() => { setIsModalOpen(false); setEditingGuardiao(null); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
                    <input required name="nomeCompleto" defaultValue={editingGuardiao?.nomeCompleto} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">QRA</label>
                    <input name="QRA" defaultValue={editingGuardiao?.QRA} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">E-mail</label>
                    <input required name="email" type="email" defaultValue={editingGuardiao?.email} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Telefone</label>
                    <input required name="telefone" defaultValue={editingGuardiao?.telefone} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status</label>
                  <select name="status" defaultValue={editingGuardiao?.status || 'Ativo'} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Autorizar Postos</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                    {postos.map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all shadow-sm">
                        <input type="checkbox" name="postos" value={p.id} defaultChecked={editingGuardiao?.postosAutorizados?.includes(p.id)} className="w-5 h-5 rounded-lg text-blue-600" />
                        <span className="text-xs font-bold truncate text-slate-700">{p.nomePosto}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-slate-800 transition-all">
                  {editingGuardiao ? 'ATUALIZAR PERFIL' : 'CADASTRAR PERFIL'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RondasHistory: React.FC = () => {
  const [rondas, setRondas] = useState<Ronda[]>([]);
  useEffect(() => {
    // In a real app, we'd have a service for all history, but for now we use active + some logic
    // Or just subscribe to the rondas collection
    const unsub = rondaService.subscribeToActiveRondas((active) => {
      // This is just a placeholder for the history tab
    });
    return () => unsub();
  }, []);

  return (
    <div className="bg-white rounded-[2.5rem] p-12 text-center space-y-6 border border-slate-100 shadow-sm">
      <div className="p-6 bg-slate-50 rounded-[2rem] w-fit mx-auto">
        <History className="w-16 h-16 text-slate-300" />
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900">Histórico Consolidado</h3>
        <p className="text-slate-500 mt-2">Visualize todos os registros de rondas e presenças passadas.</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
