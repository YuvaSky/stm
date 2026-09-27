import React, { useState, useEffect } from 'react';
import { Shield, Users, UserPlus, DollarSign, Clock, Printer, Activity, Search, Trash2, Check, X, Copy, QrCode, Store, TrendingUp, LogOut, Lock, Terminal, Cpu, Database, Server, RefreshCw, KeyRound, Sparkles, AlertCircle, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

export default function SuperAdminConsole() {
  const [token, setToken] = useState(() => localStorage.getItem('super_admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const u = localStorage.getItem('super_admin_user');
      return u ? JSON.parse(u) : null;
    } catch (_) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('shopkeepers'); // 'shopkeepers' | 'users' | 'analytics' | 'printers' | 'settings' | 'logs'
  const [analytics, setAnalytics] = useState(null);
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [printers, setPrinters] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  
  // Real Sign-In Form state
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [copiedShopId, setCopiedShopId] = useState(null);
  const [selectedQrShopkeeper, setSelectedQrShopkeeper] = useState(null);

  // Search & Role Filter
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // New Account Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'STAFF',
    shopName: ''
  });

  // Printer Modal
  const [isAddPrinterOpen, setIsAddPrinterOpen] = useState(false);
  const [newPrinter, setNewPrinter] = useState({ name: '', type: 'LASER', paperSize: 'A4', isColor: false });

  // Pricing & Retention Settings
  const [pricing, setPricing] = useState({ A4_BW: 2, A4_COLOUR: 10, A3_BW: 5, A3_COLOUR: 20 });
  const [retentionMinutes, setRetentionMinutes] = useState(60);

  // Set axios default auth header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchAnalytics();
      fetchUsers();
      fetchStaff();
      fetchPrinters();
      fetchAuditLogs();
      fetchSettings();
    }
  }, [token]);

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError('');
    if (!loginMobile || !loginPassword) {
      setLoginError('Please enter both Mobile Number and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        mobile: loginMobile,
        password: loginPassword
      });

      if (res.data.success) {
        const u = res.data.user;
        if (!['ADMIN', 'MANAGER', 'DEVELOPER'].includes(u.role)) {
          setLoginError('Access Denied: Super Admin or Manager privileges required.');
          return;
        }

        setToken(res.data.token);
        setAdminUser(u);
        localStorage.setItem('super_admin_token', res.data.token);
        localStorage.setItem('super_admin_user', JSON.stringify(u));
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Invalid Mobile Number or Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setAdminUser(null);
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/admin/analytics');
      if (res.data.success) setAnalytics(res.data.stats);
    } catch (_) {}
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/admin/settings');
      if (res.data.success && res.data.shop) {
        if (res.data.shop.settings?.pricing) setPricing(res.data.shop.settings.pricing);
        if (res.data.shop.settings?.retentionMinutes) setRetentionMinutes(res.data.shop.settings.retentionMinutes);
      }
    } catch (_) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) setUserList(res.data.users);
    } catch (_) {}
  };

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/admin/staff');
      if (res.data.success) setStaffList(res.data.staff);
    } catch (_) {}
  };

  const fetchPrinters = async () => {
    try {
      const res = await axios.get('/api/admin/printers');
      if (res.data.success) setPrinters(res.data.printers);
    } catch (_) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await axios.get('/api/admin/audit-logs');
      if (res.data.success) setAuditLogs(res.data.logs);
    } catch (_) {}
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
        setSaveSuccess(`✅ Account '${newUser.name}' (${newUser.role}) created successfully!`);
        setIsAddUserOpen(false);
        setNewUser({ name: '', mobile: '', email: '', password: '', role: 'STAFF', shopName: '' });
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
    if (!window.confirm(`Permanently delete account '${userName}'? This action cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/admin/users/${userId}`);
      if (res.data.success) {
        setSaveSuccess(`🗑️ Account '${userName}' deleted.`);
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

  const handleCreatePrinter = async (e) => {
    e.preventDefault();
    if (!newPrinter.name) return alert('Printer Name is required');
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/printers', {
        name: newPrinter.name,
        type: newPrinter.type,
        capabilities: { paperSizes: [newPrinter.paperSize], color: newPrinter.isColor, duplex: true }
      });
      if (res.data.success) {
        setSaveSuccess(`🖨️ Printer '${newPrinter.name}' added to inventory.`);
        setIsAddPrinterOpen(false);
        setNewPrinter({ name: '', type: 'LASER', paperSize: 'A4', isColor: false });
        fetchPrinters();
        fetchAnalytics();
        setTimeout(() => setSaveSuccess(''), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.put('/api/admin/settings', { pricing, retentionMinutes });
      if (res.data.success) {
        setSaveSuccess('✅ Super Admin configuration matrix saved successfully!');
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
    return `${window.location.protocol}//${window.location.hostname}:3001/?shop=${shopCode}`;
  };

  const copyPortalLink = (u) => {
    const link = getShopkeeperPortalLink(u);
    navigator.clipboard.writeText(link);
    setCopiedShopId(u._id);
    setTimeout(() => setCopiedShopId(null), 2500);
  };

  const filteredUsers = userList.filter(u => {
    const matchesRole =
      activeRoleFilter === 'ALL'
        ? true
        : activeRoleFilter === 'SHOPKEEPER'
        ? ['STAFF', 'MANAGER'].includes(u.role)
        : activeRoleFilter === 'CUSTOMER'
        ? u.role === 'CUSTOMER'
        : activeRoleFilter === 'DEVELOPER'
        ? u.role === 'DEVELOPER'
        : u.role === 'ADMIN';

    const q = userSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.mobile?.includes(q) || u.email?.toLowerCase().includes(q);

    return matchesRole && matchesSearch;
  });

  // REAL PRODUCTION SIGN IN SCREEN (WHITE THEME - NO DEMO BUTTONS)
  if (!token || !adminUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full p-8 bg-white border border-slate-200 rounded-3xl shadow-xl space-y-6 text-slate-900">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-600/20">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">SUPER ADMIN PORTAL</h2>
            <p className="text-xs text-slate-500 font-semibold">Production Administrator Authentication</p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Mobile Number (Admin Login ID)</label>
              <input
                type="tel"
                required
                placeholder="Enter registered mobile number"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono text-sm focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="Enter account password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 uppercase tracking-wider mt-2 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In To Super Admin'}</span>
            </button>
          </form>

          <div className="pt-3 text-center border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-medium">
              🔒 Authorized Administrative Access Only
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] pb-12">
      
      {/* Sleek White Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-slate-900 tracking-tight">SECURE<span className="text-purple-600">PRINT</span></span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                SUPER ADMIN PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold hidden sm:block">Central Control System & User Registration Management</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Register New Account</span>
            <span className="sm:hidden">Register</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Admin Profile & Logout */}
          <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <div className="w-6.5 h-6.5 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
              {adminUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-extrabold text-slate-900 leading-tight">{adminUser.name}</p>
              <span className="text-[9px] text-purple-700 font-bold uppercase">{adminUser.role}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="ml-1 text-slate-400 hover:text-rose-600 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-2xl font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* Crisp White Summary Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs font-semibold">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 font-extrabold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Accounts</span>
              <span className="text-xl font-black text-slate-900">{analytics?.totalUsers || userList.length || 0}</span>
              <span className="text-[10px] text-purple-700 font-bold block">{analytics?.totalStaff || 0} Shopkeepers</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100 font-extrabold shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Print Orders</span>
              <span className="text-xl font-black text-slate-900">{analytics?.totalOrders || 0}</span>
              <span className="text-[10px] text-cyan-700 font-bold block">{analytics?.activeQueue || 0} Active Queue</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 font-extrabold shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <span className="text-xl font-black text-emerald-600">₹{analytics?.totalRevenue || 0}</span>
              <span className="text-[10px] text-emerald-700 font-bold block">₹{analytics?.todayRevenue || 0} Today</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 font-extrabold shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Configured Printers</span>
              <span className="text-xl font-black text-slate-900">{printers.length || 1}</span>
              <span className="text-[10px] text-indigo-700 font-bold block">ONLINE Hardware</span>
            </div>
          </div>

        </div>

        {/* Console Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none border-b border-slate-200">
          <button
            onClick={() => setActiveTab('shopkeepers')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'shopkeepers'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Registered Shopkeepers ({userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>All System Accounts ({userList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Revenue & Store Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('printers')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'printers'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printer Hardware ({printers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pricing Matrix & Auto-Purge</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Security Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 0: SaaS Registered Shopkeepers Portal */}
        {activeTab === 'shopkeepers' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-purple-600" />
                  Registered SaaS Shopkeepers Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monitor registered print shopkeepers, counter status, and unique customer upload QR links.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search shopkeeper, mobile..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => {
                    setNewUser({ name: '', mobile: '', email: '', password: '', role: 'STAFF', shopName: '' });
                    setIsAddUserOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Shopkeeper</span>
                </button>
              </div>
            </div>

            {/* Shopkeeper SaaS Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
              <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-purple-700 font-bold uppercase block">Total Shopkeepers</span>
                  <span className="text-lg font-black text-purple-900">
                    {userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length}
                  </span>
                </div>
                <Store className="w-6 h-6 text-purple-600 opacity-80" />
              </div>

              <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block">Active Counters</span>
                  <span className="text-lg font-black text-emerald-900">
                    {userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role) && u.staffStatus !== 'INACTIVE').length}
                  </span>
                </div>
                <Check className="w-6 h-6 text-emerald-600 opacity-80" />
              </div>

              <div className="p-3.5 bg-cyan-50/60 border border-cyan-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-cyan-700 font-bold uppercase block">Customer Upload Links</span>
                  <span className="text-lg font-black text-cyan-900">
                    {userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length} Unique QR Codes
                  </span>
                </div>
                <QrCode className="w-6 h-6 text-cyan-600 opacity-80" />
              </div>
            </div>

            {/* Shopkeepers Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Shopkeeper / Store</th>
                    <th className="py-3.5 px-4">Mobile (Login ID)</th>
                    <th className="py-3.5 px-4">Customer QR Code & Upload Link</th>
                    <th className="py-3.5 px-4">Counter Status</th>
                    <th className="py-3.5 px-4">Registration Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).filter(u => {
                    const q = userSearchQuery.toLowerCase().trim();
                    return !q || u.name?.toLowerCase().includes(q) || u.mobile?.includes(q) || u.email?.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                        No registered shopkeepers found. Click "Register Shopkeeper" above to add one.
                      </td>
                    </tr>
                  ) : (
                    userList
                      .filter(u => ['STAFF', 'MANAGER'].includes(u.role))
                      .filter(u => {
                        const q = userSearchQuery.toLowerCase().trim();
                        return !q || u.name?.toLowerCase().includes(q) || u.mobile?.includes(q) || u.email?.toLowerCase().includes(q);
                      })
                      .map((u) => {
                        return (
                          <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs shrink-0">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{u.name}</p>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                                    {u.role === 'MANAGER' ? 'Shop Manager' : 'Shopkeeper Counter'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              {u.mobile}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedQrShopkeeper(u)}
                                  className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 font-bold text-[11px] shadow-xs"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>View QR</span>
                                </button>
                                <button
                                  onClick={() => copyPortalLink(u)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-bold text-[11px]"
                                >
                                  {copiedShopId === u._id ? (
                                    <span className="text-emerald-700 font-bold">Copied!</span>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Upload Link</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  u.staffStatus === 'INACTIVE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {u.staffStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE COUNTER'}
                                </span>
                                {u.staffId && (
                                  <button
                                    onClick={() => handleToggleStaffStatus(u.staffId)}
                                    className={`p-1 rounded-lg transition-colors ${
                                      u.staffStatus === 'ACTIVE'
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                    title="Toggle Counter Status"
                                  >
                                    {u.staffStatus === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteUser(u._id, u.name)}
                                disabled={adminUser && adminUser.id === u._id}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-30"
                                title="Delete Shopkeeper Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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

        {/* TAB 1: User & Shopkeeper Account Registration Directory */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                  Account Registration Directory
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register Customers, Shopkeepers (Staff), Admins, and Developers.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search name, mobile..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>

                <button
                  onClick={() => setIsAddUserOpen(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
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
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeRoleFilter === 'ALL'
                    ? 'bg-slate-900 text-white font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({userList.length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('SHOPKEEPER')}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'SHOPKEEPER'
                    ? 'bg-purple-600 text-white font-black'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                Shopkeepers ({userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('ADMIN')}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'ADMIN'
                    ? 'bg-indigo-600 text-white font-black'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Super Admins ({userList.filter(u => ['ADMIN', 'DEVELOPER'].includes(u.role)).length})
              </button>
            </div>

            {/* Clean White Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">User Details</th>
                    <th className="py-3.5 px-4">Mobile (Login ID)</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Customer QR & Link</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                        No accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isShopkeeper = ['STAFF', 'MANAGER'].includes(u.role);
                      return (
                        <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{u.name}</p>
                            {u.email && <p className="text-[11px] text-slate-500 font-normal">{u.email}</p>}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {u.mobile}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] ${
                              u.role === 'DEVELOPER' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              u.role === 'STAFF' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            }`}>
                              {u.role === 'STAFF' ? 'SHOPKEEPER' : u.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isShopkeeper ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedQrShopkeeper(u)}
                                  className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 font-bold text-[11px]"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>QR</span>
                                </button>
                                <button
                                  onClick={() => copyPortalLink(u)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-bold text-[11px]"
                                >
                                  {copiedShopId === u._id ? (
                                    <span className="text-emerald-700 font-bold">Copied!</span>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Link</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">User Account</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              u.staffStatus === 'INACTIVE' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
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
                                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  }`}
                                  title="Toggle Status"
                                >
                                  {u.staffStatus === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(u._id, u.name)}
                                disabled={adminUser && adminUser.id === u._id}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-30"
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

        {/* TAB 2: Revenue & Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Store Performance Summary
              </h3>
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Total Store Revenue</span>
                  <span className="text-lg font-black text-emerald-600">₹{analytics?.totalRevenue || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Today's Revenue</span>
                  <span className="text-lg font-black text-emerald-700">₹{analytics?.todayRevenue || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Total Print Orders</span>
                  <span className="text-lg font-black text-purple-700">{analytics?.totalOrders || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                User Account Distribution
              </h3>
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Total Registered Accounts</span>
                  <span className="text-lg font-black text-slate-900">{analytics?.totalUsers || userList.length}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Shopkeepers / Staff</span>
                  <span className="text-lg font-black text-purple-700">{analytics?.totalStaff || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Customers</span>
                  <span className="text-lg font-black text-cyan-700">{analytics?.totalCustomers || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Printers */}
        {activeTab === 'printers' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs font-semibold">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                Hardware Printers Inventory ({printers.length})
              </h3>
              <button onClick={() => setIsAddPrinterOpen(true)} className="px-4 py-2 bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow-md">
                Add Printer
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {printers.map((p) => (
                <div key={p._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900">{p.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">ONLINE</span>
                  </div>
                  <p className="text-slate-600">Type: {p.type || 'LASER'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Settings */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Print Pricing Matrix (per page)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-slate-600 block mb-1 font-bold">A4 B&W (₹)</label>
                  <input type="number" value={pricing.A4_BW} onChange={e => setPricing({ ...pricing, A4_BW: Number(e.target.value) })} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-black" />
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-slate-600 block mb-1 font-bold">A4 Colour (₹)</label>
                  <input type="number" value={pricing.A4_COLOUR} onChange={e => setPricing({ ...pricing, A4_COLOUR: Number(e.target.value) })} className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-black" />
                </div>
              </div>
              <button onClick={saveSettings} className="w-full py-3 bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow-md">Save Pricing Matrix</button>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-600" />
                Document Auto-Purge Retention
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">Retention Duration</label>
                <select value={retentionMinutes} onChange={e => setRetentionMinutes(Number(e.target.value))} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold">
                  <option value={30}>30 Minutes after handover</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>
              <button onClick={saveSettings} className="w-full py-3 bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow-md">Save Retention Timer</button>
            </div>
          </div>
        )}

        {/* TAB 5: Audit Logs */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 text-xs font-semibold">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-600" />
              Security Audit Logs ({auditLogs.length})
            </h3>
            <div className="overflow-x-auto max-h-96 rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                  {auditLogs.map(l => (
                    <tr key={l._id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 text-[11px]">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="p-3 text-purple-700 font-bold">{l.action}</td>
                      <td className="p-3 font-semibold text-slate-800">{l.userId?.name || l.staffId?.name || 'Super Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Clean White Register User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs font-semibold">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900">Register New Account</h3>
              </div>
              <button onClick={() => setIsAddUserOpen(false)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-purple-900 font-extrabold">
                  <option value="STAFF">SHOPKEEPER</option>
                  <option value="ADMIN">SUPER ADMIN</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input type="text" required placeholder="Full Name" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number (Login ID)</label>
                <input type="tel" required placeholder="Mobile Number" value={newUser.mobile} onChange={e => setNewUser({ ...newUser, mobile: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Password</label>
                <input type="password" required placeholder="Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsAddUserOpen(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-purple-600 text-white font-extrabold rounded-xl shadow-md">Register Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedQrShopkeeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4 text-center text-xs font-semibold">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-bold text-purple-700 uppercase">Customer Portal QR</span>
              <button onClick={() => setSelectedQrShopkeeper(null)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="font-extrabold text-lg text-slate-900">{selectedQrShopkeeper.name}</h3>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex justify-center">
              <QRCodeSVG value={getShopkeeperPortalLink(selectedQrShopkeeper)} size={180} level="H" />
            </div>
            <button onClick={() => copyPortalLink(selectedQrShopkeeper)} className="w-full py-2.5 bg-purple-600 text-white font-extrabold text-xs rounded-xl shadow-xs">
              {copiedShopId === selectedQrShopkeeper._id ? 'Copied to Clipboard!' : 'Copy Portal Link'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
