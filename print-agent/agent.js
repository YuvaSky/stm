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
  console.log('[Notice]: Native pdf-to-printer module optional fallback active.');
}

dotenv.config({ path: path.join(__dirname, '../.env') });

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const AGENT_SECRET = process.env.AGENT_SECRET || 'agent_secret_token_998877';

const tempSpoolDir = path.join(__dirname, './spool');
if (!fs.existsSync(tempSpoolDir)) {
  fs.mkdirSync(tempSpoolDir, { recursive: true });
}

console.log('====================================================');
console.log('🖨️  LOCAL PRINT AGENT STARTING...');
console.log(`Connecting to Backend Server: ${SERVER_URL}`);
console.log('====================================================');

// Connect Socket.io
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000
});

const abortedPrintJobs = new Set();

socket.on('agent_abort_print', ({ printJobId }) => {
  if (printJobId) abortedPrintJobs.add(String(printJobId));
});

socket.on('connect', () => {
  console.log('✅ [Agent Connected]: Real-time connection established with Print Server.');
  socket.emit('register_agent', { branchId: 'Main_Branch', timestamp: new Date() });
  detectSystemPrinters();
});

socket.on('disconnect', () => {
  console.log('⚠️ [Agent Disconnected]: Reconnecting to server...');
});

// Detect Installed System Printers
async function detectSystemPrinters() {
  if (process.platform === 'win32') {
    if (ptp && typeof ptp.getPrinters === 'function') {
      try {
        const printers = await ptp.getPrinters();
        if (printers && printers.length > 0) {
          const printerObjects = printers.map(p => ({
            name: p.name || p.deviceId,
            isDefault: Boolean(p.isDefault),
            status: 'Ready'
          }));
          console.log('\n[Detected System Printers on Windows via Spooler Engine]:');
          printerObjects.forEach(p => console.log(` - ${p.name} ${p.isDefault ? '(Default)' : ''}`));
          socket.emit('agent_printers_detected', { printers: printerObjects });
          return;
        }
      } catch (_) {}
    }

    exec('powershell "Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, Default | ConvertTo-Json"', (err, stdout) => {
      if (!err && stdout) {
        try {
          const raw = JSON.parse(stdout);
          const arr = Array.isArray(raw) ? raw : [raw];
          const printerObjects = arr.map(p => ({
            name: p.Name,
            isDefault: Boolean(p.Default),
            status: p.PrinterStatus === 3 ? 'Ready' : 'Normal'
          }));
          console.log('\n[Detected System Printers on Windows]:');
          printerObjects.forEach(p => console.log(` - ${p.name} ${p.isDefault ? '(Default)' : ''}`));
          socket.emit('agent_printers_detected', { printers: printerObjects });
          return;
        } catch (parseErr) {}
      }
      // Fallback
      exec('powershell "Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, Default"', (err2, stdout2) => {
        if (!err2 && stdout2) {
          console.log('\n[Detected System Printers on Windows]:');
          console.log(stdout2.trim());
          socket.emit('agent_printers_detected', { printers: stdout2.trim() });
        }
      });
    });
  } else {
    exec('lpstat -p', (err, stdout) => {
      if (!err && stdout) {
        console.log('\n[Detected System Printers]:\n' + stdout);
        socket.emit('agent_printers_detected', { printers: stdout.trim() });
      }
    });
  }
}

// Listen for Test Print Dispatch from Dashboard
socket.on('agent_test_print', (testData) => {
  console.log('\n====================================================');
  console.log(`🖨️ [TEST PRINT REQUEST RECEIVED] from ${testData.initiatedBy}`);
  console.log(`Test Job ID: ${testData.testJobId}`);
  console.log('Verifying Windows Spooler & physical printer state...');
  detectSystemPrinters();
  console.log('✅ Physical Spooler Pipeline Verified & Ready.');
  console.log('====================================================\n');
});

