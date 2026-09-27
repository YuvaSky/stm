import React, { useState, useEffect } from 'react';
import { Shield, Printer, DollarSign, Clock, ShieldCheck, Plus, Save, UserPlus, Users, ToggleLeft, ToggleRight, X, Lock, ArrowLeft, QrCode, Copy, Check, ExternalLink, Download } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

export default function AdminSettings({ setCurrentView }) {
  const { user, login } = useAuth();
  const [shop, setShop] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [copiedShopId, setCopiedShopId] = useState(null);
  const [selectedQrShopkeeper, setSelectedQrShopkeeper] = useState(null);

  // New Shopkeeper Registration Modal state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    mobile: '',
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
    e.preventDefault();
    setLoginError('');
    try {
      await login(loginMobile, loginPassword);
      setUnauthorized(false);
      fetchSettings();
      fetchPrinters();
      fetchAuditLogs();
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

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.mobile || !newStaff.password) {
      alert('Please fill out name, mobile, and password');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/admin/staff', newStaff);
      if (res.data.success) {
        setSaveSuccess(`✅ Shopkeeper '${newStaff.name}' registered successfully!`);
        setIsAddStaffOpen(false);
        setNewStaff({ name: '', mobile: '', password: '', role: 'STAFF', shopName: '' });
        fetchStaff();
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStaffStatus = async (staffId) => {
    try {
      const res = await axios.patch(`/api/admin/staff/${staffId}/status`);
      if (res.data.success) {
        fetchStaff();
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

  const getShopkeeperPortalLink = (staffMember) => {
    const shopCode = staffMember._id || staffMember.userId?._id || 'main';
    return `${window.location.origin}/?shop=${shopCode}`;
  };

  const copyPortalLink = (staffMember) => {
    const link = getShopkeeperPortalLink(staffMember);
    navigator.clipboard.writeText(link);
    setCopiedShopId(staffMember._id);
    setTimeout(() => setCopiedShopId(null), 2500);
  };

  if (unauthorized) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-extrabold text-slate-900">Admin Authorization Required</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please log in with Admin or Manager credentials to access system settings and shopkeeper management.
          </p>
        </div>

        {loginError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center font-semibold">
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
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-purple-600"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="Enter password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-purple-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all mt-2"
          >
            SIGN IN TO ADMIN CONFIG
          </button>

          <button
            type="button"
            onClick={async () => {
              setLoginError('');
              try {
                await login('9999999999', 'admin123');
                setUnauthorized(false);
                fetchSettings();
                fetchPrinters();
                fetchAuditLogs();
                fetchStaff();
              } catch (err) {
                setLoginError('Admin login failed: ' + err.message);
              }
            }}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span>⚡ One-Click Demo Admin Login</span>
            <span className="text-[10px] text-slate-500 font-normal">(9999999999)</span>
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentView && setCurrentView('customer')}
            className="text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Customer Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            ADMIN SYSTEM CONTROL
          </div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight">Shopkeeper Portal & QR Management</h1>
          <p className="text-xs text-purple-200">Register shopkeepers, issue customer portal links, generate shop QR codes & set print rates.</p>
        </div>

        <button
          onClick={() => setIsAddStaffOpen(true)}
          className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Shopkeeper</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Shopkeeper Management Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Registered Shopkeepers & Portals ({staffList.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Each shopkeeper gets a unique customer link and QR code for instant file uploads.</p>
          </div>
          
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-extrabold text-xs border border-purple-200 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shopkeeper</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Shopkeeper Name</th>
                <th className="py-3 px-4">Mobile / Login</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Customer Portal QR & Link</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    No shopkeepers registered yet. Click "Register New Shopkeeper" above.
                  </td>
                </tr>
              ) : (
                staffList.map((st) => {
                  const portalLink = getShopkeeperPortalLink(st);
                  return (
                    <tr key={st._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {st.userId?.name || 'Unnamed Shopkeeper'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {st.userId?.mobile}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                          {st.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedQrShopkeeper(st)}
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 font-bold text-[11px]"
                            title="View Customer QR Code"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>View QR</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => copyPortalLink(st)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-bold text-[11px]"
                            title="Copy Customer Link"
                          >
                            {copiedShopId === st._id ? (
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
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          st.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleStaffStatus(st._id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all ${
                            st.status === 'ACTIVE'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {st.status === 'ACTIVE' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          <span>{st.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
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

      {/* Register New Shopkeeper Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">Register New Shopkeeper</h3>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Shopkeeper Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Shop Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Digital Prints"
                  value={newStaff.shopName}
                  onChange={(e) => setNewStaff({ ...newStaff, shopName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number (Login ID)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={newStaff.mobile}
                  onChange={(e) => setNewStaff({ ...newStaff, mobile: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Portal Password</label>
                <input
                  type="password"
                  required
                  placeholder="Create portal password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Account Permission Role</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold"
                >
                  <option value="STAFF">STAFF (Shopkeeper Operator)</option>
                  <option value="MANAGER">MANAGER (Full Admin & Reports Access)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl shadow-md"
                >
                  {loading ? 'Creating...' : 'Register & Generate QR'}
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
              <h3 className="font-extrabold text-lg text-slate-900">{selectedQrShopkeeper.userId?.name}</h3>
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
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Print Pricing Matrix (per page)
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
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
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
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
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>

      </div>

    </div>
  );
}
