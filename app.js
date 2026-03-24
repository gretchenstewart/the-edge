'use strict';

/* ══════════════════════════════════════════════════════════════
   DATA SERVICE
   All localStorage reads/writes live here.
   Swap for fetch() calls when Python API arrives — zero UI
   changes required.
   ══════════════════════════════════════════════════════════════ */
const DataService = {
  saveSession(sessionData) {
    const sessions = this.getSessions();
    sessions.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...sessionData
    });
    localStorage.setItem('edge_sessions', JSON.stringify(sessions));
  },

  getSessions() {
    const raw = localStorage.getItem('edge_sessions');
    return raw ? JSON.parse(raw) : [];
  }

  // FUTURE: replace localStorage with API calls
  // saveSession(data) { return fetch('/api/sessions', { method: 'POST', body: JSON.stringify(data) }); }
  // getSessions()     { return fetch('/api/sessions').then(r => r.json()); }
};


/* ══════════════════════════════════════════════════════════════
   LAYERS CONFIG — 8 layers of the decision tree
   ══════════════════════════════════════════════════════════════ */
const LAYERS = [
  {
    id: 'layer1',
    key: 'vedic_timing',
    name: 'Vedic Timing Gate',
    options: [
      { val: 'green',  label: 'Green',  score: 1 },
      { val: 'yellow', label: 'Yellow', score: 0 },
      {
        val: 'red', label: 'Red', score: null, hardStop: true,
        reason: 'Active eclipse, major malefic exact transit, or retrograde storm — avoid entirely'
      }
    ]
  },
  {
    id: 'layer2',
    key: 'weekly_chaos',
    name: 'Weekly Chaos State',
    options: [
      { val: 'trending', label: 'Trending', score: 2 },
      { val: 'random',   label: 'Random',   score: 0 },
      {
        val: 'chaotic', label: 'Chaotic', score: null, hardStop: true,
        reason: 'Weekly chaotic state means no swing setup exists. Wait for weekly to resolve.'
      }
    ]
  },
  {
    id: 'layer3',
    key: 'daily_chaos',
    name: 'Daily Chaos State',
    options: [
      { val: 'trending', label: 'Trending', score:  2 },
      { val: 'random',   label: 'Random',   score:  1 },
      { val: 'chaotic',  label: 'Chaotic',  score: -1 }
    ]
  },
  {
    id: 'layer4',
    key: 'tf_alignment',
    name: 'Timeframe Alignment',
    options: [
      { val: 'all',     label: 'All',     score: 2 },
      { val: 'partial', label: 'Partial', score: 1 },
      { val: 'none',    label: 'None',    score: 0 }
    ]
  },
  {
    id: 'layer5',
    key: 'strength_index',
    name: 'Strength Index (Weekly)',
    options: [
      { val: 'vstrong',  label: 'Very Strong', score:  2 },
      { val: 'strong',   label: 'Strong',      score:  1 },
      { val: 'moderate', label: 'Moderate',    score:  0 },
      { val: 'weak',     label: 'Weak',        score: -1 }
    ]
  },
  {
    id: 'layer6',
    key: 'technical_setup',
    name: 'Technical Setup',
    options: [
      { val: 'clean',  label: 'Clean',         score: 2 },
      { val: 'decent', label: 'Decent',         score: 1 },
      { val: 'nml',    label: "No-man's Land",  score: 0 }
    ]
  },
  {
    id: 'layer7',
    key: 'somatic_check',
    name: 'Somatic Check',
    options: [
      { val: 'ease',    label: 'Ease',    score: 2 },
      { val: 'neutral', label: 'Neutral', score: 0 },
      {
        val: 'anxiety', label: 'Anxiety', score: null, hardStop: true,
        reason: "Solar plexus anxiety = no trade. Documented history says don't override this."
      }
    ]
  },
  {
    id: 'layer8',
    key: 'somatic_visual',
    name: 'Somatic vs Visual',
    options: [
      { val: 'agree',    label: 'Agree',    score:  0 },
      { val: 'disagree', label: 'Disagree', score: -2 }
    ]
  }
];

