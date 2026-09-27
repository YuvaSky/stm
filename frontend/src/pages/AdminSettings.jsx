import React, { useState, useEffect } from 'react';
import { Shield, Printer, DollarSign, Clock, ShieldCheck, Plus, Save, UserPlus, Users, ToggleLeft, ToggleRight, X, Lock, ArrowLeft, QrCode, Copy, Check, ExternalLink, Download, Trash2, Search, Filter, Store, UserCheck } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function AdminSettings({ setCurrentView }) {
  const { user, login } = useAuth();
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
      fetchSettings();
      fetchPrinters();
      fetchAuditLogs();
      fetchUsers();
      fetchStaff();
    }
  }, [user]);

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

  if (unauthorized) {
    return (
      <div className="max-w-md mx-auto my-8 px-4 sm:my-12 p-6 bg-white border border-slate-200 rounded-3xl shadow-lg space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-extrabold text-slate-900">Admin Authorization Required</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please log in with Admin or Manager credentials to access registration and portal settings.
          </p>
        </div>

        {loginError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center font-semibold">
            {loginError}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
            <input
              type="tel"
              required
              placeholder="e.g. 9999999999"
              value={loginMobile}
              onChange={(e) => setLoginMobile(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-mono focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="Enter admin password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:border-purple-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all mt-2"
          >
            SIGN IN TO ADMIN CONTROL
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentView && setCurrentView('customer')}
            className="text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Customer App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            SUPER ADMIN & USER REGISTRATION PORTAL
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">Admin & User Management</h1>
          <p className="text-xs sm:text-sm text-purple-200 max-w-2xl">
            Register new Customers, Shopkeepers (Staff) and Admins. Generate QR codes for Shopkeeper portals & manage system print rates.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all shrink-0 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New User / Shopkeeper</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-2xl font-bold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* User & Shopkeeper Registration Management Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        
        {/* Top Header & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-base sm:text-lg text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Registered Accounts ({filteredUsers.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Customers, Shopkeeper Staff & System Admin accounts in one place.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name, mobile..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
              />
            </div>

            {/* Quick Register Button */}
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-extrabold text-xs border border-purple-200 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveRoleFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeRoleFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Accounts ({userList.length})
          </button>
          
          <button
            onClick={() => setActiveRoleFilter('SHOPKEEPER')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeRoleFilter === 'SHOPKEEPER'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Shopkeepers ({userList.filter(u => ['STAFF', 'MANAGER'].includes(u.role)).length})
          </button>

          <button
            onClick={() => setActiveRoleFilter('CUSTOMER')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeRoleFilter === 'CUSTOMER'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Customers ({userList.filter(u => u.role === 'CUSTOMER').length})
          </button>

          <button
            onClick={() => setActiveRoleFilter('ADMIN')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeRoleFilter === 'ADMIN'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admins ({userList.filter(u => ['ADMIN', 'MANAGER'].includes(u.role)).length})
          </button>
        </div>

        {/* Responsive Table / Cards */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Mobile / Login ID</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Shopkeeper Portal & QR</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Manage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                    No accounts found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isShopkeeper = ['STAFF', 'MANAGER'].includes(u.role);
                  const portalLink = getShopkeeperPortalLink(u);
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{u.name}</p>
                          {u.email && <p className="text-[11px] text-slate-500 font-normal">{u.email}</p>}
                        </div>
                      </td>
                      
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {u.mobile}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] ${
                          u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                          u.role === 'MANAGER' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
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
                              type="button"
                              onClick={() => setSelectedQrShopkeeper(u)}
                              className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 font-bold text-[11px]"
                              title="View Customer QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR</span>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => copyPortalLink(u)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-bold text-[11px]"
                              title="Copy Customer Link"
                            >
                              {copiedShopId === u._id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Standard Customer Account</span>
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
                              className={`p-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all ${
                                u.staffStatus === 'ACTIVE'
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                              title={u.staffStatus === 'ACTIVE' ? 'Deactivate Shopkeeper' : 'Activate Shopkeeper'}
                            >
                              {u.staffStatus === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            disabled={user && user.id === u._id}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
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

      {/* Register New User / Shopkeeper / Admin Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900">Register New Account</h3>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              
              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Role Type</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-purple-50/60 border border-purple-200 rounded-xl p-2.5 text-purple-900 font-extrabold focus:outline-none focus:border-purple-600"
                >
                  <option value="STAFF">SHOPKEEPER / COUNTER STAFF (Receives Queue & QR)</option>
                  <option value="CUSTOMER">CUSTOMER (Standard User App)</option>
                  <option value="ADMIN">SUPER ADMIN / MANAGER (Full System Settings)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number (Login ID)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newUser.mobile}
                  onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. user@domain.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="Create account password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
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

      {/* QR Code Modal for Shopkeeper Portal Link */}
      {selectedQrShopkeeper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Customer Portal QR Code</span>
              <button
                onClick={() => setSelectedQrShopkeeper(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900">{selectedQrShopkeeper.name}</h3>
              <p className="text-xs text-slate-500">Scan to upload print files directly to this shopkeeper</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center shadow-inner">
              <QRCodeSVG value={getShopkeeperPortalLink(selectedQrShopkeeper)} size={180} level="H" />
              <span className="text-[11px] font-mono font-bold text-slate-600 mt-3 break-all">
                {getShopkeeperPortalLink(selectedQrShopkeeper)}
              </span>
            </div>

            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => copyPortalLink(selectedQrShopkeeper)}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedShopId === selectedQrShopkeeper._id ? 'Copied to Clipboard!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Pricing Matrix & Retention Timer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pricing Matrix Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Print Pricing Matrix (per page)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-slate-600 font-semibold block mb-1">A4 Black & White (₹)</label>
              <input
                type="number"
                value={pricing.A4_BW}
                onChange={(e) => setPricing({ ...pricing, A4_BW: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-extrabold"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-slate-600 font-semibold block mb-1">A4 Colour (₹)</label>
              <input
                type="number"
                value={pricing.A4_COLOUR}
                onChange={(e) => setPricing({ ...pricing, A4_COLOUR: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-extrabold"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-slate-600 font-semibold block mb-1">A3 Black & White (₹)</label>
              <input
                type="number"
                value={pricing.A3_BW}
                onChange={(e) => setPricing({ ...pricing, A3_BW: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-extrabold"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="text-slate-600 font-semibold block mb-1">A3 Colour (₹)</label>
              <input
                type="number"
                value={pricing.A3_COLOUR}
                onChange={(e) => setPricing({ ...pricing, A3_COLOUR: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 font-extrabold"
              />
            </div>
          </div>
        </div>

        {/* File Retention Auto-Deletion Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-600" />
            Automatic Document Deletion Timer
          </h3>
          <p className="text-xs text-slate-500">
            For customer privacy protection, uploaded digital files are automatically purged after collection.
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Retention Duration (Minutes)</label>
            <select
              value={retentionMinutes}
              onChange={(e) => setRetentionMinutes(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold"
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
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>

      </div>

    </div>
  );
}
