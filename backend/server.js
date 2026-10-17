const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const initRetentionCleaner = require('./utils/retentionCleaner');

const server = http.createServer(app);

// Socket.io for Real-time print queue and Local Print Agent connection
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Attach io instance to app for routes
app.set('io', io);

// Init Background Retention Cleaner Cron
initRetentionCleaner();

// Active Local Print Agent Registry
const activeAgents = new Map();
app.set('activeAgents', activeAgents);

function extractPrinters(agents) {
  const list = [];
  agents.forEach(agent => {
    if (!agent.printers) return;
    if (Array.isArray(agent.printers)) {
      agent.printers.forEach(p => {
        if (typeof p === 'string') {
          list.push({ name: p, isDefault: false, status: 'Ready' });
        } else if (p && p.name) {
          list.push({
            name: p.name,
            isDefault: Boolean(p.isDefault),
            status: p.status || 'Ready'
          });
        }
      });
    } else if (typeof agent.printers === 'string') {
      const lines = agent.printers.split('\n').filter(l => l.trim() && !l.includes('---') && !l.includes('PrinterStatus'));
      lines.forEach(line => {
        const match = line.match(/^(\S.*?\S)\s{2,}/);
        const name = match ? match[1].trim() : line.trim();
        const isDefault = line.toLowerCase().includes('true');
        if (name && name !== 'Name') {
          list.push({ name, isDefault, status: 'Ready' });
        }
      });
    }
  });
  const seen = new Set();
  return list.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

function broadcastAgentStatus() {
  const agents = Array.from(activeAgents.values());
  const printers = extractPrinters(agents);
  io.emit('agent_status', {
    online: activeAgents.size > 0,
    count: activeAgents.size,
    agents,
    printers
  });
}

// Socket.io Connection Handlers
io.on('connection', (socket) => {
  console.log(`\x1b[32m[Socket Connected]: Client ID ${socket.id}\x1b[0m`);

  // Emit current agent status to newly connected frontend
  const initialAgents = Array.from(activeAgents.values());
  socket.emit('agent_status', {
    online: activeAgents.size > 0,
    count: activeAgents.size,
    agents: initialAgents,
    printers: extractPrinters(initialAgents)
  });

  socket.on('register_agent', (data) => {
    console.log(`\x1b[35m[Local Print Agent Registered]: Shop Branch ${data.branchId || 'Main'}\x1b[0m`);
    socket.join('print_agents');
    socket.isAgent = true;
    activeAgents.set(socket.id, {
      id: socket.id,
      branchId: data.branchId || 'Main_Branch',
      printers: data.printers || [],
      registeredAt: new Date()
    });
    broadcastAgentStatus();
  });

  socket.on('agent_printers_detected', (data) => {
    if (activeAgents.has(socket.id)) {
      activeAgents.get(socket.id).printers = data.printers || [];
      broadcastAgentStatus();
    }
  });

  socket.on('disconnect', () => {
    console.log(`\x1b[33m[Socket Disconnected]: Client ID ${socket.id}\x1b[0m`);
    if (activeAgents.has(socket.id)) {
      activeAgents.delete(socket.id);
      broadcastAgentStatus();
    }
  });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Expose to local Wi-Fi network for mobile access

server.listen(PORT, HOST, () => {
  console.log(`========================================================`);
  console.log(`🚀 SECURE PRINT SHOP BACKEND RUNNING ON http://0.0.0.0:${PORT}`);
  console.log(`   Accessible from Local Machine & Mobile Wi-Fi Network`);
  console.log(`========================================================`);
});