const LAYER_NAMES = {
  layer1: 'Vedic timing',
  layer2: 'Weekly chaos',
  layer3: 'Daily chaos',
  layer4: 'TF alignment',
  layer5: 'Strength Index',
  layer6: 'Technical',
  layer7: 'Somatic',
  layer8: 'Som/Visual'
};


/* ══════════════════════════════════════════════════════════════
   SCORE ENGINE — fully isolated from the UI.
   Replace the body of calculateScore() with a fetch('/api/score')
   call when the Python backend arrives — zero other changes needed.
   ══════════════════════════════════════════════════════════════ */

function getGrade(score) {
  if (score >= 9) return { grade: 'A+', label: 'Full position',    color: 'success' };
  if (score >= 7) return { grade: 'A',  label: 'Standard position', color: 'success' };
  if (score >= 5) return { grade: 'B+', label: 'Reduced size',      color: 'warning' };
  if (score >= 3) return { grade: 'B',  label: 'Watch only',        color: 'warning' };
  return           { grade: 'X',  label: 'No trade',          color: 'danger'  };
}

// INPUT:  { layer1: { val, score }, layer2: { val, score }, … }
// OUTPUT: { score, grade, label, color, hardStop, hardStopLayer,
//           hardStopReason, layerBreakdown }
function calculateScore(inputs) {
  // ── Hard stop check (before any arithmetic) ──────────────
  const HARD_STOPS = {
    layer1: { val: 'red',     reason: 'Active eclipse, major malefic exact transit, or retrograde storm — avoid entirely' },
    layer2: { val: 'chaotic', reason: 'Weekly chaotic state means no swing setup exists. Wait for weekly to resolve.' },
    layer7: { val: 'anxiety', reason: "Solar plexus anxiety = no trade. Documented history says don't override this." }
  };

  for (const [layer, cfg] of Object.entries(HARD_STOPS)) {
    if (inputs[layer] && inputs[layer].val === cfg.val) {
      return {
        score:         null,
        grade:         null,
        label:         null,
        color:         'danger',
        hardStop:      true,
        hardStopLayer: layer,
        hardStopReason: cfg.reason
      };
    }
  }

  // ── Sum scores ────────────────────────────────────────────
  let total = 0;
  const breakdown = [];

  for (const [layer, data] of Object.entries(inputs)) {
    total += data.score;
    breakdown.push({
      layer,
      name:  LAYER_NAMES[layer] || layer,
      score: data.score
    });
  }

  const verdict = getGrade(total);

  return {
    score:          total,
    grade:          verdict.grade,
    label:          verdict.label,
    color:          verdict.color,
    hardStop:       false,
    hardStopLayer:  null,
    hardStopReason: null,
    layerBreakdown: breakdown
  };
}


/* ══════════════════════════════════════════════════════════════
   MARKET SESSION — ET timezone
   ══════════════════════════════════════════════════════════════ */

function isDST(date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== date.getTimezoneOffset();
}

function getMarketSession() {
  const now = new Date();
  const etOffset = isDST(now) ? -4 : -5;
  const et = new Date(now.getTime() + (etOffset * 60 + now.getTimezoneOffset()) * 60000);

  const totalMins = et.getHours() * 60 + et.getMinutes();
  const day = et.getDay(); // 0 = Sun, 6 = Sat

  if (day === 0 || day === 6)
    return { label: 'Market Closed', status: 'closed',     pulse: false };
  if (totalMins >= 240  && totalMins < 570)
    return { label: 'Pre-Market',    status: 'premarket',  pulse: false };
  if (totalMins >= 570  && totalMins < 960)
    return { label: 'Market Open',   status: 'open',       pulse: true  };
  if (totalMins >= 960  && totalMins < 1200)
    return { label: 'After Hours',   status: 'afterhours', pulse: false };

  return { label: 'Market Closed', status: 'closed', pulse: false };
}

function getETNow() {
  const now = new Date();
  const etOffset = isDST(now) ? -4 : -5;
  return new Date(now.getTime() + (etOffset * 60 + now.getTimezoneOffset()) * 60000);
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true
  }) + ' ET';
}


