import { supabase } from './supabase.js';

// ==========================================================
// Application State
// ==========================================================
const state = {
  user: null,
  profile: null,
  activePanel: 'homePanel', // Start on Home Panel by default
  selectedMusclePart: null,
  workouts: [],
  worshipAlarms: [],
  disciplineTodos: [],
  focusNotes: [],
  customAvatarDataUrl: null, // Holds Base64 representation of uploaded profile picture
  
  // Widget States
  globalTally: parseInt(localStorage.getItem('bb_global_tally') || '0'),
  stopwatch: {
    isRunning: false,
    startTime: 0,
    elapsedTime: 0,
    intervalId: null,
    laps: JSON.parse(localStorage.getItem('bb_stopwatch_laps') || '[]')
  },
  timer: {
    isRunning: false,
    totalSeconds: parseInt(localStorage.getItem('bb_timer_seconds') || '600'), // default 10min
    remainingSeconds: 0,
    intervalId: null
  },
  
  // Active Exercise States (stopwatch/timer running inside muscle detail views)
  activeExerciseTimers: {} // maps exerciseId -> intervalId or state
};

// ==========================================================
// Utility: Timeout wrapper for async calls
// ==========================================================
function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Check your internet connection and try again.')), ms)
    )
  ]);
}

// ==========================================================
// DOM Cache Elements
// ==========================================================
const DOM = {
  authScreen: document.getElementById('authScreen'),
  appShell: document.getElementById('appShell'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  toSignup: document.getElementById('toSignup'),
  toLogin: document.getElementById('toLogin'),
  authError: document.getElementById('authError'),
  
  // Navigation
  navTabs: document.querySelectorAll('.nav-tab'),
  panels: document.querySelectorAll('.viewport-panel'),
  
  // Profile / Header
  profileBtn: document.getElementById('profileBtn'),
  headerAvatar: document.getElementById('headerAvatar'),
  themeToggle: document.getElementById('themeToggle'),
  appBg: document.getElementById('appBg'),
  
  // Workout
  muscleBoxes: document.querySelectorAll('.muscle-box'),
  bodyPartSubpage: document.getElementById('bodyPartSubpage'),
  closeSubpageBtn: document.getElementById('closeSubpageBtn'),
  subpageTitle: document.getElementById('subpageTitle'),
  exerciseList: document.getElementById('exerciseList'),
  triggerAddExerciseBtn: document.getElementById('triggerAddExerciseBtn'),
  addExerciseModal: document.getElementById('addExerciseModal'),
  addExerciseForm: document.getElementById('addExerciseForm'),
  cancelExerciseBtn: document.getElementById('cancelExerciseBtn'),
  
  // Worship
  addAlarmBtn: document.getElementById('addAlarmBtn'),
  addAlarmModal: document.getElementById('addAlarmModal'),
  addAlarmForm: document.getElementById('addAlarmForm'),
  cancelAlarmBtn: document.getElementById('cancelAlarmBtn'),
  worshipAlarmsList: document.getElementById('worshipAlarmsList'),
  worshipTallyVal: document.getElementById('worshipTallyVal'),
  worshipTallyMinus: document.getElementById('worshipTallyMinus'),
  worshipTallyPlus: document.getElementById('worshipTallyPlus'),
  timerAlertSound: document.getElementById('timerAlertSound'),
  
  // Discipline
  addTodoBtn: document.getElementById('addTodoBtn'),
  addTodoModal: document.getElementById('addTodoModal'),
  addTodoForm: document.getElementById('addTodoForm'),
  cancelTodoBtn: document.getElementById('cancelTodoBtn'),
  disciplineList: document.getElementById('disciplineList'),
  sortTodoTimeBtn: document.getElementById('sortTodoTimeBtn'),
  subtaskInputsContainer: document.getElementById('subtaskInputsContainer'),
  addSubtaskFieldBtn: document.getElementById('addSubtaskFieldBtn'),
  
  // Focus
  addFinanceBtn: document.getElementById('addFinanceBtn'),
  addFinanceModal: document.getElementById('addFinanceModal'),
  addFinanceForm: document.getElementById('addFinanceForm'),
  cancelFinanceBtn: document.getElementById('cancelFinanceBtn'),
  netBalanceVal: document.getElementById('netBalanceVal'),
  totalIncomeVal: document.getElementById('totalIncomeVal'),
  totalExpenseVal: document.getElementById('totalExpenseVal'),
  financeLedgerList: document.getElementById('financeLedgerList'),
  
  // Account Modal
  accountModal: document.getElementById('accountModal'),
  closeAccountModalBtn: document.getElementById('closeAccountModalBtn'),
  accountAvatar: document.getElementById('accountAvatar'),
  profileUsername: document.getElementById('profileUsername'),
  saveProfileBtn: document.getElementById('saveProfileBtn'),
  sessionLogHeader: document.getElementById('sessionLogHeader'),
  sessionLogContent: document.getElementById('sessionLogContent'),
  lastLoginDisplay: document.getElementById('lastLoginDisplay'),
  newPassword: document.getElementById('newPassword'),
  updatePasswordBtn: document.getElementById('updatePasswordBtn'),
  securityMessage: document.getElementById('securityMessage'),
  logoutBtn: document.getElementById('logoutBtn'),
  avatarUploadInput: document.getElementById('avatarUploadInput'), // File upload field
  
  // Home panel progress tracking components
  progressWorkoutVal: document.getElementById('progressWorkoutVal'),
  progressWorkoutBar: document.getElementById('progressWorkoutBar'),
  progressWorshipVal: document.getElementById('progressWorshipVal'),
  progressWorshipBar: document.getElementById('progressWorshipBar'),
  progressDisciplineVal: document.getElementById('progressDisciplineVal'),
  progressDisciplineBar: document.getElementById('progressDisciplineBar'),
  progressFocusVal: document.getElementById('progressFocusVal'),
  progressFocusBar: document.getElementById('progressFocusBar'),
  homeQuoteText: document.getElementById('homeQuoteText'),

  // Widgets Top Bar
  timerWidgetBtn: document.getElementById('timerWidgetBtn'),
  stopwatchWidgetBtn: document.getElementById('stopwatchWidgetBtn'),
  tallyWidgetBtn: document.getElementById('tallyWidgetBtn'),
  headerTimerVal: document.getElementById('headerTimerVal'),
  headerStopwatchVal: document.getElementById('headerStopwatchVal'),
  headerTallyVal: document.getElementById('headerTallyVal'),
  
  // Widgets Modals
  globalTimerModal: document.getElementById('globalTimerModal'),
  closeTimerModal: document.getElementById('closeTimerModal'),
  timerInputMin: document.getElementById('timerInputMin'),
  timerInputSec: document.getElementById('timerInputSec'),
  timerReset: document.getElementById('timerReset'),
  timerToggle: document.getElementById('timerToggle'),
  
  globalStopwatchModal: document.getElementById('globalStopwatchModal'),
  closeStopwatchModal: document.getElementById('closeStopwatchModal'),
  modalStopwatchVal: document.getElementById('modalStopwatchVal'),
  stopwatchLapsList: document.getElementById('stopwatchLapsList'),
  stopwatchLap: document.getElementById('stopwatchLap'),
  stopwatchReset: document.getElementById('stopwatchReset'),
  stopwatchToggle: document.getElementById('stopwatchToggle'),
  
  globalTallyModal: document.getElementById('globalTallyModal'),
  closeTallyModal: document.getElementById('closeTallyModal'),
  modalTallyVal: document.getElementById('modalTallyVal'),
  modalTallyMinus: document.getElementById('modalTallyMinus'),
  modalTallyPlus: document.getElementById('modalTallyPlus')
};

// ==========================================================
// Utility: Scroll Reveal Observer (for Mobile Viewport animations)
// ==========================================================
function initScrollReveal() {
  const boxes = document.querySelectorAll('.muscle-box');
  if (!boxes.length) return;
  
  const observerOptions = {
    root: null,
    rootMargin: '-5% 0px -10% 0px',
    threshold: 0.25
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
      } else {
        entry.target.classList.remove('reveal-visible');
      }
    });
  }, observerOptions);

  boxes.forEach(box => observer.observe(box));
}

