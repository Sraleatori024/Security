
import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanError }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      // Explicitly request rear camera on mobile
      videoConstraints: {
        facingMode: { ideal: "environment" }
      }
    };

    scannerRef.current = new Html5QrcodeScanner("qr-reader", config, false);
    
    scannerRef.current.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        // Stop scanner after success if needed, but usually we handle it in parent
      },
      (errorMessage) => {
        if (onScanError) onScanError(errorMessage);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [onScanSuccess, onScanError]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-3xl border-4 border-slate-200 shadow-2xl bg-black">
      <div id="qr-reader" className="w-full"></div>
    </div>
  );
};

export default QRScanner;
