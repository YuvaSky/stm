import React from 'react';
import axios from 'axios';
import SuperAdminConsole from './pages/SuperAdminConsole';

if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL;
}

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      <SuperAdminConsole />
    </div>
  );
}
