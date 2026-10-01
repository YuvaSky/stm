import React, { useState, useRef } from 'react';
import { X, Printer, Crop, RotateCw, RefreshCw, Trash2, ChevronLeft, ChevronRight, Layers, LayoutGrid, Sliders, CheckCircle2, ShieldCheck, FileText, Image as ImageIcon } from 'lucide-react';

export default function CardPrintReviewModal({
  isOpen,
  onClose,
  cardData,
  onUpdateCard,
  onConfirmPrint
}) {
  const [imageType, setImageType] = useState(
    cardData?.imageType || (cardData?.pageImages?.length >= 4 ? 'MULTI_GRID' : 'CARD_PAIR')
  ); // CARD_PAIR | PASSPORT | MULTI_GRID | DOCUMENT
  const [layoutMode, setLayoutMode] = useState(cardData?.layoutMode || 'SIDE_BY_SIDE'); // SIDE_BY_SIDE | TOP_BOTTOM
  const [sizeMode, setSizeMode] = useState(cardData?.sizeMode || 'ACTUAL'); // ACTUAL | FIT_PAGE | CUSTOM
  const [customScale, setCustomScale] = useState(cardData?.customScale || 100);
  const [paperSize, setPaperSize] = useState(cardData?.paperSize || 'A4');
  const [orientation, setOrientation] = useState(cardData?.orientation || 'PORTRAIT'); // PORTRAIT | LANDSCAPE
  const [copies, setCopies] = useState(cardData?.copies || 1);
  const [marginSize, setMarginSize] = useState(cardData?.marginSize || 'NORMAL'); // COMPACT | NORMAL | WIDE
  const [cardSpacing, setCardSpacing] = useState(cardData?.cardSpacing || 20); // mm / px gap
  const [showCropMarks, setShowCropMarks] = useState(cardData?.showCropMarks ?? true);
  const [showLabels, setShowLabels] = useState(cardData?.showLabels ?? true);
  
  // Page Navigation state when multi copies produce multiple pages
  const [currentPage, setCurrentPage] = useState(1);

  // Thumbnail editing active selection
  const [activeSide, setActiveSide] = useState('FRONT'); // FRONT | BACK
  const [rotations, setRotations] = useState({ front: 0, back: 0 });

  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  if (!isOpen || !cardData) return null;

  const frontUrl = cardData.frontUrl || cardData.pageImages?.[0] || cardData.fileUrl;
  const backUrl = cardData.backUrl || cardData.pageImages?.[1] || cardData.fileUrl;
  
  const [passportCount, setPassportCount] = useState(8); // 8 | 12 | 16 | 24 copies per sheet

  // Cropping State
  const [croppingIdx, setCroppingIdx] = useState(null);
  const [cropInset, setCropInset] = useState({ top: 10, right: 10, bottom: 10, left: 10 });

  // Extract all available uploaded images dynamically
  const rawImages = cardData.pageImages?.length > 0
    ? cardData.pageImages
    : [cardData.frontUrl, cardData.backUrl, cardData.fileUrl].filter(Boolean);

  // Interactive Drag State for Corner Handles
  const [activeHandle, setActiveHandle] = useState(null);

  const handlePointerDown = (handle, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveHandle(handle);
  };

  const handlePointerMove = (e) => {
    if (!activeHandle || croppingIdx === null) return;
    const container = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - container.left, container.width));
    const y = Math.max(0, Math.min(e.clientY - container.top, container.height));

    const leftPct = Math.min(40, Math.max(0, (x / container.width) * 100));
    const topPct = Math.min(40, Math.max(0, (y / container.height) * 100));
    const rightPct = Math.min(40, Math.max(0, ((container.width - x) / container.width) * 100));
    const bottomPct = Math.min(40, Math.max(0, ((container.height - y) / container.height) * 100));

    if (activeHandle === 'tl') {
      setCropInset(prev => ({ ...prev, top: Math.round(topPct), left: Math.round(leftPct) }));
    } else if (activeHandle === 'tr') {
      setCropInset(prev => ({ ...prev, top: Math.round(topPct), right: Math.round(rightPct) }));
    } else if (activeHandle === 'bl') {
      setCropInset(prev => ({ ...prev, bottom: Math.round(bottomPct), left: Math.round(leftPct) }));
    } else if (activeHandle === 'br') {
      setCropInset(prev => ({ ...prev, bottom: Math.round(bottomPct), right: Math.round(rightPct) }));
    }
  };

  const handlePointerUp = () => {
    setActiveHandle(null);
  };

  const handleApplyCrop = () => {
    if (croppingIdx === null) return;
    const imgUrl = allUploadedImages[croppingIdx];
    const rotation = imageRotations[croppingIdx] || 0;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imgUrl;
    image.onload = () => {
      const origW = image.width;
      const origH = image.height;

      const cropX = (cropInset.left / 100) * origW;
      const cropY = (cropInset.top / 100) * origH;
      const cropW = Math.max(10, origW * (1 - (cropInset.left + cropInset.right) / 100));
      const cropH = Math.max(10, origH * (1 - (cropInset.top + cropInset.bottom) / 100));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Account for 90/180/270 deg rotation during canvas crop export
      if (rotation % 180 === 90) {
        canvas.width = cropH;
        canvas.height = cropW;
      } else {
        canvas.width = cropW;
        canvas.height = cropH;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      if (rotation % 180 === 90) {
        ctx.drawImage(image, cropX, cropY, cropW, cropH, -cropH / 2, -cropW / 2, cropH, cropW);
      } else {
        ctx.drawImage(image, cropX, cropY, cropW, cropH, -cropW / 2, -cropH / 2, cropW, cropH);
      }

      const croppedDataUrl = canvas.toDataURL('image/png');

      if (onUpdateCard) {
        const updatedImages = [...allUploadedImages];
        updatedImages[croppingIdx] = croppedDataUrl;
        onUpdateCard({
          ...cardData,
          pageImages: updatedImages,
          frontUrl: updatedImages[0] || cardData.frontUrl,
          backUrl: updatedImages[1] || cardData.backUrl
        });
      }
      setCroppingIdx(null);
    };
  };

  // Fallback to empty array if none provided
  const allUploadedImages = rawImages.length > 0 ? rawImages : [];

  // Per-image rotation tracking (dynamic object indexed by image index)
  const [imageRotations, setImageRotations] = useState({});

  const handleRotateImage = (idx) => {
    setImageRotations(prev => ({
      ...prev,
      [idx]: ((prev[idx] || 0) + 90) % 360
    }));
  };

  const handleDynamicReplace = (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (onUpdateCard) {
        const updatedImages = [...allUploadedImages];
        updatedImages[idx] = event.target.result;
        onUpdateCard({
          ...cardData,
          pageImages: updatedImages,
          frontUrl: updatedImages[0] || cardData.frontUrl,
          backUrl: updatedImages[1] || cardData.backUrl
        });
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !cardData) return null;

  // Calculate grid columns and total pages based on count of uploaded images
  const itemsPerPage = allUploadedImages.length <= 2 ? allUploadedImages.length : (orientation === 'LANDSCAPE' ? 6 : 4);
  const totalPages = Math.max(1, Math.ceil((allUploadedImages.length * copies) / Math.max(1, itemsPerPage)));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
      
      {/* Interactive Touch Crop Modal Overlay */}
      {croppingIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Crop className="w-5 h-5 text-cyan-600" />
                <h3 className="font-extrabold text-base text-slate-900">Interactive Touch & Drag Crop #{croppingIdx + 1}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleRotateImage(croppingIdx)}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-extrabold text-xs border border-cyan-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Rotate Image 90°"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Rotate 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCroppingIdx(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Crop Canvas Preview Container with Direct Image Bounds */}
            <div
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="relative w-full h-72 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden p-2 select-none touch-none"
            >
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                <img
                  src={allUploadedImages[croppingIdx]}
                  alt="Crop preview"
                  style={{ transform: `rotate(${imageRotations[croppingIdx] || 0}deg)` }}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 pointer-events-none"
                />
                <div
                  style={{
                    top: `${cropInset.top}%`,
                    right: `${cropInset.right}%`,
                    bottom: `${cropInset.bottom}%`,
                    left: `${cropInset.left}%`
                  }}
                  className="absolute border-2 border-cyan-400 bg-cyan-500/20 rounded-xs shadow-2xl transition-all"
                >
                  <div className="absolute inset-0 border border-dashed border-white/80 pointer-events-none" />
                  
                  {/* 4 Corner Touch Drag Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDown('tl', e)}
                    className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white absolute -top-2.5 -left-2.5 shadow-md cursor-nwse-resize active:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown('tr', e)}
                    className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white absolute -top-2.5 -right-2.5 shadow-md cursor-nesw-resize active:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown('bl', e)}
                    className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white absolute -bottom-2.5 -left-2.5 shadow-md cursor-nesw-resize active:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => handlePointerDown('br', e)}
                    className="w-5 h-5 rounded-full bg-cyan-500 border-2 border-white absolute -bottom-2.5 -right-2.5 shadow-md cursor-nwse-resize active:scale-125 transition-transform"
                  />
                </div>
              </div>
            </div>

            {/* Clean Modal Action Footer */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCropInset({ top: 0, right: 0, bottom: 0, left: 0 })}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Reset Crop
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCroppingIdx(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCrop}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>Apply Crop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[88vh] max-h-[88vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">
                  Print Studio Preview
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                Dynamic Print Review & Sheet Layout
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0 min-h-0">
          
          {/* Left Controls & Settings Panel (5 Columns) */}
          <div className="md:col-span-5 p-4 sm:p-5 bg-slate-50 border-r border-slate-200 space-y-4 overflow-y-auto max-h-full">
            
            {/* Dynamic Source Images Thumbnails (Renders all uploaded images, 1, 2, or N) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Loaded Source Images</span>
                <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                  {allUploadedImages.length} Image(s)
                </span>
              </label>

              {/* Fully Dynamic Thumbnail Grid for ANY count of images */}
              <div className={`grid ${allUploadedImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2.5 max-h-60 overflow-y-auto p-0.5`}>
                {allUploadedImages.map((imgUrl, idx) => (
                  <div key={idx} className="p-2 rounded-2xl border border-slate-200 bg-white hover:border-cyan-300 transition-all shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-cyan-700 uppercase tracking-wide">
                        {allUploadedImages.length === 2 ? (idx === 0 ? 'FRONT SIDE' : 'BACK SIDE') : `IMAGE #${idx + 1}`}
                      </span>
                    </div>
                    <div className="w-full h-20 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden mb-1.5 relative">
                      <img
                        src={imgUrl}
                        alt={`Uploaded Image ${idx + 1}`}
                        style={{ transform: `rotate(${imageRotations[idx] || 0}deg)` }}
                        className="max-h-full max-w-full object-contain transition-transform duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleRotateImage(idx)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors flex-1 justify-center"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Rotate</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCroppingIdx(idx);
                          setCropInset({ top: 10, right: 10, bottom: 10, left: 10 });
                        }}
                        className="px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold border border-cyan-200 flex items-center gap-1 transition-colors flex-1 justify-center"
                        title="Crop photo margins"
                      >
                        <Crop className="w-3 h-3" />
                        <span>Crop</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Print Document Type</span>
              </label>
              <select
                value={imageType}
                onChange={(e) => setImageType(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="CARD_PAIR">Standard Card / Photos Layout</option>
                <option value="PASSPORT">Passport Photo Grid (Multiple Copies on Single Sheet)</option>
                <option value="MULTI_GRID">Full Multi-Grid (All Images on Sheet)</option>
                <option value="DOCUMENT">Standard Document Layout</option>
              </select>
            </div>

            {/* Passport Photo Count Selector */}
            {imageType === 'PASSPORT' && (
              <div className="space-y-1.5 p-2.5 bg-cyan-50/70 rounded-2xl border border-cyan-200">
                <label className="text-xs font-extrabold text-cyan-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Passport Copies Per Page</span>
                  <span className="text-[10px] font-black text-cyan-700">{passportCount} Photos</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[8, 12, 16, 24].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setPassportCount(cnt)}
                      className={`py-1.5 rounded-xl border text-center font-black text-xs transition-all ${
                        passportCount === cnt
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layout Options */}
            {allUploadedImages.length >= 2 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Arrangement Layout</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('SIDE_BY_SIDE')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      layoutMode === 'SIDE_BY_SIDE'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span className="text-xs font-bold">Side-by-Side</span>
                      {layoutMode === 'SIDE_BY_SIDE' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block">Horizontal placement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLayoutMode('TOP_BOTTOM')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      layoutMode === 'TOP_BOTTOM'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-900 font-bold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-0.5">
                      <span className="text-xs font-bold">Top-and-Bottom</span>
                      {layoutMode === 'TOP_BOTTOM' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 block">Vertical placement</span>
                  </button>
                </div>
              </div>
            )}

            {/* Card & Photo Sizing Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Print Sizing Preset</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'ACTUAL', label: 'Actual Size' },
                  { id: 'FIT_PAGE', label: 'Fit to Page' },
                  { id: 'CUSTOM', label: 'Custom Scale' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSizeMode(mode.id)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      sizeMode === mode.id
                        ? 'bg-cyan-600 text-white font-bold border-cyan-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px]">{mode.label}</div>
                  </button>
                ))}
              </div>

              {sizeMode === 'CUSTOM' && (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1 mt-1">
                  <div className="flex justify-between text-xs text-slate-700">
                    <span>Custom Scale Ratio:</span>
                    <span className="font-bold text-cyan-700">{customScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    value={customScale}
                    onChange={(e) => setCustomScale(Number(e.target.value))}
                    className="w-full accent-cyan-600"
                  />
                </div>
              )}
            </div>

            {/* Paper, Orientation, Copies, Margins Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Paper Size</label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="A4">A4 Paper</option>
                  <option value="A5">A5 Paper</option>
                  <option value="LETTER">US Letter</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Orientation</label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="PORTRAIT">Portrait</option>
                  <option value="LANDSCAPE">Landscape</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Copies</label>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-5 h-5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-200"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center bg-transparent text-xs font-extrabold text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-5 h-5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Margin Size</label>
                <select
                  value={marginSize}
                  onChange={(e) => setMarginSize(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                >
                  <option value="COMPACT">Compact</option>
                  <option value="NORMAL">Normal</option>
                  <option value="WIDE">Wide</option>
                </select>
              </div>
            </div>

            {/* Print Shop Mark Toggles */}
            <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2">
                <Crop className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-xs font-bold text-slate-700">Show Cut / Crop Marks</span>
              </div>
              <input
                type="checkbox"
                checked={showCropMarks}
                onChange={(e) => setShowCropMarks(e.target.checked)}
                className="w-4 h-4 accent-cyan-600 cursor-pointer"
              />
            </div>

          </div>

          {/* Right Realistic A4 Paper Preview Canvas (7 Columns) */}
          <div className="md:col-span-7 bg-slate-100 p-3 sm:p-4 flex flex-col items-center justify-between relative overflow-hidden h-full">
            
            {/* Canvas Header Bar */}
            <div className="w-full flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5 shrink-0">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-800 font-extrabold uppercase text-[11px] tracking-wider">REALISTIC PRINT SHEET PREVIEW</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold text-slate-700 shadow-2xs">
                  {paperSize} • {orientation}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-md px-1.5 py-0.5 text-[10px]">
                    <button
                      type="button"
                      disabled={safeCurrentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="text-slate-600 hover:text-slate-900 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-slate-800 font-bold">Page {safeCurrentPage} of {totalPages}</span>
                    <button
                      type="button"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="text-slate-600 hover:text-slate-900 disabled:opacity-30"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Realistic A4 Paper Viewport Container */}
            <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden min-h-0">
              <div
                style={{
                  aspectRatio: orientation === 'LANDSCAPE' ? '297 / 210' : '210 / 297',
                }}
                className="h-full max-h-full max-w-full bg-white rounded-md shadow-xl border border-slate-300 text-slate-900 p-3 sm:p-4 flex flex-col justify-between relative transition-all duration-300 overflow-hidden"
              >
                {/* Clean Printable Sheet Container */}
                <div className="w-full h-full flex flex-col justify-center relative my-auto">
                  
                  {/* Outer Sheet Label */}
                  <div className="absolute top-0 right-1 text-[7px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">
                    {paperSize} PRINT AREA
                  </div>

                  {/* Fully Dynamic Rendering Engine with Pagination */}
                  {imageType === 'PASSPORT' && allUploadedImages.length > 0 ? (
                    /* Passport Photo Layout Grid (Renders passport copies on single sheet) */
                    <div className={`grid ${passportCount > 8 ? 'grid-cols-4 sm:grid-cols-4 gap-1.5' : 'grid-cols-4 gap-2'} w-full max-w-[95%] mx-auto my-auto p-1`}>
                      {Array.from({ length: passportCount }).map((_, pIdx) => {
                        const imgToUse = allUploadedImages[(safeCurrentPage - 1) % allUploadedImages.length] || allUploadedImages[0];
                        const imgIdx = (safeCurrentPage - 1) % allUploadedImages.length;
                        return (
                          <div key={pIdx} className="flex flex-col items-center">
                            <div className="relative w-full aspect-[35/45] bg-white border border-slate-300 rounded overflow-hidden shadow-2xs">
                              {showCropMarks && (
                                <div className="absolute inset-0 border border-dashed border-rose-400/80 pointer-events-none" />
                              )}
                              <img
                                src={imgToUse}
                                alt="Passport Photo"
                                style={{ transform: `rotate(${imageRotations[imgIdx] || 0}deg)` }}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : allUploadedImages.length === 1 ? (
                    /* Single Image Layout (Full Size Centered directly on sheet without container box) */
                    <div className="flex flex-col items-center justify-center w-full h-full my-auto relative p-2">
                      {showLabels && (
                        <span className="text-[8.5px] font-extrabold text-slate-500 uppercase mb-1 tracking-wider">SINGLE DOCUMENT IMAGE</span>
                      )}
                      <div className="relative max-w-full max-h-[82%] flex items-center justify-center overflow-hidden">
                        {showCropMarks && (
                          <div className="absolute -inset-1 border border-dashed border-rose-400/80 pointer-events-none" />
                        )}
                        <img
                          src={allUploadedImages[0]}
                          alt="Single Image"
                          style={{
                            transform: `rotate(${imageRotations[0] || 0}deg) scale(${sizeMode === 'CUSTOM' ? customScale / 100 : sizeMode === 'FIT_PAGE' ? 1.1 : 1.0})`
                          }}
                          className="max-w-full max-h-full object-contain rounded-xs shadow-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Dynamic Page Slice Rendering (Supports multi-page grid pagination) */
                    (() => {
                      const startIndex = (safeCurrentPage - 1) * itemsPerPage;
                      const pageImages = allUploadedImages.slice(startIndex, startIndex + itemsPerPage);

                      if (layoutMode === 'SIDE_BY_SIDE') {
                        return (
                          <div className={`grid ${pageImages.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'} gap-2.5 w-full h-full max-h-full my-auto items-center justify-center p-1 min-h-0 overflow-hidden`}>
                            {pageImages.map((imgUrl, pIdx) => {
                              const globalIdx = startIndex + pIdx;
                              return (
                                <div key={globalIdx} className="flex flex-col items-center justify-center relative max-h-full max-w-full min-h-0 overflow-hidden shrink">
                                  {showLabels && (
                                    <span className="text-[8.5px] font-extrabold text-slate-500 uppercase mb-0.5 tracking-wider shrink-0">
                                      {allUploadedImages.length === 2 ? (globalIdx === 0 ? 'FRONT' : 'BACK') : `PHOTO #${globalIdx + 1}`}
                                    </span>
                                  )}
                                  <div className="relative max-w-full max-h-[85%] flex items-center justify-center shrink min-h-0 overflow-hidden">
                                    {showCropMarks && (
                                      <div className="absolute -inset-1 border border-dashed border-rose-400/80 pointer-events-none rounded-xs z-10" />
                                    )}
                                    <img
                                      src={imgUrl}
                                      alt={`Image ${globalIdx + 1}`}
                                      style={{
                                        transform: `rotate(${imageRotations[globalIdx] || 0}deg) scale(${sizeMode === 'CUSTOM' ? customScale / 100 : 1.0})`
                                      }}
                                      className="max-w-full max-h-full object-contain rounded-xs shadow-xs"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex flex-col items-center justify-around gap-2 w-full h-full max-h-full my-auto p-1 min-h-0 overflow-hidden">
                            {pageImages.map((imgUrl, pIdx) => {
                              const globalIdx = startIndex + pIdx;
                              return (
                                <div key={globalIdx} className="flex flex-col items-center justify-center relative w-full max-h-[44%] shrink min-h-0 overflow-hidden">
                                  {showLabels && (
                                    <span className="text-[8.5px] font-extrabold text-slate-500 uppercase mb-0.5 tracking-wider shrink-0">
                                      {allUploadedImages.length === 2 ? (globalIdx === 0 ? 'FRONT' : 'BACK') : `PHOTO #${globalIdx + 1}`}
                                    </span>
                                  )}
                                  <div className="relative max-w-[85%] max-h-[85%] flex items-center justify-center shrink min-h-0 overflow-hidden">
                                    {showCropMarks && (
                                      <div className="absolute -inset-1 border border-dashed border-rose-400/80 pointer-events-none rounded-xs z-10" />
                                    )}
                                    <img
                                      src={imgUrl}
                                      alt={`Image ${globalIdx + 1}`}
                                      style={{
                                        transform: `rotate(${imageRotations[globalIdx] || 0}deg) scale(${sizeMode === 'CUSTOM' ? customScale / 100 : 1.0})`
                                      }}
                                      className="max-w-full max-h-full object-contain rounded-xs shadow-xs"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    })()
                  )}

                  {/* Watermark Note at bottom of sheet */}
                  <div className="text-center pt-2">
                    <p className="text-[6.5px] font-extrabold text-slate-300 tracking-wide uppercase">
                      SECURE PRINT EXPRESS • PROPORTIONAL PRINT PREVIEW
                    </p>
                  </div>

                </div>

              </div>
            </div>

            {/* Bottom Note */}
            <p className="text-[9.5px] text-slate-500 font-medium text-center mt-1 shrink-0">
              Single A4 sheet view. Content fits within page boundaries.
            </p>

          </div>

        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready for single-sheet print job</span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Back to Editing
            </button>
            <button
              type="button"
              onClick={() => {
                if (onConfirmPrint) {
                  onConfirmPrint({
                    layoutMode,
                    sizeMode,
                    customScale,
                    paperSize,
                    orientation,
                    copies,
                    marginSize,
                    cardSpacing,
                    showCropMarks,
                    rotations: imageRotations
                  });
                }
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-cyan-600 hover:bg-cyan-500 text-white shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Confirm & Print Document</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