// ==========================================================
// Core Authentication & Initializer
// ==========================================================
async function initApp() {
  setupEventListeners();
  initTheme();
  initWidgets();
  initScrollReveal();
  
  if (!supabase) {
    DOM.authError.innerHTML = `<span style="color: #ff3b30; font-weight: bold;">DATABASE SETUP REQUIRED</span><br><div style="font-size: 0.8rem; line-height: 1.4; margin-top: 5px; text-align: left; text-transform: none; color: #eee; font-family: sans-serif;">Missing database configuration. Please add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your Netlify Environment Variables (Site settings ➜ Environment variables) and trigger a new deploy.</div>`;
    return;
  }
  
  // Track auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (session) {
        state.user = session.user;
        await loadUserProfile();
        logSessionLocally(session.user.id);
        
        DOM.authScreen.classList.remove('active');
        DOM.appShell.classList.remove('hidden');
        
        // Load user database modules
        await refreshAllData();
        startSystemClock();
      } else {
        state.user = null;
        state.profile = null;
        DOM.appShell.classList.add('hidden');
        DOM.authScreen.classList.add('active');
        stopSystemClock();
      }
    } catch (err) {
      console.error('Auth state change error:', err);
      DOM.authError.textContent = 'Session error: ' + err.message;
      DOM.authScreen.classList.add('active');
      DOM.appShell.classList.add('hidden');
    }
  });
}

async function loadUserProfile() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .single();
      
    if (error) throw error;
    state.profile = data;
    
    // Update Header Avatar
    updateProfileUI();
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
}

function updateProfileUI() {
  if (!state.profile) return;
  
  // Username input preset
  DOM.profileUsername.value = state.profile.username || '';
  
  // Avatar setup
  const url = getAvatarUrl(state.profile.avatar_url);
  DOM.headerAvatar.src = url;
  DOM.accountAvatar.src = url;
}

