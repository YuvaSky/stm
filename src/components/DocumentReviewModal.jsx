import React, { useState } from 'react';
import { X, Eye, FileText, CheckCircle, ExternalLink, Printer, Layers, Copy, Trash2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function DocumentReviewModal({ isOpen, onClose, document: doc, onDeleteDocument, onToggleCombine2On1 }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  if (!isOpen || !doc) return null;

  const totalPages = doc.totalPages || doc.pageCount || 1;
  const printPages = doc.selectedPages?.length || doc.pageCount || 1;
  const pageRange = doc.pageRange || 'ALL';

  // Support array of page previews (for multi-page image/scans) or single fileUrl
  const pageImages = doc.pageImages || (doc.fileUrl ? [doc.fileUrl] : []);
  const activePreviewUrl = pageImages[currentPageIndex] || doc.fileUrl;

  const handlePrevPage = () => {
    setCurrentPageIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Document Review & Preview</span>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate">{doc.originalFileName}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onDeleteDocument && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to remove this document?')) {
                    onDeleteDocument(doc.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white font-extrabold text-xs shadow-xs flex items-center space-x-1.5 transition-all"
                title="Delete this document"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Print Specification Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Pages to Print</span>
              <span className="text-lg font-black text-cyan-700">
                {printPages} <span className="text-xs font-normal text-slate-500">/ {totalPages}</span>
              </span>
              <p className="text-[10px] text-slate-500 truncate mt-0.5" title={pageRange}>
                Range: {pageRange}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Paper & Sides</span>
              <span className="text-sm font-extrabold text-slate-900 block">{doc.paperSize || 'A4'} Paper</span>
              <span className="text-[10px] font-semibold text-slate-500">
                {doc.sides === 'DOUBLE' ? '2-Sided (Duplex)' : '1-Sided (Single)'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Colour Mode</span>
              <span className={`text-sm font-extrabold block ${doc.colorMode === 'COLOUR' ? 'text-cyan-600' : 'text-slate-800'}`}>
                {doc.colorMode === 'COLOUR' ? 'Full Colour' : 'Black & White'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">Laser Print</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Quantity</span>
              <span className="text-lg font-black text-slate-900">{doc.copies || 1}</span>
              <span className="text-[10px] font-semibold text-slate-500 block">Copy set(s)</span>
            </div>
          </div>

          {/* 2-Images-On-1-Page Merge Toggle Option */}
          {onToggleCombine2On1 && totalPages >= 2 && (
            <div className="p-3.5 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 rounded-2xl border border-cyan-200 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 block">Print 2 Images on 1 Page (Front & Back)</span>
                  <span className="text-[11px] text-slate-600 block">Combine front & back photos side-by-side onto 1 sheet</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleCombine2On1(doc.id)}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-xs transition-all ${
                  doc.combine2On1
                    ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {doc.combine2On1 ? '✓ 2-on-1 Enabled' : 'Enable 2-on-1'}
              </button>
            </div>
          )}

          {/* Pagination & Live Document Preview Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-600" />
                Live Document Preview
              </span>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPageIndex === 0}
                    className="p-1 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold text-slate-800">
                    Page {currentPageIndex + 1} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPageIndex >= totalPages - 1}
                    className="p-1 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 hover:underline"
                >
                  <span>Open Full</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Preview Box */}
            <div className="w-full h-80 sm:h-96 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden relative shadow-inner">
              {activePreviewUrl ? (
                doc.fileType === 'pdf' ? (
                  <iframe
                    src={`${activePreviewUrl}#page=${currentPageIndex + 1}&toolbar=0&navpanes=0`}
                    title="PDF Document Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900/5">
                    <img
                      src={activePreviewUrl}
                      alt={`Page ${currentPageIndex + 1} preview`}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                    />
                  </div>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <FileText className="w-12 h-12 mb-2 stroke-1" />
                  <p className="text-xs font-semibold text-slate-600">Preview generated on upload</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{doc.originalFileName}</p>
                </div>
              )}
            </div>

            {/* Page Thumbnails Bar if multiple pages */}
            {totalPages > 1 && pageImages.length > 1 && (
              <div className="flex items-center space-x-2 overflow-x-auto py-2">
                {pageImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentPageIndex(idx)}
                    className={`w-14 h-18 rounded-lg border-2 overflow-hidden flex-shrink-0 relative transition-all ${
                      currentPageIndex === idx
                        ? 'border-cyan-600 shadow-md ring-2 ring-cyan-400/30 scale-105'
                        : 'border-slate-200 hover:border-slate-300 opacity-70'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-white text-[9px] font-extrabold text-center py-0.5">
                      P.{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Verify pages before placing order.
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Confirm & Save Settings
          </button>
        </div>

      </div>
    </div>
  );
}
