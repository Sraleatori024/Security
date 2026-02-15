import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Shield, Lock, User, ArrowLeft, MapPin, QrCode, LogOut, CheckCircle, 
  AlertCircle, Camera, Loader2, Navigation, History, UserCircle, Clock, 
  Keyboard, CheckCircle2, Search, Power, Edit, Sun, Moon, CameraIcon, X,
  Timer, Image as ImageIcon, Users, Activity, Plus, Printer, Trash2, 
  Edit2, XCircle, Save, Calendar, UserPlus, Info, FileText, ChevronLeft, 
  ChevronRight, Repeat, CheckSquare, UserCheck, Settings, Download, Eye, Menu
} from 'lucide-react';

// --- CONSTANTES E BANCO DE DADOS LOCAL ---
const STORAGE_KEY = 'guard_system_v3_db';
const ADMIN_PASSWORD = "Adm!n@2026#Secure";

const INITIAL_DATA = {
  employees: [
    { id: 'admin-0', name: 'Administrador', active: true, role: 'ADMIN' },
    { id: 'e-1', name: 'Pedro Souza', active: true, role: 'GUARD' },
    { id: 'e-2', name: 'Matheus Silva', active: true, role: 'GUARD' },
    { id: 'e-3', name: 'Nicolas Santos', active: true, role: 'GUARD' },
  ],
  posts: [
    {
      id: 'p-1',
      name: 'Posto São Miguel',
      code: 'MIGUEL-QR',
      latitude: -23.5505,
      longitude: -46.6333,
      radiusMeters: 100,
      minIntervalMinutes: 60,
      qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MIGUEL-QR',
      allowedEmployeeIds: ['e-1', 'e-2', 'e-3'],
      dayShiftCapacity: 1,
      nightShiftCapacity: 1
    }
  ],
  plannedShifts: [
    { id: 'ps-1', postId: 'p-1', employeeId: 'e-2', date: new Date().toISOString().split('T')[0], shift: 'DAY' }
  ],
  attendanceRecords: []
};

const db = {
  get: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : INITIAL_DATA;
  },
  save: (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

// --- UTILITÁRIOS ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDateTime = (date: Date | string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date(date));
};

// --- COMPONENTES BASE ---
const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {title && <h3 className="text-lg font-bold mb-4 text-gray-800">{title}</h3>}
    {children}
  </div>
);