function getAvatarUrl(avatarVal) {
  // Treat the old character_profile.jpg default avatar image as empty/null,
  // falling back to our custom golden shield SVG vector placeholder
  if (!avatarVal || avatarVal === 'character_profile.jpg' || avatarVal === '/character_profile.jpg' || avatarVal === 'face' || avatarVal === 'chest' || avatarVal === 'abs') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="%23d4af37" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="50" cy="38" r="16" fill="rgba(212, 175, 55, 0.1)"/><path d="M25 80c0-12 10-20 25-20s25 8 25 20" fill="rgba(212, 175, 55, 0.1)"/><path d="M50 10 L85 30 L85 65 L50 90 L15 65 L15 30 Z" stroke-width="2" stroke="rgba(212, 175, 55, 0.4)"/></svg>`;
  }
  if (avatarVal.startsWith('http') || avatarVal.endsWith('.jpg') || avatarVal.endsWith('.png') || avatarVal.startsWith('data:')) {
    return avatarVal;
  }
  return avatarVal;
}

function logSessionLocally(userId) {
  const sessionKey = `bb_sessions_${userId}`;
  let sessions = JSON.parse(localStorage.getItem(sessionKey)) || [];
  const nowStr = new Date().toLocaleString();
  
  // Only add if not logged in within the last 15 seconds (prevents double logging on hot reload)
  if (sessions.length === 0 || (new Date() - new Date(sessions[0])) > 15000) {
    sessions.unshift(nowStr);
    localStorage.setItem(sessionKey, JSON.stringify(sessions.slice(0, 30)));
  }
  
  renderSessionLogs(sessions);
}

function renderSessionLogs(sessions) {
  DOM.sessionLogContent.innerHTML = '';
  if (sessions.length === 0) {
    DOM.sessionLogContent.innerHTML = `<p class="font-body text-dim">No sessions found.</p>`;
    return;
  }
  
  DOM.lastLoginDisplay.textContent = `Active Log: ${sessions[0]} (Current Device)`;
  
  sessions.forEach(time => {
    const item = document.createElement('div');
    item.className = 'session-log-item font-body';
    item.textContent = `Logged on this device: ${time}`;
    DOM.sessionLogContent.appendChild(item);
  });
}

async function refreshAllData() {
  if (!state.user) return;
  await Promise.all([
    loadWorkouts(),
    loadWorshipAlarms(),
    loadDisciplineTodos(),
    loadFocusNotes()
  ]);
}

// ==========================================================
// Theme Setup (Light / Dark)
// ==========================================================
function initTheme() {
  const storedTheme = localStorage.getItem('bb_theme') || 'dark';
  setTheme(storedTheme);
}

function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('bb_theme', 'light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('bb_theme', 'dark');
  }
}

// ==========================================================
// Navigation Routing
// ==========================================================
function switchPanel(panelId) {
  state.activePanel = panelId;
  
  DOM.navTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.target === panelId) {
      tab.classList.add('active');
    }
  });
  
  DOM.panels.forEach(panel => {
    panel.classList.remove('active');
    if (panel.id === panelId) {
      panel.classList.add('active');
    }
  });
}

// ==========================================================
// 1. WORKOUT PANEL MODULE
// ==========================================================
async function loadWorkouts() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', state.user.id);
    
  if (error) {
    console.error('Error loading workouts:', error);
    return;
  }
  state.workouts = data || [];
}

function openMuscleSubpage(part) {
  state.selectedMusclePart = part;
  DOM.subpageTitle.textContent = `${part.toUpperCase()} TARGETS`;
  DOM.bodyPartSubpage.classList.remove('hidden');
  renderExercises();
}

function renderExercises() {
  DOM.exerciseList.innerHTML = '';
  const filtered = state.workouts.filter(w => w.body_part === state.selectedMusclePart);
  
  if (filtered.length === 0) {
    DOM.exerciseList.innerHTML = `
      <div class="glass-panel text-dim font-body" style="padding:20px; text-align:center;">
        No active targets for this muscle. Tap the + floating button to add a routine!
      </div>
    `;
    return;
  }
  
  filtered.forEach(ex => {
    const card = document.createElement('div');
    card.className = `exercise-card glass-panel ${ex.status ? 'exercise-completed' : 'exercise-pending'}`;
    card.dataset.id = ex.id;
    
    // Left Details
    const details = document.createElement('div');
    details.className = 'exercise-details';
    
    const name = document.createElement('span');
    name.className = 'exercise-name-text font-header';
    name.textContent = ex.name;
    
    const styleBadge = document.createElement('span');
    styleBadge.className = 'exercise-style-badge font-body';
    styleBadge.textContent = ex.counter_type;
    
    details.appendChild(name);
    details.appendChild(styleBadge);
    card.appendChild(details);
    
    // Right Controls
    const controls = document.createElement('div');
    controls.className = 'exercise-controls';
    
    if (ex.counter_type === 'tally') {
      const minusBtn = document.createElement('button');
      minusBtn.className = 'exercise-control-btn';
      minusBtn.textContent = '-';
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adjustExerciseTally(ex.id, -1);
      });
      
      const val = document.createElement('span');
      val.className = 'exercise-tally-value';
      val.textContent = ex.count || 0;
      
      const plusBtn = document.createElement('button');
      plusBtn.className = 'exercise-control-btn';
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adjustExerciseTally(ex.id, 1);
      });
      
      controls.appendChild(minusBtn);
      controls.appendChild(val);
      controls.appendChild(plusBtn);
      
    } else if (ex.counter_type === 'stopwatch') {
      const display = document.createElement('span');
      display.className = 'exercise-time-display';
      display.textContent = formatTimeDisplay(ex.count || 0);
      
      const actionRow = document.createElement('div');
      actionRow.className = 'exercise-action-btns';
      
      const isRunning = state.activeExerciseTimers[ex.id];
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = `btn btn-mini ${isRunning ? 'btn-outline' : 'btn-red'}`;
      toggleBtn.textContent = isRunning ? 'PAUSE' : 'START';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExerciseStopwatch(ex.id);
      });
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-mini btn-outline';
      resetBtn.textContent = 'RESET';
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetExerciseStopwatch(ex.id);
      });
      
      actionRow.appendChild(toggleBtn);
      actionRow.appendChild(resetBtn);
      controls.appendChild(display);
      controls.appendChild(actionRow);
      
    } else if (ex.counter_type === 'timer') {
      const display = document.createElement('span');
      display.className = 'exercise-time-display';
      display.textContent = formatTimeDisplay(ex.count || 60); // default 60s
      
      const actionRow = document.createElement('div');
      actionRow.className = 'exercise-action-btns';
      
      const isRunning = state.activeExerciseTimers[ex.id];
      
      const toggleBtn = document.createElement('button');
      toggleBtn.className = `btn btn-mini ${isRunning ? 'btn-outline' : 'btn-red'}`;
      toggleBtn.textContent = isRunning ? 'PAUSE' : 'START';
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExerciseTimer(ex.id);
      });
      
      const setBtn = document.createElement('button');
      setBtn.className = 'btn btn-mini btn-outline';
      setBtn.textContent = '+30S';
      setBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adjustExerciseTimerLength(ex.id, 30);
      });
      
      actionRow.appendChild(toggleBtn);
      actionRow.appendChild(setBtn);
      controls.appendChild(display);
      controls.appendChild(actionRow);
    }
    
    // Delete Button inside Card
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'exercise-control-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.style.marginLeft = '8px';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteWorkoutExercise(ex.id);
    });
    controls.appendChild(deleteBtn);
    
    card.appendChild(controls);
    
    // Double Tap or Double Click Event for completion status toggling
    card.addEventListener('dblclick', (e) => {
      e.preventDefault();
      toggleExerciseStatus(ex.id);
    });
    
    // Mobile double tap handler
    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
      const curTime = new Date().getTime();
      const tapLen = curTime - lastTap;
      if (tapLen < 300 && tapLen > 0) {
        e.preventDefault();
        toggleExerciseStatus(ex.id);
      }
      lastTap = curTime;
    });
    
    DOM.exerciseList.appendChild(card);
  });
  updateHomeProgress();
}

async function addWorkoutExercise(name, type) {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .insert([{
        user_id: state.user.id,
        body_part: state.selectedMusclePart,
        name: name,
        counter_type: type,
        count: type === 'timer' ? 60 : 0, // timer defaults to 60s
        status: false
      }])
      .select()
      .single();
      
    if (error) throw error;
    state.workouts.push(data);
    renderExercises();
  } catch (error) {
    console.error('Error adding exercise:', error);
  }
}

async function deleteWorkoutExercise(id) {
  // Clear any running interval
  if (state.activeExerciseTimers[id]) {
    clearInterval(state.activeExerciseTimers[id]);
    delete state.activeExerciseTimers[id];
  }
  
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting workout:', error);
    return;
  }
  state.workouts = state.workouts.filter(w => w.id !== id);
  renderExercises();
}

async function toggleExerciseStatus(id) {
  const ex = state.workouts.find(w => w.id === id);
  if (!ex) return;
  const newStatus = !ex.status;
  
  // Optimistic update
  ex.status = newStatus;
  renderExercises();
  
  const { error } = await supabase
    .from('workouts')
    .update({ status: newStatus })
    .eq('id', id);
    
  if (error) {
    console.error('Error saving status updates:', error);
    // revert
    ex.status = !newStatus;
    renderExercises();
  }
}

async function adjustExerciseTally(id, delta) {
  const ex = state.workouts.find(w => w.id === id);
  if (!ex) return;
  
  let newCount = (ex.count || 0) + delta;
  if (newCount < 0) newCount = 0;
  
  ex.count = newCount;
  renderExercises();
  
  const { error } = await supabase
    .from('workouts')
    .update({ count: newCount })
    .eq('id', id);
    
  if (error) console.error('Error updating tally:', error);
}

function toggleExerciseStopwatch(id) {
  const ex = state.workouts.find(w => w.id === id);
  if (!ex) return;
  
  if (state.activeExerciseTimers[id]) {
    // Stop
    clearInterval(state.activeExerciseTimers[id]);
    delete state.activeExerciseTimers[id];
    saveStopwatchProgress(id, ex.count);
    renderExercises();
  } else {
    // Start
    state.activeExerciseTimers[id] = setInterval(() => {
      ex.count = (ex.count || 0) + 1;
      const card = document.querySelector(`.exercise-card[data-id="${ex.id}"]`);
      if (card) {
        const display = card.querySelector('.exercise-time-display');
        if (display) display.textContent = formatTimeDisplay(ex.count);
      }
    }, 1000);
    renderExercises();
  }
}

async function saveStopwatchProgress(id, count) {
  const { error } = await supabase
    .from('workouts')
    .update({ count: count })
    .eq('id', id);
  if (error) console.error('Error saving stopwatch progress:', error);
}

async function resetExerciseStopwatch(id) {
  if (state.activeExerciseTimers[id]) {
    clearInterval(state.activeExerciseTimers[id]);
    delete state.activeExerciseTimers[id];
  }
  const ex = state.workouts.find(w => w.id === id);
  if (!ex) return;
  ex.count = 0;
  renderExercises();
  
  const { error } = await supabase
    .from('workouts')
    .update({ count: 0 })
    .eq('id', id);
  if (error) console.error('Error resetting stopwatch:', error);
}

function toggleExerciseTimer(id) {
  const ex = state.workouts.find(w => w.id === id);
  if (!ex) return;
  
  if (state.activeExerciseTimers[id]) {
    // Stop
    clearInterval(state.activeExerciseTimers[id]);
    delete state.activeExerciseTimers[id];
    saveTimerProgress(id, ex.count);
    renderExercises();
  } else {
    // Start
    state.activeExerciseTimers[id] = setInterval(() => {
      if (ex.count <= 0) {
        clearInterval(state.activeExerciseTimers[id]);
        delete state.activeExerciseTimers[id];
        triggerSoundAlert();
        toggleExerciseStatus(id);
      } else {
        ex.count--;
        const card = document.querySelector(`.exercise-card[data-id="${ex.id}"]`);
        if (card) {
          const display = card.querySelector('.exercise-time-display');
          if (display) display.textContent = formatTimeDisplay(ex.count);
        }
      }
    }, 1000);
    renderExercises();
  }
}

async function saveTimerProgress(id, count) {
  const { error } = await supabase
    .from('workouts')
    .update({ count: count })
    .eq('id', id);
  if (error) console.error('Error saving timer progress:', error);
}

async function adjustExerciseTimerLength(id, delta) {
  const ex = state.workouts.find(w => w.id === id);
  if (!ex) return;
  
  ex.count = (ex.count || 0) + delta;
  renderExercises();
  
  const { error } = await supabase
    .from('workouts')
    .update({ count: ex.count })
    .eq('id', id);
  if (error) console.error('Error adjusting timer size:', error);
}

function formatTimeDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function triggerSoundAlert() {
  DOM.timerAlertSound.currentTime = 0;
  DOM.timerAlertSound.play().catch(() => {});
  
  // Highlight screen flash red
  document.body.style.transition = 'none';
  document.body.style.backgroundColor = 'rgba(255,0,0,0.4)';
  setTimeout(() => {
    document.body.style.transition = 'background-color 0.3s ease';
    document.body.style.backgroundColor = '';
  }, 300);
}

// ==========================================================
// 2. WORSHIP PANEL MODULE
// ==========================================================
async function loadWorshipAlarms() {
  const { data, error } = await supabase
    .from('worship_alarms')
    .select('*')
    .eq('user_id', state.user.id)
    .order('time', { ascending: true });
    
  if (error) {
    console.error('Error loading worship:', error);
    return;
  }
  state.worshipAlarms = data || [];
  
  // Also fetch/calculate prayer tally
  // We can sum counts from worship alarms or calculate a daily prayer tally from a local setting.
  // The user requested a Worship counter that increases/decreases via + and -.
  // We will save the main prayer count state in LocalStorage per user for simplicity or sum alarm counts.
  // Let's store a dedicated 'bb_worship_tally_[user_id]' count.
  const storedWorshipTally = localStorage.getItem(`bb_worship_tally_${state.user.id}`) || '0';
  DOM.worshipTallyVal.textContent = storedWorshipTally.padStart(3, '0');
  
  renderWorshipAlarms();
}

function renderWorshipAlarms() {
  DOM.worshipAlarmsList.innerHTML = '';
  
  if (state.worshipAlarms.length === 0) {
    DOM.worshipAlarmsList.innerHTML = `
      <div class="glass-panel text-dim font-body" style="padding:15px; grid-column: 1 / -1; text-align:center;">
        No alarms set. Add alarms matching your daily schedule.
      </div>
    `;
    return;
  }
  
  state.worshipAlarms.forEach(alarm => {
    const card = document.createElement('div');
    card.className = `alarm-card glass-panel ${alarm.completed ? 'alarm-completed' : 'alarm-pending'}`;
    card.dataset.id = alarm.id;
    
    const timeText = document.createElement('div');
    timeText.className = 'alarm-time-text';
    timeText.textContent = alarm.time;
    card.appendChild(timeText);
    
    // Delete cross
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteWorshipAlarm(alarm.id);
    });
    card.appendChild(delBtn);
    
    // Double tap toggle completed (turns green from white)
    card.addEventListener('dblclick', () => {
      toggleAlarmCompleted(alarm.id);
    });
    
    let lastTap = 0;
    card.addEventListener('touchend', (e) => {
      const curTime = new Date().getTime();
      const tapLen = curTime - lastTap;
      if (tapLen < 300 && tapLen > 0) {
        e.preventDefault();
        toggleAlarmCompleted(alarm.id);
      }
      lastTap = curTime;
    });
    
    DOM.worshipAlarmsList.appendChild(card);
  });
  updateHomeProgress();
}

async function addWorshipAlarm(time) {
  try {
    const { data, error } = await supabase
      .from('worship_alarms')
      .insert([{
        user_id: state.user.id,
        time: time,
        completed: false,
        count: 0
      }])
      .select()
      .single();
      
    if (error) throw error;
    state.worshipAlarms.push(data);
    state.worshipAlarms.sort((a, b) => a.time.localeCompare(b.time));
    renderWorshipAlarms();
  } catch (error) {
    console.error('Error adding alarm:', error);
  }
}

async function deleteWorshipAlarm(id) {
  const { error } = await supabase
    .from('worship_alarms')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting alarm:', error);
    return;
  }
  state.worshipAlarms = state.worshipAlarms.filter(a => a.id !== id);
  renderWorshipAlarms();
}

async function toggleAlarmCompleted(id) {
  const alarm = state.worshipAlarms.find(a => a.id === id);
  if (!alarm) return;
  
  const nextState = !alarm.completed;
  alarm.completed = nextState;
  renderWorshipAlarms();
  
  const { error } = await supabase
    .from('worship_alarms')
    .update({ completed: nextState })
    .eq('id', id);
    
  if (error) {
    console.error('Error updating alarm completed status:', error);
    // revert
    alarm.completed = !nextState;
    renderWorshipAlarms();
  }
}

function adjustWorshipTally(amount) {
  if (!state.user) return;
  const key = `bb_worship_tally_${state.user.id}`;
  let val = parseInt(localStorage.getItem(key) || '0');
  val += amount;
  if (val < 0) val = 0;
  
  localStorage.setItem(key, val.toString());
  DOM.worshipTallyVal.textContent = val.toString().padStart(3, '0');
  updateHomeProgress();
}

// Alarm system monitoring loop
let alarmIntervalId = null;
let triggeredAlarmsThisMinute = new Set();

function startSystemClock() {
  if (alarmIntervalId) clearInterval(alarmIntervalId);
  
  alarmIntervalId = setInterval(() => {
    const now = new Date();
    const hrs = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    const currentHM = `${hrs}:${mins}`;
    
    // Clear trigger list at start of new minute
    if (now.getSeconds() === 0) {
      triggeredAlarmsThisMinute.clear();
    }
    
    state.worshipAlarms.forEach(alarm => {
      if (alarm.time === currentHM && !alarm.completed && !triggeredAlarmsThisMinute.has(alarm.id)) {
        triggeredAlarmsThisMinute.add(alarm.id);
        triggerAlarmAlert(alarm);
      }
    });
  }, 1000);
}

function stopSystemClock() {
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

function triggerAlarmAlert(alarm) {
  triggerSoundAlert();
  
  // Show notification
  alert(`🔔 WARRIOR ALARM: Time for Prayer scheduled at ${alarm.time}!`);
}

// ==========================================================
// 3. DISCIPLINE PANEL MODULE (To-Do & Drag-and-Drop)
// ==========================================================
async function loadDisciplineTodos() {
  const { data, error } = await supabase
    .from('discipline_todos')
    .select('*')
    .eq('user_id', state.user.id)
    .order('position', { ascending: true });
    
  if (error) {
    console.error('Error loading todos:', error);
    return;
  }
  state.disciplineTodos = data || [];
  renderDisciplineTodos();
}

function renderDisciplineTodos() {
  DOM.disciplineList.innerHTML = '';
  
  if (state.disciplineTodos.length === 0) {
    DOM.disciplineList.innerHTML = `
      <div class="glass-panel text-dim font-body" style="padding:20px; text-align:center;">
        Pure focus. Add items to your daily checklist.
      </div>
    `;
    return;
  }
  
  state.disciplineTodos.forEach((todo, index) => {
    const card = document.createElement('div');
    card.className = `todo-item-card glass-panel ${todo.completed ? 'completed-todo' : ''}`;
    card.draggable = true;
    card.dataset.id = todo.id;
    card.dataset.index = index;
    
    // Left side checkbox & details
    const left = document.createElement('div');
    left.className = 'todo-left';
    
    const checkbox = document.createElement('div');
    checkbox.className = `todo-checkbox ${todo.completed ? 'checked' : ''}`;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTodoCompleted(todo.id);
    });
    left.appendChild(checkbox);
    
    const details = document.createElement('div');
    details.className = 'todo-details';
    
    const title = document.createElement('span');
    title.className = 'todo-title-text font-body';
    title.textContent = todo.title;
    details.appendChild(title);
    
    if (todo.time) {
      const timeBadge = document.createElement('span');
      timeBadge.className = 'todo-time-badge font-header';
      timeBadge.textContent = todo.time;
      details.appendChild(timeBadge);
    }
    
    // Render sub-checkboxes if present
    if (Array.isArray(todo.checkboxes) && todo.checkboxes.length > 0) {
      const subContainer = document.createElement('div');
      subContainer.className = 'todo-subtasks-container';
      
      todo.checkboxes.forEach((sub, subIdx) => {
        const row = document.createElement('div');
        row.className = 'subtask-row';
        
        const subBox = document.createElement('div');
        subBox.className = `subtask-box ${sub.checked ? 'checked' : ''}`;
        subBox.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSubtaskCompleted(todo.id, subIdx);
        });
        
        const subText = document.createElement('span');
        subText.className = `subtask-text font-body ${sub.checked ? 'checked' : ''}`;
        subText.textContent = sub.text;
        
        row.appendChild(subBox);
        row.appendChild(subText);
        subContainer.appendChild(row);
      });
      details.appendChild(subContainer);
    }
    
    left.appendChild(details);
    card.appendChild(left);
    
    // Right side drag handle and delete cross
    const right = document.createElement('div');
    right.className = 'todo-right';
    
    const delBtn = document.createElement('button');
    delBtn.className = 'exercise-control-btn';
    delBtn.innerHTML = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTodo(todo.id);
    });
    right.appendChild(delBtn);
    
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.innerHTML = '☰';
    right.appendChild(handle);
    
    card.appendChild(right);
    
    // Drag and Drop Event Listeners
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('drop', handleDrop);
    
    DOM.disciplineList.appendChild(card);
  });
  updateHomeProgress();
}

async function addTodo(title, time, checkboxes) {
  try {
    const position = state.disciplineTodos.length;
    const { data, error } = await supabase
      .from('discipline_todos')
      .insert([{
        user_id: state.user.id,
        title: title,
        time: time || null,
        completed: false,
        position: position,
        checkboxes: checkboxes
      }])
      .select()
      .single();
      
    if (error) throw error;
    state.disciplineTodos.push(data);
    renderDisciplineTodos();
  } catch (error) {
    console.error('Error adding todo:', error);
  }
}

async function deleteTodo(id) {
  const { error } = await supabase
    .from('discipline_todos')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting todo:', error);
    return;
  }
  state.disciplineTodos = state.disciplineTodos.filter(t => t.id !== id);
  renderDisciplineTodos();
}

async function toggleTodoCompleted(id) {
  const todo = state.disciplineTodos.find(t => t.id === id);
  if (!todo) return;
  
  const nextCompleted = !todo.completed;
  todo.completed = nextCompleted;
  
  // Also update all sub-checkboxes if completed
  if (nextCompleted && Array.isArray(todo.checkboxes)) {
    todo.checkboxes.forEach(sub => sub.checked = true);
  }
  
  renderDisciplineTodos();
  
  const { error } = await supabase
    .from('discipline_todos')
    .update({ 
      completed: nextCompleted,
      checkboxes: todo.checkboxes 
    })
    .eq('id', id);
  if (error) console.error('Error updating todo completion:', error);
}

async function toggleSubtaskCompleted(todoId, subIndex) {
  const todo = state.disciplineTodos.find(t => t.id === todoId);
  if (!todo || !Array.isArray(todo.checkboxes)) return;
  
  todo.checkboxes[subIndex].checked = !todo.checkboxes[subIndex].checked;
  
  // Check if all subtasks are complete, to mark overall completed
  const allDone = todo.checkboxes.every(sub => sub.checked);
  todo.completed = allDone;
  
  renderDisciplineTodos();
  
  const { error } = await supabase
    .from('discipline_todos')
    .update({ 
      checkboxes: todo.checkboxes,
      completed: todo.completed
    })
    .eq('id', todoId);
  if (error) console.error('Error toggling subtask status:', error);
}

function sortTodosByTime() {
  state.disciplineTodos.sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
  
  // Save position adjustments back
  saveTodoPositions();
  renderDisciplineTodos();
}

// Drag and drop states
let dragSourceElement = null;

function handleDragStart(e) {
  dragSourceElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  return false;
}

function handleDragEnd() {
  this.classList.remove('dragging');
  const cards = document.querySelectorAll('.todo-item-card');
  cards.forEach(c => c.classList.remove('dragging'));
}

async function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  
  const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'));
  const targetIdx = parseInt(this.dataset.index);
  
  if (sourceIdx === targetIdx) return;
  
  // Reorder array
  const temp = state.disciplineTodos.splice(sourceIdx, 1)[0];
  state.disciplineTodos.splice(targetIdx, 0, temp);
  
  // Update UI immediately
  renderDisciplineTodos();
  
  // Save position details to Supabase
  await saveTodoPositions();
}

async function saveTodoPositions() {
  // Map positions
  const updates = state.disciplineTodos.map((todo, idx) => {
    todo.position = idx;
    return supabase
      .from('discipline_todos')
      .update({ position: idx })
      .eq('id', todo.id);
  });
  
  try {
    await Promise.all(updates);
  } catch (error) {
    console.error('Error updating positions:', error);
  }
}

// ==========================================================
// 4. FOCUS PANEL MODULE (Finance ledger & notes)
// ==========================================================
async function loadFocusNotes() {
  const { data, error } = await supabase
    .from('focus_notes')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error loading finance notes:', error);
    return;
  }
  state.focusNotes = data || [];
  renderFinanceLedger();
}

function renderFinanceLedger() {
  DOM.financeLedgerList.innerHTML = '';
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  state.focusNotes.forEach(note => {
    const amt = parseFloat(note.amount);
    if (note.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  });
  
  const netBalance = totalIncome - totalExpense;
  
  // Render headers
  DOM.netBalanceVal.textContent = `$${netBalance.toFixed(2)}`;
  DOM.totalIncomeVal.textContent = `+$${totalIncome.toFixed(2)}`;
  DOM.totalExpenseVal.textContent = `-$${totalExpense.toFixed(2)}`;
  
  if (state.focusNotes.length === 0) {
    DOM.financeLedgerList.innerHTML = `
      <div class="glass-panel text-dim font-body" style="padding:20px; text-align:center;">
        No financial logs found. Tap the button to log a notes entry.
      </div>
    `;
    return;
  }
  
  state.focusNotes.forEach(note => {
    const card = document.createElement('div');
    card.className = `ledger-card glass-panel ${note.type}`;
    
    const info = document.createElement('div');
    info.className = 'ledger-info';
    
    const title = document.createElement('span');
    title.className = 'ledger-title font-body';
    title.textContent = note.title;
    info.appendChild(title);
    
    if (note.notes) {
      const notes = document.createElement('span');
      notes.className = 'ledger-notes font-body';
      notes.textContent = note.notes;
      info.appendChild(notes);
    }
    
    const dateStr = new Date(note.created_at).toLocaleDateString();
    const dateBadge = document.createElement('span');
    dateBadge.className = 'ledger-date font-body';
    dateBadge.textContent = dateStr;
    info.appendChild(dateBadge);
    
    card.appendChild(info);
    
    const amountVal = document.createElement('span');
    amountVal.className = 'ledger-amount font-header';
    amountVal.textContent = `${note.type === 'income' ? '+' : '-'}$${parseFloat(note.amount).toFixed(2)}`;
    
    const rightSide = document.createElement('div');
    rightSide.style.display = 'flex';
    rightSide.style.alignItems = 'center';
    rightSide.style.gap = '10px';
    
    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    delBtn.style.position = 'static';
    delBtn.addEventListener('click', () => {
      deleteFinanceNote(note.id);
    });
    
    rightSide.appendChild(amountVal);
    rightSide.appendChild(delBtn);
    card.appendChild(rightSide);
    
    DOM.financeLedgerList.appendChild(card);
  });
  updateHomeProgress();
}

async function addFinanceNote(title, amount, type, notes) {
  try {
    const { data, error } = await supabase
      .from('focus_notes')
      .insert([{
        user_id: state.user.id,
        title: title,
        amount: parseFloat(amount),
        type: type,
        notes: notes || null
      }])
      .select()
      .single();
      
    if (error) throw error;
    state.focusNotes.unshift(data);
    renderFinanceLedger();
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

async function deleteFinanceNote(id) {
  const { error } = await supabase
    .from('focus_notes')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error('Error deleting transaction:', error);
    return;
  }
  state.focusNotes = state.focusNotes.filter(f => f.id !== id);
  renderFinanceLedger();
}

// ==========================================================
// Widgets Integration (Top Bar & Modals)
// ==========================================================
function initWidgets() {
  // Init displays
  DOM.headerTallyVal.textContent = state.globalTally;
  DOM.modalTallyVal.textContent = state.globalTally;
  
  // Tally Controls
  const adjustTally = (delta) => {
    state.globalTally += delta;
    if (state.globalTally < 0) state.globalTally = 0;
    localStorage.setItem('bb_global_tally', state.globalTally);
    DOM.headerTallyVal.textContent = state.globalTally;
    DOM.modalTallyVal.textContent = state.globalTally;
  };
  
  DOM.modalTallyMinus.addEventListener('click', () => adjustTally(-1));
  DOM.modalTallyPlus.addEventListener('click', () => adjustTally(1));
  
  // Global Timer UI controls
  updateTimerUI();
  
  DOM.timerReset.addEventListener('click', () => {
    stopGlobalTimer();
    const min = parseInt(DOM.timerInputMin.value) || 0;
    const sec = parseInt(DOM.timerInputSec.value) || 0;
    state.timer.totalSeconds = (min * 60) + sec;
    localStorage.setItem('bb_timer_seconds', state.timer.totalSeconds);
    updateTimerUI();
  });
  
  DOM.timerToggle.addEventListener('click', () => {
    if (state.timer.isRunning) {
      stopGlobalTimer();
    } else {
      startGlobalTimer();
    }
  });

  // Global Stopwatch controls
  updateStopwatchUI();
  renderStopwatchLaps();
  
  DOM.stopwatchToggle.addEventListener('click', () => {
    if (state.stopwatch.isRunning) {
      stopGlobalStopwatch();
    } else {
      startGlobalStopwatch();
    }
  });
  
  DOM.stopwatchReset.addEventListener('click', () => {
    resetGlobalStopwatch();
  });
  
  DOM.stopwatchLap.addEventListener('click', () => {
    recordGlobalStopwatchLap();
  });
}

// 1. Global Timer Functions
function updateTimerUI() {
  const currentVal = state.timer.isRunning ? state.timer.remainingSeconds : state.timer.totalSeconds;
  const mins = Math.floor(currentVal / 60);
  const secs = currentVal % 60;
  const str = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  
  DOM.headerTimerVal.textContent = str;
  DOM.timerToggle.textContent = state.timer.isRunning ? 'PAUSE' : 'START';
}

function startGlobalTimer() {
  if (state.timer.isRunning) return;
  
  if (state.timer.remainingSeconds <= 0) {
    const min = parseInt(DOM.timerInputMin.value) || 0;
    const sec = parseInt(DOM.timerInputSec.value) || 0;
    state.timer.totalSeconds = (min * 60) + sec;
    state.timer.remainingSeconds = state.timer.totalSeconds;
  }
  
  state.timer.isRunning = true;
  updateTimerUI();
  
  state.timer.intervalId = setInterval(() => {
    state.timer.remainingSeconds--;
    updateTimerUI();
    
    if (state.timer.remainingSeconds <= 0) {
      stopGlobalTimer();
      triggerSoundAlert();
      alert('⏰ TIMER DONE: Focus target completed.');
    }
  }, 1000);
}

function stopGlobalTimer() {
  state.timer.isRunning = false;
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  updateTimerUI();
}

// 2. Global Stopwatch Functions
function updateStopwatchUI() {
  const display = formatStopwatchDisplay(state.stopwatch.elapsedTime);
  DOM.headerStopwatchVal.textContent = display;
  DOM.modalStopwatchVal.textContent = display;
  DOM.stopwatchToggle.textContent = state.stopwatch.isRunning ? 'PAUSE' : 'START';
}

function formatStopwatchDisplay(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const cents = Math.floor((ms % 1000) / 10); // Centiseconds
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
}

function startGlobalStopwatch() {
  if (state.stopwatch.isRunning) return;
  state.stopwatch.isRunning = true;
  state.stopwatch.startTime = Date.now() - state.stopwatch.elapsedTime;
  
  state.stopwatch.intervalId = setInterval(() => {
    state.stopwatch.elapsedTime = Date.now() - state.stopwatch.startTime;
    updateStopwatchUI();
  }, 33); // approx 30fps
}

function stopGlobalStopwatch() {
  state.stopwatch.isRunning = false;
  if (state.stopwatch.intervalId) {
    clearInterval(state.stopwatch.intervalId);
    state.stopwatch.intervalId = null;
  }
  updateStopwatchUI();
}

function resetGlobalStopwatch() {
  stopGlobalStopwatch();
  state.stopwatch.elapsedTime = 0;
  state.stopwatch.laps = [];
  localStorage.setItem('bb_stopwatch_laps', '[]');
  updateStopwatchUI();
  renderStopwatchLaps();
}

function recordGlobalStopwatchLap() {
  if (!state.stopwatch.isRunning) return;
  const time = formatStopwatchDisplay(state.stopwatch.elapsedTime);
  const lapNum = state.stopwatch.laps.length + 1;
  state.stopwatch.laps.unshift({ lapNum, time });
  localStorage.setItem('bb_stopwatch_laps', JSON.stringify(state.stopwatch.laps));
  renderStopwatchLaps();
}

function renderStopwatchLaps() {
  DOM.stopwatchLapsList.innerHTML = '';
  if (state.stopwatch.laps.length === 0) {
    DOM.stopwatchLapsList.innerHTML = `<p class="font-body text-dim" style="text-align:center;">No laps logged yet.</p>`;
    return;
  }
  
  state.stopwatch.laps.forEach(lap => {
    const item = document.createElement('div');
    item.className = 'stopwatch-lap-item font-body';
    item.innerHTML = `<span>LAP ${lap.lapNum}</span> <span>${lap.time}</span>`;
    DOM.stopwatchLapsList.appendChild(item);
  });
}

// ==========================================================
// Setup DOM Event Listeners & UI binders
// ==========================================================
// ==========================================================
// Setup DOM Event Listeners & UI binders
// ==========================================================
function setupEventListeners() {
  // Theme Toggle
  DOM.themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  });

  // Navigation Panel Switches
  DOM.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchPanel(tab.dataset.target);
    });
  });

  // Workout Muscle Box Clicks & Mobile Touches
  DOM.muscleBoxes.forEach(box => {
    box.addEventListener('click', () => {
      openMuscleSubpage(box.dataset.part);
    });
    // Swipe/Touch support: toggles class to show name label
    box.addEventListener('touchstart', (e) => {
      DOM.muscleBoxes.forEach(b => {
        if (b !== box) b.classList.remove('touch-active');
      });
      box.classList.toggle('touch-active');
    });
  });
  
  DOM.closeSubpageBtn.addEventListener('click', () => {
    DOM.bodyPartSubpage.classList.add('hidden');
    state.selectedMusclePart = null;
    loadWorkouts(); // reload latest values
  });

  // Floating Add Exercise Controls
  DOM.triggerAddExerciseBtn.addEventListener('click', () => {
    DOM.addExerciseModal.classList.remove('hidden');
  });
  
  DOM.cancelExerciseBtn.addEventListener('click', () => {
    DOM.addExerciseModal.classList.add('hidden');
    DOM.addExerciseForm.reset();
  });
  
  DOM.addExerciseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('exerciseName').value;
    const type = document.getElementById('counterType').value;
    
    if (name) {
      await addWorkoutExercise(name, type);
      DOM.addExerciseModal.classList.add('hidden');
      DOM.addExerciseForm.reset();
    }
  });

  // Worship Add Alarm
  DOM.addAlarmBtn.addEventListener('click', () => {
    DOM.addAlarmModal.classList.remove('hidden');
  });
  
  DOM.cancelAlarmBtn.addEventListener('click', () => {
    DOM.addAlarmModal.classList.add('hidden');
    DOM.addAlarmForm.reset();
  });
  
  DOM.addAlarmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = DOM.alarmTime.value;
    if (val) {
      await addWorshipAlarm(val);
      DOM.addAlarmModal.classList.add('hidden');
      DOM.addAlarmForm.reset();
    }
  });

  DOM.alarmTime = document.getElementById('alarmTime');
  
  DOM.worshipTallyMinus.addEventListener('click', () => adjustWorshipTally(-1));
  DOM.worshipTallyPlus.addEventListener('click', () => adjustWorshipTally(1));

  // Discipline Add To-Do
  DOM.addTodoBtn.addEventListener('click', () => {
    // Clear subtask inputs first
    DOM.subtaskInputsContainer.innerHTML = '';
    DOM.addTodoModal.classList.remove('hidden');
  });
  
  DOM.cancelTodoBtn.addEventListener('click', () => {
    DOM.addTodoModal.classList.add('hidden');
    DOM.addTodoForm.reset();
  });
  
  DOM.addSubtaskFieldBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'subtask-input-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Subtask details';
    input.className = 'subtask-field';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-subtask-field-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      row.remove();
    });
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    DOM.subtaskInputsContainer.appendChild(row);
  });
  
  DOM.addTodoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('todoTitle').value;
    const time = document.getElementById('todoTime').value;
    
    const checkboxes = [];
    const fields = DOM.subtaskInputsContainer.querySelectorAll('.subtask-field');
    fields.forEach(f => {
      if (f.value.trim()) {
        checkboxes.push({ text: f.value.trim(), checked: false });
      }
    });
    
    if (title) {
      await addTodo(title, time, checkboxes);
      DOM.addTodoModal.classList.add('hidden');
      DOM.addTodoForm.reset();
    }
  });
  
  DOM.sortTodoTimeBtn.addEventListener('click', () => {
    sortTodosByTime();
  });

  // Focus Finance ledger
  DOM.addFinanceBtn.addEventListener('click', () => {
    DOM.addFinanceModal.classList.remove('hidden');
  });
  
  DOM.cancelFinanceBtn.addEventListener('click', () => {
    DOM.addFinanceModal.classList.add('hidden');
    DOM.addFinanceForm.reset();
  });
  
  DOM.addFinanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('financeTitle').value;
    const amount = document.getElementById('financeAmount').value;
    const type = document.getElementById('financeType').value;
    const notes = document.getElementById('financeNotes').value;
    
    if (title && amount) {
      await addFinanceNote(title, amount, type, notes);
      DOM.addFinanceModal.classList.add('hidden');
      DOM.addFinanceForm.reset();
    }
  });

  // Auth Forms Switch
  DOM.toSignup.addEventListener('click', () => {
    DOM.loginForm.classList.add('hidden');
    DOM.signupForm.classList.remove('hidden');
    DOM.authError.textContent = '';
  });
  
  DOM.toLogin.addEventListener('click', () => {
    DOM.signupForm.classList.add('hidden');
    DOM.loginForm.classList.remove('hidden');
    DOM.authError.textContent = '';
  });
  
  DOM.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.authError.textContent = '';
    
    const submitBtn = DOM.loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'CONNECTING...';
    submitBtn.disabled = true;
    
    try {
      const email = document.getElementById('loginEmail').value.trim();
      const pass = document.getElementById('loginPassword').value;
      
      if (!email || !pass) {
        DOM.authError.textContent = 'Please enter both email and password.';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      console.log('[Auth] Attempting login for:', email);
      
      // Clear old token key to prevent potential lock conflicts or stale sessions
      try { window.localStorage.removeItem('bb-auth-token'); } catch (_) {}
      
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password: pass }),
        15000
      );
      
      console.log('[Auth] Login response received. Error:', error, 'Session:', !!data?.session);
      
      if (error) {
        DOM.authError.textContent = error.message;
      } else if (!data?.session) {
        DOM.authError.textContent = 'No session returned. Try registering a new account first.';
      }
    } catch (err) {
      console.error('[Auth] Login exception:', err);
      DOM.authError.textContent = err.message;
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
  
  DOM.signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    DOM.authError.textContent = '';
    
    const submitBtn = DOM.signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'CREATING...';
    submitBtn.disabled = true;
    
    try {
      const name = document.getElementById('signupUsername').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const pass = document.getElementById('signupPassword').value;
      
      if (!name || !email || !pass) {
        DOM.authError.textContent = 'Please fill in all fields.';
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        return;
      }
      
      console.log('[Auth] Attempting signup for:', email, 'username:', name);
      
      // Clear old token key to prevent potential lock conflicts or stale sessions
      try { window.localStorage.removeItem('bb-auth-token'); } catch (_) {}
      
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email: email,
          password: pass,
          options: { data: { username: name } }
        }),
        15000
      );
      
      console.log('[Auth] Signup response received. Error:', error, 'Session:', !!data?.session, 'User:', !!data?.user);
      
      if (error) {
        DOM.authError.textContent = error.message;
      } else if (data?.session) {
        // Auto-login happened (email confirmation disabled) — onAuthStateChange handles the rest
        console.log('[Auth] Auto-login session received, transitioning to app...');
      } else if (data?.user && !data?.session) {
        DOM.authError.style.color = '#f39c12';
        DOM.authError.textContent = 'Account created! Check your email to confirm, then log in.';
        setTimeout(() => { DOM.authError.style.color = ''; }, 5000);
        DOM.signupForm.classList.add('hidden');
        DOM.loginForm.classList.remove('hidden');
      } else {
        DOM.authError.textContent = 'Unexpected response. Please try again.';
      }
    } catch (err) {
      console.error('[Auth] Signup exception:', err);
      DOM.authError.textContent = err.message;
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  // Top widgets click to open popups
  DOM.timerWidgetBtn.addEventListener('click', () => {
    DOM.globalTimerModal.classList.remove('hidden');
  });
  DOM.closeTimerModal.addEventListener('click', () => {
    DOM.globalTimerModal.classList.add('hidden');
  });
  
  DOM.stopwatchWidgetBtn.addEventListener('click', () => {
    DOM.globalStopwatchModal.classList.remove('hidden');
  });
  DOM.closeStopwatchModal.addEventListener('click', () => {
    DOM.globalStopwatchModal.classList.add('hidden');
  });
  
  DOM.tallyWidgetBtn.addEventListener('click', () => {
    DOM.globalTallyModal.classList.remove('hidden');
  });
  DOM.closeTallyModal.addEventListener('click', () => {
    DOM.globalTallyModal.classList.add('hidden');
  });

  // Account Modal toggle
  DOM.profileBtn.addEventListener('click', () => {
    DOM.accountModal.classList.remove('hidden');
    updateProfileUI();
  });
  DOM.closeAccountModalBtn.addEventListener('click', () => {
    DOM.accountModal.classList.add('hidden');
    DOM.securityMessage.textContent = '';
  });
  
  DOM.logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      DOM.accountModal.classList.add('hidden');
    }
  });
  
  // Custom Local Avatar Upload Binding
  DOM.avatarUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 150; // Resize avatar for db storage efficiency
        let w = img.width;
        let h = img.height;
        
        if (w > h) {
          if (w > maxDim) {
            h = Math.round(h * maxDim / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round(w * maxDim / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        DOM.accountAvatar.src = dataUrl;
        state.customAvatarDataUrl = dataUrl;
        
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
  
  DOM.saveProfileBtn.addEventListener('click', async () => {
    const name = DOM.profileUsername.value.trim();
    // Save Base64 upload if available, else fall back to the existing profile avatar or empty string
    const avatar = state.customAvatarDataUrl || (state.profile ? state.profile.avatar_url : '');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: name,
          avatar_url: avatar
        })
        .eq('id', state.user.id);
        
      if (error) throw error;
      alert('Profile updated successfully!');
      state.customAvatarDataUrl = null; // Reset local upload state
      await loadUserProfile();
    } catch (e) {
      alert(`Error updating profile: ${e.message}`);
    }
  });
  
  DOM.sessionLogHeader.addEventListener('click', () => {
    DOM.sessionLogContent.classList.toggle('hidden');
  });
  
  DOM.updatePasswordBtn.addEventListener('click', async () => {
    DOM.securityMessage.textContent = '';
    const pass = DOM.newPassword.value;
    if (pass.length < 6) {
      DOM.securityMessage.textContent = 'Password must be at least 6 characters.';
      return;
    }
    
    const { error } = await supabase.auth.updateUser({
      password: pass
    });
    
    if (error) {
      DOM.securityMessage.textContent = error.message;
    } else {
      DOM.securityMessage.style.color = '#2ecc71';
      DOM.securityMessage.textContent = 'Password updated successfully!';
      DOM.newPassword.value = '';
      setTimeout(() => {
        DOM.securityMessage.style.color = '';
        DOM.securityMessage.textContent = '';
      }, 3000);
    }
  });

}

// Parallax scrolling mouse effect (slight shift)
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX - window.innerWidth / 2) / 60;
  const y = (e.clientY - window.innerHeight / 2) / 60;
  DOM.appBg.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
});

// ==========================================================
// Home Section Progress & Quote Rotator
// ==========================================================
const quotes = [
  "YOUR FUTURE DEPENDS ON TODAY",
  "PAIN IS TEMPORARY, PRIDE IS ETERNAL",
  "CONQUER YOURSELF BEFORE YOU CONQUER THE WORLD",
  "A SWORD IS FORGED IN THE HOTTEST FIRE",
  "DISCIPLINE IS THE BRIDGE BETWEEN GOALS AND ACCOMPLISHMENT",
  "WHAT WE DO TODAY ECHOES IN ETERNITY",
  "HE WHO CONQUERS HIMSELF IS THE MIGHTIEST WARRIOR"
];
let quoteIndex = 0;

function startQuoteRotation() {
  setInterval(() => {
    if (DOM.homeQuoteText) {
      DOM.homeQuoteText.style.transition = 'opacity 0.3s ease';
      DOM.homeQuoteText.style.opacity = '0';
      setTimeout(() => {
        quoteIndex = (quoteIndex + 1) % quotes.length;
        DOM.homeQuoteText.textContent = `"${quotes[quoteIndex]}"`;
        DOM.homeQuoteText.style.opacity = '1';
      }, 300);
    }
  }, 10000);
}

function updateHomeProgress() {
  if (!state.user) return;

  // 1. Workout Progress
  const totalWorkouts = state.workouts.length;
  const completedWorkouts = state.workouts.filter(w => w.status).length;
  const workoutPct = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;
  
  if (DOM.progressWorkoutVal && DOM.progressWorkoutBar) {
    DOM.progressWorkoutVal.textContent = `${completedWorkouts} / ${totalWorkouts} Done (${workoutPct}%)`;
    DOM.progressWorkoutBar.style.width = `${workoutPct}%`;
  }

  // 2. Worship Progress
  const totalAlarms = state.worshipAlarms.length;
  const completedAlarms = state.worshipAlarms.filter(a => a.completed).length;
  const worshipPct = totalAlarms > 0 ? Math.round((completedAlarms / totalAlarms) * 100) : 0;
  
  if (DOM.progressWorshipVal && DOM.progressWorshipBar) {
    const key = `bb_worship_tally_${state.user.id}`;
    const tallyVal = localStorage.getItem(key) || '0';
    DOM.progressWorshipVal.textContent = `${completedAlarms} / ${totalAlarms} Alarms (${worshipPct}%) | Prayer Tally: ${tallyVal}`;
    DOM.progressWorshipBar.style.width = `${worshipPct}%`;
  }

  // 3. Discipline Progress
  const totalTodos = state.disciplineTodos.length;
  const completedTodos = state.disciplineTodos.filter(t => t.completed).length;
  const todoPct = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
  
  if (DOM.progressDisciplineVal && DOM.progressDisciplineBar) {
    DOM.progressDisciplineVal.textContent = `${completedTodos} / ${totalTodos} Done (${todoPct}%)`;
    DOM.progressDisciplineBar.style.width = `${todoPct}%`;
  }

  // 4. Focus Finance Progress
  let totalIncome = 0;
  let totalExpense = 0;
  state.focusNotes.forEach(note => {
    const amt = parseFloat(note.amount);
    if (note.type === 'income') totalIncome += amt;
    else totalExpense += amt;
  });
  const netSavings = totalIncome - totalExpense;
  
  if (DOM.progressFocusVal && DOM.progressFocusBar) {
    DOM.progressFocusVal.textContent = `$${netSavings.toFixed(2)} Net Savings`;
    const focusBar = DOM.progressFocusBar;
    if (netSavings >= 0) {
      focusBar.style.width = '100%';
      focusBar.style.backgroundColor = '#2ecc71';
      focusBar.style.boxShadow = '0 0 8px rgba(46, 204, 113, 0.6)';
    } else {
      focusBar.style.width = '100%';
      focusBar.style.backgroundColor = 'var(--accent-red)';
      focusBar.style.boxShadow = '0 0 8px var(--accent-red-glow)';
    }
  }
}

// Start quote rotation on startup
startQuoteRotation();

// Start the application
initApp();
