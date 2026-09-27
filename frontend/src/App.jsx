import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CustomerApp from './pages/CustomerApp';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import AdminPortal from './pages/AdminPortal';
import DeveloperAdminPortal from './pages/DeveloperAdminPortal';

function MainApp() {
  const { user } = useAuth();
  const isStaffOrAdmin = user && ['STAFF', 'MANAGER', 'ADMIN', 'DEVELOPER'].includes(user.role);

  const [currentView, setCurrentView] = useState(() => {
    // Check URL pathname or query params first
    if (window.location.pathname === '/developer' || window.location.pathname === '/dev' || window.location.search.includes('portal=developer')) {
      return 'developer';
    }
    if (window.location.pathname === '/admin' || window.location.search.includes('portal=admin')) {
      return 'admin';
    }
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role === 'DEVELOPER') {
          return 'developer';
        }
        if (['ADMIN', 'MANAGER'].includes(u.role)) {
          return 'admin';
        }
        if (u.role === 'STAFF') {
          return 'shopkeeper';
        }
      }
    } catch (_) {}
    return 'customer';
  });

  // Keep state in sync with URL location if needed
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/developer' || window.location.pathname === '/dev' || window.location.search.includes('portal=developer')) {
        setCurrentView('developer');
      } else if (window.location.pathname === '/admin' || window.location.search.includes('portal=admin')) {
        setCurrentView('admin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Separate Standalone Developer Portal Page
  if (currentView === 'developer') {
    return (
      <div className="min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
        <DeveloperAdminPortal setCurrentView={setCurrentView} />
      </div>
    );
  }

  // Standalone Admin Portal Page
  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">
        <AdminPortal setCurrentView={setCurrentView} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation Bar */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main View Container */}
      <main className="flex-1 bg-slate-50">
        {currentView === 'customer' && <CustomerApp setCurrentView={setCurrentView} />}
        {currentView === 'shopkeeper' && <ShopkeeperDashboard setCurrentView={setCurrentView} />}
      </main>

      {/* Professional Footer */}
      <Footer currentView={currentView} setCurrentView={setCurrentView} />

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
