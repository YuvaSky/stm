import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { QrCode, Printer, CheckCircle, PackageCheck, AlertCircle, RefreshCw, Tag, ShieldAlert, KeyRound, Search, DollarSign, Lock, ArrowLeft, Zap, ChevronDown, Check, Ban, X, Copy, Store } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import QrScannerModal from '../components/QrScannerModal';

import PrintJobLabel from '../components/PrintJobLabel';
import HandoverModal from '../components/HandoverModal';
import PrintAgentModal from '../components/PrintAgentModal';

export default function ShopkeeperDashboard({ setCurrentView }) {
  const { socket } = useSocket();
  const { user, login } = useAuth();

  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ newOrders: 0, printing: 0, ready: 0, collectedToday: 0, todaySales: 0 });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isShopPortalQrOpen, setIsShopPortalQrOpen] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState(null);
  const [reprintOrderTarget, setReprintOrderTarget] = useState(null);
  const [isPrintAgentModalOpen, setIsPrintAgentModalOpen] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [connectedPrinters, setConnectedPrinters] = useState([]);
  const [preferredPrinter, setPreferredPrinter] = useState('AUTO');
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  
  const [manualPinInput, setManualPinInput] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!user || !['STAFF', 'MANAGER', 'ADMIN'].includes(user.role)) {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
      fetchQueue();
      fetchAgentStatus();
      fetchAutoPrintSettings();
    }
  }, [user]);

  // Handle click outside of printer selector dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#printer-selector-container')) {
        setPrinterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsePrintersData = (printersRaw) => {
    if (!printersRaw) return [];
    if (Array.isArray(printersRaw)) {
      return printersRaw.map(p => {
        if (typeof p === 'string') return { name: p, isDefault: false, status: 'Ready' };
        return { name: p.name || 'Unknown', isDefault: Boolean(p.isDefault), status: p.status || 'Ready' };
      });
    }
    if (typeof printersRaw === 'string') {
      const lines = printersRaw.split('\n').filter(l => l.trim() && !l.includes('---') && !l.includes('PrinterStatus'));
      const list = lines.map(line => {
        const match = line.match(/^(\S.*?\S)\s{2,}/);
        const name = match ? match[1].trim() : line.trim();
        const isDefault = line.toLowerCase().includes('true');
        return { name, isDefault, status: 'Ready' };
      }).filter(p => p.name && p.name !== 'Name');
      return list;
    }
    return [];
  };

  const fetchAgentStatus = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/agent-status');
      if (res.data.success) {
        setAgentOnline(res.data.online);
        if (res.data.printers && res.data.printers.length > 0) {
          setConnectedPrinters(parsePrintersData(res.data.printers));
        }
      }
    } catch (_) {}
  };

  const fetchAutoPrintSettings = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/autoprint-settings');
      if (res.data.success) {
        setAutoPrintEnabled(res.data.autoPrint);
        if (res.data.preferredPrinter) {
          setPreferredPrinter(res.data.preferredPrinter);
        }
      }
    } catch (_) {}
  };

  const toggleAutoPrint = async () => {
    try {
      const nextState = !autoPrintEnabled;
      const res = await axios.post('/api/shopkeeper/autoprint-settings', {
        autoPrint: nextState,
        preferredPrinter
      });
      if (res.data.success) {
        setAutoPrintEnabled(res.data.autoPrint);
        setActionMessage(res.data.message);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Error changing auto-print: ' + err.message);
    }
  };

  const handleSelectPrinter = async (printerName) => {
    setPreferredPrinter(printerName);
    setPrinterDropdownOpen(false);
    try {
      const res = await axios.post('/api/shopkeeper/autoprint-settings', {
        autoPrint: autoPrintEnabled,
        preferredPrinter: printerName
      });
      if (res.data.success) {
        setActionMessage(`Active Printer set to: ${printerName === 'AUTO' ? 'Windows Default (Auto-Route)' : printerName}`);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      console.error('Failed to update preferred printer', err);
    }
  };

  // Real-time queue and agent sync via Socket.io
  useEffect(() => {
    if (!socket) return;

    socket.on('new_order_queued', () => {
      fetchQueue();
    });

    socket.on('order_status_updated', () => {
      fetchQueue();
    });

    socket.on('agent_status', (data) => {
      setAgentOnline(data.online);
      if (data.printers && data.printers.length > 0) {
        setConnectedPrinters(parsePrintersData(data.printers));
      } else if (data.agents && data.agents.length > 0 && data.agents[0].printers) {
        setConnectedPrinters(parsePrintersData(data.agents[0].printers));
      }
    });

    socket.on('autoprint_settings_updated', (data) => {
      if (data.autoPrint !== undefined) {
        setAutoPrintEnabled(data.autoPrint);
      }
      if (data.preferredPrinter !== undefined) {
        setPreferredPrinter(data.preferredPrinter);
      }
    });

    return () => {
      socket.off('new_order_queued');
      socket.off('order_status_updated');
      socket.off('agent_status');
      socket.off('autoprint_settings_updated');
    };
  }, [socket]);

  const fetchQueue = async () => {
    setUnauthorized(false);
    try {
      const res = await axios.get('/api/shopkeeper/queue');
      if (res.data.success) {
        setQueue(res.data.queue);
        
        const reportsRes = await axios.get('/api/shopkeeper/reports');
        if (reportsRes.data.success) {
          setStats({
            ...res.data.stats,
            todaySales: reportsRes.data.reports.todaySales || 0
          });
        } else {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setUnauthorized(true);
      } else {
        console.error('Failed to fetch queue:', err.message);
      }
    }
  };

  const handleStaffLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError('');
    try {
      await login(loginMobile, loginPassword);
      setUnauthorized(false);
      fetchQueue();
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Staff login failed');
    }
  };

  const handleAutoLoginStaff = async () => {
    setLoginError('');
    try {
      await login('8888888888', 'admin123');
      setUnauthorized(false);
      fetchQueue();
    } catch (err) {
      setLoginError('Staff login failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleQrScanned = async (scannedToken) => {
    setLoading(true);
    setActionMessage('');
    try {
      const res = await axios.post('/api/shopkeeper/verify-qr', { qrToken: scannedToken });
      if (res.data.success) {
        setActionMessage(`✅ ORDER VERIFIED: ${res.data.order.publicOrderId}`);
        fetchQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'QR Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualPinVerify = async () => {
    if (!manualPinInput) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/shopkeeper/verify-pin', { pickupPin: manualPinInput });
      if (res.data.success) {
        setActionMessage(`✅ PIN VERIFIED: Order ${res.data.order.publicOrderId}`);
        setSelectedOrderForHandover(res.data.order);
        setManualPinInput('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid PIN');
    } finally {
      setLoading(false);
    }
  };

  const triggerPrintNow = async (order, isReprintConfirmed = false) => {
    setLoading(true);
    setActionMessage('');
    try {
      const res = await axios.post('/api/shopkeeper/print-now', {
        orderId: order._id,
        isReprintConfirmed,
        printerName: preferredPrinter
      });

      if (res.data.success) {
        setActionMessage(`🖨️ Physical print job dispatched to: ${res.data.printerName} (${order.publicOrderId})`);
        setReprintOrderTarget(null);
        fetchQueue();
        setTimeout(() => setActionMessage(''), 5000);
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.requiresReprintConfirmation) {
        // Trigger Duplicate Print Protection Modal
        setReprintOrderTarget(order);
      } else {
        alert(err.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const markReady = async (orderId) => {
    try {
      const res = await axios.post('/api/shopkeeper/mark-ready', { orderId });
      if (res.data.success) {
        setActionMessage(`✅ Order marked READY FOR PICKUP`);
        fetchQueue();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const abortPrint = async (order) => {
    if (!window.confirm(`Abort printing for ${order.publicOrderId}?`)) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/shopkeeper/abort-print', { orderId: order._id });
      if (res.data.success) {
        setActionMessage(`Print aborted: ${order.publicOrderId}`);
        fetchQueue();
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Shopkeeper Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleShopkeeperRegister = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!regName || !regMobile || !regPassword) {
      setLoginError('Name, Mobile Number, and Password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', {
        name: regName,
        shopName: regShopName || `${regName}'s Print Shop`,
        mobile: regMobile,
        password: regPassword,
        role: 'STAFF'
      });

      if (res.data.success) {
        alert(`✅ Shopkeeper registration successful! Logging into ${regShopName || regName}'s Dashboard...`);
        await login(regMobile, regPassword);
        setUnauthorized(false);
        fetchQueue();
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintStandee = () => {
    const shopCode = user?._id || 'main';
    const uploadUrl = `${window.location.origin}/?shop=${shopCode}`;
    const shopNameStr = user?.name || 'Counter Express Print';

    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Counter Standee - ${shopNameStr}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .standee { border: 4px solid #0284c7; border-radius: 24px; padding: 40px; max-w: 480px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            .badge { background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 14px; padding: 6px 16px; border-radius: 20px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; }
            h1 { font-size: 28px; margin: 20px 0 5px; font-weight: 900; }
            p { font-size: 14px; color: #64748b; margin-bottom: 25px; }
            .qr-box { background: #f8fafc; padding: 25px; border-radius: 20px; border: 2 border-dashed #cbd5e1; display: inline-block; }
            .qr-box img { width: 220px; height: 220px; }
            .url { font-family: monospace; font-size: 12px; font-weight: bold; color: #0284c7; margin-top: 15px; word-break: break-all; }
            .instructions { margin-top: 30px; text-align: left; background: #f1f5f9; padding: 15px 20px; border-radius: 16px; font-size: 13px; line-height: 1.6; }
            .instructions li { margin-bottom: 6px; }
            .footer { margin-top: 25px; font-size: 11px; color: #94a3b8; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="standee">
            <div class="badge">SECUREPRINT EXPRESS COUNTER</div>
            <h1>${shopNameStr}</h1>
            <p>Scan QR Code with Phone Camera to Upload Files</p>

            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(uploadUrl)}" alt="Counter QR Code" />
              <div class="url">${uploadUrl}</div>
            </div>

            <div class="instructions">
              <strong>📱 How Customers Order:</strong>
              <ol>
                <li>Scan QR code with your mobile camera</li>
                <li>Select documents or ID photos to print</li>
                <li>Instant collection at counter when status updates</li>
              </ol>
            </div>

            <div class="footer">Zero Dialog Spooling • Powered by SecurePrint Express</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (unauthorized) {
    return (
      <div className="max-w-md mx-auto my-8 px-4 sm:my-12 p-6 bg-white border border-slate-200 rounded-3xl shadow-lg space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
          <Store className="w-6 h-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-extrabold text-slate-900">
            Shopkeeper Counter Login
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access your print queue, live WebSocket jobs, and counter QR code.
          </p>
        </div>

        {loginError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center font-bold">
            {loginError}
          </div>
        )}

        {/* Shopkeeper Sign In Form */}
        <form onSubmit={handleStaffLogin} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
            <input
              type="tel"
              required
              placeholder="Enter registered mobile number"
              value={loginMobile}
              onChange={(e) => setLoginMobile(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-blue-600"
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
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all mt-2 cursor-pointer"
          >
            SIGN IN TO SHOP DASHBOARD
          </button>

          <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-500 font-medium">
            🔒 <span className="font-bold text-slate-700">Need a Shopkeeper Account?</span> Contact Platform Admin. Only Admin can create shopkeeper accounts.
          </div>
        </form>

        <div className="pt-2 text-center border-t border-slate-100">
          <button
            type="button"
            onClick={() => setCurrentView && setCurrentView('customer')}
            className="text-xs font-semibold text-slate-500 hover:text-cyan-700 transition-colors inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Customer App</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredQueue = queue.filter(item => {
    const matchesSearch = item.publicOrderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.userId?.mobile || '').includes(searchQuery);
    
    if (!matchesSearch) return false;
    if (activeFilter === 'WAITING') return ['PAID', 'QUEUED', 'VERIFIED'].includes(item.status);
    if (activeFilter === 'PRINTING') return item.status === 'PRINTING';
    if (activeFilter === 'READY') return item.status === 'READY';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Banner & Counter Cards */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            SHOPKEEPER DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 mt-1">Direct Physical Printer Control • Real-time WebSocket Queue • Zero Print Dialog</p>
        </div>

        {/* Action Controls: Auto-Print Toggle, Connected Printer Selector, Scan QR & Quick PIN entry */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
          {/* Quick Auto-Print Mode Toggle */}
          <button
            onClick={toggleAutoPrint}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              autoPrintEnabled
                ? 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title="When active, customer orders print automatically upon payment"
          >
            <Zap className={`w-3.5 h-3.5 ${autoPrintEnabled ? 'text-cyan-600 fill-cyan-500 animate-pulse' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{autoPrintEnabled ? 'AUTO-PRINT ON' : 'AUTO-PRINT OFF'}</span>
            <span className="sm:hidden">{autoPrintEnabled ? 'AUTO' : 'MANUAL'}</span>
          </button>

          {/* Shopkeeper Customer Upload Portal QR Code Button */}
          <button
            onClick={() => setIsShopPortalQrOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 transition-all shadow-xs"
            title="Display your Customer Upload Portal QR Code & Link"
          >
            <QrCode className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">My Portal QR</span>
            <span className="sm:hidden">QR</span>
          </button>

          {/* Connected Printers Selector / Dropdown */}
          <div id="printer-selector-container" className="relative">
            <button
              onClick={() => {
                if (!agentOnline || connectedPrinters.length === 0) {
                  setIsPrintAgentModalOpen(true);
                } else {
                  setPrinterDropdownOpen(!printerDropdownOpen);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                agentOnline && connectedPrinters.length > 0
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
              title={
                agentOnline
                  ? `Connected to ${connectedPrinters.length} printer(s). Click to view connected printers or switch.`
                  : 'Print agent is offline. Click to connect printer.'
              }
            >
              <div className="relative flex items-center">
                <Printer className={`w-3.5 h-3.5 ${agentOnline ? 'text-cyan-600' : 'text-amber-600'}`} />
                <span
                  className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-white ${
                    agentOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
              </div>

              {agentOnline && connectedPrinters.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <span className="max-w-[130px] sm:max-w-[170px] truncate">
                    {preferredPrinter && preferredPrinter !== 'AUTO'
                      ? preferredPrinter
                      : (connectedPrinters.find(p => p.isDefault)?.name || connectedPrinters[0]?.name || 'Auto-Route')}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                    {connectedPrinters.length} Online
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>No Printer Connected</span>
                  <span className="text-[10px] underline font-normal hidden sm:inline">(Connect)</span>
                </div>
              )}
            </button>

            {/* Dropdown Menu listing all connected printers */}
            {printerDropdownOpen && agentOnline && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Connected Printers ({connectedPrinters.length})
                    </p>
                    <p className="text-[10px] text-slate-500">Target hardware printer for counter orders</p>
                  </div>
                  <button
                    onClick={() => { setPrinterDropdownOpen(false); setIsPrintAgentModalOpen(true); }}
                    className="text-[10px] font-bold text-cyan-600 hover:text-cyan-800 hover:underline cursor-pointer"
                  >
                    Test Spooler
                  </button>
                </div>

                <div className="p-1.5 max-h-60 overflow-y-auto space-y-1">
                  {/* Auto-Route to default printer */}
                  <button
                    onClick={() => handleSelectPrinter('AUTO')}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      preferredPrinter === 'AUTO'
                        ? 'bg-cyan-50/80 text-cyan-950 font-bold border border-cyan-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-600" />
                      <div>
                        <p className="leading-tight font-semibold">Auto-Route (Windows Default)</p>
                        <p className="text-[10px] text-slate-400 font-normal">Sends to Windows default system printer</p>
                      </div>
                    </div>
                    {preferredPrinter === 'AUTO' && <Check className="w-4 h-4 text-cyan-600 shrink-0" />}
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  {/* List of Detected Physical / System Printers */}
                  {connectedPrinters.map((printer, idx) => {
                    const isSelected = preferredPrinter === printer.name;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectPrinter(printer.name)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-950 font-bold border border-blue-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate leading-tight font-semibold">{printer.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {printer.isDefault && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Default
                                </span>
                              )}
                              <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                Connected
                              </span>
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                  <button
                    onClick={() => { setPrinterDropdownOpen(false); setIsPrintAgentModalOpen(true); }}
                    className="w-full py-1.5 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>⚙️ Manage Spooler & Agent Diagnostics</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>SCAN QR</span>
          </button>

          <div className="flex items-center bg-white border border-slate-300 rounded-xl px-2 py-1 shadow-xs">
            <input
              type="text"
              placeholder="Enter Pickup PIN"
              value={manualPinInput}
              onChange={(e) => setManualPinInput(e.target.value)}
              className="bg-transparent text-xs text-slate-900 px-2 py-1 focus:outline-none w-28 font-mono"
            />
            <button
              onClick={handleManualPinVerify}
              className="bg-cyan-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-cyan-500"
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Status Alert Message */}
      {actionMessage && (
        <div className="p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs rounded-xl flex items-center justify-between shadow-xs">
          <span className="font-semibold">{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-cyan-700 hover:text-slate-900 text-xs font-bold">Dismiss</button>
        </div>
      )}

      {/* Metrics Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-extrabold text-lg">
            {stats.newOrders || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">QUEUED</span>
            <span className="text-xs text-slate-800 font-bold">Waiting Print</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-extrabold text-lg">
            {stats.printing || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">PRINTING</span>
            <span className="text-xs text-slate-800 font-bold">Agent Active</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-lg">
            {stats.ready || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">READY</span>
            <span className="text-xs text-slate-800 font-bold">For Pickup</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-extrabold text-lg">
            {stats.collectedToday || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">HANDOVER</span>
            <span className="text-xs text-slate-800 font-bold">Completed</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-sm">
            ₹{stats.todaySales || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">TODAY SALES</span>
            <span className="text-xs text-emerald-700 font-extrabold">Revenue</span>
          </div>
        </div>

      </div>

      {/* Queue Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          {['ALL', 'WAITING', 'PRINTING', 'READY'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeFilter === tab ? 'bg-white text-cyan-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Job ID or Mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
          />
        </div>
      </div>

      {/* Main Print Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Queue # / Job ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Documents / Pages</th>
                <th className="py-3 px-4">Print Options</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500 font-semibold">
                    <p className="text-sm font-bold text-slate-700">No print orders currently in queue</p>
                    <p className="text-xs text-slate-400 mt-1">Place an order from Customer App to see it update live here.</p>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item, idx) => {
                  const firstSetting = item.settings?.[0] || {};
                  const totalPages = (item.documents || []).reduce((sum, d) => sum + (d.pageCount || 1), 0);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      
                      {/* Job ID */}
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span className="text-cyan-700 text-sm">{item.publicOrderId}</span>
                        <span className="text-[10px] text-slate-400 block">Queue #{idx + 1}</span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{item.userId?.name || 'Customer'}</span>
                        <span className="text-[10px] text-slate-500">{item.userId?.mobile || ''}</span>
                      </td>

                      {/* Documents / Pages */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{item.documents?.length || 1} Doc(s)</span>
                        <span className="text-cyan-700 font-extrabold block">{totalPages} Total Pages</span>
                      </td>

                      {/* Print Options & Printer Routing */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            {firstSetting.paperSize || 'A4'}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            firstSetting.colorMode === 'COLOUR' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-500 shadow-2xs' : 'bg-slate-800 text-white border-slate-700'
                          }`}>
                            {firstSetting.colorMode === 'COLOUR' ? '🌈 COLOR' : '⚫ B&W'}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                            {firstSetting.sides || 'SINGLE'}
                          </span>
                        </div>

                        {/* Dedicated Printer Target Tag */}
                        <div className={`text-[9px] font-black px-2 py-0.5 rounded border inline-block ${
                          firstSetting.colorMode === 'COLOUR'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          ROUTE TO: {firstSetting.colorMode === 'COLOUR' ? 'COLOR PRINTER 🖨️' : 'B&W PRINTER 🖨️'}
                        </div>
                      </td>

                      {/* Status & Hardware Printer Dispatched */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                          item.status === 'READY'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                            : item.status === 'PRINTING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.status === 'PRINTED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}>
                          {item.status}
                        </span>

                        {/* Displays which physical/virtual printer received the print job */}
                        {item.printedToPrinter && (
                          <div
                            className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-semibold max-w-fit"
                            title={`Printed to: ${item.printedToPrinter}`}
                          >
                            <Printer className="w-3 h-3 text-cyan-600 shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[140px]">{item.printedToPrinter}</span>
                          </div>
                        )}

                        {item.printCount > 1 && (
                          <span className="text-[9px] text-amber-600 font-bold block mt-0.5">
                            Printed {item.printCount}x
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        
                        {/* 1. Direct Physical PRINT NOW or PRINT AGAIN Button */}
                        {item.printCount > 0 || ['PRINTED', 'PRINTING', 'READY'].includes(item.status) ? (
                          <button
                            onClick={() => setReprintOrderTarget(item)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs rounded-lg shadow-xs flex items-center gap-1.5 inline-flex transition-all active:scale-95 cursor-pointer"
                            title={
                              item.printedToPrinter
                                ? `Already printed to ${item.printedToPrinter}. Click to print again.`
                                : 'Already printed. Click to print again.'
                            }
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                            <span>PRINT AGAIN</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerPrintNow(item)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center gap-1 inline-flex transition-all active:scale-95 cursor-pointer"
                            title={`Direct physical print to: ${preferredPrinter && preferredPrinter !== 'AUTO' ? preferredPrinter : 'selected printer'}`}
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>PRINT NOW</span>
                          </button>
                        )}

                        {/* 2. Print Job Label Tag Button */}
                        <button
                          onClick={() => setSelectedOrderForLabel(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                          title="Print Physical Tray Tag"
                        >
                          <Tag className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Tag</span>
                        </button>

                        {/* 3. Mark Ready Button */}
                        {['PRINTING', 'PRINTED'].includes(item.status) && (
                          <button
                            onClick={() => markReady(item._id)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Ready</span>
                          </button>
                        )}

                        {/* Abort an active print before handover */}
                        {item.status === 'PRINTING' && (
                          <button
                            onClick={() => abortPrint(item)}
                            disabled={loading}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg inline-flex items-center gap-1 border border-rose-200 cursor-pointer"
                            title="Abort this print job"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>ABORT PRINT</span>
                          </button>
                        )}

                        {/* 4. Collect & Handover Button */}
                        {item.status === 'READY' && (
                          <button
                            onClick={() => setSelectedOrderForHandover(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-lg shadow-xs flex items-center gap-1 inline-flex transition-all cursor-pointer"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>HANDOVER</span>
                          </button>
                        )}

                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate Print Protection Warning Modal */}
      {reprintOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">⚠️ PRINT AGAIN CONFIRMATION</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Order <strong className="text-cyan-700">{reprintOrderTarget.publicOrderId}</strong> has already been printed{' '}
                {reprintOrderTarget.printedToPrinter ? (
                  <span>on <strong className="text-slate-900">{reprintOrderTarget.printedToPrinter}</strong> ({reprintOrderTarget.printCount || 1} time{reprintOrderTarget.printCount > 1 ? 's' : ''})</span>
                ) : (
                  <span>({reprintOrderTarget.printCount || 1} time{reprintOrderTarget.printCount > 1 ? 's' : ''})</span>
                )}.
              </p>
              <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Spooler Printer</span>
                <span className="font-extrabold text-cyan-800 flex items-center gap-1.5 mt-0.5">
                  <Printer className="w-3.5 h-3.5 text-cyan-600" />
                  {preferredPrinter && preferredPrinter !== 'AUTO' ? preferredPrinter : 'Windows Default Printer (Auto-Route)'}
                </span>
              </div>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setReprintOrderTarget(null)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => triggerPrintNow(reprintOrderTarget, true)}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>CONFIRM PRINT AGAIN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Label Printable Tag Modal */}
      {selectedOrderForLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-900 text-sm">Physical Envelope Tag</h3>
              <button onClick={() => setSelectedOrderForLabel(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <PrintJobLabel order={selectedOrderForLabel} />

            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => window.print()} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-xs shadow-xs">
                Print Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web Scanner Modal */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScanSuccess={handleQrScanned}
      />

      {/* Handover & Collection Verification Modal */}
      <HandoverModal
        isOpen={!!selectedOrderForHandover}
        order={selectedOrderForHandover}
        onClose={() => setSelectedOrderForHandover(null)}
        onHandoverSuccess={() => {
          setActionMessage(`✅ Handover Complete! Order ${selectedOrderForHandover?.publicOrderId} marked COLLECTED.`);
          fetchQueue();
        }}
      />

      {/* Local Print Agent Diagnostics & Testing Modal */}
      <PrintAgentModal
        isOpen={isPrintAgentModalOpen}
        onClose={() => setIsPrintAgentModalOpen(false)}
      />

      {/* Customer Upload Portal QR & Link Modal */}
      {isShopPortalQrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold text-purple-700 uppercase tracking-wider">Your Customer Upload Portal</span>
              <button
                onClick={() => setIsShopPortalQrOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900">{user?.name || 'Shopkeeper Portal'}</h3>
              <p className="text-xs text-slate-500">Show this QR code to customers so they can upload & order prints from their mobile</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center shadow-inner">
              <QRCodeSVG value={`${window.location.origin}/?shop=${user?._id || 'main'}`} size={180} level="H" />
              <span className="text-[11px] font-mono font-bold text-slate-600 mt-3 break-all">
                {`${window.location.origin}/?shop=${user?._id || 'main'}`}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/?shop=${user?._id || 'main'}`);
                  alert('Customer Portal Link copied to clipboard!');
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Portal Link</span>
              </button>

              <button
                type="button"
                onClick={handlePrintStandee}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Counter Standee Poster</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

