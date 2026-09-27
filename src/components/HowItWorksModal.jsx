import React from 'react';
import { X, Upload, Sliders, QrCode, Shield, Clock, CheckCircle } from 'lucide-react';

export default function HowItWorksModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const steps = [
    {
      num: '01',
      title: 'Upload or Capture',
      desc: 'Select PDF, Office docs or images from your phone or PC. Or use our integrated scanner to photograph physical papers.',
      icon: Upload,
      color: 'bg-cyan-50 text-cyan-600 border-cyan-200'
    },
    {
      num: '02',
      title: 'Select Print Preferences',
      desc: 'Pick your paper size (A4 / A3), Black & White or Colour, single or double sided, and quantity. See live price and pay easily.',
      icon: Sliders,
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      num: '03',
      title: 'Collect at Counter',
      desc: 'An encrypted QR code and 4-digit PIN will appear on your screen. Show it at the counter — your pages print instantly.',
      icon: QrCode,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block mb-0.5">Quick & Contactless</span>
            <h2 className="text-lg font-extrabold tracking-tight">How SecurePrint Works</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${step.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono font-black text-xs text-slate-400">{step.num}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">{step.title}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy Guarantee Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-cyan-950">100% Confidential & Secure Promise</h4>
              <p className="text-[11px] text-cyan-800/90 mt-0.5 leading-relaxed">
                Your documents are spooled through encrypted channels directly to the counter printer. Shop staff never see or keep copies on public computers, and files are permanently purged from the system within 60 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Start Printing
          </button>
        </div>

      </div>
    </div>
  );
}
