
import React, { useState } from 'react';
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

const SidebarLink: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`w-full p-4 rounded-xl flex items-center gap-3 font-bold transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Badge: React.FC<{ status: string; label: string; detail: string; onSubstitute?: () => void }> = ({ status, label, detail, onSubstitute }) => {
  const styles = {
    'ATIVO': 'bg-emerald-50 border-emerald-100 text-emerald-800',
    'FALTA': 'bg-red-50 border-red-200 text-red-800',
    'SUBSTITUICAO': 'bg-blue-50 border-blue-100 text-blue-800'
  }[status] || 'bg-slate-50 border-slate-100 text-slate-800';

  const dotColor = {
    'ATIVO': 'bg-emerald-500',
    'FALTA': 'bg-red-500 animate-pulse',
    'SUBSTITUICAO': 'bg-blue-500'
  }[status] || 'bg-slate-400';

  return (
    <div className={`p-3 rounded-[1.25rem] border-2 flex flex-col relative transition-all shadow-sm mb-2 ${styles}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
          <span className="text-[11px] font-black uppercase truncate">
            {status === 'ATIVO' ? 'Confirmado: ' : status === 'SUBSTITUICAO' ? 'Substituto: ' : 'Falta: '}
            {label}
          </span>
        </div>
        {onSubstitute && status === 'FALTA' && (
          <button onClick={onSubstitute} title="Realizar Substituição" className="p-1.5 bg-white text-red-600 rounded-xl shadow-sm hover:bg-red-600 hover:text-white transition-all">
            <Repeat size={12} />
          </button>
        )}
      </div>
      <span className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-wider">{detail}</span>
    </div>
  );
};

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
  
  const [substData, setSubstData] = useState<{
    post: Post;
    date: string;
    shift: ShiftType;
    originalEmp: Employee;
  } | null>(null);

  const [viewDate, setViewDate] = useState(new Date());
  const [planningDate, setPlanningDate] = useState(new Date().toISOString().split('T')[0]);
  const [planningShift, setPlanningShift] = useState<ShiftType>('DAY');

  const recentPatrols = state.attendanceRecords
    .filter(r => r.type === 'RONDA')
    .slice(-15)
    .reverse();

  const onlineStaff = state.posts.map(post => {
    const today = new Date().toISOString().split('T')[0];
    const latestCheckIn = state.attendanceRecords
      .filter(r => r.postId === post.id && r.type === 'CHECK_IN' && r.timestamp.startsWith(today))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    
    const hasCheckOut = latestCheckIn ? state.attendanceRecords.some(r => 
      r.employeeId === latestCheckIn.employeeId && 
      r.postId === post.id && 
      r.type === 'CHECK_OUT' && 
      r.timestamp > latestCheckIn.timestamp
    ) : false;

    if (latestCheckIn && !hasCheckOut) {
      const emp = state.employees.find(e => e.id === latestCheckIn.employeeId);
      return { empName: emp?.name || '?', postName: post.name, time: formatDateTime(latestCheckIn.timestamp).split(',')[1] };
    }
    return null;
  }).filter(Boolean);

  const downloadQRCode = (post: Post) => {
    const link = document.createElement('a');
    link.href = post.qrUrl;
    link.download = `QR-${post.code}-${post.name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQRCode = (post: Post) => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
          <h1 style="margin-bottom:10px;">${post.name}</h1>
          <p style="font-size:24px; font-weight:bold; color:#666; margin-bottom:30px;">CÓDIGO: ${post.code}</p>
          <img src="${post.qrUrl}" style="width:400px; height:400px; border:20px solid white; box-shadow:0 0 20px rgba(0,0,0,0.1);" />
          <p style="margin-top:40px; color:#999;">GuardSystem Pro - Segurança Patrimonial</p>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
      </html>
    `);
    win.document.close();
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
        if (items.length === 0) return '<span style="color:#ccc;">Vago</span>';
        return items.map(s => {
          let style = 'color: #1e293b;';
          let prefix = '';
          if (s.status === 'FALTA') { style = 'color: #dc2626; font-weight: bold;'; prefix = '[FALTA] '; }
          if (s.status === 'SUBSTITUICAO') { style = 'color: #2563eb; font-weight: bold;'; prefix = `[SUBST. ${s.substitutedName || '?'}] `; }
          if (s.status === 'ATIVO') { style = 'color: #059669; font-weight: bold;'; prefix = '[CONFIRMADO] '; }
          return `<div style="margin-bottom:4px; ${style}">${prefix}${s.name}</div>`;
        }).join('');
      };

      tableRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight:bold;">${d}/${viewDate.getMonth() + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${renderShift('DAY')}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${renderShift('NIGHT')}</td>
        </tr>
      `;
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Escala Mensal - ${post.name}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { margin: 0; color: #1e293b; font-size: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 10px; border: 1px solid #ddd; font-size: 11px; vertical-align: top; }
            .footer { margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Escala de Serviço - ${post.name}</h1>
              <div style="font-weight:bold; color:#64748b; margin-top:5px;">Período: ${monthLabel.toUpperCase()}</div>
            </div>
            <div style="text-align:right; font-size:10px; color:#94a3b8;">Gerado em: ${new Date().toLocaleString()}</div>
          </div>
          <table>
            <thead>
              <tr><th style="width:60px">Dia</th><th>Turno Dia</th><th>Turno Noite</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">Documento Oficial - GuardSystem Pro - Controle de Efetivo e Rondas</div>
          <script>setTimeout(() => { window.print(); }, 500);</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const getAttendanceStatus = (postId: string, date: string) => {
    const planned = state.plannedShifts.filter(ps => ps.postId === postId && ps.date === date);
    const actual = state.attendanceRecords.filter(r => r.postId === postId && r.timestamp.startsWith(date));
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
        const subst = actual.find(a => a.type === 'CHECK_IN' && a.status === 'SUBSTITUTION' && a.substitutedEmployeeId === p.employeeId);
        if (subst) {
           const subEmp = state.employees.find(e => e.id === subst.employeeId);
           results.push({
             employeeId: subst.employeeId,
             name: subEmp?.name || 'Substituto',
             status: 'SUBSTITUICAO',
             shift: p.shift,
             substitutedName: emp?.name,
             checkIn: formatDateTime(subst.timestamp).split(',')[1]
           });
        } else {
          results.push({
            employeeId: p.employeeId,
            name: emp?.name || '---',
            status: 'FALTA',
            shift: p.shift
          });
        }
      }
    });

    return results;
  };

  const handleSavePost = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const code = editingPost ? editingPost.code : generatePostCode(fd.get('name') as string);
    const postData = {
      name: fd.get('name') as string,
      latitude: parseFloat(fd.get('latitude') as string),
      longitude: parseFloat(fd.get('longitude') as string),
      altitude: parseFloat(fd.get('altitude') as string) || 0,
      radiusMeters: parseInt(fd.get('radius') as string) || 100,
      minIntervalMinutes: parseInt(fd.get('interval') as string) || 60,
      allowedEmployeeIds: Array.from(fd.getAll('allowedEmployees')) as string[],
      isDayActive: fd.get('isDayActive') === 'on',
      dayStart: fd.get('dayStart') as string,
      dayEnd: fd.get('dayEnd') as string,
      isNightActive: fd.get('isNightActive') === 'on',
      nightStart: fd.get('nightStart') as string,
      nightEnd: fd.get('nightEnd') as string,
    };

    if (editingPost) {
      setState(p => ({ ...p, posts: p.posts.map(x => x.id === editingPost.id ? { ...x, ...postData } : x) }));
    } else {
      const newPost: Post = {
        id: 'p-' + Math.random().toString(36).substr(2, 9),
        ...postData,
        code,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`
      };
      setState(p => ({ ...p, posts: [...p.posts, newPost] }));
    }
    setIsModalOpen(false);
    setEditingPost(null);
  };

  // Fix: Added missing handleDeletePost function
  const handleDeletePost = (id: string) => {
    if (confirm('CUIDADO: Deseja realmente excluir este posto? Todos os registros e escalas vinculados serão removidos.')) {
      setState(st => ({
        ...st,
        posts: st.posts.filter(p => p.id !== id),
        plannedShifts: st.plannedShifts.filter(ps => ps.postId !== id),
        attendanceRecords: st.attendanceRecords.filter(ar => ar.postId !== id)
      }));
    }
  };

  // Fix: Added missing handleManualSubstitution function
  const handleManualSubstitution = (subEmpId: string) => {
    if (!substData) return;
    const newRec: AttendanceRecord = { 
      id: 'subst-' + Math.random().toString(36).substr(2, 9), 
      timestamp: new Date().toISOString(), 
      employeeId: subEmpId, 
      postId: substData.post.id, 
      latitude: substData.post.latitude, 
      longitude: substData.post.longitude, 
      type: 'CHECK_IN', 
      status: 'SUBSTITUTION', 
      substitutedEmployeeId: substData.originalEmp.id, 
      photos: [] 
    };
    setState(p => ({ ...p, attendanceRecords: [...p.attendanceRecords, newRec] }));
    setIsSubstModalOpen(false);
    setSubstData(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-600 rounded-xl"><Shield className="w-8 h-8 text-white" /></div>
            <div>
              <h1 className="font-black text-xl leading-none tracking-tight">ADMIN</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase mt-1">GuardSystem Pro</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-white"><X /></button>
        </div>
        
        <nav className="flex-1 p-6 space-y-3">
          <SidebarLink active={activeTab === 'MONITOR'} onClick={() => { setActiveTab('MONITOR'); setIsSidebarOpen(false); }} icon={<Activity />} label="Monitoramento" />
          <SidebarLink active={activeTab === 'EMPLOYEES'} onClick={() => { setActiveTab('EMPLOYEES'); setIsSidebarOpen(false); }} icon={<Users />} label="Funcionários" />
          <SidebarLink active={activeTab === 'POSTS'} onClick={() => { setActiveTab('POSTS'); setIsSidebarOpen(false); }} icon={<MapPin />} label="Postos & GPS" />
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 text-slate-400 hover:text-white rounded-2xl transition-all font-bold text-sm">
            <ArrowLeft className="w-5 h-5" /> <span>Sair do Painel</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white shadow-sm border rounded-2xl"><Menu /></button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {activeTab === 'MONITOR' ? 'Monitoramento em Tempo Real' : activeTab === 'EMPLOYEES' ? 'Equipe' : 'Unidades Operacionais'}
              </h2>
            </div>
          </div>
          <div className="flex gap-3">
            {activeTab === 'POSTS' && <Button onClick={() => {setEditingPost(null); setIsModalOpen(true);}}><Plus size={18} className="mr-2 inline" /> Novo Posto</Button>}
            {activeTab === 'EMPLOYEES' && <Button onClick={() => {setEditingEmployee(null); setIsModalOpen(true);}}><Plus size={18} className="mr-2 inline" /> Novo Guardião</Button>}
          </div>
        </header>

        {activeTab === 'MONITOR' && (
          <div className="space-y-8">
            {/* NOVO: Funcionários Online Agora */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <Card className="rounded-[2rem] border-blue-100 bg-blue-50/30 flex flex-col justify-center items-center py-8">
                 <div className="p-4 bg-blue-600 rounded-full text-white mb-4 animate-pulse"><Activity size={32} /></div>
                 <div className="text-3xl font-black text-blue-900">{onlineStaff.length}</div>
                 <div className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Guardiões Online</div>
               </Card>
               <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {onlineStaff.map((staff, i) => (
                   <div key={i} className="bg-white p-5 rounded-[1.5rem] border shadow-sm flex items-center gap-4 animate-in slide-in-from-right">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">{staff?.empName.charAt(0)}</div>
                     <div className="overflow-hidden">
                       <p className="text-xs font-black text-slate-900 truncate">{staff?.empName}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{staff?.postName}</p>
                       <div className="flex items-center gap-1 mt-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                         <span className="text-[8px] font-black text-emerald-600 uppercase">Em Plantão desde {staff?.time}</span>
                       </div>
                     </div>
                   </div>
                 ))}
                 {onlineStaff.length === 0 && <div className="col-span-full bg-slate-100/50 rounded-[1.5rem] border border-dashed flex items-center justify-center text-slate-400 font-bold text-xs uppercase italic">Ninguém online no momento</div>}
               </div>
            </div>

            <Card title="Quadro de Escala e Confirmações" className="rounded-[2.5rem] p-0 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50"><tr className="border-b text-slate-400 text-[10px] font-black uppercase tracking-widest"><th className="p-6">Unidade</th><th>🌞 Dia</th><th>🌙 Noite</th><th className="text-right p-6">Ações</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {state.posts.map(post => {
                      const today = new Date().toISOString().split('T')[0];
                      const stats = getAttendanceStatus(post.id, today);
                      return (
                        <tr key={post.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6"><div className="font-black text-slate-900">{post.name}</div><div className="text-[9px] font-mono text-slate-400 uppercase">{post.code}</div></td>
                          <td>{post.isDayActive ? stats.filter(s=>s.shift==='DAY').map((s,i)=><Badge key={i} status={s.status} label={s.name} detail={s.status === 'SUBSTITUICAO' ? `Subst. ${s.substitutedName}` : (s.checkIn ? `Check-In: ${s.checkIn}` : 'Aguardando')} onSubstitute={() => { setSubstData({post, date: today, shift: 'DAY', originalEmp: state.employees.find(e=>e.id===s.employeeId)!}); setIsSubstModalOpen(true); }} />) : <span className="text-[9px] text-slate-200 font-black">---</span>}</td>
                          <td>{post.isNightActive ? stats.filter(s=>s.shift==='NIGHT').map((s,i)=><Badge key={i} status={s.status} label={s.name} detail={s.status === 'SUBSTITUICAO' ? `Subst. ${s.substitutedName}` : (s.checkIn ? `Check-In: ${s.checkIn}` : 'Aguardando')} onSubstitute={() => { setSubstData({post, date: today, shift: 'NIGHT', originalEmp: state.employees.find(e=>e.id===s.employeeId)!}); setIsSubstModalOpen(true); }} />) : <span className="text-[9px] text-slate-200 font-black">---</span>}</td>
                          <td className="p-6 text-right space-x-2">
                             <Button onClick={() => { setSelectedPostForHistory(post); setIsHistoryOpen(true); }} variant="outline" className="text-[9px] px-3 py-1.5">ESCALA</Button>
                             <Button onClick={() => exportPDF(post)} variant="outline" className="text-[9px] px-3 py-1.5 flex items-center gap-1 ml-auto"><Printer size={12}/> PDF</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Atividades Recentes de Ronda" className="rounded-[2.5rem] p-0 overflow-hidden shadow-md">
               <div className="overflow-x-auto"><table className="w-full text-left min-w-[700px]">
                 <thead className="bg-slate-50"><tr className="border-b text-slate-400 text-[10px] font-black uppercase tracking-widest"><th className="p-6">Guardião</th><th>Posto</th><th>Horário</th><th className="text-right p-6">Fotos</th></tr></thead>
                 <tbody className="divide-y">{recentPatrols.map(r => (
                   <tr key={r.id} className="hover:bg-slate-50/50">
                     <td className="p-6 font-bold">{state.employees.find(e => e.id === r.employeeId)?.name}</td>
                     <td>{state.posts.find(p => p.id === r.postId)?.name}</td>
                     <td className="text-xs font-mono">{formatDateTime(r.timestamp).split(',')[1]}</td>
                     <td className="p-6 text-right">{r.photos && r.photos.length > 0 ? (
                       <button onClick={() => setViewPhotosModal(r)} className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 px-4 py-2 rounded-xl"><ImageIcon size={14} /> Ver ({r.photos.length})</button>
                     ) : <span className="text-slate-300 italic text-[10px]">Sem registros</span>}</td>
                   </tr>
                 ))}</tbody>
               </table></div>
            </Card>
          </div>
        )}

        {activeTab === 'POSTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.posts.map(p => (
              <Card key={p.id} className="rounded-[2.5rem] group relative border-2 border-transparent hover:border-blue-100 transition-all">
                <div className="absolute top-6 right-6 flex gap-2">
                  <button onClick={() => { setEditingPost(p); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => handleDeletePost(p.id)} className="p-2.5 bg-slate-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16} /></button>
                </div>
                <div className="mb-6"><h3 className="text-xl font-black text-slate-900">{p.name}</h3><p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-1">Ref: {p.code}</p></div>
                <div className="flex flex-col items-center bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 mb-6 group-hover:bg-white transition-colors">
                   <img src={p.qrUrl} className="w-40 h-40 mb-4" alt="QR" />
                   <div className="flex gap-2 w-full">
                      <button onClick={() => printQRCode(p)} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50"><Printer size={14}/> Imprimir</button>
                      <button onClick={() => downloadQRCode(p)} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50"><Download size={14}/> Baixar</button>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                   <div className={`p-2 rounded-xl text-[9px] font-black uppercase ${p.isDayActive ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-300'}`}>Dia: {p.isDayActive ? p.dayStart : 'OFF'}</div>
                   <div className={`p-2 rounded-xl text-[9px] font-black uppercase ${p.isNightActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>Noite: {p.isNightActive ? p.nightStart : 'OFF'}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* MODAL FOTOS DA RONDA */}
      {viewPhotosModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[300]">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Relatório Fotográfico</h3>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">
                  Operador: {state.employees.find(e => e.id === viewPhotosModal.employeeId)?.name} • {formatDateTime(viewPhotosModal.timestamp)}
                </p>
              </div>
              <button onClick={() => setViewPhotosModal(null)} className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><X size={24}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {viewPhotosModal.photos?.map((photo, idx) => (
                  <div key={idx} className="group relative rounded-[2rem] overflow-hidden shadow-lg border-4 border-white aspect-square bg-slate-200">
                    <img src={photo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Evidência" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBSTITUIÇÃO MANUAL */}
      {isSubstModalOpen && substData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in border-4 border-blue-100">
            <h3 className="text-2xl font-black mb-2 leading-tight text-slate-900">Trocar Guardião</h3>
            <p className="text-slate-400 font-bold text-xs uppercase mb-8 tracking-widest">{substData.post.name} • {substData.shift === 'DAY' ? 'TURNO DIA' : 'TURNO NOITE'}</p>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-300 ml-1">Selecione o Substituto:</label>
              <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {state.employees.filter(e=>e.role==='GUARD' && e.id !== substData.originalEmp.id && substData.post.allowedEmployeeIds.includes(e.id)).map(emp=>(
                  <button key={emp.id} onClick={()=>handleManualSubstitution(emp.id)} className="w-full p-5 text-left bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black hover:border-blue-500 hover:bg-blue-50 transition-all flex justify-between items-center group">
                    <span>{emp.name}</span>
                    <UserCheck className="opacity-0 group-hover:opacity-100 text-blue-600" size={20} />
                  </button>
                ))}
              </div>
            </div>
            <button onClick={()=>setIsSubstModalOpen(false)} className="w-full mt-8 py-4 text-slate-400 font-black text-xs uppercase hover:text-slate-600">Cancelar Operação</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
