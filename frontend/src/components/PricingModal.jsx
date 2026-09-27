import React from 'react';
import { X, Check, ShieldCheck, Zap, Printer } from 'lucide-react';

export default function PricingModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const pricingTiers = [
    {
      size: 'A4 Paper',
      desc: 'Standard documents, assignments, forms & invoices',
      popular: true,
      rates: [
        { label: 'Black & White (Single-sided)', price: '₹2' },
        { label: 'Black & White (Double-sided)', price: '₹3' },
        { label: 'Full Colour (Single-sided)', price: '₹10' },
        { label: 'Full Colour (Double-sided)', price: '₹18' },
      ],
      badge: 'Most Common'
    },
    {
      size: 'A3 Large Paper',
      desc: 'Architectural drawings, posters, charts & blueprints',
      popular: false,
      rates: [
        { label: 'Black & White (Single-sided)', price: '₹5' },
        { label: 'Black & White (Double-sided)', price: '₹9' },
        { label: 'Full Colour (Single-sided)', price: '₹20' },
        { label: 'Full Colour (Double-sided)', price: '₹36' },
      ],
      badge: 'Large Format'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">Print & Photocopy Rates</h2>
              <p className="text-xs text-slate-300">Transparent pricing • High brightness 80 GSM paper</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all ${
                  tier.popular
                    ? 'border-cyan-500/40 bg-cyan-50/20 shadow-sm ring-1 ring-cyan-500/20'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-extrabold text-slate-900 text-base">{tier.size}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tier.popular ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tier.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">{tier.desc}</p>

                <div className="space-y-2.5">
                  {tier.rates.map((rate, rIdx) => (
                    <div key={rIdx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-600 font-medium">{rate.label}</span>
                      <span className="font-extrabold text-slate-900">{rate.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quality Assurance Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Fast 40 PPM Laser Output</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">Zero File Retention Guarantee</span>
            </div>
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <Check className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">UPI & Cash Accepted</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
}
