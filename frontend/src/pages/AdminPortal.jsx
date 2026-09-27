import React, { useState, useEffect } from 'react';
import { Shield, Printer, DollarSign, Clock, ShieldCheck, Plus, Save, UserPlus, Users, ToggleLeft, ToggleRight, X, Lock, ArrowLeft, QrCode, Copy, Check, ExternalLink, Download, Trash2, Search, Filter, Store, UserCheck, TrendingUp, Activity, FileText, Layers, RefreshCw, LogOut } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function AdminPortal({ setCurrentView }) {
  const { user, login, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'overview' | 'printers' | 'settings' | 'logs'
  const [analytics, setAnalytics] = useState(null);
  const [shop, setShop] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [copiedShopId, setCopiedShopId] = useState(null);
  const [selectedQrShopkeeper, setSelectedQrShopkeeper] = useState(null);

  // User Filter & Search State
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // New Account Registration Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    role: 'STAFF',
    shopName: ''
  });

  // Printer Creation Modal
  const [isAddPrinterOpen, setIsAddPrinterOpen] = useState(false);
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    type: 'LASER',
    paperSize: 'A4',
    isColor: false
  });

  // Editable settings
  const [pricing, setPricing] = useState({
    A4_BW: 2,
    A4_COLOUR: 10,
    A3_BW: 5,
    A3_COLOUR: 20
  });
  const [retentionMinutes, setRetentionMinutes] = useState(60);

  useEffect(() => {
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
      fetchAnalytics();
      fetchSettings();
      fetchPrinters();
      fetchAuditLogs();
      fetchUsers();
      fetchStaff();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/admin/analytics');
      if (res.data.success) {
        setAnalytics(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  const fetchSettings = async () => {
    setUnauthorized(false);
    try {
      const res = await axios.get('/api/admin/settings');
      if (res.data.success && res.data.shop) {
        setShop(res.data.shop);
        if (res.data.shop.settings?.pricing) {
          setPricing(res.data.shop.settings.pricing);
        }
        if (res.data.shop.settings?.retentionMinutes) {
          setRetentionMinutes(res.data.shop.settings.retentionMinutes);
        }
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setUnauthorized(true);
      }
    }
  };

  const handleAdminLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError('');
    try {
      await login(loginMobile, loginPassword);
      setUnauthorized(false);
      fetchAnalytics();
      fetchSettings();
      fetchPrinters();
      fetchAuditLogs();
      fetchUsers();
      fetchStaff();
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Login failed');
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

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data.success) {
        setUserList(res.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.mobile || !newUser.password) {
      alert('Please fill out Name, Mobile number, and Password');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/users', newUser);
      if (res.data.success) {
        const roleLabel = newUser.role === 'STAFF' ? 'Shopkeeper' : newUser.role === 'ADMIN' ? 'Admin' : 'Customer User';
        setSaveSuccess(`✅ ${roleLabel} '${newUser.name}' registered successfully!`);
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
    if (!window.confirm(`Are you sure you want to delete account for '${userName}'? This action cannot be undone.`)) {
      return;
    }

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
    if (!newPrinter.name) {
      alert('Printer Name is required');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/printers', {
        name: newPrinter.name,
        type: newPrinter.type,
        capabilities: {
          paperSizes: [newPrinter.paperSize],
          color: newPrinter.isColor,
          duplex: true
        }
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
      const res = await axios.put('/api/admin/settings', {
        pricing,
        retentionMinutes
      });
      if (res.data.success) {
        setSaveSuccess('✅ Admin Settings & Pricing matrix saved successfully!');
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

  // Filtered Users List
  const filteredUsers = userList.filter(u => {
    const matchesRole =
      activeRoleFilter === 'ALL'
        ? true
        : activeRoleFilter === 'SHOPKEEPER'
        ? ['STAFF', 'MANAGER'].includes(u.role)
        : activeRoleFilter === 'CUSTOMER'
        ? u.role === 'CUSTOMER'
        : ['ADMIN', 'MANAGER'].includes(u.role);

    const q = userSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || u.name?.toLowerCase().includes(q) || u.mobile?.includes(q) || u.email?.toLowerCase().includes(q);

    return matchesRole && matchesSearch;
  });

  // Dedicated Admin Login Screen
  if (unauthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl space-y-6 text-white">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-600/30">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">SECURE<span className="text-purple-400">PRINT</span> ADMIN PORTAL</h2>
            <p className="text-xs text-slate-400">Master Control & User Registration Console</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl text-center font-bold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Mobile Number (Admin ID)</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9999999999"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-medium focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-wider"
            >
              Sign In To Admin Portal
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentView && setCurrentView('customer')}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Customer Express App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] pb-12">
      
      {/* Standalone Admin Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-600/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-tight">SECURE<span className="text-purple-400">PRINT</span></span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                SUPER ADMIN PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Central Control System & User Registration Management</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Register Account</span>
            <span className="sm:hidden">Register</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Admin User Info & Logout */}
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-white leading-tight">{user?.name}</p>
              <span className="text-[9px] text-purple-400 font-semibold uppercase">{user?.role}</span>
            </div>
            <button
              onClick={() => { logout(); setCurrentView('customer'); }}
              title="Sign out of Admin Portal"
              className="ml-1 text-slate-400 hover:text-rose-400 transition-colors p-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">

        {saveSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm rounded-2xl font-bold flex items-center gap-2 shadow-xs">
            <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* Top Summary Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 font-extrabold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Accounts</span>
              <span className="text-lg font-black text-white">{analytics?.totalUsers || userList.length || 0}</span>
              <span className="text-[10px] text-purple-400 font-semibold block">{analytics?.totalStaff || 0} Shopkeepers</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-extrabold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Print Orders</span>
              <span className="text-lg font-black text-white">{analytics?.totalOrders || 0}</span>
              <span className="text-[10px] text-cyan-400 font-semibold block">{analytics?.activeQueue || 0} Active in Queue</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-extrabold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
              <span className="text-lg font-black text-emerald-400">₹{analytics?.totalRevenue || 0}</span>
              <span className="text-[10px] text-emerald-300 font-semibold block">₹{analytics?.todayRevenue || 0} Today</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-sm">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-extrabold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Configured Printers</span>
              <span className="text-lg font-black text-white">{printers.length || analytics?.printers || 1}</span>
              <span className="text-[10px] text-indigo-300 font-semibold block">ONLINE & Ready</span>
            </div>
          </div>

        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none border-b border-slate-800">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User & Shopkeeper Accounts ({userList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Store Analytics & Revenue</span>
          </button>

          <button
            onClick={() => setActiveTab('printers')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'printers'
                ? 'bg-purple-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Printers & Agents ({printers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Print Pricing & Auto-Purge</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-purple-600 text-white shadow-lg font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Audit Activity Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* TAB 1: User & Shopkeeper Accounts Registration Management */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-lg text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  Account Registration & Role Directory
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register new Shopkeepers (Staff), Customer Users, and Super Admins.
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
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

            {/* Role Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
              <button
                onClick={() => setActiveRoleFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  activeRoleFilter === 'ALL'
                    ? 'bg-purple-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({userList.length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('SHOPKEEPER')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'SHOPKEEPER'
                    ? 'bg-purple-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-purple-400" />
                Shopkeepers ({userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length})
              </button>

              <button
                onClick={() => setActiveRoleFilter('CUSTOMER')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeRoleFilter === 'CUSTOMER'
                    ? 'bg-cyan-600 text-white font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
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
                Admins ({userList.filter(u => ['ADMIN', 'MANAGER'].includes(u.role)).length})
              </button>
            </div>

            {/* Account List Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="py-3.5 px-4">User Name</th>
                    <th className="py-3.5 px-4">Mobile (Login ID)</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Customer QR & Link</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
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
                      const portalLink = getShopkeeperPortalLink(u);
                      return (
                        <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            {u.name}
                            {u.email && <span className="block text-[10px] text-slate-400 font-normal">{u.email}</span>}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-300">
                            {u.mobile}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] ${
                              u.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                              u.role === 'STAFF' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {u.role === 'STAFF' ? 'SHOPKEEPER' : u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {isShopkeeper ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setSelectedQrShopkeeper(u)}
                                  className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-bold text-[11px]"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>View QR</span>
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
                              <span className="text-slate-500 italic text-[11px]">Customer Account</span>
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

        {/* TAB 2: Overview & Store Analytics */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Store Performance Summary
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Total Revenue Generated</span>
                  <span className="text-base font-black text-emerald-400">₹{analytics?.totalRevenue || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Today's Sales Revenue</span>
                  <span className="text-base font-black text-emerald-300">₹{analytics?.todayRevenue || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Completed Orders Collected</span>
                  <span className="text-base font-black text-cyan-400">{analytics?.completedOrders || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Today's Total Orders</span>
                  <span className="text-base font-black text-purple-400">{analytics?.todayOrdersCount || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Registered User Distribution
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Total Registered Users</span>
                  <span className="text-base font-black text-white">{analytics?.totalUsers || userList.length}</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Shopkeepers / Operators</span>
                  <span className="text-base font-black text-purple-400">{analytics?.totalStaff || staffList.length}</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Customers</span>
                  <span className="text-base font-black text-cyan-400">{analytics?.totalCustomers || 0}</span>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-semibold">Admins & Managers</span>
                  <span className="text-base font-black text-indigo-400">{analytics?.totalAdmins || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Hardware Printers Management */}
        {activeTab === 'printers' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-400" />
                  Registered Physical Printers & Print Spoolers ({printers.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage hardware printers configured across store counters.</p>
              </div>
              <button
                onClick={() => setIsAddPrinterOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hardware Printer</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {printers.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-500 italic text-xs">
                  No printers configured yet. Click "Add Hardware Printer" above.
                </div>
              ) : (
                printers.map((p) => (
                  <div key={p._id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                          <Printer className="w-4 h-4" />
                        </div>
                        <h4 className="font-black text-sm text-white">{p.name}</h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px]">
                        ONLINE
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-900">
                      <p><span className="font-bold text-slate-300">Type:</span> {p.type || 'LASER'}</p>
                      <p><span className="font-bold text-slate-300">Color Support:</span> {p.capabilities?.color ? 'Full Color' : 'B&W Only'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Print Pricing Matrix & Auto-Purge */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Print Pricing Matrix (per page)
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-slate-400 font-semibold block mb-1">A4 Black & White (₹)</label>
                  <input
                    type="number"
                    value={pricing.A4_BW}
                    onChange={(e) => setPricing({ ...pricing, A4_BW: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-slate-400 font-semibold block mb-1">A4 Colour (₹)</label>
                  <input
                    type="number"
                    value={pricing.A4_COLOUR}
                    onChange={(e) => setPricing({ ...pricing, A4_COLOUR: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-slate-400 font-semibold block mb-1">A3 Black & White (₹)</label>
                  <input
                    type="number"
                    value={pricing.A3_BW}
                    onChange={(e) => setPricing({ ...pricing, A3_BW: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black"
                  />
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-slate-400 font-semibold block mb-1">A3 Colour (₹)</label>
                  <input
                    type="number"
                    value={pricing.A3_COLOUR}
                    onChange={(e) => setPricing({ ...pricing, A3_COLOUR: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black"
                  />
                </div>
              </div>

              <button
                onClick={saveSettings}
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all mt-2"
              >
                SAVE PRICING MATRIX
              </button>
            </div>

            <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Automatic Document Deletion Retention
              </h3>
              <p className="text-xs text-slate-400">
                Uploaded print files are automatically deleted after handover to preserve customer privacy.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Retention Duration</label>
                <select
                  value={retentionMinutes}
                  onChange={(e) => setRetentionMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-bold"
                >
                  <option value={30}>30 Minutes after handover</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                  <option value={120}>2 Hours</option>
                  <option value={1440}>24 Hours</option>
                </select>
              </div>

              <button
                onClick={saveSettings}
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md transition-all"
              >
                SAVE RETENTION TIMER
              </button>
            </div>

          </div>
        )}

        {/* TAB 5: Audit Activity Logs */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              System Audit & Security Logs ({auditLogs.length})
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">User / Admin</th>
                    <th className="p-3">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 italic">No audit logs recorded yet.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-800/40">
                        <td className="p-3 text-[11px] text-slate-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-purple-300">{log.action}</td>
                        <td className="p-3 text-slate-200">
                          {log.userId?.name || log.staffId?.name || 'System Admin'}
                        </td>
                        <td className="p-3 text-[10px] text-slate-400 truncate max-w-xs">
                          {JSON.stringify(log.metadata || {})}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Register New Account Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full border border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-white">Register New Account</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Account Role Type</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-purple-300 font-extrabold focus:outline-none focus:border-purple-500"
                >
                  <option value="STAFF">SHOPKEEPER / COUNTER STAFF (Receives Queue & QR)</option>
                  <option value="CUSTOMER">CUSTOMER (Standard User App)</option>
                  <option value="ADMIN">SUPER ADMIN / MANAGER (Full System Settings)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Mobile Number (Login ID)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newUser.mobile}
                  onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. admin@domain.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="Create account password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-md transition-all active:scale-95"
                >
                  {loading ? 'Creating...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Printer Modal */}
      {isAddPrinterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-black text-base">Add Hardware Printer</h3>
              <button onClick={() => setIsAddPrinterOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePrinter} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Printer Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter HP LaserJet Pro"
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsAddPrinterOpen(false)} className="px-3 py-1.5 text-slate-400 font-bold">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white font-black rounded-xl">Save Printer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal for Shopkeeper Portal Link */}
      {selectedQrShopkeeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full border border-slate-800 shadow-2xl p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Customer Portal QR Code</span>
              <button
                onClick={() => setSelectedQrShopkeeper(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-white">{selectedQrShopkeeper.name}</h3>
              <p className="text-xs text-slate-400">Scan to upload print files directly to this shopkeeper</p>
            </div>

            <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <QRCodeSVG value={getShopkeeperPortalLink(selectedQrShopkeeper)} size={180} level="H" />
            </div>

            <button
              type="button"
              onClick={() => copyPortalLink(selectedQrShopkeeper)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              <span>{copiedShopId === selectedQrShopkeeper._id ? 'Copied to Clipboard!' : 'Copy Portal Link'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
