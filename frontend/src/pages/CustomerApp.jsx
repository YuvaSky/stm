import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FileText, Camera, Scan, Image, Plus, Trash2, CheckCircle2, QrCode, KeyRound, Clock, ShieldAlert, Sparkles, Send, Eye, Layers, CreditCard, Store } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import CameraCaptureModal from '../components/CameraCaptureModal';
import DocumentScannerModal from '../components/DocumentScannerModal';
import DocumentReviewModal from '../components/DocumentReviewModal';
import AadhaarIdUploadModal from '../components/AadhaarIdUploadModal';
import CardPrintReviewModal from '../components/CardPrintReviewModal';
import DirectUpiPaymentModal from '../components/DirectUpiPaymentModal';


// Helper to parse page range strings like "1-5", "2,3,4", "1 to 5"
function parseClientPageRange(rangeStr, maxPages = 999) {
  if (!rangeStr || rangeStr.trim().toUpperCase() === 'ALL') {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }
  let clean = rangeStr.replace(/\bto\b/gi, '-');
  clean = clean.replace(/\s*-\s*/g, '-');
  const parts = clean.split(/[,;\s]+/).filter(Boolean);
  const pages = new Set();
  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const low = Math.max(1, Math.min(start, end));
        const high = Math.min(maxPages, Math.max(start, end));
        for (let p = low; p <= high; p++) pages.add(p);
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxPages) {
        pages.add(num);
      }
    }
  }
  const sorted = Array.from(pages).sort((a, b) => a - b);
  return sorted;
}

