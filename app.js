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
    key: 'temporal_field',
    name: 'The Room',
    question: "What's the vibe?",
    description: "The opening read. Before anything else — is this a moment worth entering? Markets have texture. Read the room before you read anything else.",
    helper: "High-impact macro events today or within your hold window? (Fed, CPI, NFP, earnings on this instrument) | VIX environment — spiking or collapsing in ways that distort price? | Broader market regime intact, or sector rotation underway? | Does the day feel alive and directional, or heavy and unresolved?",
    options: [
      { val: 'resonant',  label: 'Resonant',  score: 1 },
      { val: 'murky',     label: 'Murky',     score: 0 },
      {
        val: 'disrupted', label: 'Disrupted', score: null, hardStop: true,
        reason: 'Macro Conditions are Disrupted — major scheduled catalyst imminent (Fed, CPI, NFP, earnings) or systemic stress active. Do not enter.'
      }
    ]
  },
  {
    id: 'layer2',
    key: 'weekly_chaos',
    name: 'Weekly Field State',
    question: "Is the market putting itself out there?",
    options: [
      { val: 'trending', label: 'Sovereign',  score: 2, description: "Directed, available, moving with intention." },
      { val: 'the_dud',  label: 'The Dud',    score: 0, description: "In the room but not arriving. The energy exists — it's just not leading anywhere. No grip, no direction, no commitment. He showed up. That's about it." },
      {
        val: 'chaotic', label: 'Tyrant', score: null, hardStop: true,
        reason: 'Weekly field is Tyrant — no swing setup exists. Wait for the weekly to resolve.',
        description: "Performing power it doesn't actually have."
      }
    ]
  },
  {
    id: 'layer3',
    key: 'daily_chaos',
    name: 'Daily Field State',
    question: "Is the pull real?",
    description: "Present-moment temperature check. The weekly showed interest — is the daily confirming? Genuine heat building toward you, or scattered and erratic?",
    options: [
      { val: 'trending', label: 'Sovereign', score:  1, description: "Real pull, building." },
      { val: 'the_dud',  label: 'The Dud',   score:  1, description: "Heat present, still coiling." },
      { val: 'chaotic',  label: 'Tyrant',    score: -1, description: "Scattered. Not today." }
    ]
  },
  {
    id: 'layer4',
    key: 'tf_alignment',
    name: 'Timeframe Convergence',
    question: "Is all of you pulling?",
    description: "Not a temperature read — a listening. Are every scale and register oriented the same direction simultaneously? Surface heat without systemic agreement is a named condition: wait.",
    options: [
      { val: 'all',     label: 'Full Convergence', score: 2, description: "Every timeframe saying the same thing." },
      { val: 'partial', label: 'Partial Accord',   score: 1, description: "Mostly aligned. One register hesitating." },
      { val: 'none',    label: 'Fractured',        score: 0, description: "Conflicting signals at different scales. Surface desire, systemic ambivalence." }
    ]
  },
  {
    id: 'layer5',
    key: 'strength_index',
    name: 'Signal Integrity',
    question: "Is there substance here?",
    description: "How deep does this actually go? Genuine Hurst persistence or surface agitation?",
    note: "Read via your Strength Index on the entry timeframe — Hurst persistence is the depth component that separates genuine trend conviction from surface momentum.",
    options: [
      { val: 'vstrong',  label: 'High Conviction', score:  1, description: "Full-body wanting. Real persistence beneath the move." },
      { val: 'strong',   label: 'Strong Signal',   score:  1, description: "Solid. Present and directional." },
      { val: 'moderate', label: 'Moderate',        score:  0, description: "Something here but not deep." },
      { val: 'weak',     label: 'Noise',           score: -1, description: "Surface agitation. No underlying movement." }
    ]
  },
  {
    id: 'layer6',
    key: 'pattern_clarity',
    name: 'Pattern Clarity',
    question: "Does he know where he's taking you?",
    description: "A dominant who knows what he wants moves with direction even when he's making you wait. The pull is unmistakable. But a DOM who's uncertain, blocked by his own unresolved history, or performing confidence he doesn't have — that's not tension. That's confusion. You can feel the difference.",
    options: [
      { val: 'clear_intention', label: 'Clear Intention', score:  2, description: "Steel cuff — deepest imprint. He knows exactly where this is going. Strong magnetic level ahead, path relatively open." },
      { val: 'the_tease',       label: 'The Tease',       score:  1, description: "Leather cuff — history and grip. The pull is real, destination is clear, but something sits between here and there. Unfinished business. He hasn't forgotten where he's taking you — he's just not done with this moment yet." },
      { val: 'lost_or_blocked', label: 'Lost or Blocked', score: -1, description: "No clear magnetic level, or so much overhead confusion he can't lead cleanly. This isn't tension — it's confusion. Not right now." }
    ]
  },
  {
    id: 'layer7',
    key: 'somatic_check',
    name: 'The Instrument',
    question: "Hell yes or not right now?",
    description: "The body check before committing. Not excitement — ease. Calm, open, unhurried desire.",
    options: [
      { val: 'ease',    label: 'Calm Ease', score: 2, description: "Belly warmth, openness, absence of urgency. Clean yes." },
      { val: 'neutral', label: 'Neutral',   score: 0, description: "Inconclusive. Proceed at reduced size with attention." },
      {
        val: 'anxiety', label: 'Solar Plexus Alarm', score: null, hardStop: true,
        reason: "The Instrument is alarming. Solar plexus anxiety = no trade. Your documented history says don't override this.",
        description: "Hard stop. Your documented history says don't override this."
      }
    ]
  },
  {
    id: 'layer8',
    key: 'somatic_visual',
    name: 'Instrument Agreement',
    question: "Are you both saying the same thing?",
    description: "Final check. Body and chart — same market?",
    options: [
      { val: 'agree',    label: 'Aligned',    score:  1, description: "Two channels of perception arriving at the same truth simultaneously." },
      { val: 'disagree', label: 'Conflicted', score: -2, description: "Something is split. Wait until they speak together." }
    ]
  }
];

