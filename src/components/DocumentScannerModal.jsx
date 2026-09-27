import React, { useState, useRef, useEffect } from 'react';
import { Camera, Scan, Sparkles, Check, X, RotateCw, Contrast, Trash2, FileCheck } from 'lucide-react';
import axios from 'axios';

export default function DocumentScannerModal({ isOpen, onClose, onScanDone }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [scannedPages, setScannedPages] = useState([]);
  const [filterMode, setFilterMode] = useState('ENHANCED'); // ENHANCED, MONO, COLOR
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setScannedPages([]);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setErrorMsg('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setErrorMsg('Camera access unavailable. Check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const scanCurrentPage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Apply Document Scanning Edge & Contrast Enhancement Canvas filter
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (filterMode === 'MONO') {
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const threshold = avg > 120 ? 255 : 0; // High contrast monochrome
        data[i] = threshold;
        data[i + 1] = threshold;
        data[i + 2] = threshold;
      }
    } else if (filterMode === 'ENHANCED') {
      // Document enhancement: boost contrast & remove background shadows
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.25);
        data[i + 1] = Math.min(255, data[i + 1] * 1.25);
        data[i + 2] = Math.min(255, data[i + 2] * 1.25);
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const scannedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setScannedPages(prev => [...prev, scannedDataUrl]);
  };

  const removePage = (index) => {
    setScannedPages(prev => prev.filter((_, i) => i !== index));
  };

  const finishDocumentScan = async () => {
    if (scannedPages.length === 0) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('sourceType', 'CAMERA_SCAN');

      for (let i = 0; i < scannedPages.length; i++) {
        const res = await fetch(scannedPages[i]);
        const blob = await res.blob();
        formData.append('pages', blob, `scan_page_${i + 1}.jpg`);
      }

      const response = await axios.post('/api/customer/camera-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        onScanDone(response.data.document);
        stopCamera();
        onClose();
      }
    } catch (err) {
      alert('Error saving scanned PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scan className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h3 className="font-bold text-slate-100 text-base">📷 Document Edge Scanner</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
          
          {/* Scanner Filter Mode Selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 text-xs font-semibold">
            <button
              onClick={() => setFilterMode('ENHANCED')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                filterMode === 'ENHANCED' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Enhanced Scan
            </button>
            <button
              onClick={() => setFilterMode('MONO')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                filterMode === 'MONO' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              <Contrast className="w-3.5 h-3.5" /> High-B&W Document
            </button>
            <button
              onClick={() => setFilterMode('COLOR')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
                filterMode === 'COLOR' ? 'bg-emerald-500 text-white font-bold' : 'text-slate-400'
              }`}
            >
              Color Photo Scan
            </button>
          </div>

          {/* Viewport with Auto Corner Detection Overlay simulation */}
          <div className="relative w-full max-w-md aspect-[4/3] bg-black rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-inner">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Edge Finder HUD overlay */}
            <div className="absolute inset-6 border-2 border-dashed border-emerald-400/70 rounded-lg pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400"></span>
                <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400"></span>
              </div>
              <div className="text-center">
                <span className="bg-black/60 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-emerald-300">
                  Align Document Corners
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400"></span>
                <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400"></span>
              </div>
            </div>

            {/* Shutter Button */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center">
              <button
                onClick={scanCurrentPage}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-500/20 active:scale-95 transition-all"
              >
                <Scan className="w-7 h-7" />
              </button>
            </div>
          </div>

          {/* Scanned Pages Carousel */}
          {scannedPages.length > 0 && (
            <div className="w-full mt-6">
              <p className="text-xs font-semibold text-slate-400 mb-2">
                Scanned Pages ({scannedPages.length})
              </p>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {scannedPages.map((page, idx) => (
                  <div key={idx} className="relative group shrink-0 w-24 aspect-[3/4] rounded-lg overflow-hidden border border-emerald-500/50 shadow-md">
                    <img src={page} alt={`Scan ${idx+1}`} className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-400">
                      P{idx + 1}
                    </span>
                    <button
                      onClick={() => removePage(idx)}
                      className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/50">
          <span className="text-xs text-slate-400">
            {scannedPages.length > 0 ? `${scannedPages.length} scanned page(s) ready` : 'Align page and press scan button'}
          </span>
          <div className="flex space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
              Cancel
            </button>
            <button
              onClick={finishDocumentScan}
              disabled={scannedPages.length === 0 || loading}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-40 flex items-center gap-1.5 transition-all"
            >
              <FileCheck className="w-4 h-4" />
              <span>{loading ? 'Creating PDF...' : 'GENERATE SCANNED PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
