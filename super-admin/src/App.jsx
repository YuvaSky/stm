import React from 'react';
import axios from 'axios';
import SuperAdminConsole from './pages/SuperAdminConsole';

const API_BASE = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://secure-print-application.netlify.app');
axios.defaults.baseURL = API_BASE;

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      <SuperAdminConsole />
    </div>
  );
}