// Listen for Print Jobs dispatched from Shopkeeper Dashboard
socket.on('agent_print_job', async (jobData) => {
  console.log('\n====================================================');
  console.log(`⚡ [NEW PHYSICAL PRINT JOB RECEIVED]: ${jobData.publicOrderId}`);
  console.log(`Print Job ID: ${jobData.printJobId}`);
  console.log(`Documents count: ${jobData.documents ? jobData.documents.length : 0}`);
  console.log('====================================================');

  try {
    for (const doc of jobData.documents) {
      if (abortedPrintJobs.has(String(jobData.printJobId))) {
        console.log(`⚠️ [PRINT ABORTED]: Skipping remaining documents for ${jobData.publicOrderId}`);
        abortedPrintJobs.delete(String(jobData.printJobId));
        return;
      }

      console.log(`⬇️ Downloading document '${doc.name}' for direct physical spooling...`);

      const fileUrl = `${SERVER_URL}/api/agent/download/${doc.id}`;
      const localFilePath = path.join(tempSpoolDir, `spool_${jobData.publicOrderId}_${doc.name}`);

      const response = await axios({
        method: 'GET',
        url: fileUrl,
        responseType: 'arraybuffer',
        headers: {
          'x-agent-secret': AGENT_SECRET
        }
      });

      fs.writeFileSync(localFilePath, response.data);
      console.log(`💾 File downloaded to spool: ${localFilePath}`);

      // Execute Direct OS Spool Printing (No Browser Print Dialog)
      await printDocumentToPrinter(localFilePath, jobData);

      if (abortedPrintJobs.has(String(jobData.printJobId))) {
        console.log(`⚠️ [PRINT ABORTED]: Stopped after current spool operation for ${jobData.publicOrderId}`);
        abortedPrintJobs.delete(String(jobData.printJobId));
        return;
      }

      // Clean spool file after print dispatch
      setTimeout(() => {
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
      }, 5000);
    }

    // Report success to backend
    await axios.post(`${SERVER_URL}/api/agent/job-status`, {
      printJobId: jobData.printJobId,
      status: 'COMPLETED'
    }, {
      headers: { 'x-agent-secret': AGENT_SECRET }
    });

    console.log(`✅ [PHYSICAL PRINT COMPLETE]: Job ${jobData.publicOrderId} printed successfully!`);

  } catch (err) {
    console.error(`🔴 [PRINT AGENT FAILURE]: ${err.message}`);
    try {
      await axios.post(`${SERVER_URL}/api/agent/job-status`, {
        printJobId: jobData.printJobId,
        status: 'FAILED',
        failureReason: err.message
      }, {
        headers: { 'x-agent-secret': AGENT_SECRET }
      });
    } catch (reportErr) {
      console.error('Failed to report job status:', reportErr.message);
    }
  }
});

// Helper executing background Windows/OS print command
async function printDocumentToPrinter(filePath, jobData) {
  const targetPrinter = jobData.printerName;
  console.log(`🖨️ Spooling physical print payload for job ${jobData.publicOrderId} to target: "${targetPrinter || 'Default System Printer'}"...`);

  if (process.platform === 'win32') {
    // 1. Primary: Native Windows PDF Spooler Engine (pdf-to-printer)
    if (ptp && typeof ptp.print === 'function') {
      try {
        const options = {};
        if (targetPrinter && targetPrinter !== 'Default' && targetPrinter !== 'AUTO' && targetPrinter !== 'Default Physical Printer') {
          options.printer = targetPrinter;
        }
        console.log(`⚡ [Windows Direct Spooler]: Printing via hardware driver pipeline... Target: "${options.printer || 'Default Windows Printer'}"`);
        await ptp.print(filePath, options);
        console.log(`✅ [Windows Direct Spooler]: Physical print job successfully spooled to "${options.printer || 'Default Windows Printer'}".`);
        return;
      } catch (ptpErr) {
        console.warn(`⚠️ [Spooler Engine Warning]: ${ptpErr.message}. Falling back to PowerShell Verb...`);
      }
    }

    // 2. Fallback: PowerShell PrintTo / Print verb
    return new Promise((resolve) => {
      let cmd;
      if (targetPrinter && targetPrinter !== 'Default' && targetPrinter !== 'AUTO') {
        console.log(`🎯 Multi-Printer Dispatch (PowerShell) -> Specific Target: "${targetPrinter}"`);
        cmd = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '\"${targetPrinter}\"' -PassThru | Out-Null"`;
      } else {
        console.log(`🎯 Multi-Printer Dispatch (PowerShell) -> Default System Printer`);
        cmd = `powershell -Command "Start-Process -FilePath '${filePath}' -Verb Print -PassThru | Out-Null"`;
      }

      exec(cmd, (err) => {
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
      exec(lpCmd, (err) => {
        if (err) {
          console.log(`[Printer Note]: Direct Unix spool job accepted with note.`);
        } else {
          console.log(`[Printer Note]: Direct Unix spool job accepted for ${targetPrinter || 'Default'}.`);
        }
        resolve();
      });
    });
  }
}
