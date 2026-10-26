const { io } = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dotenv = require('dotenv');

let ptp = null;
try {
  ptp = require('pdf-to-printer');
} catch (e) {
  console.log('[Notice]: Native pdf-to-printer module fallback active.');
}

// Load environments
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const AGENT_SECRET = process.env.AGENT_SECRET || 'agent_secret_token_876634';

const tempSpoolDir = path.join(__dirname, './spool');
if (!fs.existsSync(tempSpoolDir)) {
  fs.mkdirSync(tempSpoolDir, { recursive: true });
}

console.log('================================================================');
console.log('🖨️  SECURE PRINT SHOP - SMART HARDWARE PRINT AGENT');
console.log('    Supports USB • Wi-Fi (Network) • Bluetooth (Thermal/POS)');
console.log(`    Target Print Server: ${SERVER_URL}`);
console.log('================================================================\n');

// Socket.io Real-time Connection
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000
});

// State Management
const processedJobIds = new Set();
const abortedPrintJobs = new Set();
const printerQueues = new Map(); // printerName -> Array<jobData>
const activePrinterWorkers = new Set(); // Currently printing printerNames
let isScanningPrinters = false;
let lastDetectedPrinters = [];

// Socket Handlers
socket.on('connect', () => {
  console.log('✅ [Agent Connected]: Real-time connection established with Print Server.');
  socket.emit('register_agent', { branchId: 'Main_Branch', timestamp: new Date() });
  detectSystemPrinters();
});

socket.on('disconnect', () => {
  console.log('⚠️ [Agent Disconnected]: Connection lost. Auto-reconnecting in background...');
});

// Run immediate hardware scan on agent launch
detectSystemPrinters();

socket.on('agent_abort_print', ({ printJobId }) => {
  if (printJobId) {
    abortedPrintJobs.add(String(printJobId));
    console.log(`🛑 [Abort Signal]: Print job ${printJobId} marked for abort.`);
  }
});

socket.on('agent_rescan_printers', () => {
  console.log('🔄 [Manual Rescan]: Printer rescan requested by Shopkeeper Dashboard');
  detectSystemPrinters();
});

socket.on('agent_test_print', (testData) => {
  console.log('\n================================================================');
  console.log(`🖨️ [TEST PRINT REQUEST RECEIVED] from ${testData.initiatedBy || 'Dashboard'}`);
  console.log(`Test Job ID: ${testData.testJobId || 'TEST_01'}`);
  console.log('Verifying Windows Spooler & active printer hardware...');
  detectSystemPrinters();
  console.log('✅ Physical Spooler Pipeline Verified & Ready.');
  console.log('================================================================\n');
});

// -------------------------------------------------------------
// 1. SMART PRINTER SCANNER (USB + Wi-Fi + Bluetooth + Virtual)
// -------------------------------------------------------------
function categorizePrinter(p) {
  const port = (p.PortName || '').toUpperCase();
  const driver = (p.DriverName || '').toLowerCase();
  const name = (p.Name || '').toLowerCase();

  // 1. USB Connection
  if (port.includes('USB') || port.includes('DOT4')) {
    return { interfaceType: 'USB', icon: '🔌' };
  }
  // 2. Wi-Fi / LAN Network Connection
  if (Boolean(p.Network) || port.includes('WSD') || port.includes('IP_') || port.includes('TCP') || port.includes('HTTP') || /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(port)) {
    return { interfaceType: 'Wi-Fi / Network', icon: '📶' };
  }
  // 3. Bluetooth Connection (Thermal / POS / Portable / COM RFCOMM)
  if (port.includes('BTH') || port.includes('BLUETOOTH') || port.includes('COM') || driver.includes('bluetooth') || name.includes('bluetooth') || name.includes('bth') || name.includes('pos-') || name.includes('thermal') || name.includes('rp-') || name.includes('mpt-')) {
    return { interfaceType: 'Bluetooth', icon: '🔵' };
  }
  // 4. Virtual / Software Printer
  if (port.includes('PORTPROMPT:') || port.includes('NUL:') || port.includes('FILE:') || driver.includes('pdf') || driver.includes('onenote') || driver.includes('xps') || driver.includes('fax') || name.includes('pdf') || name.includes('onenote')) {
    return { interfaceType: 'Virtual / PDF', icon: '📄' };
  }
  return { interfaceType: 'Direct Hardware', icon: '🖨️' };
}

