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

// Initial Default Roster (Production Starter)
const initialRoster = [
  { id: 'u1', name: 'Benson Admin', roleId: 'super_admin', roleName: 'ICT Director & Lead Engineer', department: 'Development', isHod: true, status: 'online', phone: '+254712345678', email: 'benson@hodi.com', lastSeen: 'Just now', pin: '1234' }
];

let roster = [];
let alertHistory = [];
const sseClients = new Set();
const activeRecipientsMap = new Map();

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

function broadcastSse(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => {
    try {
      res.write(payload);
    } catch (e) {
      sseClients.delete(res);
    }
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const cleanUrl = req.url.split('?')[0];

  // 1. SSE Stream
  if (cleanUrl === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write('retry: 3000\n\n');
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', roster, roles: ROLES })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. API: Get Roster
  if (cleanUrl === '/api/roster' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ roster, roles: ROLES }));
    return;
  }

  // 3. API: Register / Add Staff Member
  if ((cleanUrl === '/api/register' || cleanUrl === '/api/roster') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newUser = JSON.parse(body);
        if (!newUser.name) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Name is required' }));
        }
        if (!newUser.id) newUser.id = 'u_' + Date.now();
        if (!newUser.status) newUser.status = 'online';
        if (newUser.isHod === undefined) newUser.isHod = false;
        if (!newUser.roleId) newUser.roleId = newUser.isHod ? 'hod' : 'staff';
        if (!newUser.roleName) newUser.roleName = newUser.roleTitle || (newUser.isHod ? 'Department Manager (HOD)' : 'Staff Specialist');
        if (!newUser.department) newUser.department = 'Development';

        const existingIdx = roster.findIndex(u => u.id === newUser.id || (u.email && newUser.email && u.email === newUser.email));
        if (existingIdx >= 0) {
          roster[existingIdx] = { ...roster[existingIdx], ...newUser };
        } else {
          roster.push(newUser);
        }

        saveRoster();
        broadcastSse({ type: 'ROSTER_SYNC', roster, roles: ROLES });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', user: newUser, rosterCount: roster.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 4. API: Create Alert / Ring Page
  if (cleanUrl === '/api/alerts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const alertId = 'alert_' + Date.now();
        const sentTime = new Date();

        let recipients = [];
        if (data.targetType === 'all') {
          recipients = [...roster];
        } else if (data.targetType === 'dept' && data.targetDepartment) {
          recipients = roster.filter(u => u.department === data.targetDepartment);
        } else if (data.targetType === 'hods') {
          recipients = roster.filter(u => u.isHod);
        } else if (data.targetType === 'multi' && Array.isArray(data.recipientIds)) {
          recipients = roster.filter(u => data.recipientIds.includes(u.id));
        } else if (data.recipientId) {
          const single = roster.find(u => u.id === data.recipientId || u.name === data.recipientName);
          if (single) {
            recipients.push(single);
          } else if (data.recipientName) {
            recipients.push({ id: data.recipientId, name: data.recipientName, roleName: 'Staff', department: 'General', status: 'online' });
          }
        }

        const alertRecord = {
          id: alertId,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          location: data.location || "Office Intercom",
          priority: data.priority || 'normal',
          reason: data.reason || 'Urgent Page',
          targetType: data.targetType || 'single',
          recipientsCount: recipients.length,
          createdAt: sentTime.toISOString(),
          sentTimestamp: sentTime.getTime(),
          recipientsList: recipients.map(r => ({
            id: r.id,
            name: r.name,
            role: r.roleName,
            dept: r.department,
            status: 'sent',
            deliveredAt: sentTime.toISOString(),
            acknowledgedAt: null,
            responseType: null,
            customReplyText: null,
            responseTimeSeconds: null,
          })),
        };

        alertHistory.unshift(alertRecord);

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

  // 5. API: Respond to Alert / Acknowledge Page
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

        if (alertObj) {
          const recItem = alertObj.recipientsList.find(r => r.id === recipientId);
          if (recItem) {
            respSeconds = Math.max(1, Math.round((ackTime.getTime() - alertObj.sentTimestamp) / 1000));
            recItem.status = 'acknowledged';
            recItem.acknowledgedAt = ackTime.toISOString();
            recItem.responseType = responseType;
            recItem.customReplyText = customReplyText || null;
            recItem.responseTimeSeconds = respSeconds;
          }
        }

        const respEvent = {
          type: 'ALERT_RESPONSE',
          alertId,
          recipientId,
          recipientName: recipientObj ? recipientObj.name : 'Staff Member',
          senderId: alertObj ? alertObj.senderId : null,
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

  // 6. API: Get Alert History / Live Ring Log
  if ((cleanUrl === '/api/alerts/history' || cleanUrl === '/api/history') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ history: alertHistory }));
    return;
  }

  // 7. API: Update Employee Status
  if (cleanUrl === '/api/updateStatus' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { employeeId, status } = JSON.parse(body);
        const emp = roster.find(p => p.id === employeeId);
        if (emp) {
          emp.status = status;
          emp.lastSeen = status === 'online' ? 'Just now' : 'Busy';
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

  // 8. API: Clear all mock data
  if (cleanUrl === '/api/clearData' && req.method === 'POST') {
    roster = [...initialRoster];
    alertHistory = [];
    saveRoster();
    broadcastSse({ type: 'ROSTER_SYNC', roster, roles: ROLES });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'All mock data cleared.' }));
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
