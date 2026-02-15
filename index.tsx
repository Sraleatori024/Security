
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Shield, Lock, User, ArrowLeft, MapPin, QrCode, LogOut, CheckCircle, 
  AlertCircle, Camera, Loader2, Navigation, History, UserCircle, Clock, 
  Keyboard, CheckCircle2, Search, Power, Edit, Sun, Moon, CameraIcon, X,
  Timer, Image as ImageIcon, Users, Activity, Plus, Printer, Trash2, 
  Edit2, XCircle, Save, Calendar, UserPlus, Info, FileText, ChevronLeft, 
  ChevronRight, Repeat, CheckSquare, UserCheck, Settings, Download, Eye, Menu,
  Coffee
} from 'lucide-react';

// --- CONSTANTES ---
const STORAGE_KEY = 'guard_system_pro_v4';
const ADMIN_PASSWORD = "Adm!n@2026#Secure";

// --- DADOS INICIAIS ---
const INITIAL_DATA = {
  employees: [
    { id: 'admin-0', name: 'Administrador', active: true, role: 'ADMIN' },
    { id: 'e-1', name: 'Pedro Souza', active: true, role: 'GUARD' },
    { id: 'e-2', name: 'Matheus Silva', active: true, role: 'GUARD' },
    { id: 'e-3', name: 'Nicolas Santos (Nico)', active: true, role: 'GUARD' },
    { id: 'e-4', name: 'Paulo Oliveira', active: true, role: 'GUARD' },
  ],
  posts: [
    {
      id: 'p-1',
      name: 'Posto São Miguel',
      code: 'MIGUEL-QR',
      latitude: -23.5505,
      longitude: -46.6333,
      altitude: 760,
      radiusMeters: 100,
      minIntervalMinutes: 60,
      qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MIGUEL-QR',
      allowedEmployeeIds: ['e-1', 'e-2', 'e-3', 'e-4'],
      morningActive: true, morningStart: "07:00", morningEnd: "15:00",
      afternoonActive: false, afternoonStart: "15:00", afternoonEnd: "23:00",
      nightActive: true, nightStart: "23:00", nightEnd: "07:00"
    }
  ],
  plannedShifts: [
    { id: 'ps-1', postId: 'p-1', employeeId: 'e-2', date: new Date().toISOString().split('T')[0], shift: 'MORNING' }
  ],
  attendanceRecords: []
};

// --- DB SERVICE ---
const db = {
  get: () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : INITIAL_DATA;
  },
  save: (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};

// --- UTILS ---
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

const generatePostCode = (name: string) => {
  const prefix = name.substring(0, 4).toUpperCase().replace(/\s/g, '');
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
};

