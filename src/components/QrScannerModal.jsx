import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, X } from 'lucide-react';

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const scanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          scanner.clear().catch(e => console.error(e));
          onScanSuccess(decodedText);
          onClose();
        },
        (error) => {
          // Ignore scanning frame decode errors
        }
      );

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-base">SCAN CUSTOMER QR CODE</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reader Viewport */}
        <div className="p-6 text-center">
          <div id="reader" className="w-full bg-slate-950 rounded-xl overflow-hidden text-slate-300"></div>
          <p className="text-xs text-slate-400 mt-4">
            Point camera at customer's order QR code on smartphone screen.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-950">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
