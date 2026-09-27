import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, Plus, Trash2, RotateCw, FileCheck, ShieldAlert, Upload } from 'lucide-react';
import axios from 'axios';

export default function CameraCaptureModal({ isOpen, onClose, onCaptureDone }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [capturedPages, setCapturedPages] = useState([]); // Array of base64 images
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedPages([]);
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera access denied or unmounted:', err.name || err.message);
      setCameraError('Camera access permission was dismissed or camera is unavailable. You can click allow in your browser address bar or select image files directly below.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const takeSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPages(prev => [...prev, dataUrl]);
  };

  const handleFileSelectFallback = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPages(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const deletePage = (index) => {
    setCapturedPages(prev => prev.filter((_, i) => i !== index));
  };

  const finishCaptures = async () => {
    if (capturedPages.length === 0) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('sourceType', 'CAMERA_CAPTURE');

      for (let i = 0; i < capturedPages.length; i++) {
        const res = await fetch(capturedPages[i]);
        const blob = await res.blob();
        formData.append('pages', blob, `page_${i + 1}.jpg`);
      }

      const response = await axios.post('/api/customer/camera-scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        onCaptureDone(response.data.document);
        stopCamera();
        onClose();
      }
    } catch (err) {
      alert('Failed to process camera captures: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-cyan-600" />
            <h3 className="font-bold text-slate-800 text-base">📸 Capture Document Pages</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
          {cameraError ? (
            <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-xl text-center space-y-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
              <p className="text-xs font-semibold">{cameraError}</p>
              
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                multiple
                onChange={handleFileSelectFallback}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Select Photo Files Instead
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {/* Video Viewport */}
              <div className="relative w-full max-w-md aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-md">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Shutter Button Overlay */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center">
                  <button
                    onClick={takeSnap}
                    className="w-14 h-14 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 ring-4 ring-white active:scale-95 transition-all"
                  >
                    <Camera className="w-7 h-7" />
                  </button>
                </div>
              </div>

              {/* Captured Pages Strip */}
              {capturedPages.length > 0 && (
                <div className="w-full mt-5">
                  <p className="text-xs font-semibold text-slate-500 mb-2.5 flex items-center justify-between">
                    <span>Captured Pages ({capturedPages.length})</span>
                    <span className="text-cyan-600 font-bold">Multi-Page PDF Ready</span>
                  </p>
                  
                  <div className="flex space-x-3 overflow-x-auto pb-2">
                    {capturedPages.map((pageData, index) => (
                      <div key={index} className="relative group shrink-0 w-24 aspect-[3/4] rounded-lg overflow-hidden border border-cyan-500 shadow">
                        <img src={pageData} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-slate-900/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                          P{index + 1}
                        </div>
                        <button
                          onClick={() => deletePage(index)}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
          <span className="text-xs text-slate-500 font-medium">
            {capturedPages.length > 0 ? `${capturedPages.length} page(s) ready` : 'Click camera shutter button to capture page'}
          </span>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={finishCaptures}
              disabled={capturedPages.length === 0 || loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white shadow-md flex items-center space-x-1.5 transition-all"
            >
              <FileCheck className="w-4 h-4" />
              <span>{loading ? 'Creating PDF...' : 'CREATE PDF & USE'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
