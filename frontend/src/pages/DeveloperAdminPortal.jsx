import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Cpu, Database, Server, Users, UserPlus, DollarSign, Clock, Printer, Activity, Key, Search, Trash2, Check, X, ArrowLeft, RefreshCw, LogOut, Lock, Copy, QrCode, Store, Zap, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function DeveloperAdminPortal({ setCurrentView }) {
  const { user, login, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'system' | 'analytics' | 'printers' | 'settings' | 'logs'
  const [analytics, setAnalytics] = useState(null);
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [copiedShopId, setCopiedShopId] = useState(null);
  const [selectedQrShopkeeper, setSelectedQrShopkeeper] = useState(null);

  // User Filter & Search
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // New Account Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'DEVELOPER',
    shopName: ''
  });

  // Settings state
  const [pricing, setPricing] = useState({
    A4_BW: 2,
    A4_COLOUR: 10,
    A3_BW: 5,
    A3_COLOUR: 20
  });
  const [retentionMinutes, setRetentionMinutes] = useState(60);

  useEffect(() => {
    if (!user || !['DEVELOPER', 'ADMIN', 'MANAGER'].includes(user.role)) {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
      fetchAnalytics();
      fetchUsers();
      fetchStaff();
      fetchPrinters();
      fetchAuditLogs();
      fetchSettings();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/admin/analytics');
      if (res.data.success) {
        setAnalytics(res.data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/admin/settings');
      if (res.data.success && res.data.shop) {
        if (res.data.shop.settings?.pricing) setPricing(res.data.shop.settings.pricing);
        if (res.data.shop.settings?.retentionMinutes) setRetentionMinutes(res.data.shop.settings.retentionMinutes);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setUnauthorized(true);
      }
    }
  };

  const handleDevLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError('');
    try {
      await login(loginMobile, loginPassword);
      setUnauthorized(false);
      fetchAnalytics();
      fetchUsers();
      fetchStaff();
      fetchPrinters();
      fetchAuditLogs();
      fetchSettings();
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Developer login failed');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        setUserList(res.data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/admin/staff');
      if (res.data.success) {
        setStaffList(res.data.staff);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPrinters = async () => {
    try {
      const res = await axios.get('/api/admin/printers');
      if (res.data.success) {
        setPrinters(res.data.printers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get('/api/admin/audit-logs');
      if (res.data.success) {
        setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.mobile || !newUser.password) {
      alert('Please fill out Name, Mobile, and Password');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/users', newUser);
      if (res.data.success) {
        setSaveSuccess(`🚀 Account '${newUser.name}' (${newUser.role}) created successfully!`);
        setIsAddUserOpen(false);
        setNewUser({ name: '', mobile: '', email: '', password: '', role: 'DEVELOPER', shopName: '' });
        fetchUsers();
        fetchStaff();
        fetchAnalytics();
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Developer Notice: Permanently delete account for '${userName}'?`)) {
      return;
    }
    try {
      const res = await axios.delete(`/api/admin/users/${userId}`);
      if (res.data.success) {
        setSaveSuccess(`🗑️ Developer Action: Account '${userName}' purged.`);
        fetchUsers();
        fetchStaff();
        fetchAnalytics();
        setTimeout(() => setSaveSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleToggleStaffStatus = async (staffId) => {
    if (!staffId) return;
    try {
      const res = await axios.patch(`/api/admin/staff/${staffId}/status`);
      if (res.data.success) {
        fetchStaff();
        fetchUsers();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.put('/api/admin/settings', {
        pricing,
        retentionMinutes
      });
      if (res.data.success) {
        setSaveSuccess('✅ Global system settings updated successfully!');
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getShopkeeperPortalLink = (u) => {
    const shopCode = u.staffId || u._id || 'main';
    return `${window.location.origin}/?shop=${shopCode}`;
  };

  const copyPortalLink = (u) => {
    const link = getShopkeeperPortalLink(u);
    navigator.clipboard.writeText(link);
    setCopiedShopId(u._id);
    setTimeout(() => setCopiedShopId(null), 2500);
  };

  // Filter users
  const filteredUsers = userList.filter(u => {
    const matchesRole =
      activeRoleFilter === 'ALL'
        ? true
        : activeRoleFilter === 'DEVELOPER'
        ? u.role === 'DEVELOPER'
        : activeRoleFilter === 'SHOPKEEPER'
        ? ['STAFF', 'MANAGER'].includes(u.role)
        : activeRoleFilter === 'CUSTOMER'
        ? u.role === 'CUSTOMER'
        : u.role === 'ADMIN';

    const q = userSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.mobile?.includes(q) || u.email?.toLowerCase().includes(q);

    return matchesRole && matchesSearch;
  });

  // Developer Login Screen
  if (unauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono text-xs">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl space-y-6 text-white relative overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-cyan-500 to-emerald-500"></div>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-purple-950 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
              <Terminal className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white uppercase">DEVELOPER ADMIN CONSOLE</h2>
            <p className="text-[11px] text-slate-400">Exclusive System Administrator Access</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl text-center font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Developer Mobile ID</label>
              <input
                type="tel"
                required
                placeholder="e.g. 7777777777"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Security Key / Password</label>
              <input
                type="password"
                required
                placeholder="Enter developer password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-wider"
            >
              AUTHENTICATE DEVELOPER PORTAL
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoginError('');
                try {
                  await login('7777777777', 'developer123');
                  setUnauthorized(false);
                  fetchAnalytics();
                  fetchUsers();
                  fetchStaff();
                  fetchPrinters();
                  fetchAuditLogs();
                  fetchSettings();
                } catch (err) {
                  setLoginError('Developer login failed: ' + err.message);
                }
              }}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-cyan-400 font-bold text-xs rounded-xl border border-cyan-500/20 transition-all text-center flex items-center justify-center gap-2"
            >
              <span>⚡ One-Click Developer Key Login</span>
              <span className="text-[10px] text-slate-400">(7777777777)</span>
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentView && setCurrentView('customer')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit to Main Store App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] pb-12">
      
      {/* Developer Top Terminal Navigation */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-cyan-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-tight">DEVELOPER<span className="text-cyan-400">ADMIN</span></span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                ROOT SYSTEM CONSOLE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Full Account Management & Core Backend Controls</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Register Account</span>
            <span className="sm:hidden">Add User</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Dev Profile */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono text-xs">
            <div className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center">
              DEV
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white leading-tight">{user?.name || 'Developer Admin'}</p>
              <span className="text-[9px] text-emerald-400 font-semibold uppercase">{user?.role}</span>
            </div>
            <button
              onClick={() => { logout(); setCurrentView('customer'); }}
              title="Logout Developer Session"
              className="ml-1 text-slate-400 hover:text-rose-400 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {saveSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm rounded-2xl font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* Developer Diagnostics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 font-mono text-xs">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 font-extrabold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Accounts</span>
              <span className="text-lg font-black text-white">{analytics?.totalUsers || userList.length || 0}</span>
              <span className="text-[10px] text-purple-400 block">{analytics?.totalStaff || 0} Shopkeepers</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-extrabold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Backend Status</span>
              <span className="text-sm font-black text-emerald-400 flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE (200 OK)
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-extrabold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">MongoDB State</span>
              <span className="text-xs font-black text-emerald-400 block mt-0.5">CONNECTED</span>
              <span className="text-[10px] text-slate-400 block">secure_print_shop</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-extrabold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Hardware Agents</span>
              <span className="text-lg font-black text-white">{printers.length || 1}</span>
              <span className="text-[10px] text-indigo-300 block">WebSocket Queue</span>
            </div>
          </div>

        </div>

        {/* Developer Console Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none border-b border-slate-800">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Master User Registration ({userList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'system'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>System Server Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('printers')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'printers'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printer Hardware Registry</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pricing & Privacy Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>System Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: Master Account Management */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  Developer Master Account Directory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full authority to create, elevate, or remove Developers, Shopkeepers, Customers, and Admins.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search name, mobile..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Account</span>
                </button>
              </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
              <button
                onClick={() => setActiveRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  activeRoleFilter === 'ALL'
                    ? 'bg-cyan-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All Accounts ({userList.length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('DEVELOPER')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'DEVELOPER'
                    ? 'bg-purple-600 text-white font-black'
                    : 'bg-slate-950 text-purple-300 hover:text-white border border-purple-500/20'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                Developers ({userList.filter(u => u.role === 'DEVELOPER').length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('SHOPKEEPER')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'SHOPKEEPER'
                    ? 'bg-indigo-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-indigo-400" />
                Shopkeepers ({userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('CUSTOMER')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'CUSTOMER'
                    ? 'bg-emerald-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Customers ({userList.filter(u => u.role === 'CUSTOMER').length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('ADMIN')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'ADMIN'
                    ? 'bg-indigo-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Admins ({userList.filter(u => u.role === 'ADMIN').length})
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="py-3.5 px-4">Account Name</th>
                    <th className="py-3.5 px-4">Mobile ID</th>
                    <th className="py-3.5 px-4">System Role</th>
                    <th className="py-3.5 px-4">Shopkeeper QR & Link</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Developer Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500 italic">
                        No accounts match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isShopkeeper = ['STAFF', 'MANAGER'].includes(u.role);
                      return (
                        <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            {u.name}
                            {u.email && <span className="block text-[10px] text-slate-400 font-normal">{u.email}</span>}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                            {u.mobile}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] ${
                              u.role === 'DEVELOPER' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                              u.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                              u.role === 'STAFF' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                              'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isShopkeeper ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedQrShopkeeper(u)}
                                  className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-bold text-[11px]"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>QR</span>
                                </button>
                                <button
                                  onClick={() => copyPortalLink(u)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 font-bold text-[11px]"
                                >
                                  {copiedShopId === u._id ? (
                                    <span className="text-emerald-400">Copied!</span>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Link</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Standard Account</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              u.staffStatus === 'INACTIVE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {u.staffStatus || 'ACTIVE'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {isShopkeeper && u.staffId && (
                                <button
                                  onClick={() => handleToggleStaffStatus(u.staffId)}
                                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                                    u.staffStatus === 'ACTIVE'
                                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                  }`}
                                  title="Toggle Status"
                                >
                                  {u.staffStatus === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(u._id, u.name)}
                                disabled={user && user.id === u._id}
                                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30 transition-all disabled:opacity-30"
                                title="Delete Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: System Diagnostics */}
        {activeTab === 'system' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4 font-mono text-xs">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              Core Node.js & Database Diagnostics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-slate-400 font-bold uppercase">Node Environment</p>
                <p><span className="text-slate-500">Port:</span> 5000 (Express & Socket.io)</p>
                <p><span className="text-slate-500">Host:</span> 0.0.0.0 (Local Wi-Fi Network Exposed)</p>
                <p><span className="text-slate-500">CORS:</span> Enabled for Vite Frontend (3001)</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <p className="text-slate-400 font-bold uppercase">MongoDB Database</p>
                <p><span className="text-slate-500">URI:</span> mongodb://127.0.0.1:27017/secure_print_shop</p>
                <p><span className="text-slate-500">Collections:</span> users, staff, orders, printers, auditlogs, shops</p>
                <p><span className="text-slate-500">Retention Cron:</span> Auto-Purge Active</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Printers */}
        {activeTab === 'printers' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              Hardware Printers Registry ({printers.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {printers.map((p) => (
                <div key={p._id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">ONLINE</span>
                  </div>
                  <p className="text-slate-400">Type: {p.type || 'LASER'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Pricing & Privacy */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Global Print Pricing Matrix
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-slate-400 font-semibold block mb-1">A4 B&W (₹)</label>
                  <input
                    type="number"
                    value={pricing.A4_BW}
                    onChange={(e) => setPricing({ ...pricing, A4_BW: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                  />
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-slate-400 font-semibold block mb-1">A4 Colour (₹)</label>
                  <input
                    type="number"
                    value={pricing.A4_COLOUR}
                    onChange={(e) => setPricing({ ...pricing, A4_COLOUR: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                  />
                </div>
              </div>
              <button onClick={saveSettings} className="w-full py-3 bg-purple-600 text-white font-bold text-xs rounded-xl">Save Pricing</button>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Automatic Purge Timer
              </h3>
              <select
                value={retentionMinutes}
                onChange={(e) => setRetentionMinutes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-bold"
              >
                <option value={30}>30 Minutes</option>
                <option value={60}>60 Minutes (1 Hour)</option>
                <option value={120}>2 Hours</option>
                <option value={1440}>24 Hours</option>
              </select>
              <button onClick={saveSettings} className="w-full py-3 bg-cyan-600 text-white font-bold text-xs rounded-xl">Save Retention</button>
            </div>
          </div>
        )}

        {/* TAB 5: Audit Logs */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Audit Logs ({auditLogs.length})
            </h3>
            <div className="overflow-x-auto max-h-96 rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td className="p-3 text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-cyan-300 font-bold">{log.action}</td>
                      <td className="p-3">{log.userId?.name || log.staffId?.name || 'Developer Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Register Account Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full border border-purple-500/30 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="font-black text-base text-white">Register Developer / Admin Account</h3>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Account Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 text-purple-300 font-extrabold"
                >
                  <option value="DEVELOPER">DEVELOPER (Full Root Admin Access)</option>
                  <option value="STAFF">SHOPKEEPER / COUNTER STAFF</option>
                  <option value="CUSTOMER">CUSTOMER USER</option>
                  <option value="ADMIN">SUPER ADMIN / MANAGER</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. System Admin Dev"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Mobile Number (Login ID)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 7777777777"
                  value={newUser.mobile}
                  onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Create password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 text-slate-400 font-bold">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-black rounded-xl">Register Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {selectedQrShopkeeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl p-6 space-y-4 text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400">Customer QR Code</span>
              <button onClick={() => setSelectedQrShopkeeper(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="font-extrabold text-lg">{selectedQrShopkeeper.name}</h3>
            <div className="bg-white p-5 rounded-2xl flex items-center justify-center">
              <QRCodeSVG value={getShopkeeperPortalLink(selectedQrShopkeeper)} size={180} level="H" />
            </div>
            <button onClick={() => copyPortalLink(selectedQrShopkeeper)} className="w-full py-2.5 bg-cyan-600 text-white font-bold text-xs rounded-xl">Copy Portal Link</button>
          </div>
        </div>
      )}

    </div>
  );
}
