
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
  
  // Estados para fluxo de fotos da ronda
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
        () => console.warn('Aguardando GPS...'),
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
      setError('Funcionário não cadastrado ou inativo pelo Admin.');
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

  // Função robusta para obter localização com retentativas
  const getPreciseLocation = async (retries = 3): Promise<GeolocationPosition> => {
    setStatusMessage("Obtendo localização, aguarde...");
    
    for (let i = 0; i < retries; i++) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });
        setStatusMessage(null);
        return position;
      } catch (err) {
        if (i === retries - 1) throw err;
        console.warn(`Tentativa ${i + 1} de GPS falhou. Retentando...`);
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    throw new Error("GPS Timeout");
  };

  const startInteraction = async (type: 'CHECK_IN' | 'RONDA' | 'CHECK_OUT', mode: 'QR' | 'MANUAL') => {
    if (!selectedPost && !activeShift) {
      setError('Selecione uma unidade operacional primeiro.');
      return;
    }
    setError(null);
    setCameraPermissionError(null);
    setCurrentRondaType(type);
    
    if (mode === 'QR') {
      setIsScanning(true);
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          if (qrVideoRef.current) {
            qrVideoRef.current.srcObject = stream;
            qrVideoRef.current.onloadedmetadata = () => {
              qrVideoRef.current?.play().catch(console.error);
            };
          }
          // Simulação de leitura de QR Code real
          setTimeout(() => {
            if (isScanning) {
              finalizeValidation(type, "AUTO_QR");
            }
          }, 3000);
        } catch (err) {
          console.error("Erro ao acessar câmera:", err);
          setCameraPermissionError('Acesso à câmera negado. Permita nas configurações do navegador.');
        }
      }, 300);
    } else {
      setShowManualInput(true);
    }
  };

  const handleDirectCheckOut = async () => {
    if (!activeShift) return;
    const post = state.posts.find(p => p.id === activeShift.postId);
    if (!post) return;

    setIsLoading(true);
    setError(null);
    try {
      const pos = await getPreciseLocation();
      const distance = calculateDistance(pos.coords.latitude, pos.coords.longitude, post.latitude, post.longitude);
      
      if (distance > post.radiusMeters) {
         setError(`BLOQUEIO GPS: Você precisa estar próximo ao posto para finalizar (${Math.round(distance)}m).`);
         setIsLoading(false);
         return;
      }

      saveRecord('CHECK_OUT', post, pos.coords.latitude, pos.coords.longitude);
    } catch (err) {
      setError('Erro ao obter localização. Certifique-se que o GPS está ativo e tente novamente.');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
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
    
    const postToValidate = activeShift 
      ? state.posts.find(p => p.id === activeShift.postId)
      : selectedPost;

    if (enteredCode === "AUTO_QR") {
        verifiedPost = postToValidate || undefined;
    } else if (enteredCode) {
        verifiedPost = state.posts.find(p => p.code === enteredCode);
    }

    stopQRCamera();

    if (!verifiedPost) {
        setError('Validação falhou: Unidade não reconhecida ou código inválido.');
        setIsScanning(false);
        setShowManualInput(false);
        return;
    }

    if (activeShift && verifiedPost.id !== activeShift.postId) {
      setError('Código inválido: Você deve bater o ponto no posto onde iniciou o plantão.');
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
        setError(`BLOQUEIO GPS: Você está fora do raio permitido (${Math.round(distance)}m). Aproxime-se do posto.`);
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
        setTimeout(() => startPhotoCamera(), 100);
        return;
      }

      saveRecord(type, verifiedPost, pos.coords.latitude, pos.coords.longitude);

    } catch (err) {
      setError('Falha na validação de GPS. Verifique se o GPS está ativo e tente novamente.');
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
      const startTime = new Date(activeShift!.timestamp).getTime();
      const endTime = new Date(newRecord.timestamp).getTime();
      const diffHrs = Math.floor((endTime - startTime) / (1000 * 60 * 60));
      const diffMins = Math.floor(((endTime - startTime) % (1000 * 60 * 60)) / (1000 * 60));
      setSuccess(`Plantão finalizado! Tempo total: ${diffHrs}h ${diffMins}min.`);
      setSelectedPost(null);
    } else {
      setSuccess(type === 'CHECK_IN' ? 'Plantão iniciado com sucesso!' : 'Ronda enviada com sucesso!');
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
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError('Câmera não disponível ou permissão negada para fotos.');
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
    if (capturedPhotos.length >= 15) {
      setError('Limite de 15 fotos por ronda atingido.');
      return;
    }
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const photo = canvasRef.current.toDataURL('image/jpeg', 0.6);
        setCapturedPhotos(prev => [...prev, photo]);
        setError(null);
      }
    }
  };

  const removePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-10 text-center">
          <div className="inline-flex p-6 bg-slate-900 rounded-[2rem] shadow-2xl">
            <UserCircle className="w-16 h-16 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Portal do Guardião</h2>
            <p className="text-slate-500 font-medium mt-2">Identifique-se para gerenciar seus postos.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" autoFocus placeholder="Nome Completo"
              className="w-full p-6 bg-white border-2 border-slate-100 rounded-[1.5rem] outline-none focus:border-blue-600 font-bold shadow-sm"
              value={loginName} onChange={(e) => setLoginName(e.target.value)}
            />
            {error && <p className="text-red-500 font-bold text-xs bg-red-50 p-3 rounded-xl">{error}</p>}
            <Button className="w-full py-6 rounded-[1.5rem] text-xl font-black bg-slate-900 shadow-xl transition-all hover:bg-slate-800">ACESSAR PAINEL</Button>
            <button type="button" onClick={onLogout} className="text-slate-400 font-bold text-sm pt-4 hover:text-slate-600 transition-colors">Voltar ao Início</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* HEADER DINÂMICO */}
      <header className="bg-white px-8 pt-12 pb-8 rounded-b-[3.5rem] shadow-xl border-b border-slate-100 sticky top-0 z-20">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center text-2xl font-black shadow-lg shadow-slate-200">{currentUser.name.charAt(0)}</div>
             <div>
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Guardião Ativo</p>
               <h3 className="text-xl font-black text-slate-800 leading-tight">{currentUser.name}</h3>
             </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"><LogOut className="w-6 h-6" /></button>
        </div>
        
        {activeShift ? (
          <div className="bg-emerald-600 p-6 rounded-[2.5rem] text-white flex items-center gap-5 shadow-2xl shadow-emerald-100 animate-in fade-in slide-in-from-top-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
               <div className="w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_white]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Plantão Ativo desde {formatDateTime(activeShift.timestamp).split(',')[1]}</p>
              <p className="text-xl font-black leading-tight truncate">{state.posts.find(p => p.id === activeShift.postId)?.name}</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl text-center backdrop-blur-sm border border-white/20">
               <p className="text-[8px] font-black uppercase">Rondas a cada</p>
               <p className="text-sm font-black">{state.posts.find(p => p.id === activeShift.postId)?.minIntervalMinutes}m</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 p-5 rounded-[2.5rem] text-slate-400 flex items-center gap-4 border border-slate-200">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200">
               <Clock className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Status do Dia:</p>
              <p className="text-sm font-bold leading-tight">Aguardando Início de Plantão</p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 p-8 space-y-10">
        {statusMessage && <div className="p-6 bg-blue-50 border-2 border-blue-100 text-blue-700 rounded-[2rem] font-black text-sm flex items-center gap-4 animate-pulse shadow-md"><Loader2 className="w-6 h-6 animate-spin" /> {statusMessage}</div>}
        {success && <div className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-[2rem] font-black text-sm flex items-center gap-4 animate-in slide-in-from-top shadow-md"><CheckCircle2 className="w-6 h-6" /> {success}</div>}
        {error && <div className="p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-[2rem] font-black text-sm flex items-center gap-4 animate-shake shadow-md"><AlertCircle className="w-6 h-6" /> {error}</div>}
        {isLoading && !statusMessage && <div className="flex justify-center p-4"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>}

        {/* SCANNER QR REAL */}
        {isScanning ? (
          <div className="bg-slate-900 rounded-[3.5rem] aspect-square flex flex-col items-center justify-center text-white relative shadow-2xl overflow-hidden border-8 border-slate-800">
            {!cameraPermissionError ? (
              <video 
                ref={qrVideoRef} 
                autoPlay 
                muted
                playsInline 
                className="absolute inset-0 w-full h-full object-cover opacity-80 scale-105" 
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-slate-800">
                <AlertCircle className="w-14 h-14 text-red-500 mb-6" />
                <p className="font-black text-lg text-red-200 leading-relaxed">{cameraPermissionError}</p>
              </div>
            )}

            <div className="w-64 h-64 border-4 border-emerald-500/50 rounded-[2rem] relative z-10 shadow-[0_0_100px_rgba(16,185,129,0.4)]">
               <div className="absolute inset-x-0 h-2 bg-emerald-400 animate-scan shadow-[0_0_25px_#10b981] z-20" />
               <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
               <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
               <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
               <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />
            </div>
            
            <p className="mt-10 text-xs font-black uppercase tracking-[0.3em] text-emerald-400 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] bg-slate-900/40 px-6 py-2 rounded-full backdrop-blur-sm">Validando QR Code...</p>
            <Button onClick={() => { setIsScanning(false); stopQRCamera(); }} className="mt-8 bg-white/10 rounded-2xl px-12 py-4 relative z-10 border border-white/10 hover:bg-white/20 transition-all font-black text-xs">ABORTAR SCANNER</Button>
          </div>
        ) : showManualInput ? (
          <Card className="rounded-[3rem] p-10 border-2 border-blue-100 shadow-2xl animate-in zoom-in-95">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center border border-blue-100">
                 <Keyboard className="w-10 h-10 text-blue-600" />
              </div>
              <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Inserir Código da Unidade</h4>
              <input 
                autoFocus type="text" placeholder="EX: MIGUEL-001"
                className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] outline-none focus:border-blue-600 font-black text-3xl text-center tracking-widest placeholder:text-slate-200"
                value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              />
              <div className="grid grid-cols-2 gap-4 w-full">
                <Button onClick={() => setShowManualInput(false)} variant="outline" className="py-5 rounded-2xl font-black text-slate-400">VOLTAR</Button>
                <Button onClick={() => finalizeValidation(currentRondaType!, manualCode)} className="py-5 rounded-2xl bg-slate-900 font-black">VALIDAR</Button>
              </div>
            </div>
          </Card>
        ) : showPhotoCapture ? (
          <div className="space-y-6 animate-in slide-in-from-bottom-6">
            <div className="flex justify-between items-center px-4">
               <div>
                  <h3 className="font-black text-slate-800 text-2xl tracking-tight">FOTOS DA RONDA</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Capture evidências do ambiente</p>
               </div>
               <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${capturedPhotos.length === 15 ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>
                 {capturedPhotos.length} / 15 CAPTURADAS
               </span>
            </div>
            
            <div className="bg-black rounded-[3rem] overflow-hidden aspect-video shadow-2xl relative border-4 border-slate-200 group">
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
               <canvas ref={canvasRef} className="hidden" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8">
                 <button 
                  disabled={capturedPhotos.length >= 15}
                  onClick={takePhoto} 
                  className={`w-20 h-20 bg-white rounded-full border-[6px] border-slate-200 shadow-2xl active:scale-90 transition-all flex items-center justify-center ${capturedPhotos.length >= 15 ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:scale-105'}`}
                 >
                    <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center">
                       <CameraIcon className="w-7 h-7 text-white" />
                    </div>
                 </button>
               </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto p-5 custom-scrollbar bg-white rounded-[2.5rem] shadow-inner border border-slate-100 min-h-[140px] items-center">
               {capturedPhotos.map((p, i) => (
                 <div key={i} className="relative flex-shrink-0 animate-in zoom-in">
                    <img src={p} alt="Captura" className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-xl" />
                    <button 
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-xl p-1.5 shadow-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>
               ))}
               {capturedPhotos.length === 0 && (
                 <div className="w-full flex flex-col items-center justify-center text-slate-300 gap-2">
                    <ImageIcon className="w-8 h-8 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Mínimo 1 foto para enviar</p>
                 </div>
               )}
            </div>
            
            <div className="grid grid-cols-1 gap-4 pt-4">
              {capturedPhotos.length > 0 && (
                <Button 
                  onClick={() => saveRecord('RONDA', (activeShift ? state.posts.find(p => p.id === activeShift.postId) : null)!, location!.lat, location!.lng, capturedPhotos)} 
                  className="w-full py-7 rounded-[2rem] bg-emerald-600 font-black text-xl shadow-2xl shadow-emerald-100 uppercase tracking-[0.1em]"
                >
                  ENVIAR RELATÓRIO ({capturedPhotos.length})
                </Button>
              )}
              <Button onClick={() => { setShowPhotoCapture(false); setCapturedPhotos([]); stopPhotoCamera(); }} variant="outline" className="w-full py-5 rounded-2xl uppercase font-black text-xs text-slate-400 bg-white border-slate-200">CANCELAR E DESCARTAR</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            {!activeShift ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex items-center gap-4 ml-2">
                   <div className="p-3 bg-blue-100 rounded-2xl">
                      <MapPin className="w-6 h-6 text-blue-600" />
                   </div>
                   <div>
                      <h4 className="text-lg font-black text-slate-800 tracking-tight leading-none">Unidades Disponíveis</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Selecione para iniciar</p>
                   </div>
                </div>
                
                <div className="grid gap-6">
                  {myAssignedPosts.map(post => (
                    <button 
                      key={post.id} 
                      onClick={() => setSelectedPost(post)} 
                      className={`w-full p-8 rounded-[3rem] border-4 text-left transition-all relative overflow-hidden group ${selectedPost?.id === post.id ? 'border-blue-600 bg-blue-50/50 shadow-2xl shadow-blue-100' : 'bg-white shadow-md border-transparent hover:border-slate-100'}`}
                    >
                      <div className="flex justify-between items-center relative z-10">
                        <div>
                          <h4 className={`text-2xl font-black transition-colors ${selectedPost?.id === post.id ? 'text-blue-900' : 'text-slate-800'}`}>{post.name}</h4>
                          <div className="flex items-center gap-4 mt-3">
                             <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{post.code}</span>
                             <span className="text-[10px] font-bold text-slate-400 uppercase">GPS: {post.radiusMeters}m</span>
                          </div>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedPost?.id === post.id ? 'bg-blue-600 text-white scale-110 rotate-12 shadow-lg' : 'bg-slate-50 text-slate-300 group-hover:scale-110'}`}>
                           <Navigation className="w-6 h-6" />
                        </div>
                      </div>
                      {selectedPost?.id === post.id && (
                        <div className="absolute top-0 right-0 p-2">
                           <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                        </div>
                      )}
                    </button>
                  ))}
                  {myAssignedPosts.length === 0 && (
                    <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
                       <Shield className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                       <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma unidade autorizada</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {(selectedPost || activeShift) && (
              <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-bottom-8 duration-500">
                {!activeShift ? (
                  <div className="space-y-6 bg-white p-8 rounded-[3.5rem] shadow-2xl border border-blue-50">
                    <div className="text-center mb-4">
                       <h3 className="text-xl font-black text-slate-900">Iniciar Plantão em {selectedPost?.name}</h3>
                       <p className="text-xs text-slate-400 mt-1 font-bold">É obrigatório escanear o QR Code no local</p>
                    </div>
                    <button 
                      onClick={() => startInteraction('CHECK_IN', 'QR')} 
                      className="w-full p-12 bg-blue-600 text-white rounded-[3rem] shadow-2xl shadow-blue-200 flex flex-col items-center gap-6 hover:bg-blue-700 transition-all active:scale-95 group"
                    >
                      <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-sm border border-white/30 group-hover:scale-110 transition-transform">
                        <QrCode className="w-10 h-10" />
                      </div>
                      <span className="text-2xl font-black tracking-tight uppercase">Escanear QR do Posto</span>
                    </button>

                    <button 
                      onClick={() => startInteraction('CHECK_IN', 'MANUAL')} 
                      className="w-full p-6 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center gap-4 font-black uppercase text-sm hover:bg-slate-800 transition-colors"
                    >
                      <Keyboard className="w-6 h-6 opacity-60" /> Iniciar via Código Manual
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8 bg-white p-10 rounded-[4rem] shadow-2xl border border-emerald-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                       <Shield className="w-40 h-40 text-emerald-900" />
                    </div>
                    
                    <div className="text-center relative z-10">
                       <div className="inline-flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full mb-6 border border-emerald-100">
                          <Timer className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Monitoramento em Tempo Real</span>
                       </div>
                       <h3 className="text-2xl font-black text-slate-900 leading-tight">Painel de Operações</h3>
                       <p className="text-slate-400 font-bold text-sm mt-2">Próxima ronda sugerida: A cada {state.posts.find(p => p.id === activeShift.postId)?.minIntervalMinutes} minutos</p>
                    </div>

                    <div className="grid gap-5 relative z-10">
                      <button 
                        onClick={() => startInteraction('RONDA', 'QR')} 
                        className="w-full p-10 bg-emerald-600 text-white rounded-[3rem] shadow-2xl shadow-emerald-100 flex flex-col items-center gap-6 hover:bg-emerald-700 transition-all active:scale-95 group"
                      >
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                          <QrCode className="w-8 h-8" />
                        </div>
                        <span className="text-xl font-black tracking-tight uppercase">Iniciar Nova Ronda</span>
                      </button>

                      <div className="grid grid-cols-1 gap-4">
                        <button 
                          onClick={() => startInteraction('RONDA', 'MANUAL')} 
                          className="w-full p-6 bg-slate-100 text-slate-600 rounded-[2rem] flex items-center justify-center gap-4 font-black uppercase text-xs hover:bg-slate-200 transition-all"
                        >
                          <Keyboard className="w-5 h-5 opacity-40" /> Ronda via Código Manual
                        </button>
                        
                        <div className="h-px bg-slate-100 my-2" />
                        
                        <button 
                          disabled={isLoading}
                          onClick={() => handleDirectCheckOut()} 
                          className="w-full p-8 bg-red-600 text-white rounded-[2.5rem] flex items-center justify-center gap-4 font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Power className="w-6 h-6" /> Finalizar Plantão Hoje
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default EmployeeApp;