const Button: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; variant?: 'primary' | 'danger' | 'success' | 'outline'; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }> = ({ children, onClick, className = "", variant = 'primary', disabled = false, type = 'submit' }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`px-4 py-2 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- APLICATIVO DO FUNCIONÁRIO ---
const EmployeeApp: React.FC<{ state: any; setState: any; onLogout: () => void }> = ({ state, setState, onLogout }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginName, setLoginName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentRondaType, setCurrentRondaType] = useState<any>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Aguardando GPS...'),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const getPreciseLocation = async (retries = 3) => {
    setStatusMessage("Obtendo localização, aguarde...");
    for (let i = 0; i < retries; i++) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        });
        setStatusMessage(null);
        return position;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    throw new Error("GPS Timeout");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = state.employees.find((emp: any) => emp.name.toLowerCase().trim() === loginName.toLowerCase().trim() && emp.active && emp.role === 'GUARD');
    if (found) { setCurrentUser(found); setError(null); } else { setError('Funcionário não cadastrado ou inativo.'); }
  };

  const stopQRCamera = () => {
    if (qrVideoRef.current && qrVideoRef.current.srcObject) {
      const stream = qrVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      qrVideoRef.current.srcObject = null;
    }
  };

  const myAssignedPosts = state.posts.filter((p: any) => currentUser ? p.allowedEmployeeIds.includes(currentUser.id) : false);
  const activeShift = state.attendanceRecords.find((r: any) => currentUser && r.employeeId === currentUser.id && r.type === 'CHECK_IN' && !state.attendanceRecords.some((out: any) => out.employeeId === currentUser.id && out.postId === r.postId && out.type === 'CHECK_OUT' && out.timestamp > r.timestamp));

  const startInteraction = async (type: any, mode: 'QR' | 'MANUAL') => {
    if (!selectedPost && !activeShift) { setError('Selecione uma unidade primeiro.'); return; }
    setError(null); setCameraPermissionError(null); setCurrentRondaType(type);
    if (mode === 'QR') {
      setIsScanning(true);
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (qrVideoRef.current) { qrVideoRef.current.srcObject = stream; qrVideoRef.current.onloadedmetadata = () => qrVideoRef.current?.play().catch(console.error); }
          setTimeout(() => { if (isScanning) finalizeValidation(type, "AUTO_QR"); }, 3000);
        } catch (err) { setCameraPermissionError('Câmera negada. Permita o acesso.'); }
      }, 300);
    } else { setShowManualInput(true); }
  };

  const handleDirectCheckOut = async () => {
    if (!activeShift) return;
    const post = state.posts.find((p: any) => p.id === activeShift.postId);
    setIsLoading(true); setError(null);
    try {
      const pos = await getPreciseLocation();
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, post.latitude, post.longitude);
      if (dist > post.radiusMeters) { setError(`BLOQUEIO GPS: Você está a ${Math.round(dist)}m.`); setIsLoading(false); return; }
      saveRecord('CHECK_OUT', post, pos.coords.latitude, pos.coords.longitude, []);
    } catch (err) { setError('Erro GPS. Verifique e tente novamente.'); }
    finally { setIsLoading(false); setStatusMessage(null); }
  };

  const finalizeValidation = async (type: any, code: string) => {
    const postToVal = activeShift ? state.posts.find((p: any) => p.id === activeShift.postId) : selectedPost;
    let verifiedPost = code === "AUTO_QR" ? postToVal : state.posts.find((p: any) => p.code === code);
    stopQRCamera();
    if (!verifiedPost) { setError('Validação falhou. Código inválido.'); setIsScanning(false); setShowManualInput(false); return; }
    setIsLoading(true); setError(null);
    try {
      const pos = await getPreciseLocation();
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, verifiedPost.latitude, verifiedPost.longitude);
      if (dist > verifiedPost.radiusMeters) { setError(`BLOQUEIO GPS: Distância ${Math.round(dist)}m.`); setIsLoading(false); setIsScanning(false); setShowManualInput(false); return; }
      if (type === 'RONDA') { setIsLoading(false); setIsScanning(false); setShowManualInput(false); setShowPhotoCapture(true); setTimeout(() => startPhotoCamera(), 100); return; }
      saveRecord(type, verifiedPost, pos.coords.latitude, pos.coords.longitude, []);
    } catch (err) { setError('Falha GPS. Tente novamente.'); }
    finally { setIsLoading(false); setIsScanning(false); setShowManualInput(false); setStatusMessage(null); }
  };

  const saveRecord = (type: any, post: any, lat: number, lng: number, photos: string[]) => {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    const shift = (hour >= 6 && hour < 18) ? 'DAY' : 'NIGHT';
    const isPlanned = state.plannedShifts.some((ps: any) => ps.employeeId === currentUser.id && ps.postId === post.id && ps.date === today && ps.shift === shift);
    const newRec = { id: 'att-' + Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), employeeId: currentUser.id, postId: post.id, latitude: lat, longitude: lng, type, status: isPlanned ? 'VALID' : 'SUBSTITUTION', photos };
    setState((p: any) => ({ ...p, attendanceRecords: [...p.attendanceRecords, newRec] }));
    setSuccess(type === 'CHECK_OUT' ? 'Plantão finalizado!' : 'Registro efetuado com sucesso!');
    setShowPhotoCapture(false); setCapturedPhotos([]); stopPhotoCamera(); setTimeout(() => setSuccess(null), 3000);
  };

  const startPhotoCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { setError('Câmera não disponível.'); setShowPhotoCapture(false); }
  };

  const stopPhotoCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const takePhoto = () => {
    if (capturedPhotos.length >= 15) { setError('Limite de 15 fotos atingido.'); return; }
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedPhotos(p => [...p, canvasRef.current!.toDataURL('image/jpeg', 0.6)]);
        setError(null);
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="inline-flex p-6 bg-slate-900 rounded-[2rem] shadow-2xl"><UserCircle className="w-16 h-16 text-white" /></div>
          <h2 className="text-3xl font-black text-slate-900">Portal do Guardião</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Nome Completo" className="w-full p-5 bg-white border-2 rounded-2xl outline-none focus:border-blue-600 font-bold" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            {error && <p className="text-red-500 font-bold text-xs bg-red-50 p-3 rounded-xl">{error}</p>}
            <Button className="w-full py-5 rounded-2xl text-lg font-black">ENTRAR</Button>
            <button type="button" onClick={onLogout} className="text-slate-400 font-bold text-sm">Voltar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <header className="bg-white px-6 pt-10 pb-6 rounded-b-[3rem] shadow-xl border-b sticky top-0 z-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black">{currentUser.name.charAt(0)}</div><div><p className="text-[10px] font-black text-blue-600 uppercase">Guardião Ativo</p><h3 className="text-lg font-black text-slate-800 leading-tight">{currentUser.name}</h3></div></div>
          <button onClick={() => setCurrentUser(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl"><LogOut className="w-5 h-5" /></button>
        </div>
        {activeShift ? (
          <div className="bg-emerald-600 p-5 rounded-[2rem] text-white flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse"><div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]" /></div>
            <div className="flex-1"><p className="text-[9px] font-black uppercase opacity-80">Plantão Ativo desde {activeShift.timestamp.split('T')[1].substr(0,5)}</p><p className="font-black leading-tight truncate">{state.posts.find((p: any) => p.id === activeShift.postId)?.name}</p></div>
          </div>
        ) : <div className="p-4 bg-slate-100 rounded-[2rem] text-slate-400 text-center font-bold text-xs">AGUARDANDO INÍCIO DE PLANTÃO</div>}
      </header>

      <main className="flex-1 p-6 space-y-8">
        {statusMessage && <div className="p-5 bg-blue-50 border-2 border-blue-100 text-blue-700 rounded-2xl font-black text-xs flex items-center gap-3 animate-pulse"><Loader2 className="w-5 h-5 animate-spin" /> {statusMessage}</div>}
        {success && <div className="p-5 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl font-black text-xs flex items-center gap-3"><CheckCircle2 className="w-5 h-5" /> {success}</div>}
        {error && <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 rounded-2xl font-black text-xs flex items-center gap-3 animate-shake"><AlertCircle className="w-5 h-5" /> {error}</div>}

        {isScanning ? (
          <div className="bg-slate-900 rounded-[3rem] aspect-square flex flex-col items-center justify-center text-white relative overflow-hidden border-8 border-slate-800">
            {!cameraPermissionError ? <video ref={qrVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" /> : <p className="p-10 text-center font-bold text-red-400">{cameraPermissionError}</p>}
            <div className="w-48 h-48 border-4 border-emerald-500/50 rounded-2xl relative z-10"><div className="absolute inset-x-0 h-1 bg-emerald-400 animate-scan z-20" /></div>
            <Button onClick={() => { setIsScanning(false); stopQRCamera(); }} className="mt-8 bg-white/10 rounded-xl relative z-10 font-black text-xs">CANCELAR</Button>
          </div>
        ) : showManualInput ? (
          <Card className="rounded-[2.5rem] p-8 text-center animate-in zoom-in-95"><h4 className="text-lg font-black text-slate-900 mb-6">Código da Unidade</h4><input autoFocus type="text" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-center tracking-widest mb-6" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} /><div className="grid grid-cols-2 gap-3"><Button onClick={() => setShowManualInput(false)} variant="outline">VOLTAR</Button><Button onClick={() => finalizeValidation(currentRondaType, manualCode)}>VALIDAR</Button></div></Card>
        ) : showPhotoCapture ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-black text-slate-800 text-xl">FOTOS DA RONDA</h3><span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">{capturedPhotos.length}/15</span></div>
            <div className="bg-black rounded-[2rem] aspect-video relative overflow-hidden border-4"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" /><button disabled={capturedPhotos.length >= 15} onClick={takePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 flex items-center justify-center shadow-2xl active:scale-90"><CameraIcon className="w-8 h-8 text-slate-900" /></button></div>
            <div className="flex gap-2 overflow-x-auto p-4 bg-white rounded-3xl min-h-[100px]">{capturedPhotos.map((p, i) => (<div key={i} className="relative flex-shrink-0"><img src={p} className="w-20 h-20 rounded-xl object-cover border-2 shadow-sm" /><button onClick={() => setCapturedPhotos(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>))}</div>
            {capturedPhotos.length > 0 && <Button onClick={() => saveRecord('RONDA', (activeShift ? state.posts.find((p: any) => p.id === activeShift.postId) : null), location?.lat, location?.lng, capturedPhotos)} className="w-full py-5 rounded-2xl bg-emerald-600 font-black text-lg">ENVIAR RELATÓRIO</Button>}
            <Button onClick={() => {setShowPhotoCapture(false); stopPhotoCamera();}} variant="outline" className="w-full py-3">CANCELAR</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {!activeShift ? (
              <div className="grid gap-4">
                {myAssignedPosts.map((post: any) => (
                  <button key={post.id} onClick={() => setSelectedPost(post)} className={`w-full p-6 rounded-[2.5rem] border-4 text-left transition-all relative ${selectedPost?.id === post.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white shadow-md border-transparent'}`}>
                    <div className="flex justify-between items-center"><h4 className="text-xl font-black text-slate-800">{post.name}</h4><Navigation className={`w-6 h-6 ${selectedPost?.id === post.id ? 'text-blue-600' : 'text-slate-300'}`} /></div>
                  </button>
                ))}
              </div>
            ) : null}
            {(selectedPost || activeShift) && (
              <div className="bg-white p-8 rounded-[3rem] shadow-2xl border space-y-5">
                {!activeShift ? (
                  <>
                    <button onClick={() => startInteraction('CHECK_IN', 'QR')} className="w-full py-8 bg-blue-600 text-white rounded-[2rem] flex flex-col items-center gap-4 font-black"><QrCode className="w-10 h-10" /> ESCANEAR QR POSTO</button>
                    <button onClick={() => startInteraction('CHECK_IN', 'MANUAL')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">DIGITAR CÓDIGO MANUAL</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startInteraction('RONDA', 'QR')} className="w-full py-8 bg-emerald-600 text-white rounded-[2rem] flex flex-col items-center gap-4 font-black shadow-xl"><QrCode className="w-10 h-10" /> INICIAR NOVA RONDA</button>
                    <button disabled={isLoading} onClick={handleDirectCheckOut} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black flex items-center justify-center gap-3"><Power className="w-5 h-5" /> FINALIZAR PLANTÃO HOJE</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// --- PAINEL ADMINISTRATIVO ---
const AdminDashboard: React.FC<{ state: any; setState: any; onLogout: () => void }> = ({ state, setState, onLogout }) => {
  const [activeTab, setActiveTab] = useState('MONITOR');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewPhotosModal, setViewPhotosModal] = useState<any>(null);

  const getStatus = (postId: string, date: string) => {
    const planned = state.plannedShifts.filter((ps: any) => ps.postId === postId && ps.date === date);
    const actual = state.attendanceRecords.filter((r: any) => r.postId === postId && r.timestamp.startsWith(date));
    return planned.map((p: any) => {
      const rec = actual.find((a: any) => a.employeeId === p.employeeId && a.type === 'CHECK_IN');
      return { name: state.employees.find((e: any) => e.id === p.employeeId)?.name, status: rec ? 'ATIVO' : 'FALTA', shift: p.shift };
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 font-black text-xl flex items-center gap-3"><Shield className="text-blue-500" /> ADMIN</div>
        <nav className="p-4 space-y-2 flex-1">
          <button onClick={() => {setActiveTab('MONITOR'); setIsSidebarOpen(false);}} className={`w-full p-4 rounded-xl flex items-center gap-3 font-bold ${activeTab === 'MONITOR' ? 'bg-blue-600' : 'text-slate-400'}`}><Activity size={20} /> Monitoramento</button>
          <button onClick={() => {setActiveTab('EMPLOYEES'); setIsSidebarOpen(false);}} className={`w-full p-4 rounded-xl flex items-center gap-3 font-bold ${activeTab === 'EMPLOYEES' ? 'bg-blue-600' : 'text-slate-400'}`}><Users size={20} /> Funcionários</button>
          <button onClick={() => {setActiveTab('POSTS'); setIsSidebarOpen(false);}} className={`w-full p-4 rounded-xl flex items-center gap-3 font-bold ${activeTab === 'POSTS' ? 'bg-blue-600' : 'text-slate-400'}`}><MapPin size={20} /> Postos</button>
        </nav>
        <div className="p-4"><button onClick={onLogout} className="w-full p-4 text-slate-400 font-bold flex items-center gap-3 hover:text-white transition-all"><LogOut size={20} /> Sair</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
        <header className="flex justify-between items-center"><div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white shadow-sm rounded-xl"><Menu /></button><h2 className="text-2xl md:text-3xl font-black text-slate-900">{activeTab === 'MONITOR' ? 'Gestão de Efetivo' : activeTab === 'EMPLOYEES' ? 'Equipe' : 'Unidades'}</h2></div></header>
        {activeTab === 'MONITOR' && (
          <div className="grid gap-8">
            <Card title="Situação de Hoje" className="overflow-x-auto"><table className="w-full text-left min-w-[700px]"><thead><tr className="border-b text-slate-400 text-[10px] font-black uppercase"><th>Unidade</th><th>Turno Dia</th><th>Turno Noite</th></tr></thead><tbody>{state.posts.map((p: any) => { const st = getStatus(p.id, new Date().toISOString().split('T')[0]); return (<tr key={p.id} className="border-b"><td className="py-4 font-bold">{p.name}</td><td>{st.filter(s=>s.shift==='DAY').map((s: any,i: number)=>(<div key={i} className={`p-2 rounded-lg text-[10px] font-black uppercase mb-1 ${s.status==='FALTA'?'bg-red-50 text-red-800':'bg-emerald-50 text-emerald-800'}`}>{s.name}</div>))}</td><td>{st.filter(s=>s.shift==='NIGHT').map((s: any,i: number)=>(<div key={i} className={`p-2 rounded-lg text-[10px] font-black uppercase mb-1 ${s.status==='FALTA'?'bg-red-50 text-red-800':'bg-emerald-50 text-emerald-800'}`}>{s.name}</div>))}</td></tr>)})}</tbody></table></Card>
            <Card title="Últimas Rondas" className="overflow-x-auto"><table className="w-full text-left min-w-[600px]"><thead><tr className="border-b text-slate-400 text-[10px] font-black uppercase"><th>Guardião</th><th>Unidade</th><th>Hora</th><th>Fotos</th></tr></thead><tbody>{state.attendanceRecords.filter((r: any)=>r.type==='RONDA').slice(-10).reverse().map((r: any)=>(<tr key={r.id} className="border-b"><td className="py-3 font-bold">{state.employees.find((e: any)=>e.id===r.employeeId)?.name}</td><td>{state.posts.find((p: any)=>p.id===r.postId)?.name}</td><td className="text-xs">{formatDateTime(r.timestamp).split(',')[1]}</td><td>{r.photos?.length > 0 ? <button onClick={()=>setViewPhotosModal(r)} className="text-blue-600 font-bold text-xs">Ver {r.photos.length}</button> : '-'}</td></tr>))}</tbody></table></Card>
          </div>
        )}
        {activeTab === 'EMPLOYEES' && <Card><table className="w-full"><thead><tr className="text-left text-xs font-black uppercase"><th>Nome</th><th>Status</th></tr></thead><tbody>{state.employees.map((e: any)=>(<tr key={e.id} className="border-b"><td className="py-4 font-bold">{e.name}</td><td><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${e.active?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{e.active?'Ativo':'Inativo'}</span></td></tr>))}</tbody></table></Card>}
        {activeTab === 'POSTS' && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{state.posts.map((p: any)=>(<Card key={p.id}><div className="flex justify-between items-start"><div><h3 className="text-xl font-black">{p.name}</h3><p className="text-xs text-slate-400">{p.code}</p></div><img src={p.qrUrl} className="w-12 h-12" /></div><div className="mt-4 flex gap-4 text-xs font-bold text-slate-600"><span>GPS: {p.radiusMeters}m</span><span>Ronda: {p.minIntervalMinutes}m</span></div></Card>))}</div>}
      </main>
      {viewPhotosModal && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"><div className="p-6 border-b flex justify-between items-center"><h3 className="font-black">Fotos da Ronda</h3><button onClick={()=>setViewPhotosModal(null)} className="p-2 bg-slate-100 rounded-xl"><X /></button></div><div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 gap-4">{viewPhotosModal.photos?.map((p: string,i: number)=>(<img key={i} src={p} className="rounded-xl border shadow-sm w-full aspect-square object-cover" />))}</div></div></div>
      )}
    </div>
  );
};

// --- APP PRINCIPAL ---
const App = () => {
  const [view, setView] = useState('SELECT');
  const [state, setState] = useState(db.get());
  const [adminPass, setAdminPass] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { db.save(state); }, [state]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === ADMIN_PASSWORD) { setView('ADMIN'); setError(''); } else { setError('Senha incorreta.'); }
  };

  if (view === 'SELECT') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex p-5 bg-blue-600 rounded-3xl shadow-xl"><Shield size={48} color="white" /></div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">GuardSystem Pro</h1>
          <div className="grid gap-4">
            <button onClick={() => setView('EMPLOYEE')} className="p-8 bg-white border-2 rounded-[2.5rem] shadow-sm hover:border-emerald-500 transition-all text-left flex items-center gap-6"><div className="p-4 bg-slate-100 rounded-2xl"><User size={32} /></div><div><h3 className="text-xl font-black">Funcionário</h3><p className="text-sm text-slate-400">Acessar postos e rondas</p></div></button>
            <button onClick={() => setView('ADMIN_LOGIN')} className="p-8 bg-white border-2 rounded-[2.5rem] shadow-sm hover:border-blue-500 transition-all text-left flex items-center gap-6"><div className="p-4 bg-slate-100 rounded-2xl"><Lock size={32} /></div><div><h3 className="text-xl font-black">Administrador</h3><p className="text-sm text-slate-400">Escalas e monitoramento</p></div></button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_LOGIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[2.5rem] p-10 shadow-2xl relative">
          <button onClick={() => setView('SELECT')} className="absolute top-8 left-8 p-2"><ArrowLeft /></button>
          <div className="text-center mb-8"><Lock size={48} className="mx-auto text-blue-600 mb-4" /><h2 className="text-2xl font-black">Acesso Restrito</h2></div>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input type="password" autoFocus placeholder="Senha" className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-blue-600 font-bold" value={adminPass} onChange={e=>setAdminPass(e.target.value)} />
            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
            <Button className="w-full py-4 rounded-2xl font-black">DESBLOQUEAR</Button>
          </form>
        </div>
      </div>
    );
  }

  return view === 'ADMIN' 
    ? <AdminDashboard state={state} setState={setState} onLogout={() => setView('SELECT')} /> 
    : <EmployeeApp state={state} setState={setState} onLogout={() => setView('SELECT')} />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