const LAYER_NAMES = {
  layer1: 'The Room',
  layer2: 'Weekly Field',
  layer3: 'Daily Field',
  layer4: 'TF Convergence',
  layer5: 'Signal Integrity',
  layer6: 'Pattern Clarity',
  layer7: 'The Instrument',
  layer8: 'Inst. Agreement'
};


/* ══════════════════════════════════════════════════════════════
   SCORE ENGINE — fully isolated from the UI.
   Replace the body of calculateScore() with a fetch('/api/score')
   call when the Python backend arrives — zero other changes needed.
   ══════════════════════════════════════════════════════════════ */

function getGrade(score) {
  if (score >= 11) return { grade: 'A+',    label: 'Full position — all systems consenting', color: 'success' };
  if (score >= 9)  return { grade: 'A',     label: 'Standard position',                      color: 'success' };
  if (score >= 7)  return { grade: 'B+',    label: 'Reduced size',                           color: 'warning' };
  if (score >= 5)  return { grade: 'B',     label: 'Watch only',                             color: 'warning' };
  return                   { grade: 'X',    label: 'No trade',                               color: 'danger'  };
}

function getHoldingProfile(layerVals) {
  const clarity = layerVals.pattern_clarity;
  if (clarity === 'the_tease') {
    return {
      label:       'The Tease',
      instruction: 'Longer hold · Wider stop · Smaller initial size',
      note:        'Let him build. This is accumulation, not a sprint.'
    };
  }
  if (clarity === 'clear_intention') {
    return {
      label:       'Clear Intention',
      instruction: 'Standard swing · Tighter stop',
      note:        'Direction is clean. Execute with precision.'
    };
  }
  return null;
}

// INPUT:  { layer1: { val, score }, layer2: { val, score }, … }
// OUTPUT: { score, grade, label, color, hardStop, hardStopLayer,
//           hardStopReason, layerBreakdown }
function calculateScore(inputs) {
  // ── Hard stop check (before any arithmetic) ──────────────
  const HARD_STOPS = {
    layer1: { val: 'disrupted', reason: 'Macro Conditions are Disrupted — major scheduled catalyst imminent (Fed, CPI, NFP, earnings) or systemic stress active. Do not enter.' },
    layer2: { val: 'chaotic', reason: 'Weekly field is Tyrant — no swing setup exists. Wait for the weekly to resolve.' },
    layer7: { val: 'anxiety', reason: "The Instrument is alarming. Solar plexus anxiety = no trade. Your documented history says don't override this." }
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
    ${layer.question    ? `<div class="layer-question">${layer.question}</div>` : ''}
    ${layer.description ? `<div class="layer-description">${layer.description}</div>` : ''}
    ${layer.note        ? `<div class="layer-note">${layer.note}</div>` : ''}
    ${layer.helper      ? `<div class="layer-helper">${layer.helper}</div>` : ''}
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
            <span class="option-text">
              <span class="option-label">${opt.label}</span>
              ${opt.description ? `<span class="option-description">${opt.description}</span>` : ''}
            </span>
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
    `${result.score} <span class="denom">/ 12</span>`;

  // Holding profile
  const holdingEl = document.getElementById('verdict-holding');
  const layerVals = {};
  for (const layer of LAYERS) {
    const sel = state.inputs[layer.id];
    if (sel) layerVals[layer.key] = sel.val;
  }
  const holding = getHoldingProfile(layerVals);
  if (holding && result.grade !== 'X') {
    holdingEl.innerHTML = `
      <div class="holding-label">${holding.label}</div>
      <div class="holding-instruction">${holding.instruction}</div>
      <div class="holding-note">${holding.note}</div>`;
    holdingEl.style.display = 'block';
  } else {
    holdingEl.style.display = 'none';
  }

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
    ticker:        null,
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

function goToReference() {
  showScreen('screen-reference');
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
  document.getElementById('btn-open-ref').addEventListener('click', goToReference);
  document.getElementById('btn-ref-back').addEventListener('click', goToDashboard);

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