/* ══════════════════════════════════════════════════════════════
   APP STATE
   ══════════════════════════════════════════════════════════════ */
const state = {
  inputs: {},         // { layer1: { val, score }, … }
  sessionSaved: false
};


/* ══════════════════════════════════════════════════════════════
   RENDER — Entry Screen
   Called after every user interaction on the entry screen.
   ══════════════════════════════════════════════════════════════ */

function renderEntryScreen() {
  // ── Determine hard stop ────────────────────────────────────
  let hardStopIndex = -1;
  let hardStopReason = '';

  for (let i = 0; i < LAYERS.length; i++) {
    const sel = state.inputs[LAYERS[i].id];
    if (!sel) continue;
    const opt = LAYERS[i].options.find(o => o.val === sel.val);
    if (opt && opt.hardStop) {
      hardStopIndex = i;
      hardStopReason = opt.reason;
      break;
    }
  }

  // ── Hard stop banner ───────────────────────────────────────
  const banner = document.getElementById('hard-stop-banner');
  if (hardStopIndex >= 0) {
    banner.classList.add('visible');
    document.getElementById('hard-stop-reason').textContent = hardStopReason;
  } else {
    banner.classList.remove('visible');
  }

  // ── Layer cards ────────────────────────────────────────────
  const container = document.getElementById('layers-container');
  container.innerHTML = '';

  LAYERS.forEach((layer, i) => {
    const locked = hardStopIndex >= 0 && i > hardStopIndex;
    container.appendChild(buildLayerCard(layer, i, locked));
  });

  // ── Live score in header ───────────────────────────────────
  const scoreEl = document.getElementById('live-score');
  const liveScore = computeLiveScore(hardStopIndex);

  if (liveScore === null) {
    scoreEl.textContent = '—';
    scoreEl.classList.remove('is-stop');
  } else if (liveScore === 'STOP') {
    scoreEl.textContent = 'STOP';
    scoreEl.classList.add('is-stop');
  } else {
    scoreEl.textContent = liveScore;
    scoreEl.classList.remove('is-stop');
  }

  // ── Verdict card ───────────────────────────────────────────
  renderVerdict(hardStopIndex);
}

function buildLayerCard(layer, index, locked) {
  const card = document.createElement('div');
  card.className = 'layer-card' + (locked ? ' locked' : '');
  card.id = layer.id;

  const twoUp = layer.options.length === 2;
  const sel   = state.inputs[layer.id];

  card.innerHTML = `
    <span class="layer-num">Layer ${index + 1}</span>
    <div class="layer-name">${layer.name}</div>
    <div class="options-grid${twoUp ? ' two-up' : ''}">
      ${layer.options.map(opt => {
        const isSelected = sel && sel.val === opt.val;
        const isStop     = !!opt.hardStop;
        const scoreLabel = isStop ? 'STOP'
                         : opt.score > 0 ? `+${opt.score}`
                         : `${opt.score}`;
        const scoreClass = isStop           ? 'stop'
                         : opt.score > 0   ? 'pos'
                         : opt.score < 0   ? 'neg'
                         :                   'zero';
        return `
          <button
            class="option-btn${isSelected ? ' selected' : ''}${isSelected && isStop ? ' is-stop' : ''}"
            data-layer="${layer.id}"
            data-val="${opt.val}"
            data-score="${isStop ? 'null' : opt.score}"
            data-is-stop="${isStop}"
          >
            <span class="option-label">${opt.label}</span>
            <span class="option-score ${scoreClass}">${scoreLabel}</span>
          </button>`;
      }).join('')}
    </div>`;

  return card;
}

function computeLiveScore(hardStopIndex) {
  const count = Object.keys(state.inputs).length;
  if (count === 0) return null;
  if (hardStopIndex >= 0) return 'STOP';

  let total = 0;
  for (const d of Object.values(state.inputs)) {
    total += (d.score || 0);
  }
  return total;
}