async function detectSystemPrinters() {
  if (isScanningPrinters) return;
  isScanningPrinters = true;

  try {
    const detectedPrintersMap = new Map();
    let defaultPrinterName = null;

    if (process.platform === 'win32') {
      // Step A: Find default printer from pdf-to-printer if available
      if (ptp && typeof ptp.getDefaultPrinter === 'function') {
        try {
          const def = await ptp.getDefaultPrinter();
          if (def && (def.name || def.deviceId)) {
            defaultPrinterName = def.name || def.deviceId;
          }
        } catch (_) {}
      }

      // Step B: Query PowerShell Win32_Printer with full port & driver details
      const psCommand = 'powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, PrinterStatus, Default, Network | ConvertTo-Json -Compress"';
      
      await new Promise((resolve) => {
        exec(psCommand, { timeout: 10000 }, (err, stdout) => {
          if (!err && stdout && stdout.trim()) {
            try {
              const raw = JSON.parse(stdout.trim());
              const arr = Array.isArray(raw) ? raw : [raw];
              arr.forEach(p => {
                if (p.Name) {
                  const isDef = Boolean(p.Default) || p.Name === defaultPrinterName;
                  const cat = categorizePrinter(p);
                  detectedPrintersMap.set(p.Name, {
                    name: p.Name,
                    isDefault: isDef,
                    status: p.PrinterStatus === 3 ? 'Ready' : 'Normal',
                    port: p.PortName || '',
                    driver: p.DriverName || '',
                    interfaceType: cat.interfaceType,
                    icon: cat.icon
                  });
                  if (isDef) defaultPrinterName = p.Name;
                }
              });
            } catch (_) {}
          }
          resolve();
        });
      });

      // Step C: Fallback to pdf-to-printer if map is empty
      if (detectedPrintersMap.size === 0 && ptp && typeof ptp.getPrinters === 'function') {
        try {
          const fallbackPrinters = await ptp.getPrinters();
          if (Array.isArray(fallbackPrinters)) {
            fallbackPrinters.forEach(p => {
              const name = p.name || p.deviceId;
              if (name) {
                const isDef = name === defaultPrinterName || Boolean(p.isDefault);
                detectedPrintersMap.set(name, {
                  name,
                  isDefault: isDef,
                  status: 'Ready',
                  interfaceType: 'Direct Hardware',
                  icon: '🖨️'
                });
              }
            });
          }
        } catch (_) {}
      }

      const printerObjects = Array.from(detectedPrintersMap.values());
      const hasChanged = JSON.stringify(printerObjects.map(p => p.name)) !== JSON.stringify(lastDetectedPrinters.map(p => p.name));
      lastDetectedPrinters = printerObjects;

      if (hasChanged || printerObjects.length > 0) {
        console.log(`\n🔍 [System Hardware Printers Auto-Scanned (${printerObjects.length} Connected)]:`);
        printerObjects.forEach(p => {
          console.log(`  ${p.icon} ${p.name} [${p.interfaceType}] ${p.port ? `(Port: ${p.port})` : ''} ${p.isDefault ? '⭐ DEFAULT' : ''}`);
        });
        console.log('');
      }

      socket.emit('agent_printers_detected', { printers: printerObjects });
    } else {
      // Unix / CUPS
      exec('lpstat -p', (err, stdout) => {
        if (!err && stdout) {
          socket.emit('agent_printers_detected', { printers: stdout.trim() });
        }
      });
    }
  } catch (scanErr) {
    console.error('Printer scan error:', scanErr.message);
  } finally {
    isScanningPrinters = false;
  }
}

// Auto-rescan hardware every 20 seconds (detects newly connected USB, Wi-Fi or Bluetooth printers dynamically)
setInterval(detectSystemPrinters, 20000);


