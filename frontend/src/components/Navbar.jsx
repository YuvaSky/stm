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
              if (isStaffOrAdmin) {
                setCurrentView('shopkeeper');
              } else {
                setCurrentView('customer');
              }
            }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-600/20 shrink-0">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                SECURE<span className="text-cyan-600">PRINT</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                  EXPRESS
                </span>
              </span>
              <p className="text-[9px] text-slate-500 font-medium hidden sm:block">Instant Self-Service Counter Printing</p>
            </div>
          </div>

          {/* Navigation Links for Customer (or Staff Controls if Logged In) */}
          <div className="hidden md:flex items-center space-x-2">
            
            {/* If Staff / Admin is logged in, show their management tabs without Customer Store */}
            {isStaffOrAdmin ? (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setCurrentView('shopkeeper')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    currentView === 'shopkeeper'
                      ? 'bg-blue-600 text-white shadow font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Store className="w-3.5 h-3.5" />
                  Shop Queue
                </button>

                {['ADMIN', 'MANAGER', 'DEVELOPER'].includes(user.role) && (
                  <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      currentView === 'admin'
                        ? 'bg-purple-600 text-white shadow font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Config
                  </button>
                )}

                {user.role === 'DEVELOPER' && (
                  <button
                    onClick={() => setCurrentView('developer')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      currentView === 'developer'
                        ? 'bg-cyan-600 text-white shadow font-bold'
                        : 'text-cyan-700 hover:text-cyan-900'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Developer Portal
                  </button>
                )}
              </div>
            ) : (
              /* Public / Customer Navigation Links */
              <div className="flex items-center space-x-1 text-xs font-semibold text-slate-600">
                <button
                  onClick={() => { setCurrentView('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    currentView === 'customer' ? 'text-cyan-700 font-bold bg-cyan-50/60' : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Express Print
                </button>
                <button
                  onClick={() => setHowItWorksOpen(true)}
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  How It Works
                </button>
                <button
                  onClick={() => setPricingOpen(true)}
                  className="px-3 py-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Print Rates
                </button>
              </div>
            )}

          </div>

          {/* Right Action / Profile */}
          <div className="hidden md:flex items-center space-x-3">
            {isStaffOrAdmin ? (
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.name}</p>
                  <span className="text-[10px] text-blue-600 font-semibold uppercase">{user.role}</span>
                </div>
                <button
                  onClick={() => { logout(); setCurrentView('customer'); }}
                  title="Sign out"
                  className="ml-2 text-slate-400 hover:text-rose-600 transition-colors p-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* If viewing shopkeeper login page without staff auth, show back to customer */
              currentView !== 'customer' ? (
                <button
                  onClick={() => setCurrentView('customer')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Customer Store</span>
                </button>
              ) : (
                /* Discreet Staff / Shopkeeper & Admin Entry */
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView('shopkeeper')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-all"
                  title="Shopkeeper / Counter Staff Portal"
                >
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <span>Shop Staff</span>
                </button>

                <button
                  onClick={() => setCurrentView('admin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-all shadow-xs"
                  title="Super Admin Portal & User Registration"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span>Admin Portal</span>
                </button>
              </div>
              )
            )}
          </div>

          {/* Mobile Hamburger Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {isStaffOrAdmin && (
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

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-3 shadow-lg animate-fade-in">
            <div className="grid grid-cols-1 gap-2 text-xs font-semibold">
              {!isStaffOrAdmin ? (
                <>
                  <button
                    onClick={() => { setCurrentView('customer'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                      currentView === 'customer' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-700 bg-slate-50'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Express Print Store
                  </button>

                  <button
                    onClick={() => { setHowItWorksOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-slate-700 bg-slate-50 hover:bg-slate-100"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    How It Works
                  </button>

                  <button
                    onClick={() => { setPricingOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-slate-700 bg-slate-50 hover:bg-slate-100"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Print Rates & Pricing
                  </button>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <button
                      onClick={() => { setCurrentView('shopkeeper'); setMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold"
                    >
                      <Store className="w-4 h-4 text-slate-500" />
                      <span>Shopkeeper / Counter Staff Portal</span>
                    </button>

                    <button
                      onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                      className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 text-xs font-extrabold border border-purple-200"
                    >
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Super Admin Portal</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                    Staff & Shop Operations
                  </div>
                  <button
                    onClick={() => { setCurrentView('shopkeeper'); setMobileMenuOpen(false); }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                      currentView === 'shopkeeper' ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 bg-slate-50'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    Shopkeeper Queue
                  </button>

                  {['ADMIN', 'MANAGER'].includes(user.role) && (
                    <button
                      onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                        currentView === 'admin' ? 'bg-purple-600 text-white font-bold' : 'text-slate-700 bg-slate-50'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      Admin Configuration
                    </button>
                  )}

                  <button
                    onClick={() => { logout(); setCurrentView('customer'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out ({user.name})
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <PricingModal isOpen={pricingOpen} onClose={() => setPricingOpen(false)} />
      <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
    </>
  );
}
