import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Vibration,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NativeModules } from 'react-native';

// Safely check if ExponentAV native module exists before requiring expo-av
const getAudioModule = () => {
  try {
    const hasExpoAV = Boolean(
      (global.ExpoModules && (global.ExpoModules.ExponentAV || global.ExpoModules.ExpoAV)) ||
      (NativeModules && (NativeModules.ExponentAV || NativeModules.EXAV || NativeModules.ExpoAV))
    );
    if (!hasExpoAV) {
      return null;
    }
    const av = require('expo-av');
    return av?.Audio || av?.default?.Audio || null;
  } catch (e) {
    return null;
  }
};

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0;
const STORAGE_KEY = 'hodi_user_profile_v2';
const SERVER_URL_KEY = 'hodi_server_url_v2';
const DEFAULT_SERVER_URL = 'http://10.254.0.196:8080';

// Clean Starter Roster (Only Benson Admin initially)
const DEFAULT_ROSTER = [
  {
    id: 'u1',
    name: 'Benson Admin',
    roleName: 'ICT Director & Lead Engineer',
    department: 'Development',
    isHod: true,
    status: 'online',
    phone: '+254712345678',
  }
];

const DEPARTMENTS_LIST = [
  'Development',
  'Executive',
  'Support',
  'Marketing and Sales',
  'Finance',
  'Operations',
  'Medical',
  'Administration'
];

const QUICK_TEMPLATES = [
  '🏢 Come to my office',
  '🤝 Let\'s go for a meeting',
  '📞 Call me ASAP',
  '🚨 Emergency briefing required',
  '📄 Review urgent documents',
  '☕ Quick check-in'
];

const QUICK_REPLIES = [
  '🏃 On my way!',
  '⏳ Give me 5 mins',
  '❌ In a meeting / Busy',
  '📞 Calling you back now',
];

