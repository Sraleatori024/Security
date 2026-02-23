
import React, { useState, useEffect } from 'react';
import { 
  Shield, MapPin, QrCode, LogOut, Activity, 
  Camera, Loader2, Navigation, History, 
  UserCircle, Clock, CheckCircle2, AlertCircle,
  X, Timer, Image as ImageIcon, CameraIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Guardiao, Posto, Ronda } from '../types';
import { postoService } from '../services/postoService';
import { rondaService } from '../services/rondaService';
import { authService } from '../services/authService';
import QRScanner from './QRScanner';
import { calculateDistance } from '../utils';

const GuardiaoApp: React.FC<{ user: Guardiao; onLogout: () => void }> = ({ user, onLogout }) => {
  const [postos, setPostos] = useState<Posto[]>([]);
  const [activeRonda, setActiveRonda] = useState<Ronda | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubPostos = postoService.subscribeToPostos((allPostos) => {
      // Filter only authorized posts for this guard
      const authorized = allPostos.filter(p => user.postosAutorizados.includes(p.id));
      setPostos(authorized);
    });

    const unsubRondas = rondaService.subscribeToActiveRondas((rondas) => {
      const myRonda = rondas.find(r => r.guardiaoId === user.id);
      setActiveRonda(myRonda || null);
    });

    return () => {
      unsubPostos();
      unsubRondas();
    };
  }, [user.id, user.postosAutorizados]);

  const handleScanSuccess = async (decodedText: string) => {
    setIsScanning(false);
    setIsLoading(true);
    setError(null);
    setStatusMessage("Validando Localização GPS...");

    try {
      // 1. Find the post
      const posto = postos.find(p => p.id === decodedText);
      if (!posto) {
        throw new Error("QR Code inválido ou posto não autorizado.");
      }

      // 2. Get GPS
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      const distance = calculateDistance(latitude, longitude, posto.latitude, posto.longitude);

      // 3. Validate Distance (100m)
      if (distance > 100) {
        throw new Error(`Fora do raio permitido. Você está a ${Math.round(distance)}m do posto.`);
      }

      // 4. Start Ronda
      await rondaService.startRonda({
        guardiaoId: user.id,
        guardiaoNome: user.nomeCompleto,
        postoId: posto.id,
        postoNome: posto.nomePosto,
        latitudeInicio: latitude,
        longitudeInicio: longitude,
        horarioInicio: new Date().toISOString(),
        photos: []
      });

      setSuccess(`Presença confirmada no ${posto.nomePosto}!`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message || "Erro ao validar presença.");
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleFinishRonda = async () => {
    if (!activeRonda) return;
    setIsLoading(true);
    try {
      await rondaService.finishRonda(activeRonda.id);
      setSuccess("Plantão finalizado com sucesso.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Erro ao finalizar plantão.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!activeRonda) return;
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());

      const photoUrl = await rondaService.uploadRondaPhoto(activeRonda.id, base64, activeRonda.photos.length);
      const newPhotos = [...activeRonda.photos, photoUrl];
      await rondaService.updateRondaPhotos(activeRonda.id, newPhotos);
      
      setSuccess("Foto registrada com sucesso!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError("Erro ao capturar foto. Verifique as permissões da câmera.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <header className="bg-white px-8 pt-12 pb-8 rounded-b-[3.5rem] shadow-xl border-b sticky top-0 z-20">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.25rem] flex items-center justify-center text-2xl font-black shadow-lg">
              {user.nomeCompleto.charAt(0)}
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${activeRonda ? "text-emerald-600" : "text-slate-400"}`}>
                {activeRonda ? "● Online" : "● Offline"}
              </p>
              <h3 className="text-xl font-black text-slate-800 leading-tight">{user.nomeCompleto}</h3>
              {user.QRA && <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">QRA: {user.QRA}</p>}
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>

        {activeRonda ? (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-600 p-6 rounded-[2.5rem] text-white flex items-center gap-5 shadow-2xl"
          >
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
              <div className="w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_10px_white]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Em Serviço no Posto</p>
              <p className="text-xl font-black leading-tight truncate">{activeRonda.postoNome}</p>
            </div>
          </motion.div>
        ) : (
          <div className="bg-slate-100 p-5 rounded-[2.5rem] text-slate-400 text-center font-bold text-xs border border-dashed">
            AGUARDANDO INÍCIO DE PLANTÃO
          </div>
        )}
      </header>

      <main className="flex-1 p-8 space-y-8">
        <AnimatePresence>
          {statusMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 bg-blue-50 border-2 border-blue-100 text-blue-700 rounded-[2rem] font-black text-sm flex items-center gap-4 shadow-sm"
            >
              <Loader2 className="w-6 h-6 animate-spin" /> {statusMessage}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-[2rem] font-black text-sm flex items-center gap-4 shadow-sm"
            >
              <CheckCircle2 className="w-6 h-6" /> {success}
            </motion.div>
          )}
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-[2rem] font-black text-sm flex items-center gap-4 shadow-sm"
            >
              <AlertCircle className="w-6 h-6" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {isScanning ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight">Escanear QR do Posto</h3>
              <button onClick={() => setIsScanning(false)} className="p-2 bg-slate-200 rounded-xl"><X size={20}/></button>
            </div>
            <QRScanner onScanSuccess={handleScanSuccess} onScanError={(err) => console.warn(err)} />
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Aponte a câmera para o QR Code fixado no posto
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {!activeRonda ? (
              <div className="space-y-6">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Suas Unidades Autorizadas:</p>
                <div className="grid gap-4">
                  {postos.map(posto => (
                    <div key={posto.id} className="bg-white p-6 rounded-[2.5rem] shadow-md border-2 border-transparent flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-black text-slate-800">{posto.nomePosto}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{posto.descricao}</p>
                      </div>
                      <div className="p-3 bg-slate-50 text-slate-300 rounded-2xl">
                        <MapPin size={20} />
                      </div>
                    </div>
                  ))}
                  {postos.length === 0 && (
                    <div className="p-10 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 font-bold text-sm">Nenhum posto autorizado vinculado ao seu perfil.</p>
                    </div>
                  )}
                </div>

                {postos.length > 0 && (
                  <button 
                    onClick={() => setIsScanning(true)}
                    className="w-full p-10 bg-blue-600 text-white rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 hover:bg-blue-700 transition-all active:scale-95 group"
                  >
                    <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <span className="text-2xl font-black uppercase tracking-tight">Iniciar Plantão (QR)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-white p-10 rounded-[4rem] shadow-2xl border border-emerald-50 text-center space-y-8">
                  <div className="inline-flex items-center gap-3 bg-emerald-50 px-5 py-2 rounded-full border border-emerald-100">
                    <Timer className="w-4 h-4 text-emerald-600 animate-spin-slow" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase">Serviço em Andamento</span>
                  </div>
                  
                  <div className="grid gap-4">
                    <button 
                      onClick={handleTakePhoto}
                      disabled={isLoading}
                      className="w-full p-10 bg-emerald-600 text-white rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 hover:bg-emerald-700 transition-all active:scale-95 group disabled:opacity-50"
                    >
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        {isLoading ? <Loader2 className="animate-spin" /> : <CameraIcon className="w-8 h-8" />}
                      </div>
                      <span className="text-xl font-black uppercase">Registrar Foto Ronda</span>
                    </button>

                    <div className="h-px bg-slate-100 my-4" />

                    <button 
                      disabled={isLoading}
                      onClick={handleFinishRonda}
                      className="w-full p-8 bg-red-600 text-white rounded-[2.5rem] flex items-center justify-center gap-4 font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : <LogOut />}
                      Finalizar Plantão
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GuardiaoApp;
