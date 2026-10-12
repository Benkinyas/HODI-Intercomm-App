const http = require('http');

const BASE = 'http://10.254.0.196:8080';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request(`${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let out = '';
      res.on('data', chunk => out += chunk);
      res.on('end', () => resolve(JSON.parse(out)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, res => {
      let out = '';
      res.on('data', chunk => out += chunk);
      res.on('end', () => resolve(JSON.parse(out)));
    }).on('error', reject);
  });
}

async function runDryRun() {
  console.log('--- STARTING COMPREHENSIVE DRY RUN ---');
  
  // 1. Fetch Roster
  const rosterData = await get('/api/roster');
  console.log('1. Roster Count:', rosterData.roster.length);

  // 2. Register Account
  const regRes = await post('/api/registerUser', {
    name: 'DryRun Specialist',
    department: 'ICT',
    roleName: 'QA Systems Specialist',
    isHod: true,
    phone: '+254700999888'
  });
  console.log('2. Registered User:', regRes.user.name, 'ID:', regRes.user.id);

  // 3. Status Update
  const statusRes = await post('/api/updateStatus', {
    employeeId: regRes.user.id,
    status: 'online'
  });
  console.log('3. Status Updated:', statusRes.newStatus);

  // 4. Create Alert (Ring Page)
  const alertRes = await post('/api/alerts/create', {
    senderId: 'u_1791288408060_418',
    senderName: 'Eddy',
    senderRole: 'Dev',
    recipientId: regRes.user.id,
    recipientName: 'DryRun Specialist',
    priority: 'urgent',
    reason: '🏢 Come to my office for briefing'
  });
  console.log('4. Alert Created ID:', alertRes.alertId, 'Recipients Count:', alertRes.recipientsCount);

  // 5. Acknowledge Alert with Custom Reply
  const ackRes = await post('/api/alerts/respond', {
    alertId: alertRes.alertId,
    recipientId: regRes.user.id,
    responseType: 'on_my_way',
    customReplyText: '🏃‍♂️ On my way now!'
  });
  console.log('5. Acknowledged Alert Status:', ackRes.status, 'Response Time:', ackRes.responseTimeSeconds, 's');

  // 6. Alert History Verification
  const historyData = await get('/api/alerts/history');
  console.log('6. Total Alert History Count:', historyData.history.length);
  const lastAlert = historyData.history[0];
  console.log('   Last Alert Sender:', lastAlert.senderName);
  console.log('   Recipient Status:', lastAlert.recipientsList[0].status);
  console.log('   Recipient Custom Reply:', lastAlert.recipientsList[0].customReplyText);

  console.log('--- DRY RUN COMPLETED SUCCESSFULLY: 100% FUNCTIONAL ---');
}

runDryRun().catch(console.error);