function allLayersFilled() {
  return LAYERS.every(l => state.inputs[l.id] !== undefined);
}

function renderVerdict(hardStopIndex) {
  const card = document.getElementById('verdict-card');

  if (hardStopIndex >= 0 || !allLayersFilled()) {
    card.classList.remove('visible', 'success', 'warning', 'danger');
    return;
  }

  // Build inputs map for calculateScore
  const inputs = {};
  for (const layer of LAYERS) inputs[layer.id] = state.inputs[layer.id];

  const result = calculateScore(inputs);

  card.classList.remove('success', 'warning', 'danger');
  card.classList.add('visible', result.color);

  document.getElementById('verdict-grade').textContent  = result.grade;
  document.getElementById('verdict-action').textContent = result.label;
  document.getElementById('verdict-score-total').innerHTML =
    `${result.score} <span class="denom">/ 13</span>`;

  // Breakdown pills
  const grid = document.getElementById('verdict-breakdown');
  grid.innerHTML = result.layerBreakdown.map(b => {
    const cls  = b.score > 0 ? 'pos' : b.score < 0 ? 'neg' : 'zero';
    const disp = b.score > 0 ? `+${b.score}` : `${b.score}`;
    return `<span class="breakdown-pill ${cls}">
      ${b.name}<span class="pill-score">&nbsp;${disp}</span>
    </span>`;
  }).join('');

  // Auto-save (once per analysis run)
  if (!state.sessionSaved) {
    DataService.saveSession(buildSessionData(result));
    state.sessionSaved = true;
  }
}

function buildSessionData(result) {
  const layers = {};
  for (const layer of LAYERS) {
    const sel = state.inputs[layer.id];
    if (sel) layers[layer.key] = sel.val;
  }
  return {
    layers,
    score:            result.score,
    grade:            result.grade,
    hard_stop:        result.hardStop,
    hard_stop_reason: result.hardStopReason,
    // Phase 2 fields — schema ready, values null for now
    instrument:    null,
    entry_price:   null,
    outcome:       null,
    outcome_notes: null
  };
}


/* ══════════════════════════════════════════════════════════════
   EVENTS
   ══════════════════════════════════════════════════════════════ */

function handleOptionClick(e) {
  const btn = e.target.closest('.option-btn');
  if (!btn) return;

  const layerId = btn.dataset.layer;
  const val     = btn.dataset.val;
  const isStop  = btn.dataset.isStop === 'true';
  const score   = isStop ? null : parseInt(btn.dataset.score, 10);

  state.inputs[layerId] = { val, score };

  // Changing an answer after verdict was shown resets the saved flag
  // so a new session is recorded if the user re-completes
  state.sessionSaved = false;

  renderEntryScreen();
}

function resetEntry() {
  state.inputs       = {};
  state.sessionSaved = false;
  renderEntryScreen();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/* ══════════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════════ */

function updateDashboard() {
  const et = getETNow();
  document.getElementById('dash-date').textContent = fmtDate(et);
  document.getElementById('dash-time').textContent = fmtTime(et);

  const session = getMarketSession();
  const badge   = document.getElementById('session-badge');
  badge.className = `session-badge ${session.status}`;
  document.getElementById('session-label').textContent = session.label;
}


/* ══════════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════════ */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goToEntry() {
  showScreen('screen-entry');
  renderEntryScreen();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function goToDashboard() {
  showScreen('screen-dashboard');
  window.scrollTo({ top: 0, behavior: 'instant' });
}


/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */

function init() {
  // Dashboard
  updateDashboard();
  setInterval(updateDashboard, 60_000);

  // Navigation
  document.getElementById('btn-open-tree').addEventListener('click', goToEntry);
  document.getElementById('btn-back').addEventListener('click', goToDashboard);

  // Option selection (event delegation — one listener for all 8 layers)
  document.getElementById('layers-container').addEventListener('click', handleOptionClick);

  // Reset / new analysis
  document.getElementById('btn-reset').addEventListener('click', resetEntry);

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .catch(err => console.warn('SW registration failed:', err));
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
