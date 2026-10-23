import React, { useState } from 'react';
import { X, Check, Copy, ArrowRight, ShieldCheck, Smartphone, QrCode, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DirectUpiPaymentModal({
  isOpen,
  onClose,
  totalAmount,
  shopInfo,
  onConfirmPayment,
  loading
}) {
  const [upiUtr, setUpiUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [activeTab, setActiveTab] = useState('AUTO'); // 'AUTO' | 'QR' | 'INTENT'
  const [utrError, setUtrError] = useState('');

  if (!isOpen) return null;

  // Resolve Shop's UPI ID (or fallback)
  const shopUpi = shopInfo?.settings?.paymentGateway?.upiId?.trim() || 
    shopInfo?.upiId?.trim() || 
    (shopInfo?.phone ? `${shopInfo.phone.replace(/\D/g, '')}@upi` : 'secureprint@upi');
  const shopName = shopInfo?.name || 'Secure Print Shop';
  const orderRef = `ORD-${Date.now().toString().slice(-6)}`;
  const transactionNote = `PrintOrder ${orderRef}`;

  // Standard NPCI UPI URI Scheme
  const upiUrl = `upi://pay?pa=${encodeURIComponent(shopUpi)}&pn=${encodeURIComponent(shopName)}&am=${totalAmount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  // App-specific intent URLs for Android / iOS
  const gpayUrl = `gpay://upi/pay?pa=${encodeURIComponent(shopUpi)}&pn=${encodeURIComponent(shopName)}&am=${totalAmount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;
  const phonepeUrl = `phonepe://pay?pa=${encodeURIComponent(shopUpi)}&pn=${encodeURIComponent(shopName)}&am=${totalAmount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;
  const paytmUrl = `paytmmp://pay?pa=${encodeURIComponent(shopUpi)}&pn=${encodeURIComponent(shopName)}&am=${totalAmount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(shopUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleAppClick = (url) => {
    // Attempt app-specific intent, with fallback to standard upi://
    window.location.href = url;
    setTimeout(() => {
      window.location.href = upiUrl;
    }, 800);
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setUtrError('');
    
    // Optional check: if entered, UTR is usually 12 digits
    const cleanUtr = upiUtr.trim();
    if (cleanUtr && cleanUtr.length < 6) {
      setUtrError('Please enter a valid 12-digit UPI Reference / UTR Number.');
      return;
    }

    onConfirmPayment({
      method: 'UPI',
      upiUtr: cleanUtr || `UPI-DIRECT-${Date.now().toString().slice(-6)}`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md text-emerald-200 flex items-center justify-center border border-white/20 shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 bg-white/20 px-2 py-0.2 rounded-md">
                  DIRECT UPI • 0% FEES
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Pay Directly to Shop Bank
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          
          {/* Amount Hero Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-4 sm:p-4.5 border border-slate-800 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Payable Amount
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight flex items-baseline gap-1">
                <span>₹{totalAmount}</span>
                <span className="text-[11px] text-slate-400 font-sans font-medium">Exact Amount</span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs mt-0.5">
                📍 {shopName}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Extra Fee</span>
              </span>
            </div>
          </div>

          {/* Shop UPI ID Row with 1-Tap Copy */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Shopkeeper UPI VPA</span>
              <p className="font-mono font-black text-xs sm:text-sm text-slate-900 truncate">{shopUpi}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                copiedUpi
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
            </button>
          </div>

          {/* 1-Tap Mobile Intent Buttons (Visible on mobile / small screens) */}
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold text-slate-700 flex items-center justify-between">
              <span>⚡ 1-Tap Pay via Installed UPI App:</span>
              <span className="text-[10px] text-emerald-600 font-bold">Auto-fills ₹{totalAmount}</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {/* Google Pay */}
              <button
                type="button"
                onClick={() => handleAppClick(gpayUrl)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-800 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-black text-[11px] flex items-center justify-center">
                  G
                </div>
                <span>Google Pay</span>
              </button>

              {/* PhonePe */}
              <button
                type="button"
                onClick={() => handleAppClick(phonepeUrl)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 text-slate-800 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-black text-[11px] flex items-center justify-center">
                  पे
                </div>
                <span>PhonePe</span>
              </button>

              {/* Paytm */}
              <button
                type="button"
                onClick={() => handleAppClick(paytmUrl)}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-cyan-400 hover:bg-cyan-50/40 text-slate-800 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 font-black text-[11px] flex items-center justify-center">
                  P
                </div>
                <span>Paytm UPI</span>
              </button>

              {/* Any Other UPI App / BHIM */}
              <button
                type="button"
                onClick={() => handleAppClick(upiUrl)}
                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer font-extrabold"
              >
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span>Any UPI App</span>
              </button>
            </div>
          </div>

          {/* Dynamic Embedded UPI QR Code */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col items-center text-center space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>Or Scan Dynamic Order QR Code</span>
            </div>

            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm inline-block">
              <QRCodeSVG 
                value={upiUrl} 
                size={148} 
                level="M" 
                includeMargin={false}
              />
            </div>

            <p className="text-[10px] text-slate-500 font-medium max-w-xs">
              Scan with GPay, PhonePe, Paytm or camera on your phone to pay exact <strong>₹{totalAmount}</strong>
            </p>
          </div>

          {/* Step 2: Confirmation / UTR Input */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-extrabold text-slate-700 flex items-center justify-between mb-1">
                <span>Enter 12-Digit UPI Ref / UTR No. (Optional):</span>
                <span className="text-[10px] text-slate-400 font-normal">Found on UPI receipt</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 481920394812 (12 digits)"
                value={upiUtr}
                onChange={(e) => setUpiUtr(e.target.value.replace(/\s+/g, ''))}
                maxLength={20}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
              />
              {utrError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{utrError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Verifying & Placing Order...' : '✓ I HAVE PAID — PLACE PRINT ORDER'}</span>
            </button>
          </form>

        </div>

        {/* Footer Guarantee */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Instant Settlement • 100% Direct to Shopkeeper Bank Account</span>
        </div>

      </div>
    </div>
  );
}
