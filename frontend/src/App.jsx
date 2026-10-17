import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CustomerApp from './pages/CustomerApp';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import AdminPortal from './pages/AdminPortal';
import DeveloperAdminPortal from './pages/DeveloperAdminPortal';
import axios from 'axios';

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

function MainApp() {
  const { user } = useAuth();
  const isStaffOrAdmin = user && ['STAFF', 'MANAGER', 'ADMIN', 'DEVELOPER'].includes(user.role);

  const [currentView, setCurrentView] = useState(() => {
    // If scanned via counter QR link (?shop=...), always open customer upload flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('shop') || urlParams.has('store')) {
      return 'customer';
    }

    // Check URL pathname or query params
    if (window.location.pathname === '/developer' || window.location.pathname === '/dev' || window.location.search.includes('portal=developer')) {
      return 'developer';
    }
    if (window.location.pathname === '/admin' || window.location.search.includes('portal=admin')) {
      return 'admin';
    }
    if (window.location.pathname === '/customer' || window.location.pathname === '/upload' || window.location.search.includes('portal=customer')) {
      return 'customer';
    }
    if (window.location.pathname === '/shop' || window.location.pathname === '/shopkeeper' || window.location.search.includes('portal=shop')) {
      return 'shopkeeper';
    }

    // Default: Open Shopkeeper Counter portal / login
    return 'shopkeeper';
  });

  // Keep state in sync with URL location if needed
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('shop') || urlParams.has('store')) {
        setCurrentView('customer');
      } else if (window.location.pathname === '/developer' || window.location.pathname === '/dev' || window.location.search.includes('portal=developer')) {
        setCurrentView('developer');
      } else if (window.location.pathname === '/admin' || window.location.search.includes('portal=admin')) {
        setCurrentView('admin');
      } else if (window.location.pathname === '/customer' || window.location.pathname === '/upload' || window.location.search.includes('portal=customer')) {
        setCurrentView('customer');
      } else if (window.location.pathname === '/shop' || window.location.pathname === '/shopkeeper' || window.location.search.includes('portal=shop')) {
        setCurrentView('shopkeeper');
      } else {
        setCurrentView('shopkeeper');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToView = (viewName) => {
    setCurrentView(viewName);
    const url = new URL(window.location.href);
    url.searchParams.set('portal', viewName);
    window.history.pushState({}, '', url.toString());
  };

  // Separate Standalone Developer Portal Page
  if (currentView === 'developer') {
    return (
      <div className="min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
        <DeveloperAdminPortal setCurrentView={navigateToView} />
      </div>
    );
  }

  // Standalone Admin Portal Page
  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
        <AdminPortal setCurrentView={navigateToView} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation Bar */}
      <Navbar currentView={currentView} setCurrentView={navigateToView} />

      {/* Main View Container */}
      <main className="flex-1 bg-slate-50">
        {currentView === 'customer' && <CustomerApp setCurrentView={navigateToView} />}
        {currentView === 'shopkeeper' && <ShopkeeperDashboard setCurrentView={navigateToView} />}
      </main>

      {/* Professional Footer */}
      <Footer currentView={currentView} setCurrentView={navigateToView} />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
