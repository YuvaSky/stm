import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle2, AlertCircle, Play, Terminal, RefreshCw, X, ShieldCheck, Cpu, ArrowRight, Zap, Settings, Check } from 'lucide-react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

export default function PrintAgentModal({ isOpen, onClose }) {
  const { socket } = useSocket();
  const [agentOnline, setAgentOnline] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [printersList, setPrintersList] = useState([]);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedCommand, setCopiedCommand] = useState(false);

  // Auto-Print Settings
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
  const [preferredPrinter, setPreferredPrinter] = useState('AUTO');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    checkAgentStatus();
    fetchAutoPrintSettings();

    // Listen to real-time socket agent updates
    if (socket) {
      const handleAgentStatus = (data) => {
        setAgentOnline(data.online);
        if (data.printers && data.printers.length > 0) {
          parsePrinters(data.printers);
        } else if (data.agents && data.agents.length > 0 && data.agents[0].printers) {
          parsePrinters(data.agents[0].printers);
        }
        if (data.agents && data.agents.length > 0) {
          setAgentInfo(data.agents[0]);
        } else {
          setAgentInfo(null);
        }
      };

      const handleAutoPrintUpdated = (data) => {
        if (data.autoPrint !== undefined) setAutoPrintEnabled(data.autoPrint);
        if (data.preferredPrinter !== undefined) setPreferredPrinter(data.preferredPrinter);
      };

      socket.on('agent_status', handleAgentStatus);
      socket.on('autoprint_settings_updated', handleAutoPrintUpdated);

      return () => {
        socket.off('agent_status', handleAgentStatus);
        socket.off('autoprint_settings_updated', handleAutoPrintUpdated);
      };
    }
  }, [isOpen, socket]);

  const parsePrinters = (printersRaw) => {
    if (typeof printersRaw === 'string') {
      const lines = printersRaw.split('\n').filter(l => l.trim() && !l.includes('---') && !l.includes('PrinterStatus'));
      const names = lines.map(line => {
        const match = line.match(/^(\S.*?\S)\s{2,}/);
        return match ? match[1].trim() : line.trim();
      }).filter(n => n && n !== 'Name');
      setPrintersList(Array.from(new Set(names)));
    } else if (Array.isArray(printersRaw)) {
      const names = printersRaw.map(p => (typeof p === 'string' ? p : p.name)).filter(Boolean);
      setPrintersList(Array.from(new Set(names)));
    }
  };

  const checkAgentStatus = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/agent-status');
      if (res.data.success) {
        setAgentOnline(res.data.online);
        if (res.data.printers && res.data.printers.length > 0) {
          parsePrinters(res.data.printers);
        }
      }
    } catch (_) {}
  };

  const fetchAutoPrintSettings = async () => {
    try {
      const res = await axios.get('/api/shopkeeper/autoprint-settings');
      if (res.data.success) {
        setAutoPrintEnabled(res.data.autoPrint);
        setPreferredPrinter(res.data.preferredPrinter || 'AUTO');
      }
    } catch (_) {}
  };

  const handleSaveAutoPrint = async (newAutoPrint, newPrinter) => {
    setSavingSettings(true);
    setSettingsSavedMessage('');
    try {
      const res = await axios.post('/api/shopkeeper/autoprint-settings', {
        autoPrint: newAutoPrint !== undefined ? newAutoPrint : autoPrintEnabled,
        preferredPrinter: newPrinter !== undefined ? newPrinter : preferredPrinter
      });
      if (res.data.success) {
        setAutoPrintEnabled(res.data.autoPrint);
        setPreferredPrinter(res.data.preferredPrinter);
        setSettingsSavedMessage(res.data.message);
        setTimeout(() => setSettingsSavedMessage(''), 4000);
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestPrint = async () => {
    setTestPrintLoading(true);
    setTestResult(null);
    try {
      const res = await axios.post('/api/shopkeeper/test-print');
      setTestResult({
        success: true,
        message: res.data.message || 'Test signal sent to Print Agent!'
      });
      checkAgentStatus();
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message
      });
    } finally {
      setTestPrintLoading(false);
    }
  };

  const copyRunCommand = () => {
    const cmd = 'cd c:\\Users\\SumitKumarYadav\\Downloads\\stm\\stm\\print-agent; npm start';
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">LOCAL PHYSICAL PRINT AGENT</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Printer Connection & Automatic Printing</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Live Status Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            agentOnline 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${agentOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <h4 className="text-sm font-extrabold flex items-center gap-2">
                  <span>{agentOnline ? 'Print Agent Connected & Active' : 'Print Agent Inactive / Standby'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    agentOnline ? 'bg-emerald-200/80 text-emerald-800' : 'bg-amber-200/80 text-amber-800'
                  }`}>
                    {agentOnline ? 'ONLINE' : 'STANDBY'}
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {agentOnline 
                    ? 'Connected to local spooler via WebSocket. Zero browser dialogs needed.' 
                    : 'Start the background agent process to enable physical hardware printing.'}
                </p>
              </div>
            </div>

            <button
              onClick={checkAgentStatus}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* AUTO-PRINT TOGGLE & PRINTER SELECTION (Requested Feature) */}
          <div className="bg-gradient-to-br from-cyan-50/60 via-white to-blue-50/60 p-4 sm:p-5 rounded-2xl border border-cyan-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Automatic Print on Order Placement</h4>
                  <p className="text-xs text-slate-500">Automatically print customer files as soon as they complete payment</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoPrintEnabled}
                  onChange={(e) => handleSaveAutoPrint(e.target.checked, preferredPrinter)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* Target Printer Selection */}
            <div className="pt-3 border-t border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Target Connected Printer for Auto-Print:
              </label>
              <div className="flex gap-2">
                <select
                  value={preferredPrinter}
                  onChange={(e) => handleSaveAutoPrint(autoPrintEnabled, e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-cyan-600 shadow-2xs"
                >
                  <option value="AUTO">⚡ Auto-Route (Windows Default Printer)</option>
                  {printersList.map((p, idx) => (
                    <option key={idx} value={p}>🖨️ {p}</option>
                  ))}
                  {!printersList.includes('Microsoft Print to PDF') && (
                    <option value="Microsoft Print to PDF">🖨️ Microsoft Print to PDF</option>
                  )}
                </select>

                <button
                  onClick={() => handleSaveAutoPrint(autoPrintEnabled, preferredPrinter)}
                  disabled={savingSettings}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'Saving...' : 'Set Active'}</span>
                </button>
              </div>

              {settingsSavedMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{settingsSavedMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Start & Live Testing */}
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Run Local Print Agent
              </span>
              <button
                onClick={copyRunCommand}
                className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                {copiedCommand ? '✓ Copied!' : 'Copy Command'}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Run in a PowerShell terminal on the computer connected to your physical printer:
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto select-all">
              cd c:\Users\SumitKumarYadav\Downloads\stm\stm\print-agent ; npm start
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-800/80">
              <div className="text-[11px] text-slate-400">
                Send a test print signal over WebSocket:
              </div>

              <button
                onClick={handleTestPrint}
                disabled={testPrintLoading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{testPrintLoading ? 'Dispatching...' : 'Dispatch Test Print'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                testResult.success 
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* How It Works Flow */}
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-600" />
              Automatic Self-Service Print Flow
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-[10px] font-extrabold text-cyan-600 uppercase tracking-widest block">1. Customer Submits</span>
                <h5 className="text-xs font-bold text-slate-800">Upload & Instant UPI Pay</h5>
                <p className="text-[11px] text-slate-500">Customer chooses copies, page range (e.g. 1 to 5), and pays from phone.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block">2. Automatic Spooling</span>
                <h5 className="text-xs font-bold text-slate-800">Instant Hardware Trigger</h5>
                <p className="text-[11px] text-slate-500">When Auto-Print is ON, backend directly dispatches file to the connected printer.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">3. Zero Dialog Print</span>
                <h5 className="text-xs font-bold text-slate-800">Direct Physical Spooler</h5>
                <p className="text-[11px] text-slate-500">Agent executes PowerShell PrintTo command directly to printer tray with zero popups.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-0.5">
                <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-widest block">4. Pickup PIN Handover</span>
                <h5 className="text-xs font-bold text-slate-800">Ready for Collection</h5>
                <p className="text-[11px] text-slate-500">Order is marked READY. Customer walks to counter, provides 4-digit PIN, and collects paper.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            Auto-Print is currently <strong className={autoPrintEnabled ? 'text-emerald-600' : 'text-slate-600'}>{autoPrintEnabled ? 'ENABLED' : 'DISABLED'}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
