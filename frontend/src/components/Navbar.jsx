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

          {/* Customer & Shop Counter Switcher */}
          <div className="hidden md:flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setCurrentView('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                currentView === 'customer'
                  ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer Upload</span>
            </button>

            <button
              onClick={() => setCurrentView('shopkeeper')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                currentView === 'shopkeeper'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Shop Counter</span>
            </button>

            {user && ['ADMIN', 'MANAGER', 'DEVELOPER'].includes(user?.role) && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                    : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
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
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView('shopkeeper')}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
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
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => { setCurrentView('customer'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${currentView === 'customer' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Customer Upload</span>
              </button>
              <button
                onClick={() => { setCurrentView('shopkeeper'); setMobileMenuOpen(false); }}
                className={`p-2.5 rounded-xl border flex items-center gap-2 ${currentView === 'shopkeeper' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
              >
                <Store className="w-4 h-4" />
                <span>Shop Counter</span>
              </button>
              {user && ['ADMIN', 'MANAGER', 'DEVELOPER'].includes(user?.role) && (
                <button
                  onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                  className={`col-span-2 p-2.5 rounded-xl border flex items-center justify-center gap-2 ${currentView === 'admin' ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-700 border-purple-200'}`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Console</span>
                </button>
              )}
            </div>

            {user ? (
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
            ) : (
              <button
                onClick={() => { setCurrentView('shopkeeper'); setMobileMenuOpen(false); }}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs text-center cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        )}
      </header>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} currentShop={user?.shop} />
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </>
  );
}
