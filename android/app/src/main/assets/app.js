document.addEventListener('DOMContentLoaded', () => {
  // Web Audio Synth for High-Volume Alarm Ringtone & Outgoing Ringback Tone
  let audioCtx = null;
  let alarmInterval = null;
  let senderRingbackInterval = null;
  let isSoundEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Global user interaction listener to unlock AudioContext on browser interaction
  document.addEventListener('click', () => initAudio(), { once: false });
  document.addEventListener('touchstart', () => initAudio(), { once: false });

  // 1. Recipient High-Volume Alarm Ringtone Synthesizer
  function playHighVolumeRingtone(priority = 'normal') {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (priority === 'urgent') {
        osc1.type = 'sawtooth';
        osc2.type = 'square';

        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.35);

        osc2.frequency.setValueAtTime(440, now);
        osc2.frequency.exponentialRampToValueAtTime(880, now + 0.35);

        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      } else if (priority === 'important') {
        osc1.type = 'square';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(659.25, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.25);

        osc2.frequency.setValueAtTime(329.63, now);
        osc2.frequency.exponentialRampToValueAtTime(440, now + 0.25);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      } else {
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.2);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      }

      osc1.connect(gain);
      if (priority === 'urgent' || priority === 'important') {
        osc2.connect(gain);
      }
      gain.connect(audioCtx.destination);

      osc1.start(now);
      if (priority === 'urgent' || priority === 'important') osc2.start(now);

      osc1.stop(now + 0.5);
      if (priority === 'urgent' || priority === 'important') osc2.stop(now + 0.5);

      if (navigator.vibrate) {
        navigator.vibrate(priority === 'urgent' ? [600, 200, 600, 200, 1000] : [300, 150, 300]);
      }
    } catch (e) {
      console.warn('Audio play warning:', e);
    }
  }

  // 2. Sender Outgoing Ring-Back Sound Generator (Plays when ringing someone else!)
  function playSenderRingbackTone() {
    if (!isSoundEnabled) return;
    try {
      initAudio();
      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // Standard telephone ringback tone (440Hz + 480Hz)
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Ringback audio error:', e);
    }
  }

  function startAlarmLoop(priority = 'normal') {
    stopAlarmLoop();
    playHighVolumeRingtone(priority);
    alarmInterval = setInterval(() => {
      playHighVolumeRingtone(priority);
    }, priority === 'urgent' ? 800 : (priority === 'important' ? 1400 : 2500));
  }

  function stopAlarmLoop() {
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
    if (window.HodiNative && window.HodiNative.stopNativeRingtone) {
      try { window.HodiNative.stopNativeRingtone(); } catch (e) {}
    }
  }

  function startSenderRingbackLoop() {
    stopSenderRingbackLoop();
    playSenderRingbackTone();
    senderRingbackInterval = setInterval(() => {
      playSenderRingbackTone();
    }, 2500);

    setTimeout(() => {
      stopSenderRingbackLoop();
    }, 15000);
  }

  function stopSenderRingbackLoop() {
    if (senderRingbackInterval) {
      clearInterval(senderRingbackInterval);
      senderRingbackInterval = null;
    }
  }

  // GLOBAL STATE
  let roster = [];
  let roles = {};
  let currentUserId = null;
  let activeIncomingAlert = null;
  let selectedRecipientIds = new Set();
  let historyData = [];

  // SERVER BASE URL RESOLVER
  const SERVER_URL_KEY = 'hodi_server_url';
  let serverBaseUrl = localStorage.getItem(SERVER_URL_KEY) || 'http://10.254.0.196:8080';

  function getApiUrl(endpoint) {
    if (window.location.protocol !== 'file:') return endpoint;
    return serverBaseUrl.replace(/\/$/, '') + endpoint;
  }

  function loadOfflineRoster() {
    try {
      const saved = localStorage.getItem('hodi_offline_roster');
      if (saved) roster = JSON.parse(saved);
    } catch (e) { roster = []; }
  }

  function saveOfflineRoster() {
    try {
      localStorage.setItem('hodi_offline_roster', JSON.stringify(roster));
    } catch (e) { console.error('Failed to save offline roster', e); }
  }

  // DOM ELEMENTS
  const authModal = document.getElementById('authModal');
  const authTabRegister = document.getElementById('authTabRegister');
  const authTabLogin = document.getElementById('authTabLogin');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  const loginSelectUser = document.getElementById('loginSelectUser');
  const btnLoginAccount = document.getElementById('btnLoginAccount');

  const hdrUserAvatar = document.getElementById('hdrUserAvatar');
  const hdrUserName = document.getElementById('hdrUserName');
  const myStatusSelect = document.getElementById('myStatusSelect');
  const btnSwitchAccount = document.getElementById('btnSwitchAccount');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const qrBtn = document.getElementById('qrBtn');
  const qrModal = document.getElementById('qrModal');
  const closeQrModalBtn = document.getElementById('closeQrModalBtn');
  const closeQrBtn = document.getElementById('closeQrBtn');

  const unifiedSearchInput = document.getElementById('unifiedSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const btnRingMultiSelected = document.getElementById('btnRingMultiSelected');
  const multiSelectCountText = document.getElementById('multiSelectCountText');

  const staffDirectoryList = document.getElementById('staffDirectoryList');
  const departmentsAccordionList = document.getElementById('departmentsAccordionList');
  const hodsList = document.getElementById('hodsList');

  const countDirectory = document.getElementById('countDirectory');
  const countDepartments = document.getElementById('countDepartments');
  const countHODs = document.getElementById('countHODs');

  const liveMonitorGrid = document.getElementById('liveMonitorGrid');
  const historyTableBody = document.getElementById('historyTableBody');
  const toastContainer = document.getElementById('toastContainer');

  // MODALS
  const ringModal = document.getElementById('ringModal');
  const closeRingModalBtn = document.getElementById('closeRingModalBtn');
  const cancelRingBtn = document.getElementById('cancelRingBtn');
  const ringComposerForm = document.getElementById('ringComposerForm');
  const ringTargetSubtitle = document.getElementById('ringTargetSubtitle');
  const customMessageText = document.getElementById('customMessageText');
  const ringLocation = document.getElementById('ringLocation');

  const incomingRingOverlay = document.getElementById('incomingRingOverlay');
  const incomingCardTheme = document.getElementById('incomingCardTheme');
  const incomingPriorityTitle = document.getElementById('incomingPriorityTitle');
  const incomingPriorityIcon = document.getElementById('incomingPriorityIcon');
  const incCallerAvatar = document.getElementById('incCallerAvatar');
  const incCallerName = document.getElementById('incCallerName');
  const incCallerRole = document.getElementById('incCallerRole');
  const incMessageText = document.getElementById('incMessageText');
  const ackResponseForm = document.getElementById('ackResponseForm');
  const incCustomReplyText = document.getElementById('incCustomReplyText');

  if (qrBtn) qrBtn.addEventListener('click', () => qrModal.classList.remove('hidden'));
  if (closeQrModalBtn) closeQrModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
  if (closeQrBtn) closeQrBtn.addEventListener('click', () => qrModal.classList.add('hidden'));

  // PRIORITY CHIPS SELECTION HANDLER
  document.querySelectorAll('.priority-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.priority-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const radio = chip.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
      }
    });
  });

  // QUICK TEMPLATE CHIPS SELECTION HANDLER
  document.querySelectorAll('.template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.template-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const text = chip.getAttribute('data-text');
      if (text && customMessageText) {
        customMessageText.value = text;
      }
    });
  });

  // REALTIME SERVER EVENTS (SSE + API FETCH)
  let evtSource = null;
  function initServerConnection() {
    try {
      if (evtSource) evtSource.close();
      evtSource = new EventSource(getApiUrl('/api/events'));
      evtSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROSTER_SYNC') {
            roster = data.roster || [];
            roles = data.roles || {};
            saveOfflineRoster();
            checkAndSyncActiveUser();
            renderAllViews();
          } else if (data.type === 'ALERT_CREATED') {
            handleIncomingAlertCreated(data.alert);
          } else if (data.type === 'ALERT_RESPONSE') {
            handleIncomingAlertResponse(data);
          } else if (data.type === 'ALERT_ESCALATED') {
            showToast(`🚨 ALERT ESCALATED: ${data.recipientName} did not respond after 2 mins. Escalated to ${data.managerName}.`, 'warning');
            fetchAlertHistory();
          }
        } catch (e) {
          console.error('SSE JSON Error:', e);
        }
      };
    } catch (e) {}

    // FETCH INITIAL DATA FROM SERVER
    fetch(getApiUrl('/api/roster'))
      .then(r => r.json())
      .then(data => {
        if (data && data.roster) {
          roster = data.roster || [];
          roles = data.roles || {};
          saveOfflineRoster();
          checkAndSyncActiveUser();
          renderAllViews();
        }
      })
      .catch(() => {
        loadOfflineRoster();
        checkAndSyncActiveUser();
        renderAllViews();
      });
  }

  initServerConnection();
  fetchAlertHistory();
  setInterval(fetchAlertHistory, 2500);

  // PERSISTENT AUTH (WHATSAPP STYLE)
  function checkAndSyncActiveUser() {
    const savedUserId = localStorage.getItem('hodi_active_user');
    if (savedUserId && roster.some(u => u.id === savedUserId)) {
      currentUserId = savedUserId;
      authModal.classList.add('hidden');
    } else if (roster.length > 0) {
      currentUserId = roster[0].id;
      localStorage.setItem('hodi_active_user', currentUserId);
      authModal.classList.add('hidden');
    } else {
      authModal.classList.remove('hidden');
    }
    updateHeaderProfileUI();

    if (window.HodiNative && window.HodiNative.syncActiveUser && currentUserId) {
      const u = roster.find(x => x.id === currentUserId);
      try {
        window.HodiNative.syncActiveUser(currentUserId, u ? u.name : '');
      } catch (e) {}
    }
  }

  function updateHeaderProfileUI() {
    const currentUser = roster.find(u => u.id === currentUserId);
    if (currentUser) {
      hdrUserAvatar.innerText = (currentUser.name[0] || 'U').toUpperCase();
      hdrUserName.innerText = currentUser.name;
      myStatusSelect.value = currentUser.status || 'online';
    }
  }

  // AUTH TABS & REGISTRATION
  authTabRegister.addEventListener('click', () => {
    authTabRegister.classList.add('active');
    authTabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  authTabLogin.addEventListener('click', () => {
    authTabLogin.classList.add('active');
    authTabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    populateLoginUserDropdown();
  });

  function populateLoginUserDropdown() {
    if (roster.length === 0) {
      loadOfflineRoster();
    }
    loginSelectUser.innerHTML = '';
    if (roster.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.text = 'No accounts yet — please create one first';
      opt.disabled = true;
      opt.selected = true;
      loginSelectUser.appendChild(opt);
      return;
    }
    roster.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.id;
      opt.text = `${u.name} (${u.roleName} - ${u.department})`;
      if (u.id === currentUserId) opt.selected = true;
      loginSelectUser.appendChild(opt);
    });
  }

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const dept = document.getElementById('regDept').value;
    const roleName = document.getElementById('regRoleName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const roleId = document.getElementById('regRoleId').value;
    const isHod = document.getElementById('regIsHod').checked;

    if (!name) { showToast('Please enter your full name.', 'warning'); return; }
    if (!roleName) { showToast('Please enter your job title.', 'warning'); return; }

    const payload = { name, department: dept, roleName, phone: phone || '+254700000000', roleId, isHod };

    fetch(getApiUrl('/api/registerUser'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(r => r.json())
    .then(data => {
      if (data && data.user) {
        currentUserId = data.user.id;
        localStorage.setItem('hodi_active_user', currentUserId);
        authModal.classList.add('hidden');
        showToast(`🎉 Welcome ${data.user.name}! Your account is active on server.`, 'success');
        initServerConnection();
      } else {
        throw new Error('Registration failed');
      }
    })
    .catch(err => {
      // Offline fallback
      const newUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: name,
        department: dept,
        roleName: roleName,
        phone: phone || '+254700000000',
        roleId: roleId,
        isHod: isHod,
        status: 'online'
      };
      roster.push(newUser);
      saveOfflineRoster();
      currentUserId = newUser.id;
      localStorage.setItem('hodi_active_user', currentUserId);
      authModal.classList.add('hidden');
      showToast(`🎉 Welcome ${newUser.name}! Your account is active (offline).`, 'info');
      updateHeaderProfileUI();
      renderAllViews();
    });
  });

  btnLoginAccount.addEventListener('click', () => {
    const selectedId = loginSelectUser.value;
    if (selectedId) {
      currentUserId = selectedId;
      localStorage.setItem('hodi_active_user', currentUserId);
      authModal.classList.add('hidden');
      updateHeaderProfileUI();
      renderAllViews();
      showToast(`🔑 Logged in as ${roster.find(u => u.id === currentUserId)?.name}`, 'info');
    } else {
      showToast('No account selected. Please create an account first.', 'warning');
    }
  });

  btnSwitchAccount.addEventListener('click', () => {
    populateLoginUserDropdown();
    authTabLogin.click();
    authModal.classList.remove('hidden');
  });

  // MY STATUS CHANGE (online, busy, offline)
  myStatusSelect.addEventListener('change', (e) => {
    const newStatus = e.target.value;
    fetch('/api/updateStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: currentUserId, status: newStatus }),
    })
    .then(r => r.json())
    .then(() => {
      const u = roster.find(p => p.id === currentUserId);
      if (u) u.status = newStatus;
      showToast(`Status updated to ${newStatus}`, 'info');
      renderAllViews();
    })
    .catch(console.error);
  });

  // MAIN NAV PILL SWITCHING
  document.querySelectorAll('.nav-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden');
      });

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const activeTab = document.getElementById(tabId);
      if (activeTab) {
        activeTab.classList.remove('hidden');
        activeTab.classList.add('active');
      }

      if (tabId === 'historyTab' || tabId === 'liveMonitorTab') fetchAlertHistory();
      renderAllViews();
    });
  });

  // COLUMN VIEW SWITCHER (SELECTABLE VIEW MODE: DIRECTORY / DEPARTMENTS / HODs)
  document.querySelectorAll('.col-switch-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.col-switch-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetPaneId = btn.getAttribute('data-col');
      document.querySelectorAll('.column-view-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.classList.add('hidden');
      });

      const activePane = document.getElementById(targetPaneId);
      if (activePane) {
        activePane.classList.remove('hidden');
        activePane.classList.add('active');
      }
    });
  });

  // SEARCH FILTERING
  unifiedSearchInput.addEventListener('input', () => {
    const val = unifiedSearchInput.value.trim();
    if (val) clearSearchBtn.classList.remove('hidden');
    else clearSearchBtn.classList.add('hidden');
    renderAllColumns();
  });

  clearSearchBtn.addEventListener('click', () => {
    unifiedSearchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    renderAllColumns();
  });

  // RENDER ALL VIEWS
  function renderAllViews() {
    updateHeaderProfileUI();
    renderAllColumns();
    renderLiveMonitor();
  }

  function renderAllColumns() {
    const query = (unifiedSearchInput.value || '').toLowerCase();

    // Filter staff
    const filteredRoster = roster.filter(u => {
      return !query || 
        u.name.toLowerCase().includes(query) || 
        u.roleName.toLowerCase().includes(query) || 
        u.department.toLowerCase().includes(query);
    });

    // 1. Staff Directory Column
    staffDirectoryList.innerHTML = '';
    countDirectory.innerText = filteredRoster.length;

    filteredRoster.forEach(u => {
      staffDirectoryList.appendChild(createStaffItemCard(u));
    });

    // 2. Departments Column
    departmentsAccordionList.innerHTML = '';
    const deptMap = new Map();
    filteredRoster.forEach(u => {
      if (!deptMap.has(u.department)) deptMap.set(u.department, []);
      deptMap.get(u.department).push(u);
    });

    countDepartments.innerText = deptMap.size;

    deptMap.forEach((staffList, deptName) => {
      const deptCard = document.createElement('div');
      deptCard.className = 'dept-group-card';
      deptCard.innerHTML = `
        <div class="dept-group-header">
          <span>🏢 ${deptName} Department</span>
          <span style="font-size:11px;color:var(--text-secondary);">${staffList.length} staff</span>
        </div>
        <div class="dept-group-body"></div>
      `;

      departmentsAccordionList.appendChild(deptCard);
      const bodyEl = deptCard.querySelector('.dept-group-body');
      staffList.forEach(u => {
        bodyEl.appendChild(createStaffItemCard(u));
      });
    });

    // 3. HODs Column
    hodsList.innerHTML = '';
    const hodsOnly = filteredRoster.filter(u => u.isHod || u.roleId === 'hod' || u.roleId === 'ceo' || u.roleId === 'super_admin');
    countHODs.innerText = hodsOnly.length;

    hodsOnly.forEach(u => {
      hodsList.appendChild(createStaffItemCard(u));
    });

    updateMultiSelectBar();
  }

  // Create Staff Card Element with Clean Status Badges
  function createStaffItemCard(user) {
    const item = document.createElement('div');
    const isSelf = user.id === currentUserId;
    const isBusyOrOffline = user.status === 'busy' || user.status === 'offline';

    item.className = `staff-item-card ${isBusyOrOffline ? 'disabled-ring' : ''}`;

    const isChecked = selectedRecipientIds.has(user.id);

    let statusBadgeHtml = '';
    if (user.status === 'online') {
      statusBadgeHtml = `<span class="staff-status-badge online"><span class="status-dot-sm online"></span> online</span>`;
    } else if (user.status === 'busy') {
      statusBadgeHtml = `<span class="staff-status-badge busy"><span class="status-dot-sm busy"></span> busy</span>`;
    } else {
      statusBadgeHtml = `<span class="staff-status-badge offline"><span class="status-dot-sm offline"></span> offline</span>`;
    }

    item.innerHTML = `
      <div class="staff-left-info">
        ${!isSelf ? `<input type="checkbox" class="staff-checkbox" data-userid="${user.id}" ${isChecked ? 'checked' : ''}>` : ''}
        <div class="staff-item-avatar">${(user.name[0] || 'U').toUpperCase()}</div>
        <div class="staff-details-box">
          <div class="staff-item-name">
            ${user.name}
            ${user.isHod ? '<span class="hod-crown" title="Department Head">👑</span>' : ''}
            ${isSelf ? '<small style="color:var(--brand-light);">(You)</small>' : ''}
          </div>
          <div class="staff-item-role">${user.roleName} • ${user.department}</div>
        </div>
      </div>
      <div>
        ${statusBadgeHtml}
      </div>
    `;

    // Checkbox click
    const cb = item.querySelector('.staff-checkbox');
    if (cb) {
      cb.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cb.checked) selectedRecipientIds.add(user.id);
        else selectedRecipientIds.delete(user.id);
        updateMultiSelectBar();
      });
    }

    // Card tap to ring
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('staff-checkbox')) return;
      if (isSelf) return;

      if (user.status === 'busy' || user.status === 'offline') {
        showToast(`⚠️ ${user.name} is currently ${user.status} and cannot be paged.`, 'warning');
        return;
      }

      openRingModalForTargets([user.id]);
    });

    return item;
  }

  function updateMultiSelectBar() {
    const count = selectedRecipientIds.size;
    if (multiSelectCountText) multiSelectCountText.innerText = `${count} selected`;
    btnRingMultiSelected.disabled = count === 0;
  }

  btnRingMultiSelected.addEventListener('click', () => {
    if (selectedRecipientIds.size > 0) {
      openRingModalForTargets(Array.from(selectedRecipientIds));
    }
  });

  // RING COMPOSER MODAL & QUICK TEMPLATE SELECTION
  let currentModalTargetIds = [];

  function openRingModalForTargets(targetIds) {
    currentModalTargetIds = targetIds;
    const targetNames = roster.filter(u => targetIds.includes(u.id)).map(u => u.name).join(', ');

    ringTargetSubtitle.innerHTML = `Ringing: <strong>${targetNames}</strong>`;
    
    // Reset priority chip selection visual state to Normal
    document.querySelectorAll('.priority-chip').forEach(c => c.classList.remove('active'));
    const defaultPriorityChip = document.querySelector('.priority-chip.priority-normal');
    if (defaultPriorityChip) {
      defaultPriorityChip.classList.add('active');
      const rad = defaultPriorityChip.querySelector('input[type="radio"]');
      if (rad) rad.checked = true;
    }

    ringModal.classList.remove('hidden');
  }

  closeRingModalBtn.addEventListener('click', () => ringModal.classList.add('hidden'));
  cancelRingBtn.addEventListener('click', () => ringModal.classList.add('hidden'));

  // Submit Ring Form
  ringComposerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (currentModalTargetIds.length === 0) return;

    initAudio();
    const message = customMessageText.value.trim();
    const checkedRadio = document.querySelector('input[name="ringPriority"]:checked');
    const priority = checkedRadio ? checkedRadio.value : 'normal';
    const location = ringLocation.value.trim() || 'Office';

    const sender = roster.find(u => u.id === currentUserId) || { name: 'Admin', roleName: 'Manager' };

    startSenderRingbackLoop();

    fetch(getApiUrl('/api/alerts/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: currentUserId,
        senderName: sender.name,
        senderRole: sender.roleName,
        recipientIds: currentModalTargetIds,
        targetType: currentModalTargetIds.length === 1 ? 'single' : 'multi',
        recipientId: currentModalTargetIds[0],
        priority: priority,
        location: location,
        reason: message,
      }),
    })
    .then(r => r.json())
    .then(data => {
      ringModal.classList.add('hidden');
      selectedRecipientIds.clear();
      updateMultiSelectBar();
      showToast(`🔔 ${priority.toUpperCase()} Ring page sent to ${data.recipientsCount} staff member(s)!`, 'success');
      document.querySelector('[data-tab="liveMonitorTab"]').click();
    })
    .catch(console.error);
  });

  // INCOMING RING DELIVERED TO RECIPIENT
  function handleIncomingAlertCreated(alertObj) {
    const user = roster.find(u => u.id === currentUserId);
    if (!user || alertObj.senderId === currentUserId || (alertObj.senderName && user.name && alertObj.senderName.toLowerCase() === user.name.toLowerCase())) return;

    const isRecipient = alertObj.recipientsList.some(r => r.id === currentUserId || (user && r.name && r.name.toLowerCase() === user.name.toLowerCase()));
    if (!isRecipient) return;

    activeIncomingAlert = alertObj;

    incCallerAvatar.innerText = (alertObj.senderName[0] || 'A').toUpperCase();
    incCallerName.innerText = alertObj.senderName;
    incCallerRole.innerText = `${alertObj.senderRole} • ${alertObj.location}`;
    incMessageText.innerText = `"${alertObj.reason}"`;

    incomingCardTheme.className = `incoming-ring-card glass-panel theme-${alertObj.priority}`;
    incomingPriorityTitle.innerText = `INCOMING ${alertObj.priority.toUpperCase()} PAGE`;
    incomingPriorityIcon.innerText = alertObj.priority === 'urgent' ? '🚨' : (alertObj.priority === 'important' ? '⚠️' : 'ℹ️');

    incomingRingOverlay.classList.remove('hidden');
    startAlarmLoop(alertObj.priority);

    fetchAlertHistory();
  }

  // Preset choices click handler inside recipient overlay
  document.querySelectorAll('.ack-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ack-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Recipient Acknowledge Form Submission
  ackResponseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!activeIncomingAlert) return;

    const activePreset = document.querySelector('.ack-preset-btn.active')?.getAttribute('data-preset') || 'on_my_way';
    const customReply = incCustomReplyText.value.trim();

    stopAlarmLoop();
    incomingRingOverlay.classList.add('hidden');

    fetch(getApiUrl('/api/alerts/respond'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: activeIncomingAlert.id,
        recipientId: currentUserId,
        responseType: activePreset,
        customReplyText: customReply,
      }),
    })
    .then(r => r.json())
    .then(() => {
      showToast('✅ Acknowledgement sent to sender!', 'success');
      activeIncomingAlert = null;
      incCustomReplyText.value = '';
    })
    .catch(console.error);
  });

  const toastedAckKeys = new Set();
  function checkNewAckToasts(history) {
    const currentUser = roster.find(u => u.id === currentUserId);
    if (!history || !Array.isArray(history)) return;

    history.forEach(alt => {
      const isSender = alt.senderId === currentUserId ||
                       (currentUser && alt.senderName === currentUser.name);
      if (isSender && alt.recipientsList) {
        alt.recipientsList.forEach(rec => {
          if (rec.status === 'acknowledged' && rec.acknowledgedAt) {
            const key = `${alt.id}_${rec.id}_${rec.acknowledgedAt}`;
            if (!toastedAckKeys.has(key)) {
              toastedAckKeys.add(key);
              const ackTime = new Date(rec.acknowledgedAt).getTime();
              if (Date.now() - ackTime < 120000) {
                stopSenderRingbackLoop();
                stopAlarmLoop();
                let presetText = rec.responseType || "Acknowledged";
                if (rec.responseType === 'on_my_way') presetText = "🏃‍♂️ I'm on my way";
                else if (rec.responseType === 'in_meeting') presetText = "💼 I'm in a meeting";
                else if (rec.responseType === 'calling_you') presetText = "📞 I'm calling you";

                let msg = `🟢 ${rec.name} acknowledged! (${presetText})`;
                if (rec.customReplyText) msg += ` – Reply: "${rec.customReplyText}"`;
                showToast(msg, 'success');
              }
            }
          }
        });
      }
    });
  }

  // IMMEDIATE SENDER FEEDBACK ON ACKNOWLEDGEMENT
  function handleIncomingAlertResponse(data) {
    stopAlarmLoop();
    stopSenderRingbackLoop();
    fetchAlertHistory();

    const currentUser = roster.find(u => u.id === currentUserId);
    const isSender = data.senderId === currentUserId ||
                     (currentUser && data.senderName === currentUser.name) ||
                     !data.senderId;

    if (isSender) {
      let presetText = data.responseType || "Acknowledged";
      if (data.responseType === 'on_my_way') presetText = "🏃‍♂️ I'm on my way";
      else if (data.responseType === 'in_meeting') presetText = "💼 I'm in a meeting";
      else if (data.responseType === 'calling_you') presetText = "📞 I'm calling you";

      let msg = `🟢 ${data.recipientName} acknowledged! (${presetText})`;
      if (data.customReplyText) {
        msg += ` – Reply: "${data.customReplyText}"`;
      }

      showToast(msg, 'success');
    }
  }

  // FETCH ALERT HISTORY & RENDER LIVE MONITOR
  function fetchAlertHistory() {
    fetch(getApiUrl('/api/alerts/history'))
      .then(r => r.json())
      .then(data => {
        historyData = data.history || [];
        if (activeIncomingAlert) {
          const fresh = historyData.find(a => a.id === activeIncomingAlert.id);
          const user = roster.find(u => u.id === currentUserId);
          if (fresh) {
            const myRecItem = fresh.recipientsList ? fresh.recipientsList.find(r => r.id === currentUserId || (user && r.name === user.name)) : null;
            if (myRecItem && myRecItem.status === 'acknowledged') {
              activeIncomingAlert = null;
              stopAlarmLoop();
              incomingRingOverlay.classList.add('hidden');
            }
          }
        } else {
          // Check if there is an unacknowledged incoming alert targeted at current user!
          const user = roster.find(u => u.id === currentUserId);
          if (user) {
            const unackedAlert = historyData.find(alt => {
              if (alt.senderId === currentUserId || (alt.senderName && alt.senderName.toLowerCase() === user.name.toLowerCase())) return false;
              const myRec = alt.recipientsList ? alt.recipientsList.find(r => r.id === currentUserId || (r.name && r.name.toLowerCase() === user.name.toLowerCase())) : null;
              if (!myRec) return false;
              const ageMs = Date.now() - new Date(alt.createdAt).getTime();
              return myRec.status !== 'acknowledged' && ageMs < 180000;
            });
            if (unackedAlert) {
              handleIncomingAlertCreated(unackedAlert);
            }
          }
        }
        checkNewAckToasts(historyData);
        renderLiveMonitor();
        renderHistoryTable();
      })
      .catch(() => {});
  }

  function renderLiveMonitor() {
    liveMonitorGrid.innerHTML = '';
    if (historyData.length === 0) {
      liveMonitorGrid.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-secondary);">No alerts sent yet. Select staff to ring them.</div>';
      return;
    }

    historyData.slice(0, 15).forEach(alt => {
      const card = document.createElement('div');
      card.className = 'timeline-card glass-panel';

      const timeStr = new Date(alt.createdAt).toLocaleTimeString();

      let stepsHtml = '';
      alt.recipientsList.forEach(r => {
        let badgeClass = 'awaiting';
        let responseStr = `🟠 Awaiting Response (${timeStr})`;

        if (r.status === 'acknowledged') {
          badgeClass = 'acknowledged';
          let presetText = r.responseType === 'on_my_way' ? "🏃‍♂️ On my way" : (r.responseType === 'in_meeting' ? "💼 In a meeting" : "📞 Calling you");
          let customTextStr = r.customReplyText ? ` | Reply: "${r.customReplyText}"` : '';
          responseStr = `🟢 Acknowledged (${presetText}${customTextStr}) • Ack in ${r.responseTimeSeconds || 1}s`;
        } else if (r.status === 'unavailable') {
          responseStr = `🔴 Unavailable (User was busy/offline)`;
        }

        stepsHtml += `
          <div class="step-badge ${badgeClass}">
            <strong>${r.name}:</strong> ${responseStr}
          </div>
        `;
      });

      card.innerHTML = `
        <div class="timeline-header">
          <div>
            <strong>${alt.senderName} (${alt.senderRole})</strong>
            <span style="font-size:11px;color:var(--text-secondary);margin-left:6px;">📍 ${alt.location} • ${timeStr}</span>
          </div>
          <span class="role-badge" style="border-color:var(--priority-${alt.priority});color:var(--priority-${alt.priority});">
            ${alt.priority.toUpperCase()}
          </span>
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;margin-bottom:4px;">"${alt.reason}"</div>
        </div>
        <div class="timeline-steps">
          ${stepsHtml}
        </div>
      `;

      liveMonitorGrid.appendChild(card);
    });
  }

  function renderHistoryTable() {
    historyTableBody.innerHTML = '';
    historyData.forEach(alt => {
      const tr = document.createElement('tr');
      const timeStr = new Date(alt.createdAt).toLocaleString();

      const acked = alt.recipientsList.filter(r => r.status === 'acknowledged');
      const avgSecs = acked.length > 0
        ? Math.round(acked.reduce((sum, r) => sum + (r.responseTimeSeconds || 0), 0) / acked.length) + 's'
        : '-';

      const responsesSummary = acked.map(r => `${r.name}: ${r.responseType}${r.customReplyText ? ` ("${r.customReplyText}")` : ''}`).join('<br>') || 'None';

      tr.innerHTML = `
        <td>${timeStr}</td>
        <td><strong>${alt.senderName}</strong><br><small style="color:var(--text-secondary);">${alt.senderRole}</small></td>
        <td>${alt.recipientsList.map(r => r.name).join(', ')}</td>
        <td><span class="role-badge">${alt.priority.toUpperCase()}</span></td>
        <td>"${alt.reason}"</td>
        <td>${responsesSummary}</td>
        <td><strong>${avgSecs}</strong></td>
      `;
      historyTableBody.appendChild(tr);
    });
  }

  // TOAST NOTIFICATIONS
  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = msg;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // SOUND TOGGLE
  soundToggleBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    soundToggleBtn.innerText = isSoundEnabled ? '🔊 Sound' : '🔇 Muted';
    soundToggleBtn.classList.toggle('sound-active', isSoundEnabled);
    if (!isSoundEnabled) {
      stopAlarmLoop();
      stopSenderRingbackLoop();
    }
  });

  // ADMIN FORM
  document.getElementById('adminAddStaffForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('adminStaffName').value.trim();
    const roleName = document.getElementById('adminStaffRoleName').value.trim();
    const dept = document.getElementById('adminStaffDept').value.trim();
    const phone = document.getElementById('adminStaffPhone').value.trim();
    const isHod = document.getElementById('adminStaffIsHod').checked;

    fetch(getApiUrl('/api/registerUser'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, roleName, department: dept, phone, isHod }),
    })
    .then(r => r.json())
    .then(() => {
      showToast(`Added ${name} to roster successfully!`, 'success');
      document.getElementById('adminAddStaffForm').reset();
      renderAllViews();
    })
    .catch(console.error);
  });

  // BULK CSV IMPORT
  document.getElementById('btnLoadTemplate').addEventListener('click', () => {
    document.getElementById('adminCsvTextarea').value = 
`Benson Admin,ICT Director,ICT,+254712345678,true
Dr. Evelyn Njeri,Chief Executive Officer,Executive,+254722987654,true
John Kamau,ICT Specialist,ICT,+254733112233,false
Mary Wanjiku,Head of HR,HR,+254799445566,true
Peter Otieno,Head of Operations,Operations,+254711223344,true
Grace Kiprop,Senior Medical Specialist,Medical,+254700112233,false
David Mutua,Chief Financial Officer,Finance,+254720556677,true`;
  });

  document.getElementById('btnProcessImport').addEventListener('click', () => {
    const raw = document.getElementById('adminCsvTextarea').value.trim();
    if (!raw) return;

    const lines = raw.split('\n');
    const newRoster = [];

    lines.forEach((line, idx) => {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 4) {
        newRoster.push({
          id: `u_csv_${idx}_${Date.now()}`,
          name: parts[0],
          roleName: parts[1],
          roleId: parts[4] === 'true' ? 'hod' : 'staff',
          department: parts[2],
          phone: parts[3],
          isHod: parts[4] === 'true',
          status: 'online',
          lastSeen: 'Just now',
        });
      }
    });

    if (newRoster.length > 0) {
      fetch(getApiUrl('/api/uploadRoster'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster: newRoster }),
      })
      .then(r => r.json())
      .then(() => {
        showToast(`Imported ${newRoster.length} staff members!`, 'success');
        renderAllViews();
      });
    }
  });

  fetchAlertHistory();
});
