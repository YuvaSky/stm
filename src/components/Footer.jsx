import React, { useState } from 'react';
import { Printer, Shield, Lock, Zap, Clock, Store, HelpCircle, FileText } from 'lucide-react';
import PricingModal from './PricingModal';
import HowItWorksModal from './HowItWorksModal';

export default function Footer({ currentView, setCurrentView }) {
  const [pricingOpen, setPricingOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-slate-200 mt-12 transition-all">
        {/* Trust Badges Banner */}
        <div className="border-b border-slate-100 bg-slate-50/50 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-100/80 text-cyan-700 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Encrypted Print Spooling</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Documents are transmitted over encrypted TLS channels directly to the counter printer.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Zero Retention Policy</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  All temporary print files are automatically and permanently purged within 60 minutes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Express Counter Pickup</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  No waiting in queues or sharing files on WhatsApp. Scan your QR and collect instantly.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Main Footer Links & Copyright */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Brand Information */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-xs">
                  <Printer className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                  SECURE<span className="text-cyan-600">PRINT</span>
                  <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-700">
                    EXPRESS
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                Next-generation self-service express printing & photocopy station with zero document mix-up guarantee.
              </p>
            </div>

            {/* Links & Portals */}
            <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-600">
              <button
                onClick={() => { setCurrentView('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="hover:text-cyan-700 transition-colors"
              >
                Print Documents
              </button>
              
              <button
                onClick={() => setHowItWorksOpen(true)}
                className="hover:text-cyan-700 transition-colors flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                How It Works
              </button>

              <button
                onClick={() => setPricingOpen(true)}
                className="hover:text-cyan-700 transition-colors flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Pricing Rates
              </button>

              <span className="text-slate-300">|</span>

              {/* Staff / Shopkeeper portal link */}
              <button
                onClick={() => {
                  setCurrentView('shopkeeper');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-blue-700 transition-colors flex items-center gap-1 text-slate-500 hover:text-slate-800"
              >
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>Shopkeeper Portal</span>
              </button>
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>© {new Date().getFullYear()} SecurePrint Express. All rights reserved.</p>
            <div className="flex items-center space-x-4">
              <span>Zero-Leakage Privacy Assured</span>
              <span>•</span>
              <span>100% Confidential Self-Service</span>
            </div>
          </div>
        </div>
      </footer>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </>
  );
}
