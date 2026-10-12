const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;
const ROSTER_FILE = path.join(__dirname, 'roster_data.json');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Roles Definition
const ROLES = {
  super_admin: { id: 'super_admin', name: 'Super Admin', canAlertAll: true, canAlertDept: true, canManageSystem: true },
  ceo: { id: 'ceo', name: 'CEO / Executive', canAlertAll: true, canAlertDept: true, canManageSystem: false },
  hod: { id: 'hod', name: 'Department Manager (HOD)', canAlertAll: true, canAlertDept: true, canManageSystem: false },
  staff: { id: 'staff', name: 'Normal Staff', canAlertAll: true, canAlertDept: true, canManageSystem: false },
};

// Initial Default Roster
const initialRoster = [
  { id: 'u1', name: 'Benson Admin', roleId: 'super_admin', roleName: 'ICT Director & Admin', department: 'ICT', isHod: true, status: 'online', phone: '+254712345678', lastSeen: 'Just now', pin: '1234' },
  { id: 'u2', name: 'Dr. Evelyn Njeri', roleId: 'ceo', roleName: 'Chief Executive Officer', department: 'Executive', isHod: true, status: 'online', phone: '+254722987654', lastSeen: 'Just now', pin: '1234' },
  { id: 'u3', name: 'John Kamau', roleId: 'staff', roleName: 'ICT Systems Specialist', department: 'ICT', isHod: false, status: 'online', phone: '+254733112233', lastSeen: 'Just now', pin: '1234' },
  { id: 'u4', name: 'Mary Wanjiku', roleId: 'hod', roleName: 'Head of HR', department: 'HR', isHod: true, status: 'online', phone: '+254799445566', lastSeen: 'Just now', pin: '1234' },
  { id: 'u5', name: 'Peter Otieno', roleId: 'hod', roleName: 'Head of Operations', department: 'Operations', isHod: true, status: 'busy', phone: '+254711223344', lastSeen: 'Busy', pin: '1234' },
  { id: 'u6', name: 'Grace Kiprop', roleId: 'staff', roleName: 'Senior Medical Specialist', department: 'Medical', isHod: false, status: 'offline', phone: '+254700112233', lastSeen: '1 hour ago', pin: '1234' },
  { id: 'u7', name: 'David Mutua', roleId: 'hod', roleName: 'Chief Financial Officer', department: 'Finance', isHod: true, status: 'online', phone: '+254720556677', lastSeen: 'Just now', pin: '1234' }
];

let roster = [];

function loadRoster() {
  try {
    if (fs.existsSync(ROSTER_FILE)) {
      const content = fs.readFileSync(ROSTER_FILE, 'utf8');
      roster = JSON.parse(content);
    } else {
      roster = [...initialRoster];
      saveRoster();
    }
  } catch (e) {
    console.error('Error loading roster file:', e);
    roster = [...initialRoster];
  }
}

function saveRoster() {
  try {
    fs.writeFileSync(ROSTER_FILE, JSON.stringify(roster, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving roster file:', e);
  }
}

loadRoster();

// Alert History & Active Recipient Timelines
let alertHistory = [];
let activeRecipientsMap = new Map(); // alertId_recipientId -> timeline record

// SSE Real-Time Sync Clients
let sseClients = [];

function broadcastSse(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try { client.res.write(payload); } catch (e) {}
  });
}

