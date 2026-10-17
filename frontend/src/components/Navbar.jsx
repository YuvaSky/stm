import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Printer, Shield, User, LogOut, Store, Smartphone, Menu, X, HelpCircle, FileText, ArrowLeft, Cpu } from 'lucide-react';
import PricingModal from './PricingModal';
import HowItWorksModal from './HowItWorksModal';

export default function Navbar({ currentView, setCurrentView }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const isStaffOrAdmin = user && ['STAFF', 'MANAGER', 'ADMIN', 'DEVELOPER'].includes(user.role);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand logo & Title */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={() => {
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.has('shop') || urlParams.has('store')) {
                setCurrentView('customer');
              } else {
                setCurrentView('shopkeeper');
              }
            }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 ${
              currentView === 'shopkeeper'
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-700 shadow-blue-600/20'
                : 'bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-cyan-600/20'
            }`}>
              {currentView === 'shopkeeper' ? (
                <Store className="w-5 h-5 text-white" />
              ) : (
                <Printer className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                SECURE<span className={currentView === 'shopkeeper' ? 'text-blue-600' : 'text-cyan-600'}>PRINT</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                  currentView === 'shopkeeper'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-cyan-100 text-cyan-700 border-cyan-200'
                }`}>
                  {currentView === 'shopkeeper' ? 'COUNTER' : 'EXPRESS'}
                </span>
              </span>
              <p className="text-[9px] text-slate-500 font-medium hidden sm:block">
                {currentView === 'shopkeeper'
                  ? 'Shopkeeper Queue & Spooler Operations'
                  : 'Instant Self-Service Counter Printing'}
              </p>
            </div>
          </div>

          {/* Center Navigation Bar */}
          <div className="hidden md:flex items-center space-x-2">
            {currentView === 'shopkeeper' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs font-bold">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Shop Counter Desk • Operator Sign-In</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-xs font-semibold text-slate-600">
                <button
                  onClick={() => { setCurrentView('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-3 py-1.5 rounded-lg text-cyan-700 font-bold bg-cyan-50/60 cursor-pointer"
                >
                  Express Print
                </button>
                <button
                  onClick={() => setHowItWorksOpen(true)}
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  How It Works
                </button>
                <button
                  onClick={() => setPricingOpen(true)}
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Print Rates
                </button>
              </div>
            )}
          </div>

          {/* Right Action / Profile with Working Logout */}
          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  {(user.shopName || user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {user.shopName || user.name}
                  </p>
                  <span className="text-[10px] text-blue-600 font-semibold uppercase">{user.role}</span>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to log out?')) {
                      logout();
                      setCurrentView('shopkeeper');
                    }
                  }}
                  title="Sign out of current account"
                  className="ml-2 px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Logout</span>
                </button>
              </div>
            ) : currentView === 'shopkeeper' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-blue-800 text-xs font-bold">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Shop Counter Portal</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-50/80 border border-cyan-200/60 text-cyan-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Self-Service Print Desk</span>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {user.role}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
            {currentView === 'customer' ? (
              <div className="space-y-2">
                <button
                  onClick={() => { setCurrentView('customer'); setMobileMenuOpen(false); }}
                  className="w-full text-left p-2.5 rounded-xl bg-cyan-600 text-white font-bold text-xs"
                >
                  Express Print Store
                </button>
                <button
                  onClick={() => { setHowItWorksOpen(true); setMobileMenuOpen(false); }}
                  className="w-full text-left p-2.5 rounded-xl text-slate-700 bg-slate-50 font-semibold text-xs"
                >
                  How It Works
                </button>
                <button
                  onClick={() => { setPricingOpen(true); setMobileMenuOpen(false); }}
                  className="w-full text-left p-2.5 rounded-xl text-slate-700 bg-slate-50 font-semibold text-xs"
                >
                  Print Rates & Pricing
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-800 font-bold text-xs flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-600" />
                  <span>Shop Counter Portal</span>
                </div>
              </div>
            )}

            {user && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{user.name}</p>
                  <p className="text-[10px] text-blue-600 font-semibold uppercase">{user.role}</p>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); setCurrentView('shopkeeper'); }}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} currentShop={user?.shop} />
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </>
  );
}