export default function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [roster, setRoster] = useState(DEFAULT_ROSTER);
  const [currentUser, setCurrentUser] = useState(DEFAULT_ROSTER[0]);
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'log' | 'status' | 'reachability' | 'settings'

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');

  // Network Offline & Failure Tracking
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);
  const networkFailuresRef = useRef(0);

  // Multi-Select Mode
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMultiIds, setSelectedMultiIds] = useState([]);

  // Compose Ring Modal State
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [messageText, setMessageText] = useState('Call me ASAP');
  const [selectedTemplate, setSelectedTemplate] = useState('📞 Call me ASAP');
  const [priorityLevel, setPriorityLevel] = useState('normal'); // 'normal' | 'important' | 'urgent'
  const [locationTag, setLocationTag] = useState('Main Office');
  const [isSending, setIsSending] = useState(false);

  // Recipient Incoming Alert Overlay State
  const [incomingAlert, setIncomingAlert] = useState(null);
  const [recipientReplyOption, setRecipientReplyOption] = useState('🏃 On my way!');
  const [recipientCustomText, setRecipientCustomText] = useState('');

  // Sender Real-Time Ack Toast Popup State
  const [senderAckToast, setSenderAckToast] = useState(null);
  const toastedAckIdsRef = useRef(new Set());
  const isInitialFetchRef = useRef(true);

  // Ring Log History State
  const [ringLogHistory, setRingLogHistory] = useState([]);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Registration Form State (Name, Job Title, Is HOD?, Department, Phone Number)
  const [newAccName, setNewAccName] = useState('');
  const [newAccRole, setNewAccRole] = useState('');
  const [newAccIsHod, setNewAccIsHod] = useState(false);
  const [newAccDept, setNewAccDept] = useState('Development');
  const [newAccPhone, setNewAccPhone] = useState('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef(null);

  // 1. Initial Load: Load Server URL & Saved User Profile from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
        if (savedUrl) setServerUrl(savedUrl);

        const savedUser = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.name) {
            setCurrentUser(parsed);
          } else {
            setShowRegisterModal(true);
          }
        } else {
          setShowRegisterModal(true);
        }
      } catch (e) {
        setShowRegisterModal(true);
      }
    })();
  }, []);

  // Save Server URL on change
  const handleUpdateServerUrl = async (url) => {
    setServerUrl(url);
    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, url);
    } catch (e) {}
  };

  // 2. Fetch Roster, Check Network Connectivity, Ring Alerts & Sender Acknowledgements
  const fetchRosterAndHistory = async () => {
    let networkOk = false;

    // 2A. Sync Roster & Check Network Health
    try {
      const res = await fetch(`${serverUrl}/api/roster`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        networkOk = true;
        const data = await res.json();
        if (data && Array.isArray(data.roster) && data.roster.length > 0) {
          setRoster(data.roster);
        }
      }
    } catch (e) {
      networkOk = false;
    }

    // Handle Network Offline Auto Switch
    if (!networkOk) {
      networkFailuresRef.current += 1;
      if (networkFailuresRef.current >= 2) {
        setIsNetworkOffline(true);
        setCurrentUser(prev => prev.status !== 'offline' ? { ...prev, status: 'offline' } : prev);
      }
    } else {
      networkFailuresRef.current = 0;
      if (isNetworkOffline) {
        setIsNetworkOffline(false);
        setCurrentUser(prev => prev.status === 'offline' ? { ...prev, status: 'online' } : prev);
      }
    }

    // 2B. Sync Ring Log, Check Incoming Ring Alerts & Real-time Sender Ack Toast
    try {
      const hRes = await fetch(`${serverUrl}/api/alerts/history`, { signal: AbortSignal.timeout(2000) });
      if (hRes.ok) {
        const hData = await hRes.json();
        if (hData && Array.isArray(hData.history)) {
          setRingLogHistory(hData.history);

          // Check for Unacknowledged Alert Targeted at this user
          const activeIncoming = hData.history.find(alert => {
            if (alert.senderId === currentUser.id) return false;

            const isTarget = alert.recipientId === currentUser.id ||
                             alert.recipientName === currentUser.name ||
                             alert.targetType === 'all' ||
                             (alert.targetType === 'dept' && alert.targetDepartment === currentUser.department) ||
                             (alert.targetType === 'hods' && currentUser.isHod) ||
                             (alert.recipientsList && alert.recipientsList.some(r => r.id === currentUser.id || r.name === currentUser.name));

            if (!isTarget) return false;

            const myRecItem = alert.recipientsList ? alert.recipientsList.find(r => r.id === currentUser.id || r.name === currentUser.name) : null;
            const isAck = myRecItem ? myRecItem.status === 'acknowledged' : false;

            const sentTime = alert.sentTimestamp || new Date(alert.createdAt || alert.timestamp).getTime();
            const ageMs = Date.now() - sentTime;

            return !isAck && ageMs < 180000;
          });

          if (activeIncoming) {
            setIncomingAlert(prev => (!prev || prev.id !== activeIncoming.id) ? activeIncoming : prev);
          } else {
            setIncomingAlert(null);
          }

          // Check for Newly Acknowledged Alerts Sent by Current User -> Pop up Sender Ack Toast!
          hData.history.forEach(alert => {
            if (alert.senderId === currentUser.id && alert.recipientsList) {
              alert.recipientsList.forEach(rec => {
                if (rec.status === 'acknowledged' && rec.acknowledgedAt) {
                  const toastKey = `${alert.id}_${rec.id}_${rec.acknowledgedAt}`;
                  
                  // On initial app startup, populate set silently without popping up old historical toasts!
                  if (isInitialFetchRef.current) {
                    toastedAckIdsRef.current.add(toastKey);
                  } else {
                    const ackTime = new Date(rec.acknowledgedAt).getTime();
                    const isRecent = Date.now() - ackTime < 30000; // Received within last 30 seconds

                    if (isRecent && !toastedAckIdsRef.current.has(toastKey)) {
                      toastedAckIdsRef.current.add(toastKey);
                      
                      // Trigger Real-time Ack Toast Notification on Sender's Screen!
                      setSenderAckToast({
                        id: toastKey,
                        recipientName: rec.name,
                        responseType: rec.responseType || 'Acknowledged',
                        customReplyText: rec.customReplyText || null,
                        timestamp: rec.acknowledgedAt
                      });

                      // Auto dismiss Toast after 5 seconds
                      setTimeout(() => {
                        setSenderAckToast(null);
                      }, 5000);
                    }
                  }
                }
              });
            }
          });

          // Mark initial app load fetch complete
          if (isInitialFetchRef.current) {
            isInitialFetchRef.current = false;
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRosterAndHistory();
    const interval = setInterval(fetchRosterAndHistory, 2000);
    return () => clearInterval(interval);
  }, [serverUrl, currentUser]);

  // 3. Loud Universal MP3 Alarm Sound + Hardware Vibration Loop (Silent Mode Bypass)
  const startRingtone = async () => {
    try {
      const AudioObj = getAudioModule();
      if (!AudioObj) return;

      if (AudioObj.setAudioModeAsync) {
        await AudioObj.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      }

      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
      }

      // Universal MP3 sound streams (Supported natively on iOS & Android)
      const mp3Urls = [
        'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Loud Emergency Siren MP3
        'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3',   // Loud Ringing Phone MP3
        'https://codeskulptor-demos.commondatastorage.googleapis.com/desolate/Crt_Unload.mp3'
      ];

      for (const url of mp3Urls) {
        try {
          if (!AudioObj.Sound) break;
          const { sound } = await AudioObj.Sound.createAsync(
            { uri: url },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          soundRef.current = sound;
          await sound.setVolumeAsync(1.0);
          await sound.playAsync();
          break; // Sound started playing!
        } catch (err) {}
      }
    } catch (e) {}
  };

  const stopRingtone = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (incomingAlert) {
      // Continuous Heavy Hardware Vibration Pattern
      Vibration.vibrate([800, 400, 800, 400], true);
      startRingtone().catch(() => {});

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      stopRingtone().catch(() => {});
      Vibration.cancel();
      pulseAnim.setValue(1);
    }
  }, [incomingAlert]);

  // 4. Handle Account Creation & Persistence
  const handleCreateAccount = async () => {
    if (!newAccName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }

    const newUser = {
      id: 'u_' + Date.now(),
      name: newAccName.trim(),
      roleName: newAccRole.trim() || (newAccIsHod ? 'Department Manager (HOD)' : 'Staff Specialist'),
      isHod: newAccIsHod,
      department: newAccDept,
      phone: newAccPhone.trim() || '+254700000000',
      status: 'online',
    };

    setRoster(prev => {
      const filtered = prev.filter(u => u.id !== newUser.id);
      return [newUser, ...filtered];
    });
    setCurrentUser(newUser);
    setShowRegisterModal(false);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      fetch(`${serverUrl}/api/registerUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          department: newUser.department,
          roleName: newUser.roleName,
          isHod: newUser.isHod,
          phone: newUser.phone,
          pin: '1234'
        }),
        signal: AbortSignal.timeout(3000)
      })
      .then(r => r.json())
      .then(resData => {
        if (resData && resData.user) {
          setCurrentUser(resData.user);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resData.user));
        }
        fetchRosterAndHistory();
      })
      .catch(() => {});
    } catch (e) {}

    // Reset Form
    setNewAccName('');
    setNewAccRole('');
    setNewAccIsHod(false);
    setNewAccPhone('');

    Alert.alert('Account Active! 🎉', `Welcome ${newUser.name}! Your account is created and logged in permanently.`);
  };

  // 5. Handle Send Ring Page with Busy / Offline Guard
  const handleSendRingPage = () => {
    if (!selectedRecipient) return;
    if (!messageText.trim()) {
      Alert.alert('Message Required', 'Please select a template or enter a message.');
      return;
    }

    const isMulti = selectedRecipient.id === 'multi';

    // BUSY / OFFLINE GUARD ENFORCEMENT
    if (!isMulti && (selectedRecipient.status === 'busy' || selectedRecipient.status === 'offline')) {
      Alert.alert(
        'Cannot Ring Staff 🚫',
        `${selectedRecipient.name} is currently ${selectedRecipient.status.toUpperCase()} and cannot receive urgent ring pages right now.`
      );
      return;
    }

    const alertId = 'alert_' + Date.now();
    const payload = {
      id: alertId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.roleName,
      targetType: isMulti ? 'multi' : 'single',
      recipientId: isMulti ? null : selectedRecipient.id,
      recipientName: isMulti ? selectedRecipient.name : selectedRecipient.name,
      recipientIds: isMulti ? selectedMultiIds : [selectedRecipient.id],
      reason: messageText,
      location: locationTag,
      priority: priorityLevel,
      timestamp: new Date().toISOString()
    };

    const isSelf = !isMulti && selectedRecipient.id === currentUser.id;

    if (isSelf) {
      setIncomingAlert(payload);
    }

    setRingLogHistory(prev => [payload, ...prev]);
    setSelectedRecipient(null);
    setSelectedMultiIds([]);
    setIsMultiSelectMode(false);

    if (!isSelf) {
      Alert.alert(
        'Hodi Page Sent! 🔔',
        isMulti
          ? `Your ring alert was sent to ${selectedMultiIds.length} colleagues.`
          : `Your ring alert to ${selectedRecipient.name} is ringing on their device.`
      );
    }

    // Broadcast to server
    fetch(`${serverUrl}/api/alerts/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000)
    })
    .then(() => fetchRosterAndHistory())
    .catch(() => {});
  };

  // 6. Recipient Acknowledge & Respond to Ring Alert
  const handleAcknowledgeAlert = () => {
    if (!incomingAlert) return;

    stopRingtone().catch(() => {});
    Vibration.cancel();

    const responsePayload = {
      alertId: incomingAlert.id || 'alert_' + Date.now(),
      recipientId: currentUser.id,
      responseType: recipientReplyOption,
      customReplyText: recipientCustomText.trim() || null,
    };

    setIncomingAlert(null);
    setRecipientCustomText('');

    fetch(`${serverUrl}/api/alerts/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responsePayload),
      signal: AbortSignal.timeout(3000)
    })
    .then(() => fetchRosterAndHistory())
    .catch(() => {});

    Alert.alert('Acknowledged! 🟢', 'Your response was delivered to the sender.');
  };

  // Department Filters with dedicated HODs Slot
  const deptFilters = ['All', '⭐ HODs', ...DEPARTMENTS_LIST];

  // Filtered Roster Logic
  const filteredRoster = roster.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.department.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDept = true;
    if (selectedDeptFilter === '⭐ HODs') {
      matchesDept = u.isHod === true;
    } else if (selectedDeptFilter !== 'All') {
      matchesDept = u.department === selectedDeptFilter;
    }

    return matchesSearch && matchesDept;
  });

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <StatusBar style="light" backgroundColor="#064e3b" />

      {/* SENDER REAL-TIME ACKNOWLEDGEMENT TOAST BANNER */}
      {senderAckToast && (
        <TouchableOpacity style={styles.senderAckToastBanner} onPress={() => setSenderAckToast(null)}>
          <Text style={styles.toastHeaderTitle}>🟢 ACKNOWLEDGEMENT RECEIVED!</Text>
          <Text style={styles.toastBodyText}>
            <Text style={{ fontWeight: 'bold', color: '#fff' }}>{senderAckToast.recipientName}</Text> responded: "{senderAckToast.responseType}"
            {senderAckToast.customReplyText ? ` • "${senderAckToast.customReplyText}"` : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* DISCONNECTED / OFFLINE BANNER */}
      {isNetworkOffline && (
        <View style={styles.offlineWarningBanner}>
          <Text style={styles.offlineWarningText}>📡 NO WI-FI / DATA CONNECTION — STATUS: OFFLINE</Text>
        </View>
      )}

      {/* TOP HEADER */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.appTitle} numberOfLines={1}>HODI 🔔</Text>
          <Text style={styles.appSubTitle} numberOfLines={1}>Urgent Workplace Intercom</Text>
        </View>

        <TouchableOpacity style={styles.userProfilePill} onPress={() => setShowProfileModal(true)}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{currentUser.name ? currentUser.name.charAt(0) : 'U'}</Text>
          </View>
          <View style={styles.userTextCol}>
            <Text style={styles.userNameText} numberOfLines={1}>{currentUser.name ? currentUser.name.split(' ')[0] : 'User'}</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: currentUser.status === 'online' ? '#10b981' : currentUser.status === 'busy' ? '#f59e0b' : '#ef4444' }
              ]} />
              <Text style={styles.statusText}>{(currentUser.status || 'online').toUpperCase()}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* SEARCH & DEPARTMENTS BAR (Directory Tab) */}
      {activeTab === 'directory' && (
        <View style={styles.filterSection}>
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search staff, roles, or departments..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Multi-Select Mode Toggle */}
            <TouchableOpacity
              style={[styles.multiSelectToggleBtn, isMultiSelectMode && styles.multiSelectToggleBtnActive]}
              onPress={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedMultiIds([]);
              }}
            >
              <Text style={[styles.multiSelectToggleText, isMultiSelectMode && styles.multiSelectToggleTextActive]}>
                {isMultiSelectMode ? 'Cancel' : 'Multi-Select'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Department Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptScrollView}>
            {deptFilters.map(dept => (
              <TouchableOpacity
                key={dept}
                style={[styles.deptChip, selectedDeptFilter === dept && styles.deptChipActive]}
                onPress={() => setSelectedDeptFilter(dept)}
              >
                <Text style={[styles.deptChipText, selectedDeptFilter === dept && styles.deptChipTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* MAIN VIEWPORT */}
      <View style={styles.mainViewport}>
        
        {/* 1. DIRECTORY TAB */}
        {activeTab === 'directory' && (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.sectionHeaderTitle}>
                STAFF DIRECTORY ({filteredRoster.length})
                {selectedDeptFilter !== 'All' ? ` • ${selectedDeptFilter.toUpperCase()}` : ''}
              </Text>

              {filteredRoster.map(person => {
                const isSelf = person.id === currentUser.id;
                const isOnline = person.status === 'online';
                const isBusy = person.status === 'busy';
                const isOffline = person.status === 'offline';
                const isChecked = selectedMultiIds.includes(person.id);
                const isRingable = isOnline && !isSelf;

                return (
                  <TouchableOpacity
                    key={person.id}
                    activeOpacity={0.8}
                    style={[
                      styles.staffCard,
                      isChecked && styles.staffCardChecked,
                      (isOffline || isBusy) && styles.staffCardDisabled
                    ]}
                    onPress={() => {
                      if (isMultiSelectMode) {
                        if (!isRingable) {
                          Alert.alert('Cannot Select', `${person.name} is currently ${person.status.toUpperCase()} and cannot be paged.`);
                          return;
                        }
                        if (isChecked) {
                          setSelectedMultiIds(prev => prev.filter(id => id !== person.id));
                        } else {
                          setSelectedMultiIds(prev => [...prev, person.id]);
                        }
                      }
                    }}
                  >
                    <View style={styles.staffLeft}>
                      {isMultiSelectMode && (
                        <View style={[styles.checkboxSquare, isChecked && styles.checkboxSquareChecked]}>
                          {isChecked && <Text style={styles.checkmarkIcon}>✓</Text>}
                        </View>
                      )}

                      <View style={[
                        styles.staffAvatar,
                        isOnline ? styles.avatarOnline : isBusy ? styles.avatarBusy : styles.avatarOffline
                      ]}>
                        <Text style={styles.avatarInitial}>{person.name.charAt(0)}</Text>
                      </View>

                      <View style={styles.staffInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.staffName} numberOfLines={1}>{person.name}</Text>
                          {person.isHod && <Text style={styles.hodTag}>HOD</Text>}
                          {isSelf && <Text style={styles.selfBadge}>YOU</Text>}
                          {isBusy && <Text style={styles.busyBadge}>BUSY</Text>}
                          {isOffline && <Text style={styles.offlineBadge}>OFFLINE</Text>}
                        </View>
                        <Text style={styles.staffRole} numberOfLines={1}>{person.roleName}</Text>
                        <Text style={styles.staffDept} numberOfLines={1}>{person.department} • {person.phone || 'Staff'}</Text>
                      </View>
                    </View>

                    {!isMultiSelectMode && (
                      <TouchableOpacity
                        style={[styles.hodiBtn, (!isOnline || isSelf) && styles.hodiBtnDisabled]}
                        onPress={() => {
                          if (!isOnline) {
                            Alert.alert('Cannot Ring Staff 🚫', `${person.name} is currently ${person.status.toUpperCase()} and cannot receive urgent ring pages.`);
                            return;
                          }
                          setSelectedRecipient(person);
                        }}
                      >
                        <Text style={styles.hodiBtnIcon}>{!isOnline ? '🚫' : '🔔'}</Text>
                        <Text style={styles.hodiBtnText}>{!isOnline ? person.status.toUpperCase() : 'Hodi'}</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Floating Multi-Select Ring Action Button */}
            {isMultiSelectMode && selectedMultiIds.length > 0 && (
              <View style={styles.floatingMultiBar}>
                <TouchableOpacity
                  style={styles.floatingMultiBtn}
                  onPress={() => {
                    setSelectedRecipient({
                      id: 'multi',
                      name: `${selectedMultiIds.length} Selected Colleagues`
                    });
                  }}
                >
                  <Text style={styles.floatingMultiBtnText}>
                    🔔 RING SELECTED ({selectedMultiIds.length}) STAFF NOW
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* 2. RING LOG TAB */}
        {activeTab === 'log' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeaderTitle}>RECENT HODI RING HISTORY ({ringLogHistory.length})</Text>

            {ringLogHistory.length === 0 ? (
              <View style={styles.emptyLogBox}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔔</Text>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>No Ring Pages Recorded Yet</Text>
                <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Sent and received urgent alerts with recipient responses will appear here.
                </Text>
              </View>
            ) : (
              ringLogHistory.map((item, index) => (
                <View key={item.id || index} style={styles.logCard}>
                  <View style={styles.logCardHeader}>
                    <View style={styles.logSenderRow}>
                      <Text style={styles.logIcon}>🔔</Text>
                      <View>
                        <Text style={styles.logSenderText}>
                          {item.senderName || 'Staff Member'} ➔ {item.recipientName || 'Colleague'}
                        </Text>
                        <Text style={styles.logTimeText}>
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Just now'}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.priorityBadge,
                      item.priority === 'urgent' ? styles.badgeUrgent : item.priority === 'important' ? styles.badgeImportant : styles.badgeNormal
                    ]}>
                      <Text style={styles.priorityBadgeText}>{(item.priority || 'normal').toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.logBodyBox}>
                    <Text style={styles.logReasonText}>"{item.reason || item.message}"</Text>
                    <Text style={styles.logLocationText}>📍 {item.location || 'Main Office'}</Text>
                  </View>

                  {item.recipientsList && item.recipientsList.length > 0 && (
                    <View style={styles.logAckSection}>
                      <Text style={styles.logAckTitle}>RECIPIENT RESPONSES:</Text>
                      {item.recipientsList.map((r, rIdx) => (
                        <View key={rIdx} style={styles.logAckRow}>
                          <Text style={styles.logAckStatusDot}>
                            {r.status === 'acknowledged' ? '🟢' : '🟡'}
                          </Text>
                          <Text style={styles.logAckName}>{r.name}:</Text>
                          <Text style={styles.logAckReply}>
                            {r.responseType ? `${r.responseType}` : 'Sent (Ringing)'}
                            {r.customReplyText ? ` • "${r.customReplyText}"` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* 3. MY STATUS TAB */}
        {activeTab === 'status' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeaderTitle}>DECLARE YOUR AVAILABILITY</Text>

            {[
              { status: 'online', label: '🟢 Available & Online', desc: 'Ready to receive immediate Hodi loud pages.' },
              { status: 'busy', label: '🟡 In a Meeting / Busy', desc: 'Pages will be blocked and declared non-ringable.' },
              { status: 'offline', label: '🔴 Offline', desc: 'Disconnected from network intercom.' }
            ].map(item => (
              <TouchableOpacity
                key={item.status}
                style={[styles.statusOptionCard, currentUser.status === item.status && styles.statusOptionCardActive]}
                onPress={async () => {
                  const updated = { ...currentUser, status: item.status };
                  setCurrentUser(updated);
                  try {
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    fetch(`${serverUrl}/api/updateStatus`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ employeeId: updated.id, status: item.status }),
                      signal: AbortSignal.timeout(2000)
                    }).catch(() => {});
                  } catch (e) {}
                  setRoster(prev => prev.map(u => u.id === currentUser.id ? updated : u));
                }}
              >
                <Text style={styles.statusOptionLabel}>{item.label}</Text>
                <Text style={styles.statusOptionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* 4. TEST RING TAB */}
        {activeTab === 'reachability' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeaderTitle}>REACHABILITY CHECK</Text>

            <TouchableOpacity
              style={styles.testRingBtn}
              onPress={() => {
                setIncomingAlert({
                  id: 'test_' + Date.now(),
                  senderId: currentUser.id,
                  senderName: 'System Test Ring',
                  senderRole: 'HODI Reachability Service',
                  reason: '⚡ Immediate Paging Sound & Vibration Test',
                  location: 'Self Device Check',
                  priority: 'urgent',
                  timestamp: new Date().toISOString()
                });
              }}
            >
              <Text style={styles.testRingBtnIcon}>🔔</Text>
              <Text style={styles.testRingBtnText}>RING MY PHONE NOW</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testRingBtn, { backgroundColor: '#059669', marginTop: 12 }]}
              onPress={() => {
                Vibration.vibrate([800, 400, 800, 400], true);
                startRingtone().catch(() => {});
                setTimeout(() => stopRingtone().catch(() => {}), 4000);
              }}
            >
              <Text style={styles.testRingBtnIcon}>🔊</Text>
              <Text style={styles.testRingBtnText}>TEST LOUD SIREN SOUND (4 SECS)</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* 5. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionHeaderTitle}>ACCOUNT & SYSTEM CONFIGURATION</Text>

            <View style={styles.accountCardBox}>
              <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 13 }}>REGISTERED ACTIVE ACCOUNT</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{currentUser.name}</Text>
              <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                {currentUser.roleName} • {currentUser.department} {currentUser.isHod ? '• HOD' : ''}
              </Text>
              <Text style={{ color: '#6ee7b7', fontSize: 11, marginTop: 2 }}>Phone: {currentUser.phone || 'N/A'}</Text>

              <TouchableOpacity
                style={styles.createNewAccBtn}
                onPress={() => setShowRegisterModal(true)}
              >
                <Text style={styles.createNewAccBtnText}>➕ Register Another Staff Member</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>SERVER BACKEND URL (WI-FI ADDRESS):</Text>
            <TextInput
              style={styles.textInput}
              value={serverUrl}
              onChangeText={handleUpdateServerUrl}
              placeholder="http://10.254.0.196:8080"
              placeholderTextColor="#9ca3af"
            />
          </ScrollView>
        )}
      </View>

      {/* BOTTOM TAB BAR */}
      <View style={styles.tabBar}>
        {[
          { id: 'directory', label: 'Directory', icon: '👥' },
          { id: 'log', label: 'Ring Log', icon: '📋' },
          { id: 'status', label: 'My Status', icon: '⚡' },
          { id: 'reachability', label: 'Test Ring', icon: '🔔' },
          { id: 'settings', label: 'Settings', icon: '⚙️' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* COMPOSE RING / ALERT PAGE MODAL */}
      {selectedRecipient && (
        <Modal animationType="slide" transparent visible={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.screenshotComposeCard}>
              
              {/* Header */}
              <View style={styles.screenshotModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.screenshotModalTitle}>🔔 Compose Ring / Alert Page</Text>
                  <Text style={styles.screenshotModalSubtitle}>
                    Ringing: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{selectedRecipient.name}</Text>
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedRecipient(null)}>
                  <Text style={styles.screenshotCloseBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                
                {/* Quick Template Notifications */}
                <Text style={styles.screenshotFieldLabel}>Quick Template Notifications (Tap to select):</Text>
                <View style={styles.templateGridRow}>
                  {QUICK_TEMPLATES.map(tpl => {
                    const isSelected = selectedTemplate === tpl;
                    return (
                      <TouchableOpacity
                        key={tpl}
                        style={[styles.templateChipBtn, isSelected && styles.templateChipBtnActive]}
                        onPress={() => {
                          setSelectedTemplate(tpl);
                          setMessageText(tpl.replace(/^[\u2000-\u3300\ud83c-\ud83e]\s*/, ''));
                        }}
                      >
                        <Text style={[styles.templateChipText, isSelected && styles.templateChipTextActive]} numberOfLines={1}>
                          {tpl}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Message Text */}
                <Text style={styles.screenshotFieldLabel}>Custom Message Text *</Text>
                <TextInput
                  style={styles.screenshotMultilineInput}
                  multiline
                  numberOfLines={3}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Enter custom message..."
                  placeholderTextColor="#6b7280"
                />

                {/* Priority & Ringing Level */}
                <Text style={styles.screenshotFieldLabel}>Priority & Ringing Level *</Text>
                <View style={styles.priorityCardRow}>
                  <TouchableOpacity
                    style={[styles.priorityCardItem, priorityLevel === 'normal' && styles.priorityNormalCardActive]}
                    onPress={() => setPriorityLevel('normal')}
                  >
                    <Text style={styles.priorityIcon}>ℹ️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.priorityCardTitle}>NORMAL</Text>
                      <Text style={styles.priorityCardDesc}>Standard chime</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.priorityCardItem, priorityLevel === 'important' && styles.priorityImportantCardActive]}
                    onPress={() => setPriorityLevel('important')}
                  >
                    <Text style={styles.priorityIcon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.priorityCardTitle}>IMPORTANT</Text>
                      <Text style={styles.priorityCardDesc}>Loud chime</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.priorityCardItem, priorityLevel === 'urgent' && styles.priorityUrgentCardActive]}
                    onPress={() => setPriorityLevel('urgent')}
                  >
                    <Text style={styles.priorityIcon}>🚨</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.priorityCardTitle}>URGENT</Text>
                      <Text style={styles.priorityCardDesc}>Alarm override</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Office / Location Tag */}
                <Text style={styles.screenshotFieldLabel}>Office / Location Tag *</Text>
                <TextInput
                  style={styles.screenshotSingleInput}
                  value={locationTag}
                  onChangeText={setLocationTag}
                  placeholder="e.g. Main Office"
                  placeholderTextColor="#6b7280"
                />

              </ScrollView>

              {/* Actions Row: Cancel | 🔔 RING NOW */}
              <View style={styles.screenshotActionsRow}>
                <TouchableOpacity
                  style={styles.screenshotCancelBtn}
                  onPress={() => setSelectedRecipient(null)}
                >
                  <Text style={styles.screenshotCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.screenshotRingNowBtn}
                  onPress={handleSendRingPage}
                  disabled={isSending}
                >
                  {isSending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.screenshotRingNowBtnText}>🔔 RING NOW</Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
      )}

      {/* FULL-SCREEN ALARM-LIKE RECIPIENT RING OVERLAY */}
      {incomingAlert && (
        <Modal animationType="fade" transparent visible={true} statusBarTranslucent={true}>
          <View style={styles.incomingOverlay}>
            <Animated.View style={[styles.ringPulseCircle, { transform: [{ scale: pulseAnim }] }]} />

            <View style={styles.incomingCard}>
              <Text style={styles.incomingUrgentHeader}>🚨 URGENT ALARM HODI PAGE</Text>

              <View style={styles.incomingAvatarCircle}>
                <Text style={styles.incomingAvatarText}>{incomingAlert.senderName ? incomingAlert.senderName.charAt(0) : 'S'}</Text>
              </View>

              <Text style={styles.incomingCallerName}>{incomingAlert.senderName}</Text>
              <Text style={styles.incomingCallerRole}>{incomingAlert.senderRole}</Text>

              <View style={styles.incomingReasonBox}>
                <Text style={styles.incomingReasonTitle}>MESSAGE:</Text>
                <Text style={styles.incomingReasonText}>{incomingAlert.reason}</Text>
                <Text style={styles.incomingLocationText}>📍 Location: {incomingAlert.location}</Text>
              </View>

              {/* Quick Reply Selection Chips */}
              <Text style={styles.replyFieldTitle}>SELECT QUICK RESPONSE:</Text>
              <View style={styles.quickReplyGrid}>
                {QUICK_REPLIES.map(rep => (
                  <TouchableOpacity
                    key={rep}
                    style={[styles.replyChipBtn, recipientReplyOption === rep && styles.replyChipBtnActive]}
                    onPress={() => setRecipientReplyOption(rep)}
                  >
                    <Text style={[styles.replyChipText, recipientReplyOption === rep && styles.replyChipTextActive]}>
                      {rep}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Reply Text Field */}
              <Text style={styles.replyFieldTitle}>CUSTOM REPLY MESSAGE (OPTIONAL):</Text>
              <TextInput
                style={styles.incomingCustomInput}
                placeholder="Type custom note to sender..."
                placeholderTextColor="#6b7280"
                value={recipientCustomText}
                onChangeText={setRecipientCustomText}
              />

              <TouchableOpacity
                style={styles.ackBtnGreen}
                onPress={handleAcknowledgeAlert}
              >
                <Text style={styles.ackBtnText}>🏃 ACKNOWLEDGE & STOP ALARM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL: REGISTER / ACCOUNT CREATION FLOW */}
      {showRegisterModal && (
        <Modal animationType="slide" transparent visible={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.composerCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Staff Onboarding & Registration</Text>
                <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* 1. Full Name */}
                <Text style={styles.fieldLabel}>FULL NAME *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Dr. Evelyn Njeri"
                  placeholderTextColor="#9ca3af"
                  value={newAccName}
                  onChangeText={setNewAccName}
                />

                {/* 2. Job Title */}
                <Text style={styles.fieldLabel}>JOB TITLE / ROLE *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Chief Operations Specialist"
                  placeholderTextColor="#9ca3af"
                  value={newAccRole}
                  onChangeText={setNewAccRole}
                />

                {/* 3. Is HOD? Toggle */}
                <View style={styles.hodToggleRow}>
                  <View>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Department Manager (HOD)?</Text>
                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>Head of Department status</Text>
                  </View>
                  <Switch
                    value={newAccIsHod}
                    onValueChange={setNewAccIsHod}
                    trackColor={{ false: '#374151', true: '#059669' }}
                    thumbColor={newAccIsHod ? '#10b981' : '#9ca3af'}
                  />
                </View>

                {/* 4. Department Dropdown/Selector */}
                <Text style={styles.fieldLabel}>DEPARTMENT *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {DEPARTMENTS_LIST.map(dept => (
                    <TouchableOpacity
                      key={dept}
                      style={[styles.deptChip, newAccDept === dept && styles.deptChipActive]}
                      onPress={() => setNewAccDept(dept)}
                    >
                      <Text style={[styles.deptChipText, newAccDept === dept && styles.deptChipTextActive]}>
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 5. Phone Number */}
                <Text style={styles.fieldLabel}>PHONE NUMBER *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +254712345678"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  value={newAccPhone}
                  onChangeText={setNewAccPhone}
                />

                <TouchableOpacity
                  style={styles.sendSubmitBtn}
                  onPress={handleCreateAccount}
                >
                  <Text style={styles.sendSubmitBtnText}>SAVE PROFILE & STAY LOGGED IN</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL: SWITCH ACTIVE PROFILE */}
      {showProfileModal && (
        <Modal animationType="slide" transparent visible={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.profileCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Active Staff Profile</Text>
                <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                  <Text style={styles.closeModalText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 280 }}>
                {roster.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.profileSelectItem, currentUser.id === u.id && styles.profileSelectItemActive]}
                    onPress={async () => {
                      setCurrentUser(u);
                      setShowProfileModal(false);
                      try {
                        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
                      } catch (e) {}
                    }}
                  >
                    <View style={styles.profileSelectAvatar}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>{u.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileSelectName}>{u.name} {u.isHod ? '(HOD)' : ''}</Text>
                      <Text style={styles.profileSelectRole}>{u.roleName} • {u.department}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.createNewAccBtn}
                onPress={() => {
                  setShowProfileModal(false);
                  setShowRegisterModal(true);
                }}
              >
                <Text style={styles.createNewAccBtnText}>➕ Register Another Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#09110e',
    paddingTop: STATUSBAR_HEIGHT,
  },
  senderAckToastBanner: {
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#10b981',
  },
  toastHeaderTitle: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  toastBodyText: {
    color: '#ecfdf5',
    fontSize: 13,
    marginTop: 2,
  },
  offlineWarningBanner: {
    backgroundColor: '#991b1b',
    paddingVertical: 6,
    alignItems: 'center',
  },
  offlineWarningText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#064e3b',
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ecfdf5',
    letterSpacing: 0.5,
  },
  appSubTitle: {
    fontSize: 10,
    color: '#a7f3d0',
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    maxWidth: 160,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  userTextCol: {
    flex: 1,
  },
  userNameText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 3,
  },
  statusText: {
    color: '#d1fae5',
    fontSize: 8,
    fontWeight: '700',
  },
  filterSection: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: '#0c1a15',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132821',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#1e3e34',
  },
  searchIcon: {
    marginRight: 6,
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
  },
  clearSearch: {
    color: '#9ca3af',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  multiSelectToggleBtn: {
    backgroundColor: '#132821',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3e34',
  },
  multiSelectToggleBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#10b981',
  },
  multiSelectToggleText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
  },
  multiSelectToggleTextActive: {
    color: '#fff',
  },
  deptScrollView: {
    marginTop: 6,
    flexDirection: 'row',
  },
  deptChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#132821',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1e3e34',
  },
  deptChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  deptChipText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  deptChipTextActive: {
    color: '#064e3b',
    fontWeight: '800',
  },
  mainViewport: {
    flex: 1,
    backgroundColor: '#09110e',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  sectionHeaderTitle: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#11221c',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1b382e',
  },
  staffCardChecked: {
    borderColor: '#10b981',
    backgroundColor: '#16332a',
  },
  staffCardDisabled: {
    opacity: 0.65,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSquareChecked: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  checkmarkIcon: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  staffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarOnline: {
    backgroundColor: '#047857',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  avatarBusy: {
    backgroundColor: '#78350f',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  avatarOffline: {
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#6b7280',
  },
  avatarInitial: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  staffInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffName: {
    color: '#ecfdf5',
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  hodTag: {
    backgroundColor: '#f59e0b',
    color: '#1f2937',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 5,
  },
  selfBadge: {
    backgroundColor: '#10b981',
    color: '#064e3b',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 5,
  },
  busyBadge: {
    backgroundColor: '#f59e0b',
    color: '#1f2937',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 5,
  },
  offlineBadge: {
    backgroundColor: '#ef4444',
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 5,
  },
  staffRole: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 1,
  },
  staffDept: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  hodiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  hodiBtnDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  hodiBtnIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  hodiBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  floatingMultiBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  floatingMultiBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingMultiBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  emptyLogBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#11221c',
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1b382e',
  },
  logCard: {
    backgroundColor: '#11221c',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1b382e',
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logSenderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  logTimeText: {
    color: '#9ca3af',
    fontSize: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeNormal: {
    backgroundColor: '#10b981',
  },
  badgeImportant: {
    backgroundColor: '#f59e0b',
  },
  badgeUrgent: {
    backgroundColor: '#ef4444',
  },
  priorityBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  logBodyBox: {
    backgroundColor: '#132821',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  logReasonText: {
    color: '#ecfdf5',
    fontSize: 12,
    fontWeight: '600',
  },
  logLocationText: {
    color: '#6ee7b7',
    fontSize: 10,
    marginTop: 2,
  },
  logAckSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#1e382b',
    paddingTop: 6,
  },
  logAckTitle: {
    color: '#9ca3af',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  logAckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  logAckStatusDot: {
    fontSize: 10,
    marginRight: 4,
  },
  logAckName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    marginRight: 4,
  },
  logAckReply: {
    color: '#a7f3d0',
    fontSize: 11,
    flex: 1,
  },
  statusOptionCard: {
    backgroundColor: '#11221c',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1b382e',
  },
  statusOptionCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#16332a',
  },
  statusOptionLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusOptionDesc: {
    color: '#9ca3af',
    fontSize: 12,
  },
  testRingBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  testRingBtnIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  testRingBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  accountCardBox: {
    backgroundColor: '#132821',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    marginBottom: 16,
  },
  createNewAccBtn: {
    backgroundColor: '#047857',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  createNewAccBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  inputLabel: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e3e34',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 13,
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#05382c',
    borderTopWidth: 1,
    borderTopColor: '#047857',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 22 : 10,
    height: Platform.OS === 'android' ? 76 : 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tabIcon: {
    fontSize: 16,
    color: '#a7f3d0',
    opacity: 0.7,
  },
  tabIconActive: {
    opacity: 1,
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 10,
    color: '#a7f3d0',
    marginTop: 2,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fff',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },

  // STYLES FOR THE SCREENSHOT COMPOSE RING / ALERT PAGE MODAL
  screenshotComposeCard: {
    backgroundColor: '#0d1713',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e382b',
  },
  screenshotModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  screenshotModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  screenshotModalSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 3,
  },
  screenshotCloseBtn: {
    fontSize: 20,
    color: '#9CA3AF',
    padding: 4,
  },
  screenshotFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 8,
  },
  templateGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  templateChipBtn: {
    width: '48%',
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e382b',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: '1%',
    marginBottom: 8,
  },
  templateChipBtnActive: {
    borderColor: '#10b981',
    backgroundColor: '#16332a',
  },
  templateChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  templateChipTextActive: {
    color: '#10b981',
    fontWeight: '700',
  },
  screenshotMultilineInput: {
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e382b',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    height: 70,
    textAlignVertical: 'top',
  },
  priorityCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityCardItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e382b',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 3,
  },
  priorityNormalCardActive: {
    borderColor: '#10b981',
    backgroundColor: '#16332a',
  },
  priorityImportantCardActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#262213',
  },
  priorityUrgentCardActive: {
    borderColor: '#ef4444',
    backgroundColor: '#291416',
  },
  priorityIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  priorityCardTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  priorityCardDesc: {
    color: '#9CA3AF',
    fontSize: 9,
    marginTop: 2,
  },
  screenshotSingleInput: {
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e382b',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 13,
  },
  screenshotActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  screenshotCancelBtn: {
    flex: 1,
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e382b',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  screenshotCancelBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  screenshotRingNowBtn: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  screenshotRingNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  composerCard: {
    backgroundColor: '#0c1a15',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#10b981',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  closeModalText: {
    color: '#9ca3af',
    fontSize: 20,
    padding: 4,
  },
  fieldLabel: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  hodToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#132821',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1e3e34',
  },
  sendSubmitBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sendSubmitBtnText: {
    color: '#064e3b',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  incomingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 17, 14, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  ringPulseCircle: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 3,
    borderColor: '#ef4444',
  },
  incomingCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0c1a15',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  incomingUrgentHeader: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  incomingAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#991b1b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 3,
    borderColor: '#ef4444',
  },
  incomingAvatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  incomingCallerName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  incomingCallerRole: {
    color: '#9ca3af',
    fontSize: 11,
    marginBottom: 10,
  },
  incomingReasonBox: {
    backgroundColor: '#132821',
    width: '100%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  incomingReasonTitle: {
    color: '#fca5a5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  incomingReasonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 2,
  },
  incomingLocationText: {
    color: '#fca5a5',
    fontSize: 10,
  },
  replyFieldTitle: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
  },
  quickReplyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    width: '100%',
    marginBottom: 8,
  },
  replyChipBtn: {
    backgroundColor: '#132821',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e382b',
  },
  replyChipBtnActive: {
    backgroundColor: '#047857',
    borderColor: '#10b981',
  },
  replyChipText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  replyChipTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  incomingCustomInput: {
    width: '100%',
    backgroundColor: '#132821',
    borderWidth: 1,
    borderColor: '#1e382b',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 12,
    marginBottom: 12,
  },
  ackBtnGreen: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  ackBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  profileCard: {
    backgroundColor: '#0c1a15',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
  },
  profileSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#132821',
    marginBottom: 6,
  },
  profileSelectItemActive: {
    borderColor: '#10b981',
    borderWidth: 1,
  },
  profileSelectAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  profileSelectName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  profileSelectRole: {
    color: '#9ca3af',
    fontSize: 11,
  },
});