const printAnyQRCode = (qrUrl: string, name: string, code: string) => {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html>
      <head><title>Imprimir QR Code - ${name}</title></head>
      <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; text-align:center;">
        <h1 style="font-size: 24px; margin-bottom: 5px;">${name}</h1>
        <p style="font-size: 18px; color: #666; margin-bottom: 20px;">Código: ${code}</p>
        <img src="${qrUrl}" style="width: 350px; height: 350px; border: 1px solid #ccc; padding: 10px;" />
        <p style="margin-top: 20px; font-size: 12px; color: #999;">Aproxime a câmera do aplicativo para validar.</p>
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
      </body>
    </html>
  `);
  win.document.close();
};

// --- COMPONENTS ---
const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
    {title && <h3 className="text-lg font-black mb-4 text-gray-800">{title}</h3>}
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

// --- SUB-APP: FUNCIONÁRIO ---
const EmployeeApp: React.FC<{ state: any, setState: any, onLogout: () => void }> = ({ state, setState, onLogout }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginName, setLoginName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string[]>([]);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  const [pendingRondaPost, setPendingRondaPost] = useState<any>(null);
  const [pendingRondaLocation, setPendingRondaLocation] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentRondaType, setCurrentRondaType] = useState<any>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = state.employees.find((emp: any) => emp.name.toLowerCase().trim() === loginName.toLowerCase().trim() && emp.active && emp.role === 'GUARD');
    if (found) { setCurrentUser(found); setError(null); } else { setError('Funcionário não cadastrado ou inativo.'); }
  };

  const getPreciseLocation = async (retries = 3) => {
    setStatusMessage(["Obtendo localização GPS..."]);
    for (let i = 0; i < retries; i++) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
        });
        
        setStatusMessage(prev => [
          ...prev, 
          `Latitude: ${position.coords.latitude.toFixed(6)}`, 
          `Longitude: ${position.coords.longitude.toFixed(6)}`,
          "Validando raio permitido..."
        ]);
        
        return position;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    throw new Error("GPS Error");
  };

  const stopQRCamera = () => {
    if (qrVideoRef.current && qrVideoRef.current.srcObject) {
      (qrVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      qrVideoRef.current.srcObject = null;
    }
  };

  const activeShift = state.attendanceRecords.find((r: any) => currentUser && r.employeeId === currentUser.id && r.type === 'CHECK_IN' && !state.attendanceRecords.some((out: any) => out.employeeId === currentUser.id && out.postId === r.postId && out.type === 'CHECK_OUT' && out.timestamp > r.timestamp));

  const startInteraction = async (type: any, mode: 'QR' | 'MANUAL') => {
    if (!selectedPost && !activeShift) { setError('Selecione uma unidade operacional primeiro.'); return; }
    setError(null); 
    setCurrentRondaType(type);
    
    if (mode === 'QR') {
      setIsScanning(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        
        if (qrVideoRef.current) { 
          qrVideoRef.current.srcObject = stream; 
          qrVideoRef.current.setAttribute("playsinline", "true");
          qrVideoRef.current.play(); 
        }

        setTimeout(() => { 
          if (isScanning) {
            finalizeValidation(type, "AUTO_QR"); 
          }
        }, 4000);
      } catch (err) { 
        setError('Erro ao acessar câmera. Verifique as permissões do seu celular.'); 
        setIsScanning(false); 
      }
    } else { 
      setShowManualInput(true); 
    }
  };

  const finalizeValidation = async (type: any, code: string) => {
    const postToVal = activeShift ? state.posts.find((p: any) => p.id === activeShift.postId) : selectedPost;
    let verifiedPost = code === "AUTO_QR" ? postToVal : state.posts.find((p: any) => p.code === code);
    
    stopQRCamera();
    
    if (!verifiedPost) { 
      setError('CÓDIGO INVÁLIDO. Tente novamente.'); 
      setIsScanning(false); 
      setShowManualInput(false); 
      return; 
    }

    setIsLoading(true);
    try {
      const pos = await getPreciseLocation();
      const dist = calculateDistance(pos.coords.latitude, pos.coords.longitude, verifiedPost.latitude, verifiedPost.longitude);
      
      if (dist > verifiedPost.radiusMeters) { 
        setError(`ACESSO BLOQUEADO: Fora do raio permitido (${Math.round(dist)}m do posto).`); 
        setIsLoading(false); 
        setIsScanning(false); 
        setStatusMessage([]);
        return; 
      }
      
      if (type === 'RONDA') { 
        setPendingRondaPost(verifiedPost);
        setPendingRondaLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude || 0
        });
        setIsLoading(false); 
        setIsScanning(false); 
        setShowManualInput(false); 
        setShowPhotoCapture(true); 
        setStatusMessage([]);
        setTimeout(() => startPhotoCamera(), 100); 
        return; 
      }
      
      saveRecord(type, verifiedPost, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude || 0, []);
    } catch (err) { 
      setError('Sinal GPS insuficiente. Certifique-se que o GPS está ativo.'); 
    } finally { 
      setIsLoading(false); 
      setIsScanning(false); 
      setShowManualInput(false); 
      setStatusMessage([]);
    }
  };

  const saveRecord = (type: any, post: any, lat: number, lng: number, alt: number, photos: string[]) => {
    if (!post) return;
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    let currentShift: any = 'NIGHT';
    if (hour >= 7 && hour < 15) currentShift = 'MORNING';
    else if (hour >= 15 && hour < 23) currentShift = 'AFTERNOON';

    const isPlanned = state.plannedShifts.some((ps: any) => ps.employeeId === currentUser.id && ps.postId === post.id && ps.date === today && ps.shift === currentShift);
    
    const newRec = { 
      id: 'att-' + Math.random().toString(36).substr(2, 9), 
      timestamp: new Date().toISOString(), 
      employeeId: currentUser.id, 
      postId: post.id, 
      latitude: lat, 
      longitude: lng, 
      altitude: alt,
      type, 
      status: isPlanned ? 'VALID' : 'SUBSTITUTION', 
      substitutedEmployeeId: !isPlanned ? (state.plannedShifts.find((ps: any) => ps.postId === post.id && ps.date === today && ps.shift === currentShift)?.employeeId) : undefined,
      photos 
    };

    setState((p: any) => ({ ...p, attendanceRecords: [...p.attendanceRecords, newRec] }));
    setSuccess(type === 'RONDA' ? 'Ronda enviada com sucesso!' : 'Presença confirmada!'); 
    setShowPhotoCapture(false); 
    setCapturedPhotos([]); 
    setPendingRondaPost(null);
    setPendingRondaLocation(null);
    stopPhotoCamera(); 
    setTimeout(() => setSuccess(null), 3000);
  };

  const startPhotoCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { setError('Falha ao abrir câmera para fotos.'); setShowPhotoCapture(false); }
  };

  const stopPhotoCamera = () => { if (videoRef.current && videoRef.current.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; } };

  const takePhoto = () => {
    if (capturedPhotos.length >= 15) return;
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      setCapturedPhotos(p => [...p, canvasRef.current!.toDataURL('image/jpeg', 0.6)]);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="inline-flex p-6 bg-slate-900 rounded-[2rem] shadow-2xl"><UserCircle className="w-16 h-16 text-white" /></div>
          <h2 className="text-3xl font-black text-slate-900">Portal do Guardião</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Seu Nome Completo" className="w-full p-5 bg-white border-2 rounded-2xl outline-none focus:border-blue-600 font-bold" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            {error && <p className="text-red-500 font-bold text-xs bg-red-50 p-3 rounded-xl">{error}</p>}
            <Button className="w-full py-5 rounded-2xl text-lg font-black">ENTRAR NO SISTEMA</Button>
            <button type="button" onClick={onLogout} className="text-slate-400 font-bold text-sm">Voltar ao Início</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24 bg-slate-50">
      <header className="bg-white px-6 pt-10 pb-6 rounded-b-[3rem] shadow-xl border-b sticky top-0 z-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl font-black">{currentUser.name.charAt(0)}</div><div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">● Guardião Online</p><h3 className="text-lg font-black text-slate-800 leading-tight">{currentUser.name}</h3></div></div>
          <button onClick={() => setCurrentUser(null)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
        {activeShift ? (
          <div className="bg-emerald-600 p-5 rounded-[2rem] text-white flex items-center gap-4 shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse"><div className="w-3 h-3 bg-white rounded-full shadow-[0_0_8px_white]" /></div>
            <div className="flex-1"><p className="text-[9px] font-black uppercase opacity-80 tracking-widest">Plantão Ativo desde {activeShift.timestamp.split('T')[1].substr(0,5)}</p><p className="font-black leading-tight truncate">{state.posts.find((p: any) => p.id === activeShift.postId)?.name}</p></div>
          </div>
        ) : <div className="p-4 bg-slate-100 rounded-[2rem] text-slate-400 text-center font-bold text-xs border border-dashed border-slate-300 uppercase tracking-widest">Aguardando Início de Serviço</div>}
      </header>

      <main className="flex-1 p-6 space-y-6">
        {statusMessage.length > 0 && (
          <div className="p-6 bg-blue-600 text-white rounded-[2rem] font-bold text-sm space-y-1 shadow-xl animate-in fade-in zoom-in">
            <div className="flex items-center gap-3 mb-2"><Loader2 className="w-5 h-5 animate-spin" /> <span className="uppercase tracking-widest text-xs font-black">Status GPS Obrigatório</span></div>
            {statusMessage.map((msg, i) => <p key={i} className="text-[11px] opacity-90 border-l-2 border-white/30 pl-3 py-0.5">{msg}</p>)}
          </div>
        )}
        {success && <div className="p-5 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-2xl font-black text-sm flex items-center gap-3 animate-in slide-in-from-top"><CheckCircle2 className="w-6 h-6" /> {success}</div>}
        {error && <div className="p-5 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl font-black text-sm flex items-center gap-3 animate-shake"><AlertCircle className="w-6 h-6" /> {error}</div>}

        {isScanning ? (
           <div className="bg-slate-900 rounded-[3rem] aspect-square flex flex-col items-center justify-center text-white relative overflow-hidden border-8 border-slate-800 shadow-2xl">
             <video ref={qrVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-90" />
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30">
               <div className="w-56 h-56 border-4 border-emerald-500/80 rounded-2xl relative shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                 <div className="absolute inset-x-0 h-1 bg-emerald-400 animate-scan shadow-[0_0_15px_#10b981] z-20" />
               </div>
               <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] bg-black/60 px-4 py-2 rounded-full text-white backdrop-blur-sm">Escaneando QR Code do Posto...</p>
             </div>
             <Button onClick={() => { setIsScanning(false); stopQRCamera(); }} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 rounded-xl z-20 font-black text-xs hover:bg-white/20">CANCELAR SCANNER</Button>
           </div>
        ) : showManualInput ? (
          <Card className="rounded-[2.5rem] p-8 text-center animate-in zoom-in-95 shadow-2xl border-2 border-blue-100">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Keyboard size={32} /></div>
            <h4 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-tight">Código Manual da Unidade</h4>
            <input autoFocus type="text" placeholder="EX: MIGUEL-001" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-2xl text-center tracking-widest mb-6 focus:border-blue-600 outline-none uppercase" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} />
            <div className="grid grid-cols-2 gap-3"><Button onClick={() => setShowManualInput(false)} variant="outline" className="rounded-xl">VOLTAR</Button><Button onClick={() => finalizeValidation(currentRondaType, manualCode)} className="rounded-xl">VALIDAR CÓDIGO</Button></div>
          </Card>
        ) : showPhotoCapture ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center px-2"><h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">REGISTRAR FOTOS DA RONDA</h3><span className={`px-3 py-1 rounded-full text-[10px] font-black ${capturedPhotos.length === 15 ? 'bg-red-500 text-white' : 'bg-blue-600 text-white shadow-lg'}`}>{capturedPhotos.length}/15</span></div>
            <div className="bg-black rounded-[2.5rem] aspect-video relative overflow-hidden border-4 border-white shadow-2xl"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><canvas ref={canvasRef} className="hidden" /><button disabled={capturedPhotos.length >= 15} onClick={takePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-slate-200 flex items-center justify-center shadow-2xl active:scale-90 transition-transform"><CameraIcon className="w-8 h-8 text-slate-900" /></button></div>
            <div className="flex gap-2 overflow-x-auto p-4 bg-white rounded-[2rem] min-h-[110px] border shadow-inner custom-scrollbar">{capturedPhotos.map((p, i) => (<div key={i} className="relative flex-shrink-0 animate-in zoom-in"><img src={p} className="w-20 h-20 rounded-xl object-cover border-2 shadow-sm" /><button onClick={() => setCapturedPhotos(cp => cp.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-1 shadow-lg hover:bg-red-700 transition-colors"><X className="w-3 h-3" /></button></div>))}{capturedPhotos.length === 0 && <div className="w-full text-center py-6 text-slate-300 text-[10px] font-bold uppercase tracking-[0.3em] italic">Tire as fotos obrigatórias do local</div>}</div>
            {capturedPhotos.length > 0 && <Button onClick={() => saveRecord('RONDA', pendingRondaPost, pendingRondaLocation?.lat || 0, pendingRondaLocation?.lng || 0, pendingRondaLocation?.alt || 0, capturedPhotos)} className="w-full py-6 rounded-[2rem] bg-emerald-600 font-black text-xl shadow-xl shadow-emerald-200 uppercase tracking-widest">FINALIZAR RELATÓRIO</Button>}
            <Button onClick={() => { setShowPhotoCapture(false); setCapturedPhotos([]); setPendingRondaPost(null); setPendingRondaLocation(null); stopPhotoCamera(); }} variant="outline" className="w-full py-4 rounded-xl font-black text-xs uppercase text-slate-400">DESCARTAR E VOLTAR</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {!activeShift && (
              <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Escolha seu Posto de Serviço:</p>
                <div className="grid gap-4">{state.posts.filter((p:any)=>currentUser && p.allowedEmployeeIds?.includes(currentUser.id)).map((post: any) => (
                  <button key={post.id} onClick={() => setSelectedPost(post)} className={`w-full p-6 rounded-[2.5rem] border-4 text-left transition-all relative overflow-hidden group ${selectedPost?.id === post.id ? 'border-blue-600 bg-blue-50 shadow-xl' : 'bg-white shadow-md border-transparent hover:border-slate-100'}`}>
                    <div className="flex justify-between items-center relative z-10">
                      <div><h4 className={`text-xl font-black ${selectedPost?.id === post.id ? 'text-blue-900' : 'text-slate-800'}`}>{post.name}</h4><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Ref: {post.code}</p></div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedPost?.id === post.id ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-slate-50 text-slate-300'}`}><Navigation size={20} /></div>
                    </div>
                  </button>
                ))}</div>
              </div>
            )}
            
            {(selectedPost || activeShift) && (
              <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border space-y-6 animate-in slide-in-from-bottom-8">
                {!activeShift ? (
                  <div className="space-y-4">
                    <button onClick={() => startInteraction('CHECK_IN', 'QR')} className="w-full py-10 bg-blue-600 text-white rounded-[2.5rem] flex flex-col items-center gap-4 font-black shadow-xl shadow-blue-200 active:scale-95 transition-all group">
                      <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform"><QrCode className="w-8 h-8" /></div>
                      <span className="text-lg font-black uppercase tracking-tight">INICIAR PLANTÃO (SCAN QR)</span>
                    </button>
                    <button onClick={() => startInteraction('CHECK_IN', 'MANUAL')} className="w-full py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-colors"><Keyboard size={16} /> Iniciar via Código Manual</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <button onClick={() => startInteraction('RONDA', 'QR')} className="w-full py-12 bg-emerald-600 text-white rounded-[3rem] flex flex-col items-center gap-4 font-black shadow-xl shadow-emerald-200 active:scale-95 transition-all group">
                      <div className="w-16 h-16 bg-white/20 rounded-[2.5rem] flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform"><Timer size={32} /></div>
                      <span className="text-2xl font-black uppercase tracking-widest">INICIAR RONDA</span>
                    </button>
                    <div className="grid grid-cols-1 gap-4">
                      <button onClick={() => startInteraction('RONDA', 'MANUAL')} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"><Keyboard size={16}/> Ronda via Código Manual</button>
                      <div className="h-px bg-slate-100 my-2" />
                      <button disabled={isLoading} onClick={() => finalizeValidation('CHECK_OUT', "AUTO_QR")} className="w-full py-6 bg-red-600 text-white rounded-[2.5rem] font-black flex items-center justify-center gap-3 shadow-lg shadow-red-100 uppercase tracking-widest text-sm hover:bg-red-700 transition-all"><Power size={18} /> FINALIZAR SERVIÇO</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

// --- SUB-APP: ADMINISTRADOR ---
const AdminDashboard: React.FC<{ state: any, setState: any, onLogout: () => void }> = ({ state, setState, onLogout }) => {
  const [activeTab, setActiveTab] = useState('MONITOR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [viewPhotosModal, setViewPhotosModal] = useState<any>(null);
  const [isSubstModalOpen, setIsSubstModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState<any>(null);
  
  const [editingPost, setEditingPost] = useState<any>(null);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedPostForHistory, setSelectedPostForHistory] = useState<any>(null);
  const [substData, setSubstData] = useState<any>(null);

  const [viewDate, setViewDate] = useState(new Date());
  const [planningDate, setPlanningDate] = useState(new Date().toISOString().split('T')[0]);
  const [planningShift, setPlanningShift] = useState<any>('MORNING');

  const recentPatrols = state.attendanceRecords.filter((r: any) => r.type === 'RONDA').slice(-15).reverse();

  const onlineStaffCount = state.posts.reduce((count: number, post: any) => {
    const today = new Date().toISOString().split('T')[0];
    const latest = state.attendanceRecords
      .filter((r: any) => r.postId === post.id && r.timestamp.startsWith(today))
      .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))[0];
    if (latest && latest.type === 'CHECK_IN') return count + 1;
    return count;
  }, 0);

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const name = fd.get('name') as string;
    const active = fd.get('active') === 'on';

    if (editingEmployee) {
      setState((p: any) => ({ ...p, employees: p.employees.map((x: any) => x.id === editingEmployee.id ? { ...x, name, active } : x) }));
    } else {
      const newEmp = { id: 'e-' + Math.random().toString(36).substr(2, 9), name, active, role: 'GUARD' };
      setState((p: any) => ({ ...p, employees: [...p.employees, newEmp] }));
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSavePost = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const name = fd.get('name') as string;
    const allowed = Array.from(fd.getAll('allowedEmployees')) as string[];
    const code = editingPost ? editingPost.code : generatePostCode(name);

    const postData = {
      id: editingPost ? editingPost.id : 'p-' + Math.random().toString(36).substr(2, 9),
      name,
      code,
      latitude: parseFloat(fd.get('latitude') as string),
      longitude: parseFloat(fd.get('longitude') as string),
      altitude: parseFloat(fd.get('altitude') as string) || 0,
      radiusMeters: parseInt(fd.get('radius') as string) || 100,
      minIntervalMinutes: parseInt(fd.get('interval') as string) || 60,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${code}`,
      allowedEmployeeIds: allowed,
      morningActive: fd.get('morningActive') === 'on',
      morningStart: fd.get('morningStart') as string,
      morningEnd: fd.get('morningEnd') as string,
      afternoonActive: fd.get('afternoonActive') === 'on',
      afternoonStart: fd.get('afternoonStart') as string,
      afternoonEnd: fd.get('afternoonEnd') as string,
      nightActive: fd.get('nightActive') === 'on',
      nightStart: fd.get('nightStart') as string,
      nightEnd: fd.get('nightEnd') as string,
    };

    if (editingPost) {
      setState((p: any) => ({ ...p, posts: p.posts.map((x: any) => x.id === editingPost.id ? postData : x) }));
    } else {
      setState((p: any) => ({ ...p, posts: [...p.posts, postData] }));
      setShowPrintConfirmModal(postData);
    }
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleDeletePost = (id: string) => {
    if (confirm('CUIDADO: Deseja realmente excluir este posto? Todos os registros e escalas vinculados serão removidos.')) {
      setState((st: any) => ({
        ...st,
        posts: st.posts.filter((p: any) => p.id !== id),
        plannedShifts: st.plannedShifts.filter((ps: any) => ps.postId !== id),
        attendanceRecords: st.attendanceRecords.filter((ar: any) => ar.postId !== id)
      }));
    }
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('Deseja excluir este funcionário?')) {
      setState((p: any) => ({ 
        ...p, 
        employees: p.employees.filter((x: any) => x.id !== id),
        plannedShifts: p.plannedShifts.filter((x: any) => x.employeeId !== id)
      }));
    }
  };

  const handleManualSubstitution = (subEmpId: string) => {
    if (!substData) return;
    const today = new Date().toISOString().split('T')[0];
    const timestamp = `${today}T${substData.shift === 'MORNING' ? '10:00:00' : (substData.shift === 'AFTERNOON' ? '18:00:00' : '22:00:00')}.000Z`;
    const newRec = { 
      id: 'subst-' + Math.random().toString(36).substr(2, 9), 
      timestamp, 
      employeeId: subEmpId, 
      postId: substData.post.id, 
      latitude: substData.post.latitude, 
      longitude: substData.post.longitude, 
      type: 'CHECK_IN', 
      status: 'SUBSTITUTION', 
      substitutedEmployeeId: substData.originalEmpId, 
      photos: [] 
    };
    setState((p: any) => ({ ...p, attendanceRecords: [...p.attendanceRecords, newRec] }));
    setIsSubstModalOpen(false);
    setSubstData(null);
  };

  const getAttendanceStatus = (postId: string, date: string) => {
    const planned = state.plannedShifts.filter((ps: any) => ps.postId === postId && ps.date === date);
    const actual = state.attendanceRecords.filter((r: any) => r.postId === postId && r.timestamp.startsWith(date));
    
    const finalStatus: any[] = [];

    planned.forEach((p: any) => {
      const entry = actual.find((a: any) => a.employeeId === p.employeeId && a.type === 'CHECK_IN' && a.status !== 'SUBSTITUTION');
      const substitute = actual.find((a: any) => a.postId === postId && a.type === 'CHECK_IN' && a.status === 'SUBSTITUTION' && a.substitutedEmployeeId === p.employeeId);
      
      const empName = state.employees.find((e: any) => e.id === p.employeeId)?.name || 'Desconhecido';

      if (entry) {
        finalStatus.push({
          employeeId: p.employeeId,
          name: empName,
          status: 'ATIVO',
          shift: p.shift,
          checkIn: entry.timestamp.split('T')[1].substr(0,5)
        });
      } else {
        finalStatus.push({
          employeeId: p.employeeId,
          name: empName,
          status: 'FALTA',
          shift: p.shift
        });

        if (substitute) {
          const subName = state.employees.find((e: any) => e.id === substitute.employeeId)?.name || 'Substituto';
          finalStatus.push({
            employeeId: substitute.employeeId,
            name: subName,
            status: 'SUBSTITUICAO',
            shift: p.shift,
            substituting: empName,
            checkIn: substitute.timestamp.split('T')[1].substr(0,5)
          });
        }
      }
    });

    return finalStatus;
  };

  const exportPDF = (post: any) => {
    const monthLabel = viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    
    let tableRows = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = getAttendanceStatus(post.id, dateStr);
      
      const renderShift = (shiftType: string) => {
        const items = status.filter(s => s.shift === shiftType);
        if (items.length === 0) return '---';
        return items.map(s => {
          if (s.status === 'FALTA') return `<div style="color: red; font-weight: bold;">[FALTA] ${s.name}</div>`;
          if (s.status === 'SUBSTITUICAO') return `<div style="color: blue; font-weight: bold;">[SUBST] ${s.name}</div><small style="color: #666;">(Subst. ${s.substituting})</small>`;
          return `<div style="color: green;">[OK] ${s.name}</div>`;
        }).join('');
      };

      tableRows += `
        <tr>
          <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${d}/${viewDate.getMonth() + 1}</td>
          <td style="padding: 10px; border: 1px solid #ccc;">${renderShift('MORNING')}</td>
          <td style="padding: 10px; border: 1px solid #ccc;">${renderShift('AFTERNOON')}</td>
          <td style="padding: 10px; border: 1px solid #ccc;">${renderShift('NIGHT')}</td>
        </tr>
      `;
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Relatório de Escala - ${post.name}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; }
            .meta { margin-bottom: 30px; font-weight: bold; text-align: center; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f0f0f0; padding: 12px; border: 1px solid #ccc; font-size: 13px; text-transform: uppercase; }
            td { padding: 10px; border: 1px solid #ccc; font-size: 12px; vertical-align: top; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>Escala Mensal de Efetivo</h1>
          <div class="meta">Unidade: ${post.name} | Período: ${monthLabel}</div>
          <table>
            <thead>
              <tr><th>Dia</th><th>Manhã</th><th>Tarde</th><th>Noite</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="footer">Documento Gerado em ${new Date().toLocaleString()} - GuardSystem Pro</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const Badge = ({ status, label, detail, onSubstitute }: any) => {
    const isFalta = status === 'FALTA';
    const isSubst = status === 'SUBSTITUICAO';
    const isAtivo = status === 'ATIVO';

    const baseClass = isFalta 
      ? 'bg-red-50 border-red-200 text-red-800' 
      : isSubst 
      ? 'bg-blue-50 border-blue-200 text-blue-800' 
      : 'bg-emerald-50 border-emerald-100 text-emerald-800';

    return (
      <div className={`p-3 rounded-[1.25rem] border-2 flex flex-col relative transition-all shadow-sm mb-2 ${baseClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isFalta ? 'bg-red-500 animate-pulse' : isSubst ? 'bg-blue-600' : 'bg-emerald-500'}`} />
            <span className="text-[11px] font-black uppercase truncate">
              {isFalta ? 'FALTA: ' : isSubst ? 'SUBST: ' : ''}{label}
            </span>
          </div>
          {onSubstitute && (
            <button onClick={onSubstitute} title="Trocar Guardião" className="p-1.5 bg-white text-red-600 rounded-xl shadow-sm hover:bg-red-600 hover:text-white transition-all"><Repeat size={12} /></button>
          )}
        </div>
        <span className="text-[9px] font-bold opacity-70 mt-1 uppercase tracking-wider">{detail}</span>
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-800 flex items-center gap-4"><div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20"><Shield size={24} className="text-white" /></div> <h1 className="font-black text-2xl tracking-tighter">ADMIN</h1></div>
        <nav className="p-6 space-y-3 flex-1">
          <button onClick={() => {setActiveTab('MONITOR'); setIsSidebarOpen(false);}} className={`w-full p-4 rounded-2xl flex items-center gap-4 font-bold transition-all ${activeTab === 'MONITOR' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}><Activity size={20} /> Monitoramento</button>
          <button onClick={() => {setActiveTab('EMPLOYEES'); setIsSidebarOpen(false);}} className={`w-full p-4 rounded-2xl flex items-center gap-4 font-bold transition-all ${activeTab === 'EMPLOYEES' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}><Users size={20} /> Funcionários</button>
          <button onClick={() => {setActiveTab('POSTS'); setIsSidebarOpen(false);}} className={`w-full p-4 rounded-2xl flex items-center gap-4 font-bold transition-all ${activeTab === 'POSTS' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800'}`}><MapPin size={20} /> Postos & GPS</button>
        </nav>
        <div className="p-6 border-t border-slate-800"><button onClick={onLogout} className="w-full p-4 text-slate-400 font-bold flex items-center gap-4 hover:text-white transition-all"><LogOut size={20} /> Sair do Painel</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 custom-scrollbar">
        <header className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white shadow-sm">
          <div className="flex items-center gap-5">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-3 bg-white rounded-2xl shadow-md border"><Menu size={24} /></button>
             <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{activeTab === 'MONITOR' ? 'Painel Operacional' : activeTab === 'EMPLOYEES' ? 'Efetivo Cadastrado' : 'Unidades de Serviço'}</h2>
                <div className="flex items-center gap-2 mt-1"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{onlineStaffCount} Guardiões Online Agora</span></div>
             </div>
          </div>
          <div className="flex gap-3">
             {activeTab === 'POSTS' && <Button onClick={() => {setEditingPost(null); setIsModalOpen(true);}}><Plus size={18} className="mr-2 inline" /> Adicionar Posto</Button>}
             {activeTab === 'EMPLOYEES' && <Button onClick={() => {setEditingEmployee(null); setIsEmployeeModalOpen(true);}}><Plus size={18} className="mr-2 inline" /> Adicionar Guardião</Button>}
          </div>
        </header>

        {activeTab === 'MONITOR' && (
          <div className="space-y-10">
            <Card title="Situação da Escala Diária (Faltas e Substituições)" className="rounded-[3rem] p-6 sm:p-10 overflow-hidden shadow-xl border-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead><tr className="border-b text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]"><th className="pb-8 pl-4">Posto Operacional</th><th className="pb-8">🌞 Manhã</th><th className="pb-8">☕ Tarde</th><th className="pb-8">🌙 Noite</th><th className="pb-8 text-right pr-4">Opções</th></tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {state.posts.map((post: any) => {
                      const today = new Date().toISOString().split('T')[0];
                      const stats = getAttendanceStatus(post.id, today);
                      return (
                        <tr key={post.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-8 pl-4 font-black text-slate-900 text-lg leading-tight">{post.name}<br/><span className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">{post.code}</span></td>
                          <td className="py-8">
                            {post.morningActive ? (
                              <div className="flex flex-col">{stats.filter((s:any)=>s.shift==='MORNING').map((s:any, idx:any)=>(
                                <Badge key={idx} status={s.status} label={s.name} detail={s.status === 'SUBSTITUICAO' ? `Substituiu ${s.substituting}` : (s.checkIn ? `Check-in: ${s.checkIn}` : '⚠️ AUSENTE')} onSubstitute={s.status === 'FALTA' ? () => { setSubstData({post, originalEmpId: s.employeeId, shift: 'MORNING'}); setIsSubstModalOpen(true); } : null} />
                              ))}</div>
                            ) : <span className="text-[10px] font-black text-slate-200 uppercase">---</span>}
                          </td>
                          <td className="py-8">
                            {post.afternoonActive ? (
                              <div className="flex flex-col">{stats.filter((s:any)=>s.shift==='AFTERNOON').map((s:any, idx:any)=>(
                                <Badge key={idx} status={s.status} label={s.name} detail={s.status === 'SUBSTITUICAO' ? `Substituiu ${s.substituting}` : (s.checkIn ? `Check-in: ${s.checkIn}` : '⚠️ AUSENTE')} onSubstitute={s.status === 'FALTA' ? () => { setSubstData({post, originalEmpId: s.employeeId, shift: 'AFTERNOON'}); setIsSubstModalOpen(true); } : null} />
                              ))}</div>
                            ) : <span className="text-[10px] font-black text-slate-200 uppercase">---</span>}
                          </td>
                          <td className="py-8">
                            {post.nightActive ? (
                              <div className="flex flex-col">{stats.filter((s:any)=>s.shift==='NIGHT').map((s:any, idx:any)=>(
                                <Badge key={idx} status={s.status} label={s.name} detail={s.status === 'SUBSTITUICAO' ? `Substituiu ${s.substituting}` : (s.checkIn ? `Check-in: ${s.checkIn}` : '⚠️ AUSENTE')} onSubstitute={s.status === 'FALTA' ? () => { setSubstData({post, originalEmpId: s.employeeId, shift: 'NIGHT'}); setIsSubstModalOpen(true); } : null} />
                              ))}</div>
                            ) : <span className="text-[10px] font-black text-slate-200 uppercase">---</span>}
                          </td>
                          <td className="py-8 text-right pr-4 flex flex-col gap-2 items-end">
                             <Button onClick={() => { setSelectedPostForHistory(post); setIsHistoryOpen(true); }} variant="outline" className="text-[10px] font-black uppercase px-4 py-2 rounded-xl">Escala</Button>
                             <Button onClick={() => exportPDF(post)} variant="outline" className="text-[10px] font-black uppercase px-4 py-2 rounded-xl flex items-center gap-2"><Printer size={14}/> Gerar PDF</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Relatórios Fotográficos das Rondas (Tempo Real)" className="rounded-[3rem] p-6 sm:p-10 shadow-xl border-0 overflow-hidden">
               <div className="overflow-x-auto"><table className="w-full text-left min-w-[700px]">
                 <thead><tr className="border-b text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]"><th className="pb-6 pl-4">Guardião Operacional</th><th>Unidade</th><th>Horário</th><th className="text-right pr-4">Evidências (Fotos)</th></tr></thead>
                 <tbody className="divide-y">{recentPatrols.map((r: any) => (
                   <tr key={r.id} className="border-b group hover:bg-slate-50 transition-colors">
                     <td className="py-6 pl-4"><div className="font-bold text-slate-800">{state.employees.find((e: any) => e.id === r.employeeId)?.name}</div><div className="text-[10px] text-blue-500 font-bold uppercase">Online</div></td>
                     <td><div className="font-medium text-slate-700">{state.posts.find((p: any) => p.id === r.postId)?.name}</div></td>
                     <td className="text-xs font-mono font-bold text-slate-400">{formatDateTime(r.timestamp).split(',')[1]}</td>
                     <td className="py-6 text-right pr-4">{r.photos && r.photos.length > 0 ? (
                       <button onClick={() => setViewPhotosModal(r)} className="inline-flex items-center gap-3 text-blue-600 font-black text-xs bg-blue-50 px-5 py-2.5 rounded-[1.25rem] shadow-sm hover:bg-blue-600 hover:text-white transition-all"><ImageIcon size={16} /> Ver Registro ({r.photos.length})</button>
                     ) : <span className="text-slate-300 italic text-[11px] font-medium tracking-widest uppercase">Sem fotos registradas</span>}</td>
                   </tr>
                 ))}</tbody>
               </table></div>
            </Card>
          </div>
        )}

        {activeTab === 'POSTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {state.posts.map((p: any) => (
              <Card key={p.id} className="rounded-[3rem] border-0 shadow-xl group relative overflow-hidden transition-all hover:translate-y-[-5px]">
                <div className="absolute top-6 right-6 flex gap-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingPost(p); setIsModalOpen(true); }} className="p-3 bg-white text-blue-600 rounded-2xl shadow-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-50"><Edit2 size={18} /></button>
                  <button onClick={() => handleDeletePost(p.id)} className="p-3 bg-white text-red-600 rounded-2xl shadow-lg hover:bg-red-600 hover:text-white transition-all border border-red-50"><Trash2 size={18} /></button>
                </div>
                <div className="mb-8"><h3 className="text-2xl font-black text-slate-900 leading-tight">{p.name}</h3><p className="text-[11px] font-mono text-slate-400 mt-2 uppercase tracking-widest bg-slate-100 inline-block px-3 py-1 rounded-lg">ID: {p.code}</p></div>
                <div className="flex flex-col items-center justify-center mb-8 bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <img src={p.qrUrl} className="w-32 h-32 mb-4 bg-white p-2 rounded-2xl shadow-sm" />
                  <button onClick={() => printAnyQRCode(p.qrUrl, p.name, p.code)} className="text-[11px] font-black text-blue-600 flex items-center gap-2 hover:underline tracking-widest"><Printer size={16}/> IMPRIMIR QR CODE</button>
                </div>
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-[2rem] mb-6">
                  <div className="flex justify-between text-[11px] font-black uppercase text-slate-500"><span>Lat: {p.latitude}</span><span>Long: {p.longitude}</span></div>
                  <div className="flex justify-between text-[11px] font-black uppercase text-slate-500"><span>Alt: {p.altitude}m</span><span>Raio GPS: {p.radiusMeters}m</span></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                   <div className={`p-3 rounded-2xl text-center text-[10px] font-black uppercase transition-all ${p.morningActive ? 'bg-amber-100 text-amber-700 shadow-sm' : 'bg-slate-100 text-slate-300 opacity-50'}`}>Manhã</div>
                   <div className={`p-3 rounded-2xl text-center text-[10px] font-black uppercase transition-all ${p.afternoonActive ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-slate-100 text-slate-300 opacity-50'}`}>Tarde</div>
                   <div className={`p-3 rounded-2xl text-center text-[10px] font-black uppercase transition-all ${p.nightActive ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'bg-slate-100 text-slate-300 opacity-50'}`}>Noite</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'EMPLOYEES' && (
          <Card className="rounded-[3rem] p-0 overflow-hidden shadow-xl border-0">
            <table className="w-full text-left"><thead className="bg-slate-900 text-white"><tr className="text-[10px] font-black uppercase tracking-[0.2em]"><th className="p-8">Nome do Guardião</th><th className="p-8">Status de Cadastro</th><th className="p-8 text-right pr-10">Ações</th></tr></thead>
              <tbody className="divide-y">{state.employees.map((e: any) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors"><td className="p-8 font-black text-slate-800 text-lg">{e.name}</td><td><span className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${e.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{e.active ? 'Ativo' : 'Inativo'}</span></td><td className="p-8 text-right pr-10 space-x-3"><button onClick={() => { setEditingEmployee(e); setIsEmployeeModalOpen(true); }} className="p-4 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm"><Edit2 size={18} /></button><button onClick={() => handleDeleteEmployee(e.id)} className="p-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm"><Trash2 size={18} /></button></td></tr>
              ))}</tbody>
            </table>
          </Card>
        )}
      </main>

      {/* MODAL HISTÓRICO ESCALA */}
      {isHistoryOpen && selectedPostForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom">
            <div className="p-8 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
              <div><h3 className="text-2xl font-black">Escala de Serviço</h3><p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">{selectedPostForHistory.name}</p></div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-3 bg-white/10 rounded-xl transition-all hover:bg-white/20"><X className="w-6 h-6 text-white" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50 custom-scrollbar">
              <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b pb-8">
                   <h4 className="font-black text-xl flex items-center gap-3"><UserPlus size={24} className="text-blue-500" /> Planejar Efetivo</h4>
                   <div className="flex flex-wrap items-center gap-4">
                     <input type="date" value={planningDate} onChange={(e) => setPlanningDate(e.target.value)} className="p-3 bg-slate-100 rounded-2xl border-0 font-bold text-sm outline-none" />
                     <div className="flex p-1 bg-slate-100 rounded-2xl">
                       <button onClick={() => setPlanningShift('MORNING')} disabled={!selectedPostForHistory?.morningActive} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${planningShift === 'MORNING' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'} disabled:opacity-20`}>Manhã</button>
                       <button onClick={() => setPlanningShift('AFTERNOON')} disabled={!selectedPostForHistory?.afternoonActive} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${planningShift === 'AFTERNOON' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'} disabled:opacity-20`}>Tarde</button>
                       <button onClick={() => setPlanningShift('NIGHT')} disabled={!selectedPostForHistory?.nightActive} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${planningShift === 'NIGHT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'} disabled:opacity-20`}>Noite</button>
                     </div>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                   {state.employees.filter((e:any) => e.role === 'GUARD' && (selectedPostForHistory?.allowedEmployeeIds || []).includes(e.id)).map((emp:any) => {
                     const isPlanned = state.plannedShifts.some((ps:any) => ps.employeeId === emp.id && ps.postId === selectedPostForHistory.id && ps.date === planningDate && ps.shift === planningShift);
                     return (
                       <button key={emp.id} onClick={() => {
                          if (isPlanned) setState((st:any) => ({ ...st, plannedShifts: st.plannedShifts.filter((ps:any) => !(ps.employeeId === emp.id && ps.postId === selectedPostForHistory.id && ps.date === planningDate && ps.shift === planningShift)) }));
                          else setState((st:any) => ({ ...st, plannedShifts: [...st.plannedShifts, { id: 'ps-'+Math.random(), postId: selectedPostForHistory.id, employeeId: emp.id, date: planningDate, shift: planningShift }] }));
                        }} className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase text-left flex justify-between items-center transition-all ${isPlanned ? 'bg-blue-600 text-white border-blue-600 shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}`}>
                          <span className="truncate mr-2">{emp.name}</span>{isPlanned ? <CheckCircle2 size={14} /> : <Plus size={14} className="opacity-30" />}
                       </button>
                     );
                   })}
                   {state.employees.filter((e:any) => e.role === 'GUARD' && (selectedPostForHistory?.allowedEmployeeIds || []).includes(e.id)).length === 0 && (
                     <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed rounded-2xl">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum funcionário vinculado a este posto.</p>
                        <p className="text-slate-300 text-[10px] mt-1">Vincule funcionários na edição do posto (aba Postos & GPS).</p>
                     </div>
                   )}
                 </div>
              </section>
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-xl">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                    <tr><th className="p-6">Dia do Mês</th><th className="p-6">🌞 Manhã</th><th className="p-6">☕ Tarde</th><th className="p-6">🌙 Noite</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from({ length: 31 }).map((_, i) => { 
                      const day = i + 1; 
                      const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; 
                      const daily = getAttendanceStatus(selectedPostForHistory.id, dateStr); 
                      return (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-6 font-black text-slate-400 text-sm">{day}</td>
                          <td className="p-4">
                            {daily.filter((s:any)=>s.shift==='MORNING').map((s,idx)=>(
                              <div key={idx} className={`p-2 rounded-lg text-[9px] font-black uppercase mb-1 shadow-sm border ${s.status==='FALTA'?'bg-red-50 text-red-800 border-red-200':s.status==='SUBSTITUICAO'?'bg-blue-50 text-blue-800 border-blue-200':'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                {s.status === 'FALTA' ? `⚠️ FALTA: ${s.name}` : s.status === 'SUBSTITUICAO' ? `🔄 ${s.name} (Subst. ${s.substituting})` : `✅ ${s.name}`}
                              </div>
                            ))}
                          </td>
                          <td className="p-4">
                            {daily.filter((s:any)=>s.shift==='AFTERNOON').map((s,idx)=>(
                              <div key={idx} className={`p-2 rounded-lg text-[9px] font-black uppercase mb-1 shadow-sm border ${s.status==='FALTA'?'bg-red-50 text-red-800 border-red-200':s.status==='SUBSTITUICAO'?'bg-blue-50 text-blue-800 border-blue-200':'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                {s.status === 'FALTA' ? `⚠️ FALTA: ${s.name}` : s.status === 'SUBSTITUICAO' ? `🔄 ${s.name} (Subst. ${s.substituting})` : `✅ ${s.name}`}
                              </div>
                            ))}
                          </td>
                          <td className="p-4">
                            {daily.filter((s:any)=>s.shift==='NIGHT').map((s,idx)=>(
                              <div key={idx} className={`p-2 rounded-lg text-[9px] font-black uppercase mb-1 shadow-sm border ${s.status==='FALTA'?'bg-red-50 text-red-800 border-red-200':s.status==='SUBSTITUICAO'?'bg-blue-50 text-blue-800 border-blue-200':'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                {s.status === 'FALTA' ? `⚠️ FALTA: ${s.name}` : s.status === 'SUBSTITUICAO' ? `🔄 ${s.name} (Subst. ${s.substituting})` : `✅ ${s.name}`}
                              </div>
                            ))}
                          </td>
                        </tr>
                      ); 
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESSÃO QR PÓS-CRIAÇÃO */}
      {showPrintConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={40} /></div>
            <h3 className="text-2xl font-black mb-2">Unidade Criada!</h3>
            <p className="text-slate-500 mb-8 text-sm">Posto <strong>{showPrintConfirmModal.name}</strong> cadastrado. Deseja imprimir o QR Code agora para fixar no local?</p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => printAnyQRCode(showPrintConfirmModal.qrUrl, showPrintConfirmModal.name, showPrintConfirmModal.code)} className="py-4 rounded-2xl flex items-center justify-center gap-2"><Printer size={20}/> IMPRIMIR QR CODE</Button>
              <button onClick={() => setShowPrintConfirmModal(null)} className="text-slate-400 font-bold py-2 hover:text-slate-600 transition-colors">Depois eu faço isso</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBSTITUIÇÃO MANUAL */}
      {isSubstModalOpen && substData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[4rem] w-full max-w-lg p-10 sm:p-14 shadow-[0_0_100px_rgba(37,99,235,0.2)] border-4 border-blue-50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Coffee size={120} /></div>
            <h3 className="text-3xl font-black mb-2 text-slate-900 tracking-tight leading-none">Substituição Manual</h3>
            <p className="text-blue-600 font-black text-[11px] uppercase tracking-widest mb-10 border-b pb-6">{substData.post.name} • {substData.shift}</p>
            <div className="space-y-4">
              <label className="text-[11px] font-black uppercase text-slate-400 ml-2 tracking-[0.2em]">Selecione quem irá assumir:</label>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar">
                {state.employees.filter((e:any)=>e.role==='GUARD' && e.id !== substData.originalEmpId && (substData.post.allowedEmployeeIds || []).includes(e.id)).map((emp:any)=>(
                  <button key={emp.id} onClick={()=>handleManualSubstitution(emp.id)} className="w-full p-6 text-left bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-black hover:border-blue-600 hover:bg-blue-50 transition-all flex justify-between items-center group">
                    <span className="text-slate-700 group-hover:text-blue-900">{emp.name}</span>
                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all"><UserCheck size={18} /></div>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={()=>setIsSubstModalOpen(false)} className="w-full mt-10 py-5 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar Operação</button>
          </div>
        </div>
      )}

      {/* MODAL FOTOS DA RONDA */}
      {viewPhotosModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 z-[300] animate-in fade-in">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-10 border-b flex justify-between items-center shrink-0">
              <div><h3 className="text-3xl font-black text-slate-900 leading-none">Relatório Fotográfico da Ronda</h3><p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mt-4">Posto: {state.posts.find((p:any)=>p.id===viewPhotosModal.postId)?.name} • {formatDateTime(viewPhotosModal.timestamp)}</p></div>
              <button onClick={() => setViewPhotosModal(null)} className="p-5 bg-slate-100 text-slate-400 rounded-3xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><X className="w-8 h-8" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/50"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">{viewPhotosModal.photos?.map((photo: any, idx: any) => (<div key={idx} className="group relative rounded-[2.5rem] overflow-hidden shadow-2xl border-[6px] border-white aspect-square"><img src={photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /></div>))}</div></div>
          </div>
        </div>
      )}

      {/* MODAL FUNCIONÁRIO */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in overflow-hidden">
             <div className="p-8 bg-slate-900 text-white flex justify-between items-center"><h3 className="text-xl font-black">{editingEmployee ? 'Editar Guardião' : 'Cadastrar Guardião'}</h3><button onClick={() => setIsEmployeeModalOpen(false)}><X /></button></div>
             <form onSubmit={handleSaveEmployee} className="p-8 space-y-6">
                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome Completo</label><input required name="name" defaultValue={editingEmployee?.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
                <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl"><input type="checkbox" name="active" defaultChecked={editingEmployee ? editingEmployee.active : true} className="w-6 h-6 rounded-lg text-blue-600" /><span className="font-bold text-slate-700">Funcionário Ativo</span></label>
                <Button className="w-full py-5 rounded-2xl font-black text-lg">SALVAR GUARDIAO</Button>
             </form>
          </div>
        </div>
      )}

      {/* MODAL POSTO OPERACIONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in max-h-[90vh] flex flex-col">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0"><h3 className="text-xl font-black">{editingPost ? 'Editar Posto' : 'Novo Posto Operacional'}</h3><button onClick={() => setIsModalOpen(false)}><X /></button></div>
            <form onSubmit={handleSavePost} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nome da Unidade</label><input required name="name" defaultValue={editingPost?.name} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-blue-600 ml-1">Latitude</label><input required name="latitude" type="number" step="any" defaultValue={editingPost?.latitude} className="w-full p-4 bg-blue-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-blue-600 ml-1">Longitude</label><input required name="longitude" type="number" step="any" defaultValue={editingPost?.longitude} className="w-full p-4 bg-blue-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Altitude (m)</label><input required name="altitude" type="number" step="any" defaultValue={editingPost?.altitude} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
                  <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Raio GPS (m)</label><input required name="radius" type="number" defaultValue={editingPost?.radiusMeters || 100} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
                  <div className="col-span-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Intervalo Ronda (min)</label><input required name="interval" type="number" defaultValue={editingPost?.minIntervalMinutes || 60} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-bold focus:border-blue-600 outline-none" /></div>
               </div>
               <div className="space-y-4">
                  <p className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2"><Clock size={14} /> Turnos Ativos</p>
                  <div className="grid grid-cols-3 gap-3">
                     <div className="p-3 bg-amber-50 rounded-2xl border space-y-2">
                        <label className="flex items-center gap-2 font-black text-[9px] uppercase cursor-pointer"><input type="checkbox" name="morningActive" defaultChecked={editingPost?.morningActive} /> Manhã</label>
                        <input type="time" name="morningStart" defaultValue={editingPost?.morningStart || "07:00"} className="w-full p-1 text-xs border rounded" />
                        <input type="time" name="morningEnd" defaultValue={editingPost?.morningEnd || "15:00"} className="w-full p-1 text-xs border rounded" />
                     </div>
                     <div className="p-3 bg-emerald-50 rounded-2xl border space-y-2">
                        <label className="flex items-center gap-2 font-black text-[9px] uppercase cursor-pointer"><input type="checkbox" name="afternoonActive" defaultChecked={editingPost?.afternoonActive} /> Tarde</label>
                        <input type="time" name="afternoonStart" defaultValue={editingPost?.afternoonStart || "15:00"} className="w-full p-1 text-xs border rounded" />
                        <input type="time" name="afternoonEnd" defaultValue={editingPost?.afternoonEnd || "23:00"} className="w-full p-1 text-xs border rounded" />
                     </div>
                     <div className="p-3 bg-indigo-50 rounded-2xl border space-y-2">
                        <label className="flex items-center gap-2 font-black text-[9px] uppercase cursor-pointer"><input type="checkbox" name="nightActive" defaultChecked={editingPost?.nightActive} /> Noite</label>
                        <input type="time" name="nightStart" defaultValue={editingPost?.nightStart || "23:00"} className="w-full p-1 text-xs border rounded" />
                        <input type="time" name="nightEnd" defaultValue={editingPost?.nightEnd || "07:00"} className="w-full p-1 text-xs border rounded" />
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[11px] font-black uppercase text-slate-900 flex items-center gap-2"><UserCheck size={14} /> Funcionários Autorizados</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200 custom-scrollbar">
                     {state.employees.filter((e: any) => e.role === 'GUARD').map((emp: any) => (
                       <label key={emp.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all shadow-sm group">
                          <input type="checkbox" name="allowedEmployees" value={emp.id} defaultChecked={(editingPost?.allowedEmployeeIds || []).includes(emp.id)} className="w-5 h-5 rounded-lg text-blue-600 transition-all group-hover:scale-110" />
                          <span className="text-xs font-bold truncate text-slate-700">{emp.name}</span>
                       </label>
                     ))}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">Guardiões selecionados acima poderão registrar presença e rondas neste posto.</p>
               </div>
               <Button className="w-full py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-100">SALVAR CONFIGURAÇÃO DO POSTO</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- APP ROOT ---
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
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full space-y-12 text-center">
          <div className="inline-flex p-6 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-200"><Shield size={64} color="white" /></div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">GuardSystem Pro</h1>
          <div className="grid gap-5">
            <button onClick={() => setView('EMPLOYEE')} className="p-8 bg-white border-4 border-transparent rounded-[3.5rem] shadow-xl hover:border-emerald-500 transition-all text-left flex items-center gap-6 group"><div className="p-5 bg-slate-100 rounded-[1.75rem] group-hover:bg-emerald-100 transition-colors"><User size={40} className="group-hover:text-emerald-600" /></div><div><h3 className="text-2xl font-black text-slate-800">Sou Funcionário</h3><p className="text-slate-400 font-medium text-sm">Acessar meus postos e rondas</p></div></button>
            <button onClick={() => setView('ADMIN_LOGIN')} className="p-8 bg-white border-4 border-transparent rounded-[3.5rem] shadow-xl hover:border-blue-500 transition-all text-left flex items-center gap-6 group"><div className="p-5 bg-slate-100 rounded-[1.75rem] group-hover:bg-blue-100 transition-colors"><Lock size={40} className="group-hover:text-blue-600" /></div><div><h3 className="text-2xl font-black text-slate-800">Administrador</h3><p className="text-slate-400 font-medium text-sm">Gestão total e monitoramento</p></div></button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ADMIN_LOGIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[3.5rem] p-10 shadow-2xl relative animate-in zoom-in-95">
          <button onClick={() => setView('SELECT')} className="absolute top-8 left-8 p-3 text-slate-400 hover:bg-slate-100 rounded-2xl"><ArrowLeft /></button>
          <div className="text-center mb-10"><Lock size={56} className="mx-auto text-blue-600 mb-4" /><h2 className="text-3xl font-black text-slate-900 leading-tight">Acesso de Gestão</h2></div>
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <input type="password" autoFocus placeholder="Senha do Sistema" className="w-full p-5 bg-slate-50 border-2 rounded-2xl outline-none focus:border-blue-600 font-bold text-lg" value={adminPass} onChange={e=>setAdminPass(e.target.value)} />
            {error && <p className="text-red-500 font-bold text-center text-xs bg-red-50 p-3 rounded-xl">{error}</p>}
            <Button className="w-full py-5 rounded-2xl font-black text-lg">ENTRAR NO PAINEL</Button>
          </form>
        </div>
      </div>
    );
  }

  return view === 'ADMIN' 
    ? <AdminDashboard state={state} setState={setState} onLogout={() => setView('SELECT')} /> 
    : <EmployeeApp state={state} setState={setState} onLogout={() => setView('SELECT')} />;
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