export default function CustomerApp() {
  const { user } = useAuth();
  const { socket } = useSocket();

  // State
  const [documents, setDocuments] = useState([]);
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const [isCameraCaptureOpen, setIsCameraCaptureOpen] = useState(false);
  const [isDocumentScannerOpen, setIsDocumentScannerOpen] = useState(false);
  const [isAadhaarUploadOpen, setIsAadhaarUploadOpen] = useState(false);
  const [cardReviewData, setCardReviewData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isUpiPaymentOpen, setIsUpiPaymentOpen] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [customerConfirmedReceipt, setCustomerConfirmedReceipt] = useState(false);
  const ORDERS_PER_PAGE = 3;

  const toggleAddon = (addonId) => {
    setSelectedAddonIds(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  // Print Shop association from scanned Standee QR or link (?shop=...)
  const [shopInfo, setShopInfo] = useState(null);
  const [shopLoading, setShopLoading] = useState(true);
  const shopParam = new URLSearchParams(window.location.search).get('shop') || new URLSearchParams(window.location.search).get('store');

  useEffect(() => {
    fetchMyOrders();
    fetchShopInfo();
  }, [shopParam]);

  const fetchShopInfo = async () => {
    setShopLoading(true);
    try {
      const res = await axios.get(`/api/customer/shop-info?shop=${encodeURIComponent(shopParam || '')}`);
      if (res.data.success && res.data.shop) {
        setShopInfo(res.data.shop);
      }
    } catch (err) {
      console.warn('Could not load specific shop details:', err.message);
    } finally {
      setShopLoading(false);
    }
  };

  const handleCombineImages = async () => {
    if (documents.length < 2) {
      alert('Please upload at least 2 images to combine into 1 page.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/customer/combine-images', { items: documents });
      if (res.data.success) {
        const combined = res.data.document;
        const newDoc = {
          ...combined,
          totalPages: 1,
          pageCount: 1,
          pageRange: 'ALL',
          pageSelectionMode: 'ALL',
          pageRangeInput: '1',
          selectedPages: [1],
          paperSize: 'A4',
          colorMode: 'BW',
          sides: 'SINGLE',
          copies: 1
        };
        setDocuments([newDoc]);
      }
    } catch (err) {
      alert('Combine images failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (e, orderId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this order from history?')) return;
    try {
      const res = await axios.delete(`/api/customer/orders/${orderId}`);
      if (res.data.success) {
        fetchMyOrders();
        if (activeOrder && (activeOrder._id === orderId || activeOrder.publicOrderId === orderId)) {
          setActiveOrder(null);
        }
      }
    } catch (err) {
      alert('Failed to delete order: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    calculatePrice();
  }, [documents, selectedAddonIds, shopInfo]);

  // Listen for real-time status updates from shopkeeper
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (data) => {
      if (activeOrder && activeOrder.publicOrderId === data.publicOrderId) {
        setActiveOrder(prev => ({ ...prev, status: data.status }));
      }
      fetchMyOrders();
    };

    socket.on('order_status_updated', handleStatusUpdate);
    return () => socket.off('order_status_updated', handleStatusUpdate);
  }, [socket, activeOrder]);

  const fetchMyOrders = async () => {
    try {
      const res = await axios.get('/api/customer/orders');
      if (res.data.success) {
        setMyOrders(res.data.orders);
        if (res.data.orders.length > 0 && !activeOrder) {
          const latest = res.data.orders[0];
          if (['PAID', 'QUEUED', 'PRINTING', 'READY'].includes(latest.status)) {
            setActiveOrder(latest);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('sourceType', 'UPLOAD');

    setLoading(true);
    try {
      const res = await axios.post('/api/customer/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        const uploadedDocs = res.data.documents;

        // Check if uploaded files are all images (e.g. Front & Back photos)
        const allImages = uploadedDocs.every(d => imageExtensions.includes(d.fileType?.toLowerCase()));

        if (uploadedDocs.length >= 2 && allImages) {
          // Multi-image upload: Default to clean separate pages (1 photo per page)
          const pageImages = uploadedDocs.map(d => d.fileUrl);
          const totalCount = uploadedDocs.length;
          const isTwoSidedCard = totalCount === 2;

          const combinedDoc = {
            id: `doc_${Date.now()}`,
            originalFileName: isTwoSidedCard
              ? `Two-Sided ID / Document (2 Photos)`
              : `Photo Document (${totalCount} Pages)`,
            fileType: 'image',
            fileUrl: uploadedDocs[0].fileUrl,
            frontUrl: uploadedDocs[0].fileUrl,
            backUrl: uploadedDocs[1]?.fileUrl || uploadedDocs[0].fileUrl,
            pageImages: pageImages,
            tempPath: uploadedDocs[0].tempPath,
            allTempPaths: uploadedDocs.map(d => d.tempPath),
            totalPages: totalCount, // Default to 1 photo per page (e.g. 3 photos = 3 pages)
            pageCount: totalCount,
            combine2On1: false,     // Clean Separate Pages mode by default!
            layoutMode: 'SEPARATE_PAGES',
            sizeMode: 'ACTUAL',
            pageRange: 'ALL',
            pageSelectionMode: 'ALL',
            pageRangeInput: `1-${totalCount}`,
            selectedPages: Array.from({ length: totalCount }, (_, i) => i + 1),
            paperSize: 'A4',
            orientation: 'PORTRAIT',
            colorMode: 'BW',
            sides: 'SINGLE',
            copies: 1
          };
          setDocuments(prev => [...prev, combinedDoc]);
        } else {
          // Standard single file / PDF upload mapping
          const newDocs = uploadedDocs.map(d => {
            const totalPages = d.totalPages || d.pageCount || 1;
            return {
              ...d,
              id: d.id || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
              totalPages: totalPages,
              pageCount: totalPages,
              pageRange: 'ALL',
              pageSelectionMode: 'ALL',
              pageRangeInput: `1-${totalPages}`,
              selectedPages: Array.from({ length: totalPages }, (_, i) => i + 1),
              paperSize: 'A4',
              colorMode: 'BW',
              sides: 'SINGLE',
              copies: 1
            };
          });
          setDocuments(prev => [...prev, ...newDocs]);
        }
      }
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCapturedDoc = (capturedDoc) => {
    const totalPages = capturedDoc.pageCount || 1;
    const newDoc = {
      ...capturedDoc,
      id: capturedDoc.id || `doc_${Date.now()}`,
      totalPages: totalPages,
      pageCount: totalPages,
      pageRange: 'ALL',
      pageSelectionMode: 'ALL',
      pageRangeInput: `1-${totalPages}`,
      selectedPages: Array.from({ length: totalPages }, (_, i) => i + 1),
      paperSize: 'A4',
      colorMode: 'BW',
      sides: 'SINGLE',
      copies: 1
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const handlePageRangeChange = (index, inputVal) => {
    setDocuments(prev => {
      const updated = [...prev];
      const doc = { ...updated[index] };
      const maxPages = doc.totalPages || 1;
      const parsed = parseClientPageRange(inputVal, maxPages);
      
      doc.pageRangeInput = inputVal;
      doc.pageRange = inputVal.trim() || 'ALL';
      doc.selectedPages = parsed.length > 0 ? parsed : Array.from({ length: maxPages }, (_, i) => i + 1);
      doc.pageCount = parsed.length > 0 ? parsed.length : maxPages;
      updated[index] = doc;
      return updated;
    });
  };

  const setPageMode = (index, mode) => {
    setDocuments(prev => {
      const updated = [...prev];
      const doc = { ...updated[index] };
      const maxPages = doc.totalPages || 1;
      doc.pageSelectionMode = mode;
      if (mode === 'ALL') {
        doc.pageRange = 'ALL';
        doc.pageRangeInput = `1-${maxPages}`;
        doc.selectedPages = Array.from({ length: maxPages }, (_, i) => i + 1);
        doc.pageCount = maxPages;
      } else {
        const def = maxPages > 1 ? `1-${Math.min(5, maxPages)}` : '1';
        doc.pageRange = def;
        doc.pageRangeInput = def;
        const parsed = parseClientPageRange(def, maxPages);
        doc.selectedPages = parsed;
        doc.pageCount = parsed.length;
      }
      updated[index] = doc;
      return updated;
    });
  };

  const calculatePrice = async () => {
    if (documents.length === 0) {
      setTotalPrice(0);
      return;
    }
    try {
      const res = await axios.post('/api/customer/calculate-price', {
        items: documents,
        shopId: shopInfo?._id || shopInfo?.id || shopParam,
        selectedAddons: selectedAddonIds
      });
      if (res.data.success) {
        setTotalPrice(res.data.totalAmount);
      }
    } catch (err) {
      console.error('Price calculation error:', err);
    }
  };

  const updateDocSetting = (index, field, value) => {
    setDocuments(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleInitiateOrder = () => {
    if (documents.length === 0) return;
    if (paymentMethod === 'UPI') {
      setIsUpiPaymentOpen(true);
    } else {
      executeCreateOrder({ method: 'CASH' });
    }
  };

  const executeCreateOrder = async ({ method = 'UPI', upiUtr = '' } = {}) => {
    if (documents.length === 0) return;
    setLoading(true);

    try {
      const res = await axios.post('/api/customer/create-order', {
        items: documents,
        paymentMethod: method,
        upiUtr,
        shopId: shopInfo?._id || shopInfo?.id || shopParam,
        branchId: shopInfo?.branchId,
        selectedAddons: selectedAddonIds
      });

      if (res.data.success) {
        setActiveOrder({
          ...res.data.order,
          rawPickupPin: res.data.order.pickupPin,
          documents: documents
        });
        setDocuments([]);
        setSelectedAddonIds([]);
        setIsUpiPaymentOpen(false);
        fetchMyOrders();
      }
    } catch (err) {
      alert('Failed to place print order: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerConfirmReceipt = async () => {
    if (!activeOrder) return;
    try {
      const orderIdentifier = activeOrder._id || activeOrder.id || activeOrder.publicOrderId;
      const res = await axios.post(`/api/customer/confirm-receipt/${orderIdentifier}`);
      if (res.data.success) {
        setCustomerConfirmedReceipt(true);
        setActiveOrder(prev => prev ? { ...prev, status: 'COLLECTED' } : null);
        fetchMyOrders();
      }
    } catch (err) {
      alert('Error confirming receipt: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
      
      {/* Active Order Banner / Tracker */}
      {activeOrder && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-cyan-200 shadow-lg relative overflow-hidden animate-pulse-glow">
          <div className="absolute top-0 right-0 bg-cyan-600 text-white font-extrabold text-[9px] sm:text-[10px] px-2.5 py-0.5 sm:py-1 rounded-bl-xl tracking-wider">
            LIVE ORDER TRACKING
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
            
            {/* QR Code */}
            <div className="flex flex-col items-center bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 text-slate-900 shadow-sm">
              <QRCodeSVG value={activeOrder.qrToken || activeOrder.publicOrderId} size={130} level="H" />
              <span className="font-extrabold text-sm mt-2 text-cyan-700 tracking-wider">
                {activeOrder.publicOrderId}
              </span>
              <span className="text-[10px] font-semibold text-slate-500">Show to Shopkeeper to Print</span>
            </div>

            {/* Order Details & PIN */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-xs font-semibold text-slate-500">Order Reference</span>
                  <h2 className="text-xl sm:text-2xl font-black text-cyan-700">{activeOrder.publicOrderId}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Total Amount</span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-600">
                    ₹{activeOrder.totalAmount} ({activeOrder.paymentMethod === 'CASH' ? 'CASH' : 'PAID'})
                  </span>
                  {activeOrder.upiUtr && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Ref: <span className="text-slate-800 font-semibold">{activeOrder.upiUtr}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Pickup PIN box */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-900 block">YOUR PICKUP PIN</span>
                    <span className="text-[9px] sm:text-[10px] text-amber-700">If QR code scan unavailable</span>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-black text-amber-800 tracking-widest font-mono">
                  {activeOrder.rawPickupPin || activeOrder.pickupPin || '5832'}
                </span>
              </div>

              {/* Selected Add-ons on Receipt */}
              {activeOrder.selectedAddons && activeOrder.selectedAddons.length > 0 && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">SELECTED ADD-ONS & FINISHING:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeOrder.selectedAddons.map((addon) => (
                      <span key={addon.id || addon.name} className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px]">
                        ✨ {addon.name} (₹{addon.price})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div className="pt-1">
                <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-600" /> Order Status:
                </p>
                <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-semibold text-slate-600 bg-slate-100 p-2 rounded-xl border border-slate-200">
                  <div className={activeOrder.status === 'PAID' ? 'text-cyan-700 font-bold' : ''}>1. Received</div>
                  <div className={activeOrder.status === 'PRINTING' ? 'text-cyan-700 font-bold animate-pulse' : ''}>2. Printing</div>
                  <div className={activeOrder.status === 'READY' ? 'text-emerald-700 font-bold animate-bounce' : ''}>3. Ready</div>
                  <div className={activeOrder.status === 'COLLECTED' ? 'text-emerald-800 font-bold' : ''}>4. Collected</div>
                </div>
              </div>

              {/* Customer Receipt Confirmation Button (Active when READY) */}
              {activeOrder.status === 'READY' && (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-2 mt-2">
                  <span className="text-xs text-emerald-800 font-medium">Is this your order at counter?</span>
                  <button
                    onClick={handleCustomerConfirmReceipt}
                    disabled={customerConfirmedReceipt}
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {customerConfirmedReceipt ? '✓ RECEIPT CONFIRMED' : 'YES, I RECEIVED THIS'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Targeted Print Shop Counter Banner */}
      {shopInfo && (
        <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-indigo-50 border border-blue-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-md">
                  Selected Print Shop
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Counter Connected
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {shopInfo.name}
              </h2>
              <p className="text-[11px] text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                <span>📍 {shopInfo.address || 'Main Counter'}</span>
                {shopInfo.phone && <span>• 📞 {shopInfo.phone}</span>}
                {shopInfo.ownerName && <span>• 👤 {shopInfo.ownerName}</span>}
              </p>
            </div>
          </div>
          <div className="text-right sm:self-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-200/50">
            <div className="text-[11px] font-bold text-slate-700 bg-white/90 px-3 py-1.5 rounded-xl border border-blue-200 inline-block shadow-xs">
              <span className="text-slate-400">A4 B&W:</span> <b className="text-slate-900">₹{shopInfo.pricing?.A4_BW ?? 2}</b>
              <span className="text-slate-300 mx-1.5">|</span>
              <span className="text-slate-400">Colour:</span> <b className="text-slate-900">₹{shopInfo.pricing?.A4_COLOUR ?? 10}</b>
            </div>
          </div>
        </div>
      )}

      {/* Main Upload Actions Grid */}
      <div className="space-y-4">
        <div className="text-center space-y-1.5 pb-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
            <span>Express Self-Service Counter Kiosk</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Instant, Confidential Document Printing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Upload your files or photograph pages directly. You’ll receive an encrypted QR & PIN code to print instantly at the shop counter.
          </p>
        </div>

        {/* 4 Core Responsive Options (Clean Modern Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Option 1: File Upload */}
          <label className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all bg-white border border-slate-200 shadow-xs">
            <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white flex items-center justify-center mb-2.5 sm:mb-3 transition-colors shadow-xs">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">Upload Files</span>
            <span className="text-[10px] text-slate-500 mt-0.5">PDF, Word, Excel</span>
          </label>

          {/* Option 2: Camera Capture */}
          <div
            onClick={() => setIsCameraCaptureOpen(true)}
            className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all bg-white border border-slate-200 shadow-xs"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-2.5 sm:mb-3 transition-colors shadow-xs">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">Take Photo</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Camera snapshot</span>
          </div>

          {/* Option 3: Scan Document */}
          <div
            onClick={() => setIsDocumentScannerOpen(true)}
            className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group border-emerald-200 active:scale-95 transition-all bg-white border border-slate-200 shadow-xs"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center mb-2.5 sm:mb-3 transition-colors shadow-xs">
              <Scan className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">Scan Document</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Auto-crop & enhance</span>
          </div>

          {/* Option 4: Gallery */}
          <label className="glass-card glass-card-hover p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group active:scale-95 transition-all bg-white border border-slate-200 shadow-xs">
            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center mb-2.5 sm:mb-3 transition-colors shadow-xs">
              <Image className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-slate-900">Photo Album</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Pick from gallery</span>
          </label>

        </div>

        {/* 1-Click Aadhaar & ID Card Front-Back Merge */}
        <div
          onClick={() => setIsAadhaarUploadOpen(true)}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-cyan-50 to-indigo-50 border border-cyan-200 hover:border-cyan-400 cursor-pointer flex items-center justify-between gap-3 transition-all active:scale-[0.99] shadow-2xs"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase text-cyan-800 bg-cyan-100 px-2 py-0.2 rounded">
                  AADHAAR / ID CARDS
                </span>
                <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                  Combine Front & Back on 1 Single Page
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                Automatically positions front and back card images together on standard A4 paper
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-cyan-700 bg-white px-3 py-1.5 rounded-xl border border-cyan-200 shrink-0 hidden sm:inline-block shadow-2xs">
            Combine ID →
          </span>
        </div>

        {/* 3-Step Express Sequence */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-100/80 rounded-2xl border border-slate-200/80 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
            <span className="text-[11px] font-bold text-slate-700">Upload / Scan</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-x border-slate-200">
            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
            <span className="text-[11px] font-bold text-slate-700">Set Paper & Copies</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
            <span className="text-[11px] font-bold text-slate-700">Scan QR to Print</span>
          </div>
        </div>
      </div>

      {/* Selected Documents List & Simple Print Settings */}
      {documents.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-md space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              YOUR PRINT DOCUMENTS ({documents.length})
            </h3>
            <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
              Total Pages: {documents.reduce((acc, d) => acc + (d.pageCount || 1), 0)}
            </span>
          </div>

          <div className="space-y-3">
            {documents.map((doc, idx) => (
              <div key={idx} className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3.5 shadow-xs">
                
                {/* Document Top Header: Name, Page Tag, Review Button, Remove Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200">
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 font-bold text-xs shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{doc.originalFileName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                        <span className="font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                          {doc.pageCount || 1} Total Page(s)
                        </span>
                        <span>•</span>
                        <span>{doc.fileType?.toUpperCase() || 'IMAGE'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        // Open Card & Photo Studio Print Review Modal for images & cards
                        setCardReviewData({
                          ...doc,
                          frontUrl: doc.frontUrl || doc.pageImages?.[0] || doc.fileUrl,
                          backUrl: doc.backUrl || doc.pageImages?.[1] || doc.fileUrl,
                          pageImages: doc.pageImages || [doc.fileUrl].filter(Boolean),
                          combine2On1: doc.combine2On1,
                          layoutMode: doc.layoutMode || (doc.combine2On1 === false ? 'SEPARATE_PAGES' : 'SIDE_BY_SIDE')
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-initial"
                      title="Open Print Studio Review to set layout, passport sizes, copies, and A4 preview"
                    >
                      <Eye className="w-3.5 h-3.5 text-white" />
                      <span>Print Studio Layout Review</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeDocument(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      title="Remove document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Layout Selector for Multi-Image / Front & Back Photos */}
                {(doc.pageImages?.length >= 2 || doc.totalPages >= 2) && (
                  <div className="bg-gradient-to-r from-purple-50 via-cyan-50 to-blue-50 p-2.5 rounded-xl border border-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Print Layout Mode:</span>
                    </div>
                    <div className="flex bg-white p-0.5 rounded-lg border border-slate-300 text-xs">
                      {/* Separate Pages Button (1 Photo per sheet) */}
                      <button
                        type="button"
                        onClick={() => {
                          const total = doc.pageImages?.length || doc.totalPages || 2;
                          setDocuments(prev => prev.map((d, i) => i === idx ? {
                            ...d,
                            combine2On1: false,
                            layoutMode: 'SEPARATE_PAGES',
                            pageCount: total,
                            totalPages: total,
                            pageRangeInput: `1-${total}`,
                            selectedPages: Array.from({ length: total }, (_, k) => k + 1)
                          } : d));
                        }}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                          doc.combine2On1 === false
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ✓ Separate Pages ({doc.pageImages?.length || doc.totalPages || 2})
                      </button>

                      {/* Combined Sheet Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDocuments(prev => prev.map((d, i) => i === idx ? {
                            ...d,
                            combine2On1: true,
                            layoutMode: (doc.pageImages?.length === 2 ? 'SIDE_BY_SIDE' : 'MULTI_GRID'),
                            pageCount: 1,
                            totalPages: 1,
                            pageRangeInput: '1',
                            selectedPages: [1]
                          } : d));
                        }}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                          doc.combine2On1 !== false
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {(doc.pageImages?.length || 2) === 2
                          ? '2 Photos on 1 Page (Front & Back)'
                          : `Fit All (${doc.pageImages?.length || 3}) on 1 Page`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Page Selection Bar (ALL vs Custom Page Range like 1-5, 2,3,4) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-600" />
                      <span className="text-xs font-bold text-slate-800">Pages to Print:</span>
                    </div>

                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setPageMode(idx, 'ALL')}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                          doc.pageSelectionMode !== 'CUSTOM'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Pages ({doc.totalPages || 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPageMode(idx, 'CUSTOM')}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
                          doc.pageSelectionMode === 'CUSTOM'
                            ? 'bg-cyan-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Select Pages (e.g. 1-5, 2,3,4)
                      </button>
                    </div>
                  </div>

                  {/* If Custom Page Range is Selected */}
                  {doc.pageSelectionMode === 'CUSTOM' && (
                    <div className="pt-2 border-t border-slate-100 space-y-2 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={doc.pageRangeInput || ''}
                            onChange={(e) => handlePageRangeChange(idx, e.target.value)}
                            placeholder="e.g. 1-5 or 2,3,4 or 1 to 5"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-cyan-600"
                          />
                        </div>

                        {/* Quick Shortcut Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                          {(doc.totalPages || 1) >= 5 && (
                            <button
                              type="button"
                              onClick={() => handlePageRangeChange(idx, '1-5')}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 font-medium text-slate-700 transition-colors"
                            >
                              1 to 5
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePageRangeChange(idx, '2, 3, 4')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 font-medium text-slate-700 transition-colors"
                          >
                            2, 3, 4
                          </button>
                          <button
                            type="button"
                            onClick={() => setPageMode(idx, 'ALL')}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 font-medium text-slate-700 transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Selected Pages Real-time Feedback */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] bg-cyan-50/70 px-2.5 py-1.5 rounded-lg border border-cyan-200 text-cyan-900 gap-1">
                        <span className="font-semibold">
                          Selected: <span className="font-extrabold text-cyan-700">{doc.pageCount} page(s)</span>
                          <span className="font-mono ml-1 font-bold">
                            [{doc.selectedPages && doc.selectedPages.length > 0 ? doc.selectedPages.join(', ') : 'None'}]
                          </span>
                        </span>
                        <span className="text-[10px] text-cyan-600 font-medium">
                          Available: 1 to {doc.totalPages || 1}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Print Options: Paper, Colour, Sides, Copies */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                  {/* Paper Size */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">PAPER</label>
                    <select
                      value={doc.paperSize}
                      onChange={(e) => updateDocSetting(idx, 'paperSize', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 font-semibold focus:ring-1 focus:ring-cyan-600"
                    >
                      <option value="A4">A4 Standard</option>
                      <option value="A3">A3 Large</option>
                      <option value="LEGAL">Legal Paper</option>
                      <option value="GLOSSY">Glossy Photo Paper</option>
                    </select>
                  </div>

                  {/* Color Mode */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">COLOUR</label>
                    <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300 text-xs">
                      <button
                        type="button"
                        onClick={() => updateDocSetting(idx, 'colorMode', 'BW')}
                        className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                          doc.colorMode === 'BW' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        B&W
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDocSetting(idx, 'colorMode', 'COLOUR')}
                        className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                          doc.colorMode === 'COLOUR' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Colour
                      </button>
                    </div>
                  </div>

                  {/* Sides */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">SIDES</label>
                    <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300 text-xs">
                      <button
                        type="button"
                        onClick={() => updateDocSetting(idx, 'sides', 'SINGLE')}
                        className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                          doc.sides === 'SINGLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Single
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDocSetting(idx, 'sides', 'DOUBLE')}
                        className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                          doc.sides === 'DOUBLE' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        Double
                      </button>
                    </div>
                  </div>

                  {/* Copies counter */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-1">COPIES</label>
                    <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg px-2 py-1">
                      <button
                        type="button"
                        onClick={() => updateDocSetting(idx, 'copies', Math.max(1, doc.copies - 1))}
                        className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-xs text-slate-900">{doc.copies}</span>
                      <button
                        type="button"
                        onClick={() => updateDocSetting(idx, 'copies', doc.copies + 1)}
                        className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Optional Counter Add-ons & Finishing Services configured by Shopkeeper */}
          {shopInfo?.pricing?.customItems && shopInfo.pricing.customItems.filter(it => it.enabled !== false).length > 0 && (
            <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-yellow-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Counter Finishing & Add-on Services
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                  Optional Add-ons
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select additional services to apply to your order (spiral binding, lamination, corner staple):
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {shopInfo.pricing.customItems.filter(it => it.enabled !== false).map((addon) => {
                  const isSelected = selectedAddonIds.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-amber-100/90 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold truncate">{addon.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          ₹{addon.price} • {addon.unit}
                        </span>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-amber-600 border-amber-600 text-white'
                          : 'border-slate-300 bg-slate-50'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment & Submit Bar */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-semibold shrink-0">Pay Method:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all ${paymentMethod === 'UPI' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                >
                  ⚡ Direct UPI (0% Fee)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
                >
                  💵 Cash Counter
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="shrink-0">
                <span className="text-[9px] text-slate-500 block">TOTAL ESTIMATE</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600">₹{totalPrice}</span>
              </div>

              <button
                type="button"
                onClick={handleInitiateOrder}
                disabled={loading}
                className="flex-1 sm:flex-initial px-5 py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center space-x-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Processing...' : paymentMethod === 'UPI' ? 'PAY & PLACE ORDER' : 'PLACE PRINT ORDER'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Customer Recent Orders History with 3-Item Pagination & Delete Button */}
      {myOrders.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-700">My Print Orders ({myOrders.length})</h3>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Page {historyPage} of {Math.max(1, Math.ceil(myOrders.length / ORDERS_PER_PAGE))}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {myOrders
              .slice((historyPage - 1) * ORDERS_PER_PAGE, historyPage * ORDERS_PER_PAGE)
              .map((order, i) => (
                <div
                  key={i}
                  onClick={() => setActiveOrder(order)}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-cyan-500 shadow-xs cursor-pointer flex flex-col justify-between transition-all space-y-2.5 group relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-cyan-700">{order.publicOrderId}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteOrder(e, order._id || order.id || order.publicOrderId)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete order from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 font-medium">{order.documents?.length || 1} Document(s) • ₹{order.totalAmount}</p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${order.paymentMethod === 'CASH' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {order.paymentMethod === 'CASH' ? 'Cash' : 'UPI'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      order.status === 'COLLECTED'
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : order.status === 'READY'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-[9px] text-slate-400">PIN: {order.rawPickupPin || order.pickupPin}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination Controls */}
          {myOrders.length > ORDERS_PER_PAGE && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                disabled={historyPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition-all"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                {Array.from({ length: Math.ceil(myOrders.length / ORDERS_PER_PAGE) }, (_, idx) => idx + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setHistoryPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      historyPage === pageNum
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setHistoryPage(prev => Math.min(Math.ceil(myOrders.length / ORDERS_PER_PAGE), prev + 1))}
                disabled={historyPage >= Math.ceil(myOrders.length / ORDERS_PER_PAGE)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CameraCaptureModal
        isOpen={isCameraCaptureOpen}
        onClose={() => setIsCameraCaptureOpen(false)}
        onCaptureDone={handleCapturedDoc}
      />

      <DocumentScannerModal
        isOpen={isDocumentScannerOpen}
        onClose={() => setIsDocumentScannerOpen(false)}
        onScanDone={handleCapturedDoc}
      />

      <DocumentReviewModal
        isOpen={!!reviewingDoc}
        onClose={() => setReviewingDoc(null)}
        document={reviewingDoc}
        onOpenCardStudio={(d) => {
          setCardReviewData({
            ...d,
            frontUrl: d.frontUrl || d.pageImages?.[0] || d.fileUrl,
            backUrl: d.backUrl || d.pageImages?.[1] || d.fileUrl,
            pageImages: d.pageImages || [d.fileUrl].filter(Boolean)
          });
        }}
        onDeleteDocument={(docId) => {
          setDocuments(prev => prev.filter(d => d.id !== docId && d._id !== docId));
        }}
        onToggleCombine2On1={(docId) => {
          setDocuments(prev => prev.map(d => (d.id === docId || d._id === docId) ? { ...d, combine2On1: !d.combine2On1 } : d));
          setReviewingDoc(prev => prev ? { ...prev, combine2On1: !prev.combine2On1 } : null);
        }}
      />

      <AadhaarIdUploadModal
        isOpen={isAadhaarUploadOpen}
        onClose={() => setIsAadhaarUploadOpen(false)}
        onAddMergedDoc={(newDoc) => {
          setDocuments(prev => [...prev, newDoc]);
        }}
      />

      {cardReviewData && (
        <CardPrintReviewModal
          isOpen={!!cardReviewData}
          onClose={() => setCardReviewData(null)}
          cardData={cardReviewData}
          onUpdateCard={(updated) => setCardReviewData(updated)}
          onConfirmPrint={(printConfig) => {
            // Apply selected print config to document settings
            setDocuments(prev => prev.map(d => {
              if (d.id === cardReviewData.id || d._id === cardReviewData.id) {
                const isSep = printConfig.layoutMode === 'SEPARATE_PAGES';
                const total = d.pageImages?.length || d.totalPages || 2;
                return {
                  ...d,
                  paperSize: printConfig.paperSize,
                  copies: printConfig.copies,
                  layoutMode: printConfig.layoutMode,
                  sizeMode: printConfig.sizeMode,
                  orientation: printConfig.orientation,
                  combine2On1: !isSep,
                  pageCount: isSep ? total : 1,
                  totalPages: isSep ? total : 1,
                  selectedPages: isSep ? Array.from({ length: total }, (_, k) => k + 1) : [1]
                };
              }
              return d;
            }));
            setCardReviewData(null);
          }}
        />
      )}

      {/* Direct UPI Payment Modal (0% fees, Free Dynamic QR & App Intent) */}
      <DirectUpiPaymentModal
        isOpen={isUpiPaymentOpen}
        onClose={() => setIsUpiPaymentOpen(false)}
        totalAmount={totalPrice}
        shopInfo={shopInfo}
        onConfirmPayment={(paymentData) => {
          executeCreateOrder({ method: 'UPI', upiUtr: paymentData.upiUtr });
        }}
        loading={loading}
      />

    </div>
  );
}
