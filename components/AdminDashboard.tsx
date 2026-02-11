
import React, { useState, useRef } from 'react';
import { AppState, Employee, Post, PlannedShift, ShiftType, AttendanceRecord } from '../types';
import { Card, Button } from './Layout';
import { 
  Users, MapPin, Activity, Plus, LogOut, Clock, 
  Printer, Trash2, Edit2, CheckCircle2, 
  XCircle, Save, X, Shield, ArrowLeft, Calendar,
  AlertCircle, UserPlus, Info, Navigation, FileText,
  ChevronLeft, ChevronRight, Sun, Moon, Repeat, CheckSquare, Search, UserCheck,
  History, Settings, Download, QrCode, Eye, Image as ImageIcon, Menu
} from 'lucide-react';
import { formatDateTime, generatePostCode } from '../utils';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ state, setState, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'EMPLOYEES' | 'POSTS'>('MONITOR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubstModalOpen, setIsSubstModalOpen] = useState(false);
  const [viewPhotosModal, setViewPhotosModal] = useState<AttendanceRecord | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedPostForHistory, setSelectedPostForHistory] = useState<Post | null>(null);
  
  const plannerRef = useRef<HTMLDivElement>(null);

  const [substData, setSubstData] = useState<{
    post: Post;
    date: string;
    shift: ShiftType;
    originalEmp: Employee;
  } | null>(null);

  const [viewDate, setViewDate] = useState(new Date());
  const [planningDate, setPlanningDate] = useState(new Date().toISOString().split('T')[0]);
  const [planningShift, setPlanningShift] = useState<ShiftType>('DAY');

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const exportPDF = (post: Post) => {
    const monthLabel = viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    
    let tableRows = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = getAttendanceStatus(post.id, dateStr);
      
      const renderShift = (shift: ShiftType) => {
        const items = status.filter(s => s.shift === shift);
        return items.map(s => {
          let text = s.name;
          if (s.status === 'FALTA') return `<div style="color: #dc2626; font-weight: bold;">${text} (FALTA)</div>`;
          if (s.status === 'SUBSTITUICAO') return `<div style="color: #059669; font-weight: bold;">${text} (SUBST. ${s.substitutedName || '?'})</div>`;
          return `<div style="color: #1e293b;">${text}</div>`;
        }).join('') || '<div style="color: #cbd5e1;">---</div>';
      };

      tableRows += `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; text-align: center;">${d}/${viewDate.getMonth() + 1}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${renderShift('DAY')}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${renderShift('NIGHT')}</td>
        </tr>
      `;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Escala Mensal - ${post.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 5px; }
            h2 { text-align: center; font-size: 16px; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f4f4f4; padding: 10px; border: 1px solid #ccc; font-size: 12px; text-transform: uppercase; }
            td { font-size: 12px; border: 1px solid #ccc; }
            .header-info { margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 5px; font-weight: bold;">IMPRIMIR / SALVAR PDF</button>
          </div>
          <div class="header-info">
            <h1>GUARD SYSTEM PRO - ESCALA MENSAL</h1>
            <h2>Posto: ${post.name} | Período: ${monthLabel}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Dia</th>
                <th>Turno DIA (06:00 - 18:00)</th>
                <th>Turno NOITE (18:00 - 06:00)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <p style="margin-top: 20px; font-size: 10px; text-align: center; color: #999;">Documento gerado automaticamente pelo sistema de gestão de postos GuardSystem Pro.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const deleteEmployee = (id: string) => {
    if (window.confirm('CUIDADO: Deseja realmente excluir este funcionário? Esta ação é irreversível.')) {
      setState(prev => ({
        ...prev,
        employees: prev.employees.filter(e => e.id !== id),
        plannedShifts: prev.plannedShifts.filter(ps => ps.employeeId !== id)
      }));
    }
  };

  const deletePost = (id: string) => {
    if (window.confirm('CUIDADO: Deseja realmente excluir este posto? Todos os registros e escalas vinculados serão removidos.')) {
      setState(prev => ({
        ...prev,
        posts: prev.posts.filter(p => p.id !== id),
        plannedShifts: prev.plannedShifts.filter(ps => ps.postId !== id),
        attendanceRecords: prev.attendanceRecords.filter(ar => ar.postId !== id)
      }));
    }
  };

  const handleManualSubstitution = (substituteEmpId: string) => {
    if (!substData) return;

    const timestamp = substData.shift === 'DAY' 
      ? `${substData.date}T10:00:00.000Z` 
      : `${substData.date}T20:00:00.000Z`;

    const newRecord: AttendanceRecord = {
      id: 'subst-' + Math.random().toString(36).substr(2, 9),
      timestamp: timestamp,
      employeeId: substituteEmpId,
      postId: substData.post.id,
      latitude: substData.post.latitude,
      longitude: substData.post.longitude,
      type: 'CHECK_IN',
      status: 'SUBSTITUTION',
      substitutedEmployeeId: substData.originalEmp.id
    };

    setState(prev => ({
      ...prev,
      attendanceRecords: [...prev.attendanceRecords, newRecord]
    }));

    setIsSubstModalOpen(false);
    setSubstData(null);
  };

  const getAttendanceStatus = (postId: string, date: string) => {
    const planned = state.plannedShifts.filter(ps => ps.postId === postId && ps.date === date);
    const actual = state.attendanceRecords.filter(r => {
      const rDate = r.timestamp.split('T')[0];
      return r.postId === postId && rDate === date;
    });
    
    const results: any[] = [];

    planned.forEach(p => {
      const emp = state.employees.find(e => e.id === p.employeeId);
      const record = actual.find(a => a.employeeId === p.employeeId && a.type === 'CHECK_IN');
      const outRecord = actual.find(a => a.employeeId === p.employeeId && a.type === 'CHECK_OUT');

      if (record) {
        results.push({
          employeeId: p.employeeId,
          name: emp?.name || '---',
          status: 'ATIVO',
          shift: p.shift,
          checkIn: formatDateTime(record.timestamp).split(',')[1],
          checkOut: outRecord ? formatDateTime(outRecord.timestamp).split(',')[1] : undefined
        });
      } else {
        results.push({
          employeeId: p.employeeId,
          name: emp?.name || '---',
          status: 'FALTA',
          shift: p.shift
        });
      }
    });

    const substitutionRecords = actual.filter(r => r.type === 'CHECK_IN' && r.status === 'SUBSTITUTION');
    substitutionRecords.forEach(r => {
      const emp = state.employees.find(e => e.id === r.employeeId);
      const substitutedEmp = state.employees.find(e => e.id === r.substitutedEmployeeId);
      const hour = new Date(r.timestamp).getUTCHours();
      const shift: ShiftType = (hour >= 6 && hour < 18) ? 'DAY' : 'NIGHT';

      results.push({
        employeeId: r.employeeId,
        name: emp?.name || 'Substituto',
        status: 'SUBSTITUICAO',
        shift: shift,
        substitutedName: substitutedEmp?.name,
        substitutedId: r.substitutedEmployeeId,
        checkIn: formatDateTime(r.timestamp).split(',')[1]
      });
    });

    return results;
  };

  const saveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const active = formData.get('active') === 'on';
    
    if (editingEmployee) {
      setState(prev => ({
        ...prev,
        employees: prev.employees.map(emp => emp.id === editingEmployee.id ? { ...emp, name, active } : emp)
      }));
    } else {
      const newEmp: Employee = {
        id: 'e-' + Math.random().toString(36).substr(2, 9),
        name,
        active: true,
        role: 'GUARD'
      };
      setState(prev => ({ ...prev, employees: [...prev.employees, newEmp] }));
    }
    setEditingEmployee(null);
    setIsModalOpen(false);
  };

  const savePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const lat = parseFloat(formData.get('latitude') as string);
    const lng = parseFloat(formData.get('longitude') as string);
    const interval = parseInt(formData.get('interval') as string) || 60;
    const radius = parseInt(formData.get('radius') as string) || 100;
    const dayCap = parseInt(formData.get('dayCapacity') as string) || 1;
    const nightCap = parseInt(formData.get('nightCapacity') as string) || 1;
    const allowed = Array.from(formData.getAll('allowedEmployees')) as string[];

    if (editingPost) {
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => p.id === editingPost.id ? { 
          ...p, name, latitude: lat, longitude: lng, minIntervalMinutes: interval, radiusMeters: radius, allowedEmployeeIds: allowed,
          dayShiftCapacity: dayCap, nightShiftCapacity: nightCap
        } : p)
      }));
    } else {
      const code = generatePostCode(name);
      const newPost: Post = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        name,
        code,
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        minIntervalMinutes: interval,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${code}`,
        allowedEmployeeIds: allowed,
        dayShiftCapacity: dayCap,
        nightShiftCapacity: nightCap
      };
      setState(prev => ({ ...prev, posts: [...prev.posts, newPost] }));
    }
    setEditingPost(null);
    setIsModalOpen(false);
  };

  const recentPatrols = state.attendanceRecords
    .filter(r => r.type === 'RONDA')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 15);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Overlay para fechar sidebar no mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVA */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl transition-transform duration-300 lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none">ADMIN</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">GuardSystem Pro</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <SidebarLink active={activeTab === 'MONITOR'} onClick={() => { setActiveTab('MONITOR'); setIsSidebarOpen(false); }} icon={<Activity className="w-5 h-5" />} label="Monitoramento" />
          <SidebarLink active={activeTab === 'EMPLOYEES'} onClick={() => { setActiveTab('EMPLOYEES'); setIsSidebarOpen(false); }} icon={<Users className="w-5 h-5" />} label="Funcionários" />
          <SidebarLink active={activeTab === 'POSTS'} onClick={() => { setActiveTab('POSTS'); setIsSidebarOpen(false); }} icon={<MapPin className="w-5 h-5" />} label="Postos & Turnos" />
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all font-bold group text-sm">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-3 bg-white shadow-sm border border-slate-100 rounded-2xl text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {activeTab === 'MONITOR' && 'Painel de Gestão'}
                {activeTab === 'EMPLOYEES' && 'Equipe de Guardiões'}
                {activeTab === 'POSTS' && 'Unidades Operacionais'}
              </h2>
              <p className="text-slate-500 font-medium text-sm md:text-base">Controle de Efetivo e Rondas.</p>
            </div>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            {activeTab === 'EMPLOYEES' && (
              <Button onClick={() => { setEditingEmployee(null); setIsModalOpen(true); }} className="w-full sm:w-auto rounded-2xl h-14 px-8 shadow-xl shadow-blue-200">
                <Plus className="w-5 h-5 mr-2 inline" /> Adicionar
              </Button>
            )}
            {activeTab === 'POSTS' && (
              <Button onClick={() => { setEditingPost(null); setIsModalOpen(true); }} className="w-full sm:w-auto rounded-2xl h-14 px-8 shadow-xl shadow-blue-200">
                <Plus className="w-5 h-5 mr-2 inline" /> Cadastrar
              </Button>
            )}
          </div>
        </header>

        {activeTab === 'MONITOR' && (
          <div className="space-y-8 md:space-y-10">
            <Card title="Situação de Hoje" className="rounded-3xl border-0 shadow-sm overflow-hidden p-0 sm:p-6">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="pb-6 pl-4">Posto Operacional</th>
                      <th className="pb-6">🌞 Turno Dia</th>
                      <th className="pb-6">🌙 Turno Noite</th>
                      <th className="pb-6 text-right pr-4">Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {state.posts.map(post => {
                      const today = new Date().toISOString().split('T')[0];
                      const stats = getAttendanceStatus(post.id, today);
                      const dayStats = stats.filter(s => s.shift === 'DAY');
                      const nightStats = stats.filter(s => s.shift === 'NIGHT');
                      
                      return (
                        <tr key={post.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-6 pl-4">
                            <div className="font-bold text-slate-900">{post.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-widest">{post.code}</div>
                          </td>
                          <td className="py-6">
                            <div className="flex flex-col gap-2">
                              {dayStats.map((s, idx) => (
                                <Badge 
                                  key={idx} 
                                  status={s.status} 
                                  label={s.name} 
                                  detail={s.status === 'SUBSTITUICAO' ? `Troca de: ${s.substitutedName || '?'}` : (s.checkIn ? `Entrada: ${s.checkIn}` : '')}
                                  onSubstitute={s.status === 'FALTA' ? () => {
                                    const emp = state.employees.find(e => e.id === s.employeeId);
                                    if (emp) {
                                      setSubstData({ post, date: today, shift: 'DAY', originalEmp: emp });
                                      setIsSubstModalOpen(true);
                                    }
                                  } : undefined}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-6">
                            <div className="flex flex-col gap-2">
                              {nightStats.map((s, idx) => (
                                <Badge 
                                  key={idx} 
                                  status={s.status} 
                                  label={s.name} 
                                  detail={s.status === 'SUBSTITUICAO' ? `Troca de: ${s.substitutedName || '?'}` : (s.checkIn ? `Entrada: ${s.checkIn}` : '')}
                                  onSubstitute={s.status === 'FALTA' ? () => {
                                    const emp = state.employees.find(e => e.id === s.employeeId);
                                    if (emp) {
                                      setSubstData({ post, date: today, shift: 'NIGHT', originalEmp: emp });
                                      setIsSubstModalOpen(true);
                                    }
                                  } : undefined}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="py-6 text-right pr-4">
                            <Button 
                              onClick={() => { setSelectedPostForHistory(post); setIsHistoryOpen(true); }}
                              variant="outline" 
                              className="text-[10px] font-black uppercase py-2 px-4 rounded-xl flex items-center gap-2 ml-auto whitespace-nowrap"
                            >
                              <History className="w-3.5 h-3.5" /> Escala
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Últimas Rondas Realizadas" className="rounded-3xl border-0 shadow-sm overflow-hidden p-0 sm:p-6">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="pb-6 pl-4">Funcionário</th>
                      <th className="pb-6">Posto</th>
                      <th className="pb-6">Data/Hora</th>
                      <th className="pb-6">Status</th>
                      <th className="pb-6 text-right pr-4">Fotos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentPatrols.map(patrol => {
                      const emp = state.employees.find(e => e.id === patrol.employeeId);
                      const post = state.posts.find(p => p.id === patrol.postId);
                      return (
                        <tr key={patrol.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 pl-4 font-bold text-slate-900">{emp?.name || '---'}</td>
                          <td className="py-4 text-slate-600 font-medium">{post?.name || '---'}</td>
                          <td className="py-4 text-slate-500 text-xs font-mono uppercase">{formatDateTime(patrol.timestamp)}</td>
                          <td className="py-4">
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">RONDA FEITA</span>
                          </td>
                          <td className="py-4 text-right pr-4">
                            {patrol.photos && patrol.photos.length > 0 ? (
                              <button 
                                onClick={() => setViewPhotosModal(patrol)}
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap"
                              >
                                <ImageIcon className="w-4 h-4" /> Visualizar ({patrol.photos.length})
                              </button>
                            ) : <span className="text-slate-300 text-[10px] italic">Sem fotos</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {recentPatrols.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400 italic">Nenhuma ronda registrada recentemente.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'POSTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {state.posts.map(post => (
              <Card key={post.id} className="p-6 md:p-8 group relative rounded-3xl border-0 shadow-sm hover:shadow-md transition-shadow">
                <div className="absolute top-6 right-6 flex gap-2">
                  <button onClick={() => { setEditingPost(post); setIsModalOpen(true); }} className="p-2 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deletePost(post.id)} className="p-2 bg-slate-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">{post.name}</h3>
                      <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">{post.code}</p>
                    </div>
                    <div className="p-2 bg-white border rounded-xl shadow-sm shrink-0">
                       <img src={post.qrUrl} alt="QR Code Posto" className="w-12 h-12 md:w-16 md:h-16" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                      <Sun className="w-4 h-4 text-amber-500 mx-auto mb-2" />
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">Turno Dia</p>
                      <p className="text-base md:text-lg font-black text-amber-900">{post.dayShiftCapacity} Vaga(s)</p>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 text-center">
                      <Moon className="w-4 h-4 text-blue-400 mx-auto mb-2" />
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Turno Noite</p>
                      <p className="text-base md:text-lg font-black text-white">{post.nightShiftCapacity} Vaga(s)</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                     <div className="text-center flex-1 border-r border-slate-200">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Raio GPS</p>
                        <p className="text-sm font-bold text-slate-700">{post.radiusMeters}m</p>
                     </div>
                     <div className="text-center flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Min. Ronda</p>
                        <p className="text-sm font-bold text-slate-700">{post.minIntervalMinutes}m</p>
                     </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'EMPLOYEES' && (
          <Card className="rounded-3xl border-0 shadow-sm overflow-hidden p-0">
             <div className="overflow-x-auto custom-scrollbar">
               <table className="w-full text-left min-w-[600px]">
                 <thead className="bg-slate-50 border-b border-slate-100">
                   <tr className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                     <th className="p-6">Funcionário</th>
                     <th className="p-6">Vínculo</th>
                     <th className="p-6">Acesso</th>
                     <th className="p-6 text-right">Ações</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {state.employees.map(emp => (
                     <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="p-6 font-bold text-slate-900">{emp.name}</td>
                       <td className="p-6 text-xs font-medium text-slate-500">{emp.role === 'ADMIN' ? 'Administrador' : 'Segurança'}</td>
                       <td className="p-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {emp.active ? 'Habilitado' : 'Bloqueado'}
                          </span>
                       </td>
                       <td className="p-6 text-right space-x-2 whitespace-nowrap">
                         <button onClick={() => { setEditingEmployee(emp); setIsModalOpen(true); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                           <Edit2 className="w-4 h-4" />
                         </button>
                         {emp.id !== 'admin-0' && (
                           <button onClick={() => deleteEmployee(emp.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </Card>
        )}
      </main>

      {/* MODAL CONFIGURAÇÃO: POSTOS / FUNCIONÁRIOS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="text-xl md:text-2xl font-black text-slate-900">
                {activeTab === 'EMPLOYEES' ? 'Ficha Funcional' : 'Configurar Unidade'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 md:p-3 hover:bg-slate-100 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <form onSubmit={activeTab === 'EMPLOYEES' ? saveEmployee : savePost} className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome Completo</label>
                <input name="name" defaultValue={activeTab === 'EMPLOYEES' ? editingEmployee?.name : editingPost?.name} required className="w-full p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 font-bold" />
              </div>

              {activeTab === 'POSTS' && (
                <div className="space-y-6">
                  <div className="flex justify-center bg-slate-50 p-4 md:p-6 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Pré-visualização do QR Code</p>
                      {editingPost ? (
                        <img src={editingPost.qrUrl} alt="QR Code" className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-xl shadow-md border-4 border-white" />
                      ) : (
                        <div className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-slate-100 rounded-xl flex items-center justify-center border-2 border-slate-200">
                          <QrCode className="w-12 h-12 text-slate-200" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Latitude</label>
                      <input name="latitude" type="number" step="any" defaultValue={editingPost?.latitude} required className="p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Longitude</label>
                      <input name="longitude" type="number" step="any" defaultValue={editingPost?.longitude} required className="p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1">Raio GPS (m)</label>
                      <input name="radius" type="number" defaultValue={editingPost?.radiusMeters || 100} required className="p-4 md:p-5 bg-blue-50/30 border-2 border-blue-100 rounded-2xl font-bold w-full outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Min. Ronda (min)</label>
                      <input name="interval" type="number" defaultValue={editingPost?.minIntervalMinutes || 60} required className="p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold w-full" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Guardiões Autorizados</label>
                    <div className="max-h-48 overflow-y-auto border-2 border-slate-50 rounded-2xl p-4 bg-slate-50 space-y-2 custom-scrollbar">
                      {state.employees.filter(e => e.role === 'GUARD').map(emp => (
                        <label key={emp.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-300 group">
                          <span className="text-sm font-bold text-slate-700 group-hover:text-blue-700">{emp.name}</span>
                          <input type="checkbox" name="allowedEmployees" value={emp.id} defaultChecked={editingPost?.allowedEmployeeIds.includes(emp.id)} className="w-5 h-5 rounded-lg border-2 text-blue-600" />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="sticky bottom-0 bg-white pt-4 shrink-0">
                 <Button className="w-full py-4 md:py-5 rounded-2xl font-black text-base md:text-lg shadow-xl shadow-blue-200 uppercase tracking-widest">Salvar Registro</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUBSTITUIÇÃO MANUAL */}
      {isSubstModalOpen && substData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900">Troca de Efetivo</h3>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                  Posto: {substData.post.name} • Data: {substData.date}
                </p>
              </div>
              <button onClick={() => { setIsSubstModalOpen(false); setSubstData(null); }} className="p-2 md:p-3 bg-white shadow-sm rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
               <div className="p-5 md:p-6 bg-red-50 rounded-[2.5rem] border border-red-100 flex items-center gap-4 md:gap-6">
                 <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-red-500 shrink-0" />
                 <div>
                   <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Substituindo Ausência de</p>
                   <h4 className="text-lg md:text-xl font-black text-red-900">{substData.originalEmp.name}</h4>
                 </div>
               </div>

               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">1. Escolher Turno</label>
                 <div className="flex flex-wrap p-1.5 bg-slate-100 rounded-2xl w-fit">
                    <button onClick={() => setSubstData({...substData, shift: 'DAY'})} className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-[10px] md:text-xs uppercase flex items-center gap-3 transition-all ${substData.shift === 'DAY' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>
                      <Sun className="w-4 h-4" /> Dia
                    </button>
                    <button onClick={() => setSubstData({...substData, shift: 'NIGHT'})} className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-black text-[10px] md:text-xs uppercase flex items-center gap-3 transition-all ${substData.shift === 'NIGHT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                      <Moon className="w-4 h-4" /> Noite
                    </button>
                 </div>
               </div>

               <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">2. Escolher Guardião</label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                   {state.employees
                    .filter(e => e.role === 'GUARD' && e.id !== substData.originalEmp.id && substData.post.allowedEmployeeIds.includes(e.id))
                    .map(subst => (
                      <button 
                        key={subst.id}
                        onClick={() => handleManualSubstitution(subst.id)}
                        className="p-4 md:p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 text-left transition-all group flex items-center justify-between"
                      >
                        <span className="font-bold text-slate-800 text-sm md:text-base">{subst.name}</span>
                        <UserCheck className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAÇÃO DE FOTOS DA RONDA */}
      {viewPhotosModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[300]">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 md:p-8 border-b flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900">Relatório de Ronda</h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                  Operador: {state.employees.find(e => e.id === viewPhotosModal.employeeId)?.name} • {formatDateTime(viewPhotosModal.timestamp)}
                </p>
              </div>
              <button onClick={() => setViewPhotosModal(null)} className="p-3 md:p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X className="w-6 h-6 md:w-7 md:h-7" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50">
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                 {viewPhotosModal.photos?.map((photo, idx) => (
                   <div key={idx} className="group relative rounded-2xl overflow-hidden shadow-lg border-4 border-white aspect-square bg-slate-200">
                      <img src={photo} alt={`Ronda ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                         <span className="text-white text-[10px] font-black uppercase">Foto {idx + 1} de {viewPhotosModal.photos?.length}</span>
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESCALA MENSAL */}
      {isHistoryOpen && selectedPostForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-6xl shadow-2xl h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 md:p-8 border-b flex flex-col sm:flex-row justify-between items-center bg-slate-900 text-white shrink-0 gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-center sm:text-left">Relatório Mensal</h3>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1 text-center sm:text-left">{selectedPostForHistory.name}</p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
                <Button onClick={() => exportPDF(selectedPostForHistory)} className="bg-white text-slate-900 hover:bg-slate-100 border-0 rounded-xl px-4 md:px-6 py-2 text-sm flex items-center gap-2">
                  <Printer className="w-4 h-4" /> PDF
                </Button>
                <button onClick={() => setIsHistoryOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"><X className="w-6 h-6 text-white" /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 md:space-y-12 bg-slate-50 custom-scrollbar">
              <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 scroll-mt-10">
                 <div className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-10 gap-4 border-b border-slate-100 pb-8">
                   <h4 className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
                     <UserPlus className="w-6 h-6 md:w-8 md:h-8 text-blue-500" /> Planejador
                   </h4>
                   <div className="flex flex-wrap items-center justify-center gap-4">
                     <input type="date" value={planningDate} onChange={(e) => setPlanningDate(e.target.value)} className="p-3 md:p-4 bg-slate-100 rounded-2xl border-0 font-bold text-slate-700 text-sm outline-none" />
                     <div className="flex p-1 bg-slate-100 rounded-2xl">
                       <button onClick={() => setPlanningShift('DAY')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-black text-[10px] md:text-[11px] uppercase flex items-center gap-2 ${planningShift === 'DAY' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>
                         <Sun className="w-3 md:w-4 h-3 md:h-4" /> Dia
                       </button>
                       <button onClick={() => setPlanningShift('NIGHT')} className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-black text-[10px] md:text-[11px] uppercase flex items-center gap-2 ${planningShift === 'NIGHT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>
                         <Moon className="w-3 md:w-4 h-3 md:h-4" /> Noite
                       </button>
                     </div>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                   {state.employees.filter(e => e.role === 'GUARD' && selectedPostForHistory.allowedEmployeeIds.includes(e.id)).map(emp => {
                     const isPlanned = state.plannedShifts.some(ps => ps.employeeId === emp.id && ps.postId === selectedPostForHistory.id && ps.date === planningDate && ps.shift === planningShift);
                     return (
                       <button 
                        key={emp.id}
                        onClick={() => {
                          const existing = state.plannedShifts.find(ps => ps.postId === selectedPostForHistory.id && ps.employeeId === emp.id && ps.date === planningDate && ps.shift === planningShift);
                          if (existing) {
                            setState(prev => ({ ...prev, plannedShifts: prev.plannedShifts.filter(ps => ps.id !== existing.id) }));
                          } else {
                            const newShift: PlannedShift = { id: 'ps-' + Math.random().toString(36).substr(2, 9), postId: selectedPostForHistory.id, employeeId: emp.id, date: planningDate, shift: planningShift };
                            setState(prev => ({ ...prev, plannedShifts: [...prev.plannedShifts, newShift] }));
                          }
                        }}
                        className={`p-4 md:p-5 rounded-[1.5rem] border-2 text-[10px] md:text-xs font-black transition-all text-left flex justify-between items-center ${
                          isPlanned ? (planningShift === 'DAY' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md') : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                       >
                          <span className="truncate mr-2">{emp.name}</span>
                          {isPlanned ? <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5" /> : <Plus className="w-3 md:w-4 h-3 md:h-4 opacity-30" />}
                       </button>
                     );
                   })}
                 </div>
              </section>

              <section className="space-y-6 md:space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <h4 className="font-black text-xl md:text-2xl text-slate-800 flex items-center gap-3">
                    <Calendar className="w-6 md:w-8 h-6 md:h-8 text-emerald-500" /> Histórico
                  </h4>
                  <div className="flex items-center gap-3 md:gap-4 bg-white p-2 md:p-3 rounded-2xl shadow-sm border border-slate-100">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronLeft className="w-5 md:w-6 h-5 md:h-6" /></button>
                    <span className="text-xs md:text-sm font-black uppercase tracking-widest text-slate-700 min-w-[150px] md:min-w-[180px] text-center">
                      {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><ChevronRight className="w-5 md:w-6 h-5 md:h-6" /></button>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-xl">
                   <div className="overflow-x-auto custom-scrollbar">
                     <table className="w-full text-left min-w-[600px]">
                       <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                         <tr>
                           <th className="p-6">Dia</th>
                           <th className="p-6">🌞 Turno Dia</th>
                           <th className="p-6">🌙 Turno Noite</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const daily = getAttendanceStatus(selectedPostForHistory.id, dateStr);
                            
                            return (
                              <tr key={dateStr} className="hover:bg-slate-50/50">
                                 <td className="p-6 font-black text-slate-400 bg-slate-50/50">{day}/{viewDate.getMonth() + 1}</td>
                                 <td className="p-6 bg-amber-50/10">
                                   <div className="flex flex-col gap-2">
                                     {daily.filter(s => s.shift === 'DAY').map((s, idx) => (
                                       <div key={idx} className={`p-3 rounded-xl border-2 text-[10px] md:text-[11px] font-bold flex items-center justify-between ${s.status === 'FALTA' ? 'bg-red-50 text-red-600 border-red-100' : s.status === 'SUBSTITUICAO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                                         <span>{s.name} {s.status === 'FALTA' && <span className="text-[8px] ml-1 bg-red-100 px-1.5 py-0.5 rounded opacity-70">AUSENTE</span>}</span>
                                         {s.status === 'SUBSTITUICAO' && <span className="text-[8px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg shadow-sm">TROCA</span>}
                                       </div>
                                     ))}
                                   </div>
                                 </td>
                                 <td className="p-6 bg-indigo-50/10">
                                   <div className="flex flex-col gap-2">
                                     {daily.filter(s => s.shift === 'NIGHT').map((s, idx) => (
                                       <div key={idx} className={`p-3 rounded-xl border-2 text-[10px] md:text-[11px] font-bold flex items-center justify-between ${s.status === 'FALTA' ? 'bg-red-50 text-red-600 border-red-100' : s.status === 'SUBSTITUICAO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-900 text-white border-slate-800 shadow-sm'}`}>
                                         <span>{s.name} {s.status === 'FALTA' && <span className="text-[8px] ml-1 bg-red-600 text-white px-1.5 py-0.5 rounded opacity-70">AUSENTE</span>}</span>
                                         {s.status === 'SUBSTITUICAO' && <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-lg shadow-sm">TROCA</span>}
                                       </div>
                                     ))}
                                   </div>
                                 </td>
                              </tr>
                            );
                         })}
                       </tbody>
                     </table>
                   </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};

const Badge: React.FC<{ status: string; label: string; detail?: string; onSubstitute?: () => void }> = ({ status, label, detail, onSubstitute }) => (
  <div className={`p-3 md:p-4 rounded-[1.5rem] border-2 flex flex-col relative transition-all shadow-sm ${
    status === 'ATIVO' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' :
    status === 'FALTA' ? 'bg-red-50 border-red-200 text-red-800' :
    'bg-blue-50 border-blue-100 text-blue-800'
  }`}>
    <div className="flex items-center justify-between gap-2 md:gap-3">
      <div className="flex items-center gap-2 overflow-hidden">
        <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0 ${status === 'ATIVO' ? 'bg-emerald-500' : status === 'FALTA' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
        <span className="text-[10px] md:text-[11px] font-black uppercase truncate">{label}</span>
      </div>
      {onSubstitute && (
        <button 
          onClick={onSubstitute}
          className="p-1.5 md:p-2 bg-white text-red-600 rounded-xl shadow-md hover:bg-red-600 hover:text-white transition-all flex-shrink-0 border-red-100 border"
          title="Lançar Troca Manual"
        >
          <Repeat className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      )}
    </div>
    <span className={`text-[8px] md:text-[10px] font-bold opacity-70 mt-1 uppercase tracking-wider ${status === 'FALTA' ? 'text-red-700 font-black animate-pulse' : ''}`}>
      {detail || (status === 'FALTA' ? 'PONTO NÃO BATIDO' : '')}
    </span>
  </div>
);

const SidebarLink: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 md:p-5 rounded-[1.5rem] transition-all font-bold tracking-tight ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

export default AdminDashboard;
