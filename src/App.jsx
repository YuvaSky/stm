import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CustomerApp from './pages/CustomerApp';
import ShopkeeperDashboard from './pages/ShopkeeperDashboard';
import AdminSettings from './pages/AdminSettings';

function MainApp() {
  const { user } = useAuth();
  const isStaffOrAdmin = user && ['STAFF', 'MANAGER', 'ADMIN'].includes(user.role);

  const [currentView, setCurrentView] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (['STAFF', 'MANAGER', 'ADMIN'].includes(u.role)) {
          return 'shopkeeper';
        }
      }
    } catch (_) {}
    return 'customer';
  });

  // Automatically ensure staff starts on the Shopkeeper Dashboard
  React.useEffect(() => {
    if (isStaffOrAdmin && currentView === 'customer') {
      setCurrentView('shopkeeper');
    }
  }, [user, isStaffOrAdmin]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation Bar */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main View Container */}
      <main className="flex-1 bg-slate-50">
        {currentView === 'customer' && <CustomerApp setCurrentView={setCurrentView} />}
        {currentView === 'shopkeeper' && <ShopkeeperDashboard setCurrentView={setCurrentView} />}
        {currentView === 'admin' && <AdminSettings setCurrentView={setCurrentView} />}
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
