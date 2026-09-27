import React, { useState, useRef } from 'react';
import { X, Upload, CreditCard, CheckCircle, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';

export default function AadhaarIdUploadModal({ isOpen, onClose, onAddMergedDoc }) {
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  const handleFileRead = (file, setImgState) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgState(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setFrontImage(null);
    setBackImage(null);
  };

  const generateMergedImageBlob = () => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // A4 page ratio canvas: 1240 x 1754 (at 150 DPI)
      const canvasWidth = 1240;
      const canvasHeight = 1754;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill clean white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Header Banner on Canvas
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasWidth, 100);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('IDENTITY CARD / AADHAAR CARD - 1-PAGE MERGE', 60, 60);

      const frontImg = new Image();
      const backImg = new Image();

      let loadedCount = 0;
      const checkAndRender = () => {
        loadedCount++;
        if (loadedCount === 2) {
          try {
            // Render Front Image (Top Half)
            const padding = 80;
            const maxCardWidth = canvasWidth - padding * 2;
            const maxCardHeight = 650;

            // Draw Front Box / Frame
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 4;
            ctx.strokeRect(padding - 10, 140, maxCardWidth + 20, maxCardHeight + 20);

            // Calculate ratio & dimensions for Front Image
            let fWidth = frontImg.width;
            let fHeight = frontImg.height;
            const fRatio = Math.min(maxCardWidth / fWidth, maxCardHeight / fHeight);
            const drawFWidth = fWidth * fRatio;
            const drawFHeight = fHeight * fRatio;
            const fX = padding + (maxCardWidth - drawFWidth) / 2;
            const fY = 150 + (maxCardHeight - drawFHeight) / 2;

            ctx.drawImage(frontImg, fX, fY, drawFWidth, drawFHeight);

            // Label Front Side
            ctx.fillStyle = '#475569';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('FRONT SIDE', padding, 135);

            // Render Back Image (Bottom Half)
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 4;
            ctx.strokeRect(padding - 10, 920, maxCardWidth + 20, maxCardHeight + 20);

            let bWidth = backImg.width;
            let bHeight = backImg.height;
            const bRatio = Math.min(maxCardWidth / bWidth, maxCardHeight / bHeight);
            const drawBWidth = bWidth * bRatio;
            const drawBHeight = bHeight * bRatio;
            const bX = padding + (maxCardWidth - drawBWidth) / 2;
            const bY = 930 + (maxCardHeight - drawBHeight) / 2;

            ctx.drawImage(backImg, bX, bY, drawBWidth, drawBHeight);

            // Label Back Side
            ctx.fillStyle = '#475569';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText('BACK SIDE', padding, 915);

            // Export to Blob
            canvas.toBlob((blob) => {
              resolve(blob);
            }, 'image/jpeg', 0.92);
          } catch (err) {
            reject(err);
          }
        }
      };

      frontImg.onload = checkAndRender;
      backImg.onload = checkAndRender;
      frontImg.onerror = reject;
      backImg.onerror = reject;

      frontImg.src = frontImage;
      backImg.src = backImage;
    });
  };

  const handleMergeAndSubmit = async () => {
    if (!frontImage || !backImage) return;
    setLoading(true);

    try {
      const mergedBlob = await generateMergedImageBlob();
      const formData = new FormData();
      formData.append('files', mergedBlob, `Aadhaar_Merged_1Page_${Date.now()}.jpg`);
      formData.append('sourceType', 'AADHAAR_MERGE');

      const res = await axios.post('/api/customer/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.documents.length > 0) {
        const rawDoc = res.data.documents[0];
        const totalPages = rawDoc.totalPages || rawDoc.pageCount || 1;
        const newDoc = {
          ...rawDoc,
          totalPages: totalPages,
          pageCount: totalPages,
          pageRange: 'ALL',
          pageSelectionMode: 'ALL',
          pageRangeInput: `1-${totalPages}`,
          selectedPages: [1],
          paperSize: 'A4',
          colorMode: 'BW',
          sides: 'SINGLE',
          copies: 1
        };

        if (onAddMergedDoc) {
          onAddMergedDoc(newDoc);
        }
        handleReset();
        onClose();
      } else {
        alert('Failed to process merged Aadhaar document.');
      }
    } catch (err) {
      console.error('Aadhaar merge error:', err);
      alert('Error creating merged Aadhaar card document: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">ID / Aadhaar Card Utility</span>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">Merge Front & Back on 1 Page</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          <p className="text-xs text-slate-600">
            Upload images for both the <strong>Front Side</strong> and <strong>Back Side</strong> of your Aadhaar card or ID. They will be automatically combined into a single clean printable page.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Front Side Card */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-h-[180px] relative transition-all hover:border-cyan-400">
              {frontImage ? (
                <div className="w-full flex flex-col items-center">
                  <img src={frontImage} alt="Front Side" className="max-h-32 object-contain rounded-lg border border-slate-200 mb-2 shadow-xs" />
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-cyan-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-600" /> Front Added
                    </span>
                    <button
                      onClick={() => setFrontImage(null)}
                      className="text-[11px] font-semibold text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-2 cursor-pointer" onClick={() => frontInputRef.current?.click()}>
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Upload Front Side</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Click to choose image</span>
                </div>
              )}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileRead(e.target.files[0], setFrontImage)}
              />
            </div>

            {/* Back Side Card */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center min-h-[180px] relative transition-all hover:border-cyan-400">
              {backImage ? (
                <div className="w-full flex flex-col items-center">
                  <img src={backImage} alt="Back Side" className="max-h-32 object-contain rounded-lg border border-slate-200 mb-2 shadow-xs" />
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-cyan-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-600" /> Back Added
                    </span>
                    <button
                      onClick={() => setBackImage(null)}
                      className="text-[11px] font-semibold text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center p-2 cursor-pointer" onClick={() => backInputRef.current?.click()}>
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">Upload Back Side</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Click to choose image</span>
                </div>
              )}
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileRead(e.target.files[0], setBackImage)}
              />
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            disabled={!frontImage && !backImage}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Both
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleMergeAndSubmit}
              disabled={!frontImage || !backImage || loading}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md flex items-center space-x-2 transition-all ${
                frontImage && backImage && !loading
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Merging Images...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Merge & Add Document</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
