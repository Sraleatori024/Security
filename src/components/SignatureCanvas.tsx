
import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';

interface SignatureCanvasProps {
  onSave: (signatureDataUrl: string) => void;
  onClear?: () => void;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({ onSave, onClear }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      });

      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext("2d")?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
        }
      };

      window.addEventListener("resize", resizeCanvas);
      resizeCanvas();

      return () => window.removeEventListener("resize", resizeCanvas);
    }
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
    if (onClear) onClear();
  };

  const handleSave = () => {
    if (signaturePadRef.current?.isEmpty()) {
      alert("Por favor, forneça uma assinatura.");
      return;
    }
    const dataUrl = signaturePadRef.current?.toDataURL();
    if (dataUrl) onSave(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white">
        <canvas 
          ref={canvasRef} 
          className="w-full h-40 touch-none cursor-crosshair"
        />
      </div>
      <div className="flex gap-2">
        <button 
          type="button"
          onClick={handleClear}
          className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
        >
          Limpar
        </button>
        <button 
          type="button"
          onClick={handleSave}
          className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          Confirmar Assinatura
        </button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
