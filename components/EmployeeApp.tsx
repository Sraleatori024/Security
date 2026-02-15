
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Employee, Post, AttendanceRecord, ShiftType } from '../types';
import { Card, Button } from './Layout';
import { 
  Shield, MapPin, QrCode, LogOut, CheckCircle, 
  AlertCircle, Camera, Loader2, Navigation,
  History, UserCircle, Clock, Keyboard, CheckCircle2,
  ArrowLeft, Search, Power, Edit, Sun, Moon, CameraIcon, X,
  Timer, Image as ImageIcon
} from 'lucide-react';
import { calculateDistance, formatDateTime } from '../utils';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onLogout: () => void;
}

const EmployeeApp: React.FC<Props> = ({ state, setState, onLogout }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loginName, setLoginName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
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
  const [currentRondaType, setCurrentRondaType] = useState<'CHECK_IN' | 'RONDA' | 'CHECK_OUT' | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Aguardando sinal GPS estável...'),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = state.employees.find(emp => 
      emp.name.toLowerCase().trim() === loginName.toLowerCase().trim() && 
      emp.active &&
      emp.role === 'GUARD'
    );
    if (found) {
      setCurrentUser(found);
      setError(null);
    } else {
      setError('Acesso negado. Usuário não cadastrado ou inativo.');
    }
  };

  const myAssignedPosts = state.posts.filter(p => 
    currentUser ? p.allowedEmployeeIds.includes(currentUser.id) : false
  );

  const activeShift = state.attendanceRecords.find(r => 
    currentUser && 
    r.employeeId === currentUser.id && 
    r.type === 'CHECK_IN' && 
    !state.attendanceRecords.some(out => out.employeeId === currentUser.id && out.postId === r.postId && out.type === 'CHECK_OUT' && out.timestamp > r.timestamp)
  );

  const getPreciseLocation = async (retries = 3): Promise<GeolocationPosition> => {
    setStatusMessage("Validando GPS...");
    for (let i = 0; i < retries; i++) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0
          });
        });
        setStatusMessage(null);
        return position;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error("GPS_TIMEOUT");
  };

  const startInteraction = async (type: 'CHECK_IN' | 'RONDA' | 'CHECK_OUT', mode: 'QR' | 'MANUAL') => {
    if (!selectedPost && !activeShift) {
      setError('Por favor, selecione uma unidade operacional na lista.');
      return;
    }
    setError(null);
    setCameraPermissionError(null);
    setCurrentRondaType(type);
    
    if (mode === 'QR') {
      setIsScanning(true);
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (qrVideoRef.current) {
            qrVideoRef.current.srcObject = stream;
            qrVideoRef.current.play().catch(console.error);
          }
          // Simulação de leitura de QR
          setTimeout(() => { if (isScanning) finalizeValidation(type, "AUTO_QR"); }, 3000);
        } catch (err) {
          setCameraPermissionError('Permissão de câmera é obrigatória para este posto.');
        }
      }, 300);
    } else {
      setShowManualInput(true);
    }
  };

  const stopQRCamera = () => {
    if (qrVideoRef.current && qrVideoRef.current.srcObject) {
      const stream = qrVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      qrVideoRef.current.srcObject = null;
    }
  };

  const finalizeValidation = async (type: 'CHECK_IN' | 'RONDA' | 'CHECK_OUT', enteredCode?: string) => {
    let verifiedPost: Post | undefined;
    const postToValidate = activeShift ? state.posts.find(p => p.id === activeShift.postId) : selectedPost;

    if (enteredCode === "AUTO_QR") {
        verifiedPost = postToValidate || undefined;
    } else if (enteredCode) {
        verifiedPost = state.posts.find(p => p.code === enteredCode);
    }

    stopQRCamera();

    if (!verifiedPost) {
        setError('CÓDIGO INVÁLIDO. Verifique os dados e tente novamente.');
        setIsScanning(false);
        setShowManualInput(false);
        return;
    }

    if (activeShift && verifiedPost.id !== activeShift.postId) {
      setError('POSTO INCORRETO. Você iniciou o plantão em outra unidade.');
      setIsScanning(false);
      setShowManualInput(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pos = await getPreciseLocation();
      const distance = calculateDistance(pos.coords.latitude, pos.coords.longitude, verifiedPost.latitude, verifiedPost.longitude);
      
      if (distance > verifiedPost.radiusMeters) {
        setError(`BLOQUEIO GPS: Você está a ${Math.round(distance)}m do posto. Aproxime-se.`);
        setIsLoading(false);
        setIsScanning(false);
        setShowManualInput(false);
        return;
      }

      if (type === 'RONDA') {
        setIsLoading(false);
        setIsScanning(false);
        setShowManualInput(false);
        setShowPhotoCapture(true);
        setTimeout(() => startPhotoCamera(), 200);
        return;
      }

      saveRecord(type, verifiedPost, pos.coords.latitude, pos.coords.longitude);

    } catch (err) {
      setError('SINAL GPS INSUFICIENTE. Saia para um local aberto e tente novamente.');
    } finally {
      setIsLoading(false);
      setIsScanning(false);
      setShowManualInput(false);
      setManualCode('');
      setStatusMessage(null);
    }
  };

  const saveRecord = (type: 'CHECK_IN' | 'RONDA' | 'CHECK_OUT', post: Post, lat: number, lng: number, photos?: string[]) => {
    let substitutedEmployeeId: string | undefined = undefined;
    let status: 'VALID' | 'SUBSTITUTION' = 'VALID';

    if (type === 'CHECK_IN') {
      const todayStr = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      const currentShift: ShiftType = (hour >= 6 && hour < 18) ? 'DAY' : 'NIGHT';

      const isPlanned = state.plannedShifts.some(ps => 
        ps.employeeId === currentUser!.id && 
        ps.postId === post.id && 
        ps.date === todayStr &&
        ps.shift === currentShift
      );

      if (!isPlanned) {
        status = 'SUBSTITUTION';
        const plannedGuard = state.plannedShifts.find(ps => 
          ps.postId === post.id && 
          ps.date === todayStr && 
          ps.shift === currentShift
        );
        if (plannedGuard) substitutedEmployeeId = plannedGuard.employeeId;
      }
    }

    const newRecord: AttendanceRecord = {
      id: 'att-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      employeeId: currentUser!.id,
      postId: post.id,
      latitude: lat,
      longitude: lng,
      type: type,
      status: status,
      substitutedEmployeeId: substitutedEmployeeId,
      photos: photos
    };

    setState(prev => ({ ...prev, attendanceRecords: [...prev.attendanceRecords, newRecord] }));
    
    if (type === 'CHECK_OUT') {
      setSuccess(`Plantão Finalizado com Sucesso.`);
      setSelectedPost(null);
    } else {
      setSuccess(type === 'CHECK_IN' ? 'Entrada confirmada! Bom serviço.' : 'Relatório de Ronda enviado com sucesso.');
    }
    
    setShowPhotoCapture(false);
    setCapturedPhotos([]);
    stopPhotoCamera();
    setTimeout(() => setSuccess(null), 4000);
    setIsLoading(false);
  };

  const startPhotoCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Falha ao abrir câmera para fotos obrigatórias.');
      setShowPhotoCapture(false);
    }
  };

  const stopPhotoCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const takePhoto = () => {
    if (capturedPhotos.length >= 15) return;
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setCapturedPhotos(prev => [...prev, canvasRef.current!.toDataURL('image/jpeg', 0.6)]);
        setError(null);
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-10 text-center">
          <div className="inline-flex p-6 bg-slate-900 rounded-[2rem] shadow-2xl"><UserCircle className="w-16 h-16 text-white" /></div>
          <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Portal do Guardião</h2></div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Nome Completo" className="w-full p-6 bg-white border-2 border-slate-100 rounded-[1.5rem] outline-none focus:border-blue-600 font-bold shadow-sm" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            {error && <p className="text-red-500 font-bold text-xs bg-red-50 p-3 rounded-xl">{error}</p>}
            <Button className="w-full py-6 rounded-[1.5rem] text-xl font-black bg-slate-900 shadow-xl transition-all hover:bg-slate-800">ENTRAR</Button>
            <button type="button" onClick={onLogout} className="text-slate-400 font-bold text-sm pt-4 hover:text-slate-600 transition-colors">Sair</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <header className="bg-white px-8 pt-12 pb-8 rounded-b-[3.5rem] shadow-xl border-b sticky top-0 z-20">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center text-2xl font-black shadow-lg">{currentUser.name.charAt(0)}</div>
             <div><p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Guardião Online</p><h3 className="text-xl font-black text-slate-800 leading-tight">{currentUser.name}</h3></div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all"><LogOut className="w-6 h-6" /></button>
        </div>
        
        {activeShift ? (
          <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white flex items-center gap-5 shadow-2xl animate-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse"><div className="w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_white]" /></div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Plantão desde {formatDateTime(activeShift.timestamp).split(',')[1]}</p>
              <p className="text-xl font-black leading-tight truncate">{state.posts.find(p => p.id === activeShift.postId)?.name}</p>
            </div>
          </div>
        ) : <div className="bg-slate-100 p-5 rounded-[2.5rem] text-slate-400 text-center font-bold text-xs border border-dashed">AGUARDANDO INÍCIO DE PLANTÃO</div>}
      </header>

      <main className="flex-1 p-8 space-y-10">
        {statusMessage && <div className="p-6 bg-blue-50 border-2 border-blue-100 text-blue-700 rounded-[2rem] font-black text-sm flex items-center gap-4 animate-pulse"><Loader2 className="w-6 h-6 animate-spin" /> {statusMessage}</div>}
        {success && <div className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-[2rem] font-black text-sm flex items-center gap-4 animate-in slide-in-from-top"><CheckCircle2 className="w-6 h-6" /> {success}</div>}
        {error && <div className="p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-[2rem] font-black text-sm flex items-center gap-4 animate-shake"><AlertCircle className="w-6 h-6" /> {error}</div>}

        {isScanning ? (
          <div className="bg-slate-900 rounded-[3.5rem] aspect-square flex flex-col items-center justify-center text-white relative shadow-2xl overflow-hidden border-8 border-slate-800">
            {!cameraPermissionError ? <video ref={qrVideoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-80 scale-105" /> : <p className="p-10 text-center font-black">{cameraPermissionError}</p>}
            <div className="w-64 h-64 border-4 border-emerald-500/50 rounded-[2rem] relative z-10 shadow-[0_0_100px_rgba(16,185,129,0.4)]"><div className="absolute inset-x-0 h-2 bg-emerald-400 animate-scan shadow-[0_0_25px_#10b981] z-20" /></div>
            <Button onClick={() => { setIsScanning(false); stopQRCamera(); }} className="mt-8 bg-white/10 rounded-2xl px-12 py-4 relative z-10 font-black text-xs">FECHAR SCANNER</Button>
          </div>
        ) : showManualInput ? (
          <Card className="rounded-[3rem] p-10 border-2 border-blue-100 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center border border-blue-100"><Keyboard className="w-10 h-10 text-blue-600" /></div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Código da Unidade</h4>
              <input autoFocus type="text" placeholder="EX: MIGUEL-001" className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] outline-none focus:border-blue-600 font-black text-3xl text-center tracking-widest" value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} />
              <div className="grid grid-cols-2 gap-4 w-full"><Button onClick={() => setShowManualInput(false)} variant="outline" className="py-5 rounded-2xl font-black text-slate-400">VOLTAR</Button><Button onClick={() => finalizeValidation(currentRondaType!, manualCode)} className="py-5 rounded-2xl bg-slate-900 font-black">VALIDAR</Button></div>
            </div>
          </Card>
        ) : showPhotoCapture ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center px-4">
               <div><h3 className="font-black text-slate-800 text-2xl tracking-tight uppercase">Registrar Ronda</h3><p className="text-xs font-bold text-slate-400 mt-1 uppercase">Mínimo 1 foto de evidência</p></div>
               <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${capturedPhotos.length === 15 ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>{capturedPhotos.length} / 15</span>
            </div>
            <div className="bg-black rounded-[3rem] overflow-hidden aspect-video shadow-2xl relative border-4 border-slate-200"><video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" /><div className="absolute bottom-8 left-1/2 -translate-x-1/2"><button disabled={capturedPhotos.length >= 15} onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-[6px] border-slate-200 shadow-2xl active:scale-90 flex items-center justify-center"><div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center"><CameraIcon className="w-7 h-7 text-white" /></div></button></div></div>
            <div className="flex gap-4 overflow-x-auto p-5 custom-scrollbar bg-white rounded-[2.5rem] shadow-inner border min-h-[140px] items-center">
               {capturedPhotos.map((p, i) => (
                 <div key={i} className="relative flex-shrink-0"><img src={p} alt="Evidência" className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl" /><button onClick={() => setCapturedPhotos(pv => pv.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-xl p-1.5"><X className="w-4 h-4" /></button></div>
               ))}
               {capturedPhotos.length === 0 && <p className="w-full text-center text-[10px] font-black text-slate-300 uppercase italic">Aguardando Captura...</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 pt-4">
              {capturedPhotos.length > 0 && <Button onClick={() => saveRecord('RONDA', (activeShift ? state.posts.find(p => p.id === activeShift.postId) : null)!, location?.lat || 0, location?.lng || 0, capturedPhotos)} className="w-full py-7 rounded-[2rem] bg-emerald-600 font-black text-xl shadow-2xl uppercase tracking-widest">FINALIZAR RELATÓRIO</Button>}
              <Button onClick={() => { setShowPhotoCapture(false); setCapturedPhotos([]); stopPhotoCamera(); }} variant="outline" className="w-full py-5 rounded-2xl font-black text-slate-400">CANCELAR E VOLTAR</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {!activeShift ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Suas Unidades Autorizadas:</p>
                <div className="grid gap-6">
                  {myAssignedPosts.map(post => (
                    <button key={post.id} onClick={() => setSelectedPost(post)} className={`w-full p-8 rounded-[3rem] border-4 text-left transition-all relative overflow-hidden group ${selectedPost?.id === post.id ? 'border-blue-600 bg-blue-50/50 shadow-2xl' : 'bg-white shadow-md border-transparent hover:border-slate-100'}`}>
                      <div className="flex justify-between items-center relative z-10">
                        <div><h4 className={`text-2xl font-black ${selectedPost?.id === post.id ? 'text-blue-900' : 'text-slate-800'}`}>{post.name}</h4><div className="flex items-center gap-4 mt-3"><span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{post.code}</span></div></div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedPost?.id === post.id ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-slate-50 text-slate-300'}`}><Navigation className="w-6 h-6" /></div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {(selectedPost || activeShift) && (
              <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-8">
                {!activeShift ? (
                  <div className="space-y-6 bg-white p-8 rounded-[3.5rem] shadow-2xl border border-blue-50">
                    <button onClick={() => startInteraction('CHECK_IN', 'QR')} className="w-full p-12 bg-blue-600 text-white rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 hover:bg-blue-700 transition-all group">
                      <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform"><QrCode className="w-10 h-10" /></div>
                      <span className="text-2xl font-black uppercase tracking-tight">Confirmar Presença (QR)</span>
                    </button>
                    <button onClick={() => startInteraction('CHECK_IN', 'MANUAL')} className="w-full p-6 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center gap-4 font-black uppercase text-sm">Iniciar via Código Manual</button>
                  </div>
                ) : (
                  <div className="space-y-8 bg-white p-10 rounded-[4rem] shadow-2xl border border-emerald-50 text-center">
                    <div className="inline-flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full mb-2 border border-emerald-100"><Timer className="w-4 h-4 text-emerald-600 animate-spin-slow" /><span className="text-[10px] font-black text-emerald-700 uppercase">Plantão em Execução</span></div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">Posto {state.posts.find(p=>p.id===activeShift.postId)?.name}</h3>
                    <div className="grid gap-5">
                      <button onClick={() => startInteraction('RONDA', 'QR')} className="w-full p-10 bg-emerald-600 text-white rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 hover:bg-emerald-700 transition-all group">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform"><QrCode className="w-8 h-8" /></div>
                        <span className="text-xl font-black uppercase">Fazer Nova Ronda</span>
                      </button>
                      <button onClick={() => startInteraction('RONDA', 'MANUAL')} className="w-full p-6 bg-slate-100 text-slate-600 rounded-[2rem] flex items-center justify-center gap-4 font-black uppercase text-xs">Ronda via Código Manual</button>
                      <div className="h-px bg-slate-100 my-2" />
                      <button disabled={isLoading} onClick={async () => { try { const pos = await getPreciseLocation(); saveRecord('CHECK_OUT', state.posts.find(p=>p.id===activeShift.postId)!, pos.coords.latitude, pos.coords.longitude); } catch { setError('GPS NECESSÁRIO PARA FINALIZAR.'); } }} className="w-full p-8 bg-red-600 text-white rounded-[2.5rem] flex items-center justify-center gap-4 font-black uppercase tracking-widest shadow-xl shadow-red-100">FINALIZAR HOJE</button>
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

export default EmployeeApp;
