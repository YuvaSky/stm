import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, X, KeyRound } from 'lucide-react';
import axios from 'axios';

export default function HandoverModal({ isOpen, onClose, order, onHandoverSuccess }) {
  const [physicalJobMatch, setPhysicalJobMatch] = useState(false);
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset checkboxes when modal opens for a new order
  useEffect(() => {
    if (isOpen) {
      setPhysicalJobMatch(false);
      setCustomerConfirmed(false);
      setErrorMessage('');
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleCollectOrder = async () => {
    setErrorMessage('');
    if (!physicalJobMatch) {
      setErrorMessage('🔴 PHYSICAL PACKET MISMATCH: Confirm that the printed envelope label matches the digital Job ID.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/shopkeeper/collect-order', {
        orderId: order._id,
        physicalJobIdChecked: physicalJobMatch
      });

      if (response.data.success) {
        onHandoverSuccess(response.data);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Pinned at top */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm tracking-wide">VERIFY HANDOVER & COLLECT</h3>
              <span className="text-[10px] text-slate-400">Order verification & customer handover</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          
          {/* Order Details Banner */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/90 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DIGITAL JOB ID</span>
              <h2 className="text-xl font-black text-cyan-400 tracking-tight">{order.publicOrderId}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-300 font-semibold block">{order.userId?.name || 'Customer'}</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-bold">
                ₹{order.totalAmount} PAID
              </span>
            </div>
          </div>

          {/* Verification Step 1: Pickup PIN confirmation */}
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              1. Customer Pickup PIN Verification
            </label>
            <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/80 text-xs">
              <span className="text-slate-400">Order Pickup PIN:</span>
              <span className="font-mono font-black text-cyan-300 text-base tracking-widest">{order.rawPickupPin || order.pickupPin || '****'}</span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded">
                ✓ VERIFIED
              </span>
            </div>
          </div>

          {/* Verification Step 2: Physical Job ID Packet Match */}
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              2. Physical Packet Check (Strict Handover Rule)
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer bg-slate-950 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={physicalJobMatch}
                onChange={(e) => setPhysicalJobMatch(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-300 leading-snug">
                I have compared the physical printed envelope label <strong className="text-cyan-400">({order.publicOrderId})</strong> with this screen and confirm they match.
              </span>
            </label>
          </div>

          {/* Verification Step 3: Customer Confirmation */}
          <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              3. Customer Handover Confirmation
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer bg-slate-950 p-2.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={customerConfirmed}
                onChange={(e) => setCustomerConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 cursor-pointer shrink-0"
              />
              <span className="text-xs text-slate-300 leading-snug">
                Customer has confirmed physical receipt of their printed documents.
              </span>
            </label>
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Footer - Pinned at bottom */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleCollectOrder}
            disabled={!physicalJobMatch || !customerConfirmed || loading}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-35 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{loading ? 'Completing Handover...' : 'HAND OVER & COMPLETE'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