// 2-Minute Escalation Check for unanswered urgent alerts
setInterval(() => {
  const now = Date.now();
  activeRecipientsMap.forEach((rec, key) => {
    if (rec.status === 'sent' && rec.priority === 'urgent' && !rec.escalated) {
      const elapsedMs = now - rec.sentTimestamp;
      if (elapsedMs >= 120000) { // 2 minutes
        rec.escalated = true;
        rec.status = 'escalated';
        
        const emp = roster.find(u => u.id === rec.recipientId);
        const hod = roster.find(u => u.department === emp?.department && u.isHod && u.id !== rec.recipientId);
        
        const escEvent = {
          type: 'ALERT_ESCALATED',
          alertId: rec.alertId,
          recipientId: rec.recipientId,
          recipientName: rec.recipientName,
          managerName: hod ? hod.name : 'Super Admin',
          elapsedMinutes: 2,
          timestamp: new Date().toISOString(),
        };

        broadcastSse(escEvent);
        console.log(`[ESCALATION ENGINE] Alert ${rec.alertId} for ${rec.recipientName} unanswered after 2 minutes. Escalated to ${escEvent.managerName}.`);
      }
    }
  });
}, 5000);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const cleanUrl = req.url.split('?')[0];

  // 1. SSE Realtime Event Stream
  if (cleanUrl === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    res.write(`data: ${JSON.stringify({ type: 'ROSTER_SYNC', roster, roles: ROLES })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
    return;
  }

  // 2. API: Get Roster & Roles
  if (cleanUrl === '/api/roster' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ roster, roles: ROLES }));
    return;
  }

  // 3. API: Register Account / Create User
  if (cleanUrl === '/api/registerUser' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.name || !data.department || !data.roleName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name, Role Title, and Department are required.' }));
          return;
        }

        const newUser = {
          id: `u_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          name: data.name.trim(),
          roleId: data.roleId || (data.isHod ? 'hod' : 'staff'),
          roleName: data.roleName.trim(),
          department: data.department.trim(),
          isHod: !!data.isHod,
          status: 'online',
          phone: data.phone ? data.phone.trim() : '+254700000000',
          lastSeen: 'Just now',
          pin: data.pin || '1234'
        };

        roster.push(newUser);
        saveRoster();

        broadcastSse({ type: 'ROSTER_SYNC', roster, roles: ROLES });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', user: newUser }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 4. API: Create Alert (Single, Multi, Department, ALL STAFF)
  if (cleanUrl === '/api/alerts/create' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const alertId = `alt_${Date.now()}`;
        const sentTime = new Date();

        let recipients = [];
        if (data.targetType === 'all_staff') {
          recipients = roster.filter(u => u.id !== data.senderId);
        } else if (data.targetType === 'department') {
          recipients = roster.filter(u => u.department === data.targetDepartment && u.id !== data.senderId);
        } else {
          // Resolve target recipients from recipientId, recipientIds, recipientName, or recipientNames
          const targetIds = new Set(Array.isArray(data.recipientIds) ? data.recipientIds : []);
          if (data.recipientId) targetIds.add(data.recipientId);

          const targetNames = new Set(Array.isArray(data.recipientNames) ? data.recipientNames.map(n => String(n).toLowerCase()) : []);
          if (data.recipientName) targetNames.add(String(data.recipientName).toLowerCase());

          recipients = roster.filter(u => {
            if (targetIds.has(u.id)) return true;
            if (u.name && targetNames.has(u.name.toLowerCase())) return true;
            return false;
          });

          // Fallback: if no match found by ID/name sets, search for single match by recipientId or recipientName
          if (recipients.length === 0 && (data.recipientId || data.recipientName)) {
            const single = roster.find(u => u.id === data.recipientId || (data.recipientName && u.name.toLowerCase() === data.recipientName.toLowerCase()));
            if (single) recipients.push(single);
          }
        }

        const alertRecord = {
          id: alertId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          location: data.location || "Office / Intercom",
          priority: data.priority || 'normal',
          reason: data.reason || 'Please check in.',
          targetType: data.targetType,
          targetDepartment: data.targetDepartment,
          recipientsCount: recipients.length,
          createdAt: sentTime.toISOString(),
          sentTimestamp: sentTime.getTime(),
          recipientsList: recipients.map(r => ({
            id: r.id,
            name: r.name,
            role: r.roleName,
            dept: r.department,
            userStatusAtSend: r.status,
            status: 'sent',
            deliveredAt: new Date(sentTime.getTime() + 500).toISOString(),
            acknowledgedAt: null,
            responseType: null,
            customReplyText: null,
            responseTimeSeconds: null,
          })),
        };

        alertHistory.unshift(alertRecord);

        // Map active online recipient timelines
        alertRecord.recipientsList.forEach(r => {
          if (r.status === 'sent') {
            activeRecipientsMap.set(`${alertId}_${r.id}`, {
              alertId,
              recipientId: r.id,
              recipientName: r.name,
              senderName: data.senderName,
              priority: data.priority || 'normal',
              status: 'sent',
              sentTimestamp: sentTime.getTime(),
              escalated: false,
            });
          }
        });

        // Broadcast ALERT_CREATED to all connected clients
        broadcastSse({
          type: 'ALERT_CREATED',
          alert: alertRecord,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', alertId, recipientsCount: recipients.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 5. API: Respond to Alert
  if (cleanUrl === '/api/alerts/respond' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { alertId, recipientId, responseType, customReplyText } = JSON.parse(body);
        const ackTime = new Date();

        const alertObj = alertHistory.find(a => a.id === alertId);
        let respSeconds = 0;
        let recipientObj = roster.find(u => u.id === recipientId);

        let recItem = null;
        if (alertObj) {
          recItem = alertObj.recipientsList.find(r => r.id === recipientId || (recipientObj && r.name === recipientObj.name));
          if (!recItem && alertObj.recipientsList.length > 0) {
            recItem = alertObj.recipientsList[0];
          }
          if (recItem) {
            respSeconds = Math.max(1, Math.round((ackTime.getTime() - alertObj.sentTimestamp) / 1000));
            recItem.status = 'acknowledged';
            recItem.acknowledgedAt = ackTime.toISOString();
            recItem.responseType = responseType;
            recItem.customReplyText = customReplyText || null;
            recItem.responseTimeSeconds = respSeconds;
          }
        }

        activeRecipientsMap.delete(`${alertId}_${recipientId}`);

        const respEvent = {
          type: 'ALERT_RESPONSE',
          alertId,
          recipientId,
          recipientName: recItem ? recItem.name : (recipientObj ? recipientObj.name : 'Staff Member'),
          senderId: alertObj ? alertObj.senderId : null,
          senderName: alertObj ? alertObj.senderName : null,
          responseType,
          customReplyText: customReplyText || null,
          responseTimeSeconds: respSeconds,
          timestamp: ackTime.toISOString(),
        };

        broadcastSse(respEvent);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', responseTimeSeconds: respSeconds }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 6. API: Get Alert History
  if (cleanUrl === '/api/alerts/history' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ history: alertHistory }));
    return;
  }

  // 7. API: Update Employee Status (online, busy, offline)
  if (cleanUrl === '/api/updateStatus' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { employeeId, status } = JSON.parse(body);
        const emp = roster.find(p => p.id === employeeId);
        if (emp) {
          emp.status = status; // 'online' | 'busy' | 'offline'
          emp.lastSeen = status === 'online' ? 'Just now' : (status === 'busy' ? 'Busy' : 'Offline');
          saveRoster();
          broadcastSse({ type: 'ROSTER_SYNC', roster, roles: ROLES });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', employeeId, newStatus: status }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Employee not found' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 8. API: Bulk Upload Roster
  if (cleanUrl === '/api/uploadRoster' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (Array.isArray(data.roster)) {
          roster = data.roster;
          saveRoster();
          broadcastSse({ type: 'ROSTER_SYNC', roster, roles: ROLES });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', count: roster.length }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid roster array' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 9. API: Clear all mock data (Wipe roster & history clean)
  if (cleanUrl === '/api/clearData' && req.method === 'POST') {
    roster = [];
    alertHistory = [];
    activeRecipientsMap.clear();
    saveRoster();
    broadcastSse({ type: 'ROSTER_SYNC', roster: [], roles: ROLES });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'All mock data erased successfully.' }));
    return;
  }

  // Static File Server
  let filePath = path.join(PUBLIC_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
  let ext = path.extname(filePath).toLowerCase();
  let contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`HODI Enterprise Intercom & Alert System running at http://localhost:${PORT}/`);
});