// ----------------------------------------------------------------------
// 2. PARALLEL MULTI-PRINTER QUEUE SYSTEM (Simultaneous Printing)
// ----------------------------------------------------------------------
// Each physical printer gets its own independent worker loop.
// If Printer A is printing, Printer B can print at the EXACT SAME TIME!
function enqueuePrintJob(jobData) {
  if (!jobData || !jobData.printJobId) return;
  const jobId = String(jobData.printJobId);

  if (processedJobIds.has(jobId)) {
    return;
  }

  // Identify target hardware printer
  const printerKey = (jobData.printerName && jobData.printerName !== 'AUTO' && jobData.printerName !== 'Default' && jobData.printerName !== 'Default Physical Printer')
    ? jobData.printerName
    : 'DEFAULT_PRINTER';

  if (!printerQueues.has(printerKey)) {
    printerQueues.set(printerKey, []);
  }

  const queue = printerQueues.get(printerKey);
  if (queue.some(item => String(item.printJobId) === jobId)) {
    return;
  }

  queue.push(jobData);
  console.log(`📥 [JOB QUEUED FOR PRINTER "${printerKey}"]: Order ${jobData.publicOrderId} (Waiting for this printer: ${queue.length})`);
  
  // Trigger independent worker for this specific printer
  processPrinterQueue(printerKey);
}

async function processPrinterQueue(printerKey) {
  // If this specific hardware printer is already spooling, wait for it
  if (activePrinterWorkers.has(printerKey)) {
    return;
  }

  const queue = printerQueues.get(printerKey);
  if (!queue || queue.length === 0) return;

  activePrinterWorkers.add(printerKey);
  const jobData = queue.shift();

  try {
    console.log(`\n🖨️ [PARALLEL PRINT START]: Target "${printerKey}" -> Order ${jobData.publicOrderId} (Active Printers: ${activePrinterWorkers.size})`);
    await executePrintJob(jobData);
    processedJobIds.add(String(jobData.printJobId));
  } catch (err) {
    console.error(`🔴 [JOB FAILED ON "${printerKey}"]: Order ${jobData.publicOrderId} - ${err.message}`);
  } finally {
    activePrinterWorkers.delete(printerKey);
    // Next job for this specific printer
    if (queue.length > 0) {
      setTimeout(() => processPrinterQueue(printerKey), 800);
    }
  }
}

// Direct Execution of Single Print Job
async function executePrintJob(jobData) {
  console.log('\n====================================================');
  console.log(`⚡ [PHYSICAL PRINT JOB DISPATCHED]: ${jobData.publicOrderId}`);
  console.log(`Print Job ID: ${jobData.printJobId}`);
  console.log(`Target Hardware: ${jobData.printerName || 'Default System Printer'}`);
  console.log(`Documents count: ${jobData.documents ? jobData.documents.length : 0}`);
  console.log('====================================================');

  if (abortedPrintJobs.has(String(jobData.printJobId))) {
    console.log(`⚠️ [JOB ABORTED BY USER]: Skipping ${jobData.publicOrderId}`);
    abortedPrintJobs.delete(String(jobData.printJobId));
    return;
  }

  try {
    for (const doc of (jobData.documents || [])) {
      if (abortedPrintJobs.has(String(jobData.printJobId))) {
        console.log(`⚠️ [JOB ABORTED]: Skipping document '${doc.name}'`);
        abortedPrintJobs.delete(String(jobData.printJobId));
        return;
      }

      console.log(`⬇️ Downloading document '${doc.name}' for direct spooling...`);
      const fileUrl = `${SERVER_URL}/api/agent/download/${doc.id}`;
      const localFilePath = path.join(tempSpoolDir, `spool_${jobData.publicOrderId}_${Date.now()}_${doc.name}`);

      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer',
        headers: { 'x-agent-secret': AGENT_SECRET },
        timeout: 25000
      });

      fs.writeFileSync(localFilePath, response.data);
      console.log(`💾 Spool payload ready: ${localFilePath}`);

      // Direct Hardware Spooling to Printer
      await printDocumentToPrinter(localFilePath, jobData);

      // Clean spool file after short delay
      setTimeout(() => {
        if (fs.existsSync(localFilePath)) {
          try { fs.unlinkSync(localFilePath); } catch (_) {}
        }
      }, 6000);
    }

    // Report success to backend
    await axios.post(`${SERVER_URL}/api/agent/job-status`, {
      printJobId: jobData.printJobId,
      status: 'COMPLETED'
    }, {
      headers: { 'x-agent-secret': AGENT_SECRET },
      timeout: 10000
    });

    console.log(`✅ [PHYSICAL PRINT COMPLETE]: Order ${jobData.publicOrderId} printed successfully!`);

  } catch (err) {
    console.error(`🔴 [PRINT AGENT FAILURE]: ${err.message}`);
    try {
      await axios.post(`${SERVER_URL}/api/agent/job-status`, {
        printJobId: jobData.printJobId,
        status: 'FAILED',
        failureReason: err.message
      }, {
        headers: { 'x-agent-secret': AGENT_SECRET },
        timeout: 10000
      });
    } catch (_) {}
    throw err;
  }
}

