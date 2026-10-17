import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { QrCode, Printer, CheckCircle, PackageCheck, AlertCircle, RefreshCw, Tag, Shield, ShieldAlert, KeyRound, Search, DollarSign, Lock, ArrowLeft, Zap, ChevronDown, Check, Ban, X, Copy, Store, CreditCard, LogOut, MapPin, Phone, Mail, User, Clock, FileText, ExternalLink, Edit3, Sparkles, Plus, Trash2, Layers } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import QrScannerModal from '../components/QrScannerModal';

import PrintJobLabel from '../components/PrintJobLabel';
import HandoverModal from '../components/HandoverModal';
import PrintAgentModal from '../components/PrintAgentModal';

export default function ShopkeeperDashboard({ setCurrentView }) {
  const { socket } = useSocket();
  const { user, login, registerShop, logout } = useAuth();

  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ newOrders: 0, printing: 0, ready: 0, collectedToday: 0, todaySales: 0 });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isShopPortalQrOpen, setIsShopPortalQrOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({ upiId: '', razorpayKeyId: '', razorpayKeySecret: '', razorpayAccountId: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [shopStaffList, setShopStaffList] = useState([]);
  const [newStaffData, setNewStaffData] = useState({ name: '', mobile: '', password: '' });
  const [shopPricing, setShopPricing] = useState({
    A4_BW: 2,
    A4_COLOUR: 10,
    A3_BW: 5,
    A3_COLOUR: 20,
    LEGAL_BW: 3,
    LEGAL_COLOUR: 12,
    GLOSSY_COLOUR: 25,
    doubleSidedMultiplier: 1.8,
    customItems: []
  });
  const [pricingActiveTab, setPricingActiveTab] = useState('STANDARD'); // 'STANDARD' | 'DYNAMIC'
  const [newCustomItem, setNewCustomItem] = useState({
    name: '',
    price: '',
    unit: 'per document',
    category: 'BINDING',
    description: ''
  });
  const [addingCustomItem, setAddingCustomItem] = useState(false);
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState(null);
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState(null);
  const [reprintOrderTarget, setReprintOrderTarget] = useState(null);
  const [isPrintAgentModalOpen, setIsPrintAgentModalOpen] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [connectedPrinters, setConnectedPrinters] = useState([]);
  const [preferredPrinter, setPreferredPrinter] = useState('AUTO');
  const [printerDropdownOpen, setPrinterDropdownOpen] = useState(false);
  const [rescanningPrinters, setRescanningPrinters] = useState(false);
  const [customPrinterInput, setCustomPrinterInput] = useState('');
  const [showAddCustomPrinter, setShowAddCustomPrinter] = useState(false);
  
  const [manualPinInput, setManualPinInput] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Shop Registration Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [regForm, setRegForm] = useState({
    shopName: '',
    ownerName: '',
    mobile: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
    upiId: '',
    a4BwPrice: 2,
    a4ColorPrice: 10,
    retentionMinutes: 60
  });
  const [showAdvancedReg, setShowAdvancedReg] = useState(false);

  // Shop Details State & Modal
  const [isShopDetailsOpen, setIsShopDetailsOpen] = useState(false);
  const [shopDetails, setShopDetails] = useState(null);
  const [editingShopDetails, setEditingShopDetails] = useState(false);
  const [editShopForm, setEditShopForm] = useState({
    name: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    upiId: '',
    retentionMinutes: 60
  });
  const [savingShopDetails, setSavingShopDetails] = useState(false);
  const [shopDetailsMsg, setShopDetailsMsg] = useState('');
  const [copiedShopUrl, setCopiedShopUrl] = useState(false);

  useEffect(() => {
    if (!user || !['SHOPKEEPER', 'STAFF', 'MANAGER', 'ADMIN'].includes(user.role)) {
      setUnauthorized(true);
    } else {
      setUnauthorized(false);
      fetchQueue();
      fetchAgentStatus();
      fetchAutoPrintSettings();
      fetchShopPricing();
      fetchShopStaff();
      fetchPaymentSettings();
      fetchShopDetails();
    }
  }, [user]);

  const fetchPaymentSettings = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/payment-settings');
      if (res.data.success && res.data.paymentGateway) {
        setPaymentSettings({
          upiId: res.data.paymentGateway.upiId || '',
          razorpayKeyId: res.data.paymentGateway.razorpayKeyId || '',
          razorpayKeySecret: res.data.paymentGateway.razorpayKeySecret || '',
          razorpayAccountId: res.data.paymentGateway.razorpayAccountId || ''
        });
      }
    } catch (_) {}
  };

  const handleSavePaymentSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingPayment(true);
    try {
      const res = await axios.put('/api/shopkeeper/payment-settings', paymentSettings);
      if (res.data.success) {
        setActionMessage('✅ Payment credentials & UPI ID updated successfully!');
        setIsPaymentModalOpen(false);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Failed to save payment settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingPayment(false);
    }
  };

  const fetchShopStaff = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/staff');
      if (res.data.success) {
        setShopStaffList(res.data.staff);
      }
    } catch (_) {}
  };

  const handleCreateShopStaff = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStaffData.name || !newStaffData.mobile || !newStaffData.password) {
      alert('Name, Mobile Number, and Password are required for Staff');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/shopkeeper/staff', newStaffData);
      if (res.data.success) {
        setActionMessage(res.data.message || `✅ Staff '${newStaffData.name}' created! Login Mobile: ${newStaffData.mobile}`);
        setNewStaffData({ name: '', mobile: '', password: '' });
        fetchShopStaff();
        setTimeout(() => setActionMessage(''), 5000);
      }
    } catch (err) {
      alert('Failed to add staff: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShopStaff = async (staffId, staffName) => {
    if (!window.confirm(`Are you sure you want to remove staff member '${staffName}'?`)) return;
    setLoading(true);
    try {
      const res = await axios.delete(`/api/shopkeeper/staff/${staffId}`);
      if (res.data.success) {
        setActionMessage(res.data.message || 'Staff operator removed');
        fetchShopStaff();
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      alert('Failed to remove staff: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchShopPricing = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/pricing');
      if (res.data.success) {
        setShopPricing(res.data.pricing);
      }
    } catch (_) {}
  };

  const handleAddCustomItem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCustomItem.name || newCustomItem.price === '' || isNaN(Number(newCustomItem.price))) {
      alert('Please enter a valid Service Name and Price.');
      return;
    }
    setAddingCustomItem(true);
    try {
      const res = await axios.post('/api/shopkeeper/pricing/custom-item', newCustomItem);
      if (res.data.success) {
        setShopPricing(prev => ({
          ...prev,
          customItems: [...(prev.customItems || []), res.data.item]
        }));
        setNewCustomItem({ name: '', price: '', unit: 'per document', category: 'BINDING', description: '' });
        setActionMessage(res.data.message);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Failed to add custom item: ' + (err.response?.data?.message || err.message));
    } finally {
      setAddingCustomItem(false);
    }
  };

  const handleToggleCustomItem = async (itemId, currentEnabled) => {
    try {
      const res = await axios.put(`/api/shopkeeper/pricing/custom-item/${itemId}`, { enabled: !currentEnabled });
      if (res.data.success) {
        setShopPricing(prev => ({
          ...prev,
          customItems: (prev.customItems || []).map(it => it.id === itemId ? { ...it, enabled: !currentEnabled } : it)
        }));
      }
    } catch (err) {
      alert('Failed to update: ' + err.message);
    }
  };

  const handleDeleteCustomItem = async (itemId) => {
    if (!window.confirm('Delete this dynamic price item?')) return;
    try {
      const res = await axios.delete(`/api/shopkeeper/pricing/custom-item/${itemId}`);
      if (res.data.success) {
        setShopPricing(prev => ({
          ...prev,
          customItems: (prev.customItems || []).filter(it => it.id !== itemId)
        }));
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleAddQuickPreset = async (preset) => {
    try {
      const res = await axios.post('/api/shopkeeper/pricing/custom-item', preset);
      if (res.data.success) {
        setShopPricing(prev => ({
          ...prev,
          customItems: [...(prev.customItems || []), res.data.item]
        }));
        setActionMessage(`✅ Added preset '${preset.name}'!`);
        setTimeout(() => setActionMessage(''), 3000);
      }
    } catch (err) {
      alert('Preset error: ' + err.message);
    }
  };

  const handleSavePricing = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.put('/api/shopkeeper/pricing', { pricing: shopPricing });
      if (res.data.success) {
        setActionMessage('✅ Print Rates & Dynamic Services updated! Customer Store now reflects these rates.');
        setIsRateModalOpen(false);
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      alert('Failed to update rates: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

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

  const handleRescanPrinters = async () => {
    setRescanningPrinters(true);
    try {
      const res = await axios.post('/api/shopkeeper/rescan-printers');
      if (res.data.success) {
        if (res.data.printers && res.data.printers.length > 0) {
          setConnectedPrinters(parsePrintersData(res.data.printers));
        }
        setActionMessage(`✅ Windows Spooler rescanned! Found ${res.data.printers?.length || 0} printers.`);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Rescan failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setRescanningPrinters(false);
    }
  };

  const handleAddCustomPrinter = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!customPrinterInput.trim()) return;
    try {
      const res = await axios.post('/api/shopkeeper/custom-printer', { printerName: customPrinterInput.trim() });
      if (res.data.success) {
        const addedPrinterName = res.data.printer.name;
        setPreferredPrinter(addedPrinterName);
        setConnectedPrinters(prev => {
          if (prev.some(p => p.name.toLowerCase() === addedPrinterName.toLowerCase())) return prev;
          return [...prev, res.data.printer];
        });
        setCustomPrinterInput('');
        setShowAddCustomPrinter(false);
        setPrinterDropdownOpen(false);
        setActionMessage(res.data.message);
        setTimeout(() => setActionMessage(''), 3500);
      }
    } catch (err) {
      alert('Failed to configure printer: ' + (err.response?.data?.message || err.message));
    }
  };

  // Real-time queue and agent sync via Socket.io + auto-polling fallback for serverless
  useEffect(() => {
    fetchQueue();

    // Auto-poll every 4s so serverless deployments (Netlify) receive orders without persistent WebSockets
    const pollInterval = setInterval(() => {
      fetchQueue();
    }, 4000);

    if (!socket) {
      return () => clearInterval(pollInterval);
    }

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
      clearInterval(pollInterval);
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
      fetchShopDetails();
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
      fetchShopDetails();
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

  // Fetch Complete Shop Profile Details
  const fetchShopDetails = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/shop-details');
      if (res.data.success && res.data.shop) {
        setShopDetails(res.data.shop);
        setEditShopForm({
          name: res.data.shop.name || '',
          ownerName: res.data.shop.ownerName || '',
          phone: res.data.shop.phone || res.data.shop.mobile || '',
          email: res.data.shop.email || '',
          address: res.data.shop.address || '',
          upiId: res.data.shop.upiId || res.data.shop.settings?.paymentGateway?.upiId || '',
          retentionMinutes: res.data.shop.retentionMinutes || res.data.shop.settings?.retentionMinutes || 60
        });
      }
    } catch (err) {
      console.warn('Could not fetch shop details:', err.message);
    }
  };

  const handleSaveShopDetails = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingShopDetails(true);
    setShopDetailsMsg('');
    try {
      const res = await axios.put('/api/shopkeeper/shop-details', editShopForm);
      if (res.data.success) {
        setShopDetailsMsg('✅ Shop details updated successfully!');
        setEditingShopDetails(false);
        fetchShopDetails();
        setTimeout(() => setShopDetailsMsg(''), 4000);
      }
    } catch (err) {
      setShopDetailsMsg(err.response?.data?.message || err.message || 'Failed to update shop details');
    } finally {
      setSavingShopDetails(false);
    }
  };

  const handleShopRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError('');

    if (!regForm.shopName || !regForm.ownerName || !regForm.mobile || !regForm.password || !regForm.address) {
      setLoginError('Shop Name, Owner Name, Mobile Number, Password, and Address are required.');
      return;
    }

    const cleanMobile = regForm.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setLoginError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (regForm.password.length < 6) {
      setLoginError('Password must be at least 6 characters long.');
      return;
    }

    if (regForm.confirmPassword && regForm.password !== regForm.confirmPassword) {
      setLoginError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shopName: regForm.shopName.trim(),
        ownerName: regForm.ownerName.trim(),
        mobile: cleanMobile,
        phone: cleanMobile,
        email: regForm.email.trim(),
        address: regForm.address.trim(),
        password: regForm.password,
        upiId: regForm.upiId.trim(),
        pricing: {
          A4_BW: Number(regForm.a4BwPrice) >= 0 ? Number(regForm.a4BwPrice) : 2,
          A4_COLOUR: Number(regForm.a4ColorPrice) >= 0 ? Number(regForm.a4ColorPrice) : 10
        },
        retentionMinutes: Number(regForm.retentionMinutes) || 60
      };

      const res = await registerShop(payload);
      if (res?.success) {
        setUnauthorized(false);
        setActionMessage(`🎉 Welcome! '${payload.shopName}' registered successfully.`);
        fetchQueue();
        fetchShopDetails();
        setTimeout(() => setActionMessage(''), 7000);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || 'Shop registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintStandee = () => {
    const shopCode = shopDetails?._id || shopDetails?.id || user?.shop?._id || user?.shopId || user?._id || 'main';
    const uploadUrl = `${window.location.origin}/?shop=${shopCode}`;
    const shopNameStr = shopDetails?.name || user?.shopName || user?.name || 'Counter Express Print';
    const shopAddressStr = shopDetails?.address || 'Counter Pickup';
    const shopPhoneStr = shopDetails?.phone || user?.mobile || '';
    const rateBw = shopDetails?.pricing?.A4_BW ?? shopPricing?.A4_BW ?? 2;
    const rateColor = shopDetails?.pricing?.A4_COLOUR ?? shopPricing?.A4_COLOUR ?? 10;

    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Counter Standee - ${shopNameStr}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 30px; color: #0f172a; margin: 0; background: #fff; }
            .standee { border: 4px solid #0284c7; border-radius: 28px; padding: 36px 28px; max-width: 480px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
            .badge { background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 13px; padding: 6px 18px; border-radius: 20px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; }
            h1 { font-size: 26px; margin: 18px 0 4px; font-weight: 900; color: #0f172a; }
            .location { font-size: 13px; color: #475569; margin-bottom: 20px; font-weight: 600; }
            .qr-box { background: #f8fafc; padding: 22px; border-radius: 20px; border: 2px dashed #93c5fd; display: inline-block; }
            .qr-box img { width: 220px; height: 220px; display: block; margin: 0 auto; }
            .url { font-family: monospace; font-size: 11px; font-weight: bold; color: #0284c7; margin-top: 14px; word-break: break-all; }
            .rates-grid { display: flex; justify-content: center; gap: 16px; margin: 20px 0; }
            .rate-card { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 8px 16px; border-radius: 12px; font-size: 12px; }
            .rate-card strong { display: block; font-size: 16px; color: #15803d; }
            .instructions { margin-top: 20px; text-align: left; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 20px; border-radius: 16px; font-size: 12px; line-height: 1.6; }
            .instructions ol { margin: 6px 0 0 18px; padding: 0; }
            .instructions li { margin-bottom: 4px; }
            .footer { margin-top: 22px; font-size: 11px; color: #94a3b8; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="standee">
            <div class="badge">SECUREPRINT EXPRESS COUNTER</div>
            <h1>${shopNameStr}</h1>
            <div class="location">📍 ${shopAddressStr} ${shopPhoneStr ? ' • 📞 ' + shopPhoneStr : ''}</div>

            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(uploadUrl)}" alt="Counter QR Code" />
              <div class="url">${uploadUrl}</div>
            </div>

            <div class="rates-grid">
              <div class="rate-card">
                <span>A4 Black & White</span>
                <strong>₹${rateBw} / page</strong>
              </div>
              <div class="rate-card" style="background:#eff6ff; border-color:#bfdbfe;">
                <span style="color:#1e40af;">A4 Full Colour</span>
                <strong style="color:#1d4ed8;">₹${rateColor} / page</strong>
              </div>
            </div>

            <div class="instructions">
              <strong>📱 How to print from your phone:</strong>
              <ol>
                <li>Open camera on your phone & scan this QR code</li>
                <li>Upload documents, photos or ID cards</li>
                <li>Collect your printed sheets instantly at this counter!</li>
              </ol>
            </div>

            <div class="footer">100% Confidential Self-Service • Powered by SecurePrint Express</div>
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
      <div className="max-w-xl mx-auto my-8 px-4 sm:my-10 space-y-4">
        {/* Main Auth Card */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 p-6 text-white text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
              <Store className="w-6 h-6 text-cyan-200" />
            </div>
            <h2 className="text-xl font-black tracking-tight">
              Print Shop Counter Login
            </h2>
            <p className="text-xs text-blue-100 mt-1 max-w-md mx-auto">
              Sign in to access your print queue, live WebSocket dispatcher & counter QR code.
            </p>

            {/* Admin Managed Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-blue-100 border border-white/20 mt-3">
              <Shield className="w-3.5 h-3.5 text-cyan-300" />
              <span>Admin-Managed Store Directory</span>
            </div>
          </div>

          <div className="p-6">
            {loginError && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {authMode === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleStaffLogin} className="space-y-4 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Shop Mobile Number / Staff Login ID (10 digits)
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="e.g. 9999999999 or staff mobile"
                      value={loginMobile}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setLoginMobile(val);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      placeholder="Enter password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'SIGNING IN...' : 'SIGN IN TO SHOP DASHBOARD'}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                    <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>New shops are provisioned by System Admins only</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoLoginStaff}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Quick Staff Demo
                  </button>
                </div>
              </form>
            ) : (
              /* ADMIN ACCESS ONLY NOTICE */
              <div className="py-8 px-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Admin Access Required</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">
                    Shop registration is strictly restricted to system administrators. Only administrators have access to add and configure new print shops.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto font-medium">
                  If you need a print counter login provisioned, please contact your Super Admin.
                </div>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setLoginError(''); }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Return to Counter Sign In
                </button>
              </div>
            )}
          </div>
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
      
      {/* Clean Premium Header & Quick Controls Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-sm space-y-3.5">
        
        {/* Top Title & Primary Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-cyan-600/20 shrink-0">
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {(user?.shopName || user?.shop?.name || (user?.name && user.name !== 'Punit' ? user.name : 'A-ONE')).toUpperCase()} DASHBOARD
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ONLINE COUNTER
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                Real-time Print Spooler • Hardware Dispatcher • Counter Queue Management
              </p>
            </div>
          </div>

          {/* Core Action Group: PIN Input, Scanner, Logout (Single Clean Row) */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap self-start lg:self-auto">
            {/* Quick Pickup PIN Verification Box */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs focus-within:border-cyan-500 focus-within:bg-white transition-all">
              <input
                type="text"
                placeholder="Pickup PIN..."
                value={manualPinInput}
                onChange={(e) => setManualPinInput(e.target.value)}
                className="bg-transparent text-xs text-slate-900 px-1 py-0.5 focus:outline-none w-24 sm:w-28 font-mono font-bold placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
              />
              <button
                onClick={handleManualPinVerify}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all shrink-0 cursor-pointer shadow-xs"
              >
                Verify
              </button>
            </div>

            {/* Quick SCAN QR Button */}
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-sm shadow-cyan-600/20 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to sign out of Shopkeeper Portal?')) {
                  logout();
                  if (setCurrentView) setCurrentView('shopkeeper');
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0"
              title="Sign out of Shopkeeper Dashboard"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Secondary Management Controls Strip */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 relative">
          
          {/* Horizontally scrollable actions on mobile / narrow viewports */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            {/* Quick Auto-Print Mode Toggle */}
            <button
              onClick={toggleAutoPrint}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 ${
                autoPrintEnabled
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              title="When active, customer orders print automatically upon payment"
            >
              <Zap className={`w-3.5 h-3.5 ${autoPrintEnabled ? 'text-cyan-600 fill-cyan-500 animate-pulse' : 'text-slate-400'}`} />
              <span>{autoPrintEnabled ? 'AUTO-PRINT ON' : 'AUTO-PRINT OFF'}</span>
            </button>

            {/* Shopkeeper Customer Upload Portal QR Code Button */}
            <button
              onClick={() => setIsShopPortalQrOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Display your Customer Upload Portal QR Code & Link"
            >
              <QrCode className="w-3.5 h-3.5 text-purple-600" />
              <span>My Portal QR</span>
            </button>

            {/* Manage Print Rates Button */}
            <button
              onClick={() => setIsRateModalOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Manage paper & print rates for your shop store"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Print Rates</span>
            </button>

            {/* Shopkeeper Staff Management Button */}
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="px-3 py-1.5 rounded-xl font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Add counter operators & manage staff under your shop"
            >
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>Shop Staff</span>
            </button>

            {/* Payment & UPI Settings Button */}
            <button
              onClick={() => {
                fetchPaymentSettings();
                setIsPaymentModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Set up your Shop UPI ID and Razorpay credentials to receive customer payments"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Payment & UPI</span>
            </button>

            {/* Shop Details Profile Button */}
            <button
              onClick={() => {
                setIsShopDetailsOpen(true);
                fetchShopDetails();
              }}
              className="px-3 py-1.5 rounded-xl font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="View & manage complete shop details, address, rates & QR"
            >
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span>Shop Details</span>
            </button>
          </div>

          {/* Connected Printers Selector / Dropdown - Placed in its own container with overflow-visible so dropdown NEVER clips */}
          <div id="printer-selector-container" className="relative shrink-0 z-40 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setPrinterDropdownOpen(!printerDropdownOpen)}
              className={`px-3 py-1.5 rounded-xl font-bold border flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                agentOnline && connectedPrinters.length > 0
                  ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
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
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>{agentOnline ? 'Select Printer' : 'No Printer Connected'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </button>

            {/* Dropdown Menu listing all connected printers */}
            {printerDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${agentOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {agentOnline ? `Detected Printers (${connectedPrinters.length})` : 'Agent Offline'}
                    </p>
                    <p className="text-[10px] text-slate-500">Target hardware printer for counter orders</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRescanPrinters}
                      disabled={rescanningPrinters}
                      className="px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-[10px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer border border-cyan-200"
                      title="Rescan Windows print spooler for newly plugged or network printers"
                    >
                      <RefreshCw className={`w-3 h-3 ${rescanningPrinters ? 'animate-spin' : ''}`} />
                      <span>{rescanningPrinters ? 'Scanning...' : 'Rescan'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-1.5 max-h-64 overflow-y-auto space-y-1">
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
                  {connectedPrinters.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      <p>No printers detected yet.</p>
                      <button
                        onClick={handleRescanPrinters}
                        className="mt-1 text-cyan-600 font-bold hover:underline text-[11px] cursor-pointer"
                      >
                        Click to Scan Spooler
                      </button>
                    </div>
                  ) : (
                    connectedPrinters.map((printer, idx) => {
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
                                  Ready
                                </span>
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })
                  )}

                  {/* Add Custom / Network Printer Form */}
                  <div className="border-t border-slate-100 pt-1 mt-1">
                    {!showAddCustomPrinter ? (
                      <button
                        type="button"
                        onClick={() => setShowAddCustomPrinter(true)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-bold text-cyan-700 hover:bg-cyan-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>➕ Add / Select Custom Printer Name</span>
                      </button>
                    ) : (
                      <form onSubmit={handleAddCustomPrinter} className="p-2 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                        <label className="text-[10px] font-bold text-slate-600 block">Enter Exact Windows / Network Printer Name:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="e.g. EPSON L3150, HP LaserJet..."
                            value={customPrinterInput}
                            onChange={(e) => setCustomPrinterInput(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-cyan-600 text-white font-bold text-xs rounded-lg hover:bg-cyan-500 transition-colors cursor-pointer"
                          >
                            Set
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddCustomPrinter(false)}
                            className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <div className="p-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                  <button
                    onClick={() => { setPrinterDropdownOpen(false); setIsPrintAgentModalOpen(true); }}
                    className="w-full py-1.5 px-2.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>⚙️ Open Spooler Diagnostics & Test Print</span>
                  </button>
                </div>
              </div>
            )}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
        
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-extrabold text-base sm:text-lg shrink-0">
            {stats.newOrders || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">QUEUED</span>
            <span className="text-xs text-slate-800 font-bold">Waiting Print</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-extrabold text-base sm:text-lg shrink-0">
            {stats.printing || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">PRINTING</span>
            <span className="text-xs text-slate-800 font-bold">Agent Active</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-extrabold text-base sm:text-lg shrink-0">
            {stats.ready || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">READY</span>
            <span className="text-xs text-slate-800 font-bold">For Pickup</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-extrabold text-base sm:text-lg shrink-0">
            {stats.collectedToday || 0}
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 block">HANDOVER</span>
            <span className="text-xs text-slate-800 font-bold">Completed</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2.5 sm:space-x-3 col-span-2 sm:col-span-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0">
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
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full md:w-auto overflow-x-auto">
          {['ALL', 'WAITING', 'PRINTING', 'READY'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`flex-1 sm:flex-none text-center px-4 py-1.5 rounded-lg transition-all shrink-0 ${
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

      {/* Main Print Queue Container (Responsive: Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        
        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
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

                        {/* Dynamic Add-on Services badges */}
                        {item.selectedAddons && item.selectedAddons.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {item.selectedAddons.map((addon) => (
                              <span
                                key={addon.id || addon.name}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-[9px] shadow-2xs"
                              >
                                ✨ {addon.name} (₹{addon.price})
                              </span>
                            ))}
                          </div>
                        )}

                        {(item.totalPrice !== undefined || item.totalAmount !== undefined) && (
                          <div className="text-[10px] text-slate-500 font-mono font-bold">
                            Total: <span className="text-emerald-700 font-black">₹{item.totalAmount ?? item.totalPrice}</span>
                          </div>
                        )}

                        {/* Payment Method & UTR Badge */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {item.paymentMethod === 'CASH' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-[9px] shadow-2xs">
                              💵 CASH COUNTER
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-[9px] shadow-2xs">
                              <CreditCard className="w-2.5 h-2.5 text-emerald-600" />
                              UPI PAID (0% FEE)
                            </span>
                          )}
                          {item.upiUtr && (
                            <span className="text-[9px] font-mono text-slate-500 font-semibold truncate max-w-[150px]" title={`UTR: ${item.upiUtr}`}>
                              Ref: <span className="text-slate-800 font-bold">{item.upiUtr}</span>
                            </span>
                          )}
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

        {/* Mobile Interactive Queue Card List (Visible on mobile only) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredQueue.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-500">
              <p className="text-sm font-bold text-slate-700">No print orders currently in queue</p>
              <p className="text-xs text-slate-400 mt-1">Place an order from Customer App to see it update live here.</p>
            </div>
          ) : (
            filteredQueue.map((item, idx) => {
              const firstSetting = item.settings?.[0] || {};
              const totalPages = (item.documents || []).reduce((sum, d) => sum + (d.pageCount || 1), 0);

              return (
                <div key={item._id} className="p-3.5 space-y-3 bg-white hover:bg-slate-50/60 transition-colors">
                  {/* Card Header: Job ID, Queue Position, Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-700 text-sm">{item.publicOrderId}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        #{idx + 1}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
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
                  </div>

                  {/* Customer & Files Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Customer</span>
                      <p className="font-bold text-slate-900 truncate">{item.userId?.name || 'Customer'}</p>
                      {item.userId?.mobile && (
                        <a href={`tel:${item.userId.mobile}`} className="text-[11px] font-mono font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5 mt-0.5">
                          📞 {item.userId.mobile}
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Files & Pages</span>
                      <p className="font-bold text-slate-900">{item.documents?.length || 1} Doc • {totalPages} Pgs</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-[11px] font-extrabold text-emerald-700">₹{item.totalAmount ?? item.totalPrice} Paid</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          item.paymentMethod === 'CASH'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {item.paymentMethod === 'CASH' ? 'Cash' : 'UPI'}
                        </span>
                      </div>
                      {item.upiUtr && (
                        <p className="text-[9px] font-mono text-slate-500 truncate max-w-[130px]" title={`Ref: ${item.upiUtr}`}>
                          Ref: {item.upiUtr}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Print Options Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {firstSetting.paperSize || 'A4'}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-extrabold border ${
                      firstSetting.colorMode === 'COLOUR' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-500 shadow-2xs' : 'bg-slate-800 text-white border-slate-700'
                    }`}>
                      {firstSetting.colorMode === 'COLOUR' ? '🌈 COLOR' : '⚫ B&W'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                      {firstSetting.sides || 'SINGLE'}
                    </span>
                    {item.printedToPrinter && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold truncate max-w-[150px]">
                        <Printer className="w-3 h-3 text-cyan-600 shrink-0" />
                        <span className="truncate">{item.printedToPrinter}</span>
                      </span>
                    )}
                    {item.selectedAddons && item.selectedAddons.map((addon) => (
                      <span key={addon.id || addon.name} className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-extrabold text-[9px]">
                        ✨ {addon.name}
                      </span>
                    ))}
                  </div>

                  {/* Touch-Friendly Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {item.printCount > 0 || ['PRINTED', 'PRINTING', 'READY'].includes(item.status) ? (
                      <button
                        onClick={() => setReprintOrderTarget(item)}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                        <span>PRINT AGAIN</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerPrintNow(item)}
                        disabled={loading}
                        className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PRINT NOW</span>
                      </button>
                    )}

                    {item.status === 'READY' && (
                      <button
                        onClick={() => setSelectedOrderForHandover(item)}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>HANDOVER</span>
                      </button>
                    )}

                    {['PRINTING', 'PRINTED'].includes(item.status) && (
                      <button
                        onClick={() => markReady(item._id)}
                        className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Ready</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedOrderForLabel(item)}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 border border-slate-200 cursor-pointer"
                      title="Print Physical Tray Tag"
                    >
                      <Tag className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Tag</span>
                    </button>

                    {item.status === 'PRINTING' && (
                      <button
                        onClick={() => abortPrint(item)}
                        disabled={loading}
                        className="px-2.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 border border-rose-200 cursor-pointer"
                        title="Abort this print job"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
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

            {(() => {
              const shopCode = shopDetails?._id || shopDetails?.id || user?.shop?._id || user?.shopId || user?._id || 'main';
              const portalUrl = `${window.location.origin}/?shop=${shopCode}`;
              const shopTitle = shopDetails?.name || user?.shopName || user?.name || 'Shopkeeper Portal';
              return (
                <>
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-lg text-slate-900">{shopTitle}</h3>
                    <p className="text-xs text-slate-500">Show this QR code to customers so they can upload & order prints from their mobile</p>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center shadow-inner">
                    <QRCodeSVG value={portalUrl} size={180} level="H" />
                    <span className="text-[11px] font-mono font-bold text-slate-600 mt-3 break-all">
                      {portalUrl}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(portalUrl);
                        alert('Customer Portal Link copied to clipboard!');
                      }}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy Portal Link</span>
                    </button>

                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Customer Portal (New Tab)</span>
                    </a>

                    <button
                      type="button"
                      onClick={handlePrintStandee}
                      className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Counter Standee Poster</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Manage Print Rates & Dynamic Add-ons Modal for Shopkeeper */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Manage Shop Pricing & Dynamic Services</h3>
                  <p className="text-[11px] text-slate-500">Configure base print rates and dynamic counter add-ons for customers</p>
                </div>
              </div>
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPricingActiveTab('STANDARD')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pricingActiveTab === 'STANDARD' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Standard Paper Rates</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingActiveTab('DYNAMIC')}
                className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  pricingActiveTab === 'DYNAMIC' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Dynamic Services & Add-ons ({(shopPricing.customItems || []).length})</span>
              </button>
            </div>

            <div className="overflow-y-auto pr-1 flex-1 space-y-4">
              {pricingActiveTab === 'STANDARD' ? (
                <form onSubmit={handleSavePricing} className="space-y-4 text-xs font-semibold">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">A4 Black & White (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={shopPricing.A4_BW}
                        onChange={(e) => setShopPricing({ ...shopPricing, A4_BW: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">A4 Colour (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={shopPricing.A4_COLOUR}
                        onChange={(e) => setShopPricing({ ...shopPricing, A4_COLOUR: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">A3 Black & White (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={shopPricing.A3_BW}
                        onChange={(e) => setShopPricing({ ...shopPricing, A3_BW: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">A3 Colour (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        required
                        value={shopPricing.A3_COLOUR}
                        onChange={(e) => setShopPricing({ ...shopPricing, A3_COLOUR: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">Legal Black & White (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={shopPricing.LEGAL_BW || 3}
                        onChange={(e) => setShopPricing({ ...shopPricing, LEGAL_BW: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">Legal Colour (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={shopPricing.LEGAL_COLOUR || 12}
                        onChange={(e) => setShopPricing({ ...shopPricing, LEGAL_COLOUR: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">Glossy Photo Paper (₹/page)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={shopPricing.GLOSSY_COLOUR || 25}
                        onChange={(e) => setShopPricing({ ...shopPricing, GLOSSY_COLOUR: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-1">
                      <label className="font-extrabold text-slate-800 block text-[11px]">Double-Sided Multiplier</label>
                      <input
                        type="number"
                        min="1"
                        max="2"
                        step="0.05"
                        value={shopPricing.doubleSidedMultiplier || 1.8}
                        onChange={(e) => setShopPricing({ ...shopPricing, doubleSidedMultiplier: parseFloat(e.target.value) || 1.8 })}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRateModalOpen(false)}
                      className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      {loading ? 'Saving...' : 'Save Paper Rates'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Quick Preset Buttons */}
                  <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
                    <div className="text-[11px] font-bold text-amber-800 mb-2 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>1-Click Popular Add-ons Presets:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: 'Spiral Binding', price: 30, unit: 'per document', category: 'BINDING' },
                        { name: 'A4 Lamination', price: 20, unit: 'per page', category: 'LAMINATION' },
                        { name: 'Corner Stapling', price: 5, unit: 'per document', category: 'STAPLE' },
                        { name: 'Hard Binding', price: 150, unit: 'per document', category: 'BINDING' },
                        { name: 'PVC Card Printing', price: 50, unit: 'flat', category: 'OTHER' },
                        { name: 'Urgent Delivery', price: 30, unit: 'flat', category: 'OTHER' }
                      ].map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleAddQuickPreset(preset)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100/70 border border-amber-300 text-amber-900 font-bold text-[10px] rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>{preset.name} (₹{preset.price})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add New Custom Service Form */}
                  <form onSubmit={handleAddCustomItem} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      <span>Add New Dynamic Service or Add-on</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Service / Item Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Spiral Binding, Lamination"
                          required
                          value={newCustomItem.name}
                          onChange={(e) => setNewCustomItem({ ...newCustomItem, name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Rate Price (₹)</label>
                        <input
                          type="number"
                          placeholder="30"
                          min="0"
                          step="0.5"
                          required
                          value={newCustomItem.price}
                          onChange={(e) => setNewCustomItem({ ...newCustomItem, price: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Charge Unit</label>
                        <select
                          value={newCustomItem.unit}
                          onChange={(e) => setNewCustomItem({ ...newCustomItem, unit: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                        >
                          <option value="per document">Per Document (e.g. Spiral Binding)</option>
                          <option value="per page">Per Page (e.g. Lamination)</option>
                          <option value="flat">Flat Order Fee (e.g. Urgent Delivery)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-1">Category</label>
                        <select
                          value={newCustomItem.category}
                          onChange={(e) => setNewCustomItem({ ...newCustomItem, category: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
                        >
                          <option value="BINDING">Binding</option>
                          <option value="LAMINATION">Lamination</option>
                          <option value="STAPLE">Staple</option>
                          <option value="OTHER">Other Custom Service</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={addingCustomItem}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{addingCustomItem ? 'Adding Service...' : 'Add This Dynamic Service'}</span>
                    </button>
                  </form>

                  {/* Configured Services List */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Configured Active Services ({(shopPricing.customItems || []).length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Customers can select these during order</span>
                    </div>

                    {(!shopPricing.customItems || shopPricing.customItems.length === 0) ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                        No dynamic services added yet. Click one of the quick presets above or enter custom pricing.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {shopPricing.customItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                              item.enabled !== false
                                ? 'bg-white border-slate-200 shadow-2xs'
                                : 'bg-slate-50 border-slate-200 opacity-60'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs text-slate-900 truncate">{item.name}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {item.category || 'OTHER'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-black text-emerald-700 text-xs">₹{item.price}</span>
                                <span className="text-slate-400">• {item.unit}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleCustomItem(item.id, item.enabled !== false)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                  item.enabled !== false
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {item.enabled !== false ? 'Active' : 'Disabled'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomItem(item.id)}
                                className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Service"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRateModalOpen(false)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopkeeper Staff Management Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Manage Shop Counter Staff (Login IDs)</h3>
                  <p className="text-[11px] text-slate-500">Create & manage operators under your shop</p>
                </div>
              </div>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Informational Guidance Box */}
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900">
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Staff Login ID Creation:</span>
                <span className="text-[11px] text-blue-700 leading-relaxed block">
                  Add your shop counter operators here. Their 10-digit Mobile Number acts as their Login ID. They can immediately log in from the Shop Counter Login.
                </span>
              </div>
            </div>

            {/* Add New Staff Form */}
            <form onSubmit={handleCreateShopStaff} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                ➕ Add New Counter Operator
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff Name"
                    value={newStaffData.name}
                    onChange={(e) => setNewStaffData({ ...newStaffData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mobile (Login ID)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit Mobile"
                    value={newStaffData.mobile}
                    onChange={(e) => setNewStaffData({ ...newStaffData, mobile: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={newStaffData.password}
                    onChange={(e) => setNewStaffData({ ...newStaffData, password: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer mt-1 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{loading ? 'Registering Staff...' : 'CREATE STAFF LOGIN ID'}</span>
              </button>
            </form>

            {/* List of Registered Shop Staff */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-700">Existing Counter Operators ({shopStaffList.length})</h4>
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {shopStaffList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No staff operators created yet. Add one above.
                  </p>
                ) : (
                  shopStaffList.map((s, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                      <div>
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">📱 Login ID: <span className="font-bold text-slate-800">{s.mobile}</span> • {s.branchName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                          {s.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteShopStaff(s._id, s.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove operator account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment & UPI Settings Modal for Shopkeeper */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Payment & UPI Settings</h3>
                  <p className="text-[11px] text-slate-500">Set up account details to receive customer payments</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-4 text-xs font-semibold">
              {/* Direct Shop UPI ID Input */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Direct Shop UPI ID (100% Free • 0% Commission)</span>
                  </label>
                  <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                    RECOMMENDED • 0% CHARGES
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 9876543210@paytm, shopname@okaxis, or store@upi"
                  value={paymentSettings.upiId}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })}
                  className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 font-extrabold focus:outline-none focus:border-emerald-600 shadow-xs"
                />
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  ✅ <b>No transaction fees or commission.</b> Customer scans the live dynamic QR code on screen or taps Google Pay / PhonePe / Paytm to send money directly into your bank account.
                </p>
              </div>

              {/* Razorpay Credentials (Optional) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-800 text-xs flex items-center justify-between">
                  <span>💳 Razorpay Gateway Keys (Automatic Instant Payments)</span>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">Recommended</span>
                </h4>

                {/* Step-by-Step Shopkeeper Guide */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200 space-y-2 text-[11px]">
                  <span className="font-black text-indigo-900 block flex items-center gap-1">
                    📖 Step-by-Step Guide for Shopkeepers: How to set up Razorpay
                  </span>
                  <ol className="list-decimal list-inside text-slate-700 space-y-1 font-medium leading-relaxed">
                    <li>Create a free business account at <a href="https://razorpay.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">razorpay.com</a>.</li>
                    <li>Complete your quick KYC registration with your Bank Account details.</li>
                    <li>In your Razorpay Dashboard, go to <b>Account & Settings</b> &rarr; <b>API Keys</b>.</li>
                    <li>Click <b>Generate Key</b> to get your <code>Key ID</code> (starts with <code>rzp_live_...</code> or <code>rzp_test_...</code>) and <code>Key Secret</code>.</li>
                    <li>Copy and paste both keys below, then click <b>Save Payment Credentials</b>.</li>
                  </ol>
                  <p className="text-[10px] text-indigo-700 font-semibold pt-1 border-t border-blue-200/60">
                    ✅ Once saved, payments made by your customers via GPay, PhonePe, UPI, Cards, or Netbanking will go directly to your bank account and automatically place the print order!
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Razorpay Key ID</label>
                  <input
                    type="text"
                    placeholder="rzp_live_... or rzp_test_..."
                    value={paymentSettings.razorpayKeyId}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeyId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">Razorpay Route Linked Account ID (Optional for Direct Bank Settlement)</label>
                  <input
                    type="text"
                    placeholder="e.g. acc_102938475"
                    value={paymentSettings.razorpayAccountId}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayAccountId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">If you use Platform Master Account, enter your Linked Account ID here to get payouts directly.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPayment}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {savingPayment ? 'Saving Settings...' : 'SAVE PAYMENT SETTINGS'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHOP DETAILS MODAL */}
      {isShopDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>{shopDetails?.name || user?.shopName || 'My Print Shop Details'}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                      REGISTERED STORE
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Official business profile, customer QR standee & pricing matrix</p>
                </div>
              </div>
              <button
                onClick={() => { setIsShopDetailsOpen(false); setEditingShopDetails(false); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shopDetailsMsg && (
              <div className={`p-3 rounded-2xl text-xs font-bold ${shopDetailsMsg.includes('✅') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {shopDetailsMsg}
              </div>
            )}

            {!editingShopDetails ? (
              /* VIEW MODE */
              <div className="space-y-4 text-xs">
                {/* Store Banner Overview */}
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 p-4 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                      Store Identifier
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1">
                      {shopDetails?.name || user?.shopName || 'Registered Print Shop'}
                    </h4>
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                      Shop ID: <span className="font-bold text-blue-800">{shopDetails?.id || shopDetails?._id || user?.shop?._id || user?._id}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingShopDetails(true)}
                      className="px-3.5 py-2 bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                    <button
                      onClick={handlePrintStandee}
                      className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Standee</span>
                    </button>
                  </div>
                </div>

                {/* Grid of Shop Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Owner & Contact Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Owner & Contact</span>
                    </h5>
                    <div className="space-y-1 text-[11px]">
                      <p><span className="text-slate-400">Owner:</span> <b className="text-slate-800">{shopDetails?.ownerName || user?.ownerName || user?.name || 'N/A'}</b></p>
                      <p><span className="text-slate-400">Mobile:</span> <b className="text-slate-800 font-mono">{shopDetails?.phone || user?.mobile || 'N/A'}</b></p>
                      <p><span className="text-slate-400">Email:</span> <b className="text-slate-800">{shopDetails?.email || user?.email || 'Not specified'}</b></p>
                    </div>
                  </div>

                  {/* Physical Address Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>Shop Address</span>
                    </h5>
                    <p className="text-[11px] text-slate-800 font-medium leading-relaxed">
                      {shopDetails?.address || 'Counter Address'}
                    </p>
                  </div>

                  {/* Customer Upload Link & Counter QR Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 sm:col-span-2">
                    <h5 className="font-extrabold text-slate-700 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-purple-600" />
                        <span>Customer Direct Upload Link & QR</span>
                      </span>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/?shop=${shopDetails?.id || shopDetails?._id || user?.shop?._id || user?.shopId || user?._id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedShopUrl(true);
                          setTimeout(() => setCopiedShopUrl(false), 3000);
                        }}
                        className="text-[10px] text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedShopUrl ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </h5>
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700">
                      <span className="truncate flex-1">
                        {`${window.location.origin}/?shop=${shopDetails?.id || shopDetails?._id || user?.shop?._id || user?.shopId || user?._id}`}
                      </span>
                      <a
                        href={`/?shop=${shopDetails?.id || shopDetails?._id || user?.shop?._id || user?.shopId || user?._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 font-bold hover:underline shrink-0 flex items-center gap-0.5"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Pricing Matrix Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="font-extrabold text-slate-700 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Print Pricing Matrix</span>
                      </span>
                      <button
                        onClick={() => { setIsShopDetailsOpen(false); setIsRateModalOpen(true); }}
                        className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        Edit Rates &rarr;
                      </button>
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                        <span className="text-slate-400 block text-[10px]">A4 B&W</span>
                        <b className="text-slate-900 font-bold text-xs">₹{shopDetails?.pricing?.A4_BW ?? shopPricing.A4_BW}</b>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
                        <span className="text-slate-400 block text-[10px]">A4 Colour</span>
                        <b className="text-slate-900 font-bold text-xs">₹{shopDetails?.pricing?.A4_COLOUR ?? shopPricing.A4_COLOUR}</b>
                      </div>
                    </div>
                  </div>

                  {/* Document Retention & Security Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h5 className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Security & Auto-Purge</span>
                    </h5>
                    <div className="space-y-1 text-[11px]">
                      <p><span className="text-slate-400">File Retention:</span> <b className="text-cyan-800 font-bold">{shopDetails?.retentionMinutes || 60} minutes</b></p>
                      <p><span className="text-slate-400">Shop UPI:</span> <b className="text-slate-800 font-mono">{shopDetails?.upiId || 'Not configured'}</b></p>
                      <p><span className="text-slate-400">Auto-Print:</span> <b className="text-emerald-700 font-bold">{autoPrintEnabled ? 'Active' : 'Manual'}</b></p>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* EDIT SHOP DETAILS FORM */
              <form onSubmit={handleSaveShopDetails} className="space-y-3.5 text-xs font-semibold">
                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-medium">
                  Update your official shop information below. Changes are saved instantly to the database and will be reflected on your customer portal and standee posters.
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Shop / Store Name</label>
                  <input
                    type="text"
                    required
                    value={editShopForm.name}
                    onChange={(e) => setEditShopForm({ ...editShopForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Owner Name</label>
                    <input
                      type="text"
                      required
                      value={editShopForm.ownerName}
                      onChange={(e) => setEditShopForm({ ...editShopForm, ownerName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={editShopForm.phone}
                      onChange={(e) => setEditShopForm({ ...editShopForm, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editShopForm.email}
                    onChange={(e) => setEditShopForm({ ...editShopForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Complete Physical Address</label>
                  <textarea
                    rows={2}
                    required
                    value={editShopForm.address}
                    onChange={(e) => setEditShopForm({ ...editShopForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">Shop UPI ID</label>
                    <input
                      type="text"
                      placeholder="e.g. shop@paytm"
                      value={editShopForm.upiId}
                      onChange={(e) => setEditShopForm({ ...editShopForm, upiId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-800 block mb-1">File Retention (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="1440"
                      value={editShopForm.retentionMinutes}
                      onChange={(e) => setEditShopForm({ ...editShopForm, retentionMinutes: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingShopDetails}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
                  >
                    {savingShopDetails ? 'Saving Changes...' : '💾 SAVE SHOP DETAILS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingShopDetails(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