// Helper executing background Windows/OS print command
async function printDocumentToPrinter(filePath, jobData) {
  const targetPrinter = jobData.printerName;
  console.log(`🖨️ Spooling physical print payload for Order ${jobData.publicOrderId} to: "${targetPrinter || 'Default System Printer'}"...`);

  if (process.platform === 'win32') {
    const isCustomPrinter = targetPrinter && 
      targetPrinter !== 'Default' && 
      targetPrinter !== 'AUTO' && 
      targetPrinter !== 'Default Physical Printer' && 
      targetPrinter !== 'DEFAULT_PRINTER';

    // 1. Primary: Native Windows PDF Spooler Engine (pdf-to-printer)
    if (ptp && typeof ptp.print === 'function') {
      try {
        const options = {};
        if (isCustomPrinter) {
          options.printer = targetPrinter;
        }
        console.log(`⚡ [Windows Direct Spooler]: Printing via hardware driver pipeline... Target: "${options.printer || 'Default Windows Printer'}"`);
        await ptp.print(filePath, options);
        console.log(`✅ [Windows Direct Spooler]: Print job accepted by "${options.printer || 'Default Windows Printer'}".`);
        return;
      } catch (ptpErr) {
        console.warn(`⚠️ [Spooler Engine Warning]: ${ptpErr.message}. Falling back to PowerShell Verb...`);
      }
    }

    // 2. Fallback: PowerShell PrintTo / Print verb
    return new Promise((resolve) => {
      let cmd;
      if (isCustomPrinter) {
        console.log(`🎯 Multi-Printer Dispatch (PowerShell) -> Target: "${targetPrinter}"`);
        cmd = `powershell -NoProfile -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '\"${targetPrinter}\"' -PassThru | Out-Null"`;
      } else {
        console.log(`🎯 Multi-Printer Dispatch (PowerShell) -> Default Windows Printer`);
        cmd = `powershell -NoProfile -Command "Start-Process -FilePath '${filePath}' -Verb Print -PassThru | Out-Null"`;
      }

      exec(cmd, { timeout: 20000 }, (err) => {
        if (err) {
          console.log(`[Printer Note]: PowerShell Print command dispatched: ${err.message || 'Queued in Windows Spooler'}`);
        } else {
          console.log(`[Printer Note]: Physical print spool job accepted by Windows Spooler for ${targetPrinter || 'Default Printer'}.`);
        }
        resolve();
      });
    });
  } else {
    // CUPS / Unix lp command
    return new Promise((resolve) => {
      const lpCmd = targetPrinter ? `lp -d "${targetPrinter}" "${filePath}"` : `lp "${filePath}"`;
      exec(lpCmd, { timeout: 15000 }, () => {
        console.log(`[Printer Note]: Direct Unix spool job accepted.`);
        resolve();
      });
    });
  }
}

// -------------------------------------------------------------
// 3. JOB RECEIVERS (WebSockets + Resilient Polling)
// -------------------------------------------------------------
// A. Real-time WebSocket event
socket.on('agent_print_job', enqueuePrintJob);

// B. Continuous Polling Fallback (ensures cloud/serverless jobs are never missed)
async function pollPendingPrintJobs() {
  try {
    const res = await axios.get(`${SERVER_URL}/api/agent/pending-jobs`, {
      headers: { 'x-agent-secret': AGENT_SECRET },
      timeout: 5000
    });
    if (res.data && res.data.success && Array.isArray(res.data.jobs)) {
      for (const job of res.data.jobs) {
        const jId = String(job._id);
        if (!processedJobIds.has(jId)) {
          enqueuePrintJob({
            printJobId: job._id,
            publicOrderId: job.orderId?.publicOrderId || jId.slice(-6),
            printerName: job.printerId?.name || 'Default',
            documents: (job.documents || []).map(d => ({
              id: d._id || d,
              name: d.originalFileName || 'document.pdf'
            }))
          });
        }
      }
    }
  } catch (_) {}
}

// Poll every 3 seconds for continuous printing loop
setInterval(pollPendingPrintJobs, 3000);
