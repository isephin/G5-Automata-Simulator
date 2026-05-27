// ════════════════════════════════════════════
// State & Variables
// ════════════════════════════════════════════
const API = 'http://localhost:5000/api'
const R   = 24;   
let visitedTransitions = new Set();
let dfas      = {};     
let dfaKeys   = [];
let currentId = null;   
let traceData = null;   
let animStep  = -1;     
let animTimer = null;   
let currentMode = 'DFA';

// ── Pan & Zoom state ──
let vpX = 0, vpY = 0, vpScale = 1;
let isPanning = false, panStartX = 0, panStartY = 0, panOriginX = 0, panOriginY = 0;

let listData = [
  { text: "", status: null }, 
  { text: "", status: null },
  { text: "", status: null },
  { text: "", status: null },
  { text: "", status: null },
  { text: "", status: null }
];
let activeIndex = -1; 


// ════════════════════════════════════════════
// Boot & Setup
// ════════════════════════════════════════════
async function boot() {
  try {
    const res = await fetch(API + '/dfas');
    dfas = await res.json();
    dfaKeys = Object.keys(dfas);
    selectDfa(dfaKeys[0], false); 
  } catch (e) {
    showError('Cannot reach Python Flask. Make sure app.py is running!');
  }
}

window.setMode = function(mode) {
  currentMode = mode;
  
  // 1. Update active button styles
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + mode).classList.add('active');
  
  // 2. Update the LED lights
  document.getElementById('led-DFA').className = 'led';
  document.getElementById('led-PDA').className = 'led';
  document.getElementById('led-CFG').className = 'led';
  document.getElementById('led-' + mode).classList.add('led-green');
  
  // 3. Set the correct full title based on the mode
  let fullTitle = '';
  if (mode === 'DFA') fullTitle = 'Deterministic Finite Automaton (DFA)';
  else if (mode === 'CFG') fullTitle = 'Context-Free Grammar (CFG)';
  else if (mode === 'PDA') fullTitle = 'Pushdown Automaton (PDA)';
  
  document.getElementById('diagram-title-text').textContent = fullTitle;
  
  if(mode !== 'DFA') {
     document.getElementById('automaton').innerHTML = '';
     showError(mode + ' logic is not connected to Python yet!');
  } else {
     hideError();
     if(currentId) selectDfa(currentId, true); 
  }
}

function selectDfa(id, keepList = false) {
  currentId = id;
  resetViewport();
  const dfa = dfas[currentId];
  
  let regexStr = dfa.description.replace(/\*/g, "'").replace(/\|/g, "+");
  regexStr = regexStr.replace(/\(/g, '<wbr>(').replace(/\)/g, ')<wbr>');
  document.getElementById('regex-display').innerHTML = regexStr;
  
  if(!keepList) { 
    activeIndex = -1; 
    listData = [
      { text: "", status: null }, 
      { text: "", status: null },
      { text: "", status: null },
      { text: "", status: null },
      { text: "", status: null },
      { text: "", status: null }
    ];
  }
  
  resetAnim();
  drawDiagram(null, false, false);
  renderList();
}

window.toggleDFA = function() {
  if (dfaKeys.length === 0) return;
  let idx = dfaKeys.indexOf(currentId);
  idx = (idx + 1) % dfaKeys.length;
  selectDfa(dfaKeys[idx], false); 
}

// ════════════════════════════════════════════
// Dynamic List Rendering
// ════════════════════════════════════════════
function renderList() {
  let html = '';
  for (let i = 0; i < 6; i++) {
    const data = listData[i];
    const isFirst = (i === 0) ? 'first' : '';
    const isLast  = (i === 5) ? 'last' : '';
    const greenOn = (data.status === 'valid') ? 'led-green' : '';
    const redOn   = (data.status === 'invalid') ? 'led-red' : '';
    const btnAct  = (activeIndex === i) ? 'active-sim' : '';
    
    let displayText = "";
    const isAnimActive = (activeIndex === i && traceData && animStep >= 0 && animStep < traceData.trace.length);
    
    if (isAnimActive && data.text !== "") {
        const step = traceData.trace[animStep];
        const charIdx = step ? step.char_index : -1;
        const chars = data.text.split('');
        
        const animatedText = chars.map((ch, idx) => {
            let cls = 'tape-char';
            if (idx === charIdx) cls += ' current';
            else if (idx < charIdx) cls += ' done';
            return `<span class="${cls}">${ch}</span>`;
        }).join('');
        
        displayText = '> ' + animatedText;
    } else {
        const pointer = (activeIndex === i && data.text !== "") ? '> ' : '';
        displayText = data.text !== "" ? pointer + data.text : "";
    }

    html += `
    <div class="board-row">
      <div class="led-cell"><div class="led ${greenOn}"></div></div>
      <div class="led-cell invalid-col"><div class="led ${redOn}"></div></div>
      <div class="string-cell ${isFirst} ${isLast}">${displayText}</div>
      <div class="btn-cell">
        <button class="sim-btn ${btnAct}" onclick="handleSimulate(${i})">
          <div class="inner-dot"></div>
        </button>
      </div>
    </div>
    `;
  }
  document.getElementById('dynamic-list').innerHTML = html;
}

// ════════════════════════════════════════════
// Input Handling
// ════════════════════════════════════════════
document.getElementById('str-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = e.target.value;
    if (val.trim() === "") return;
    listData.unshift({ text: val, status: null });
    listData.pop(); 
    activeIndex = -1; 
    e.target.value = ""; 
    renderList();
  }
});

// ════════════════════════════════════════════
// Simulation Logic
// ════════════════════════════════════════════
window.handleSimulate = async function(index) {
  if (currentMode !== 'DFA') {
      showError("Switch to DFA mode to simulate strings!");
      return;
  }
  if (!listData[index] || listData[index].text === "") return;

  activeIndex = index;
  listData[index].status = null; 
  renderList();

  const inputString = listData[index].text;

  resetAnim();
  hideError();
  
  traceData = await fetchTrace(inputString);
  if (!traceData) return;
  
  buildLog(traceData);
  
  animStep = 0;
  showStep(0);
  
  animTimer = setInterval(() => {
    animStep++;
    if (animStep < traceData.trace.length) {
      showStep(animStep);
    } else {
      clearInterval(animTimer);
      showResult();
      listData[index].status = traceData.accepted ? 'valid' : 'invalid';
      renderList(); 
    }
  }, 600);
}

function resetAnim() {
  clearInterval(animTimer);
  traceData = null;
  animStep  = -1;
  document.getElementById('trace-log').innerHTML = '— Waiting for input —';
  drawDiagram(null, false, false);
  visitedTransitions.clear();
}

async function fetchTrace(input) {
  try {
    const res = await fetch(API + '/run', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dfa_id: currentId, input })
    });
    if (!res.ok) { showError((await res.json()).error || 'Server error'); return null; }
    return await res.json();
  } catch (e) {
    showError('Cannot reach Flask: ' + e.message);
    return null;
  }
}

// ════════════════════════════════════════════
// Transition Log Drawing
// ════════════════════════════════════════════
function buildLog(data) {
  const logEl = document.getElementById('trace-log');
  if (!data || !data.trace) return;
  
  logEl.innerHTML = data.trace.map((step, i) => {
    if (i === 0) return `<div class="log-step" id="log-0">START → <b>${step.state}</b></div>`;
    const prev = data.trace[i - 1].state;
    return `<div class="log-step" id="log-${i}">
      read <b>'${step.symbol}'</b> → <b>${prev}</b> → <b>${step.state}</b>
    </div>`;
  }).join('');
}

function highlightLog(i) {
  document.querySelectorAll('.log-step').forEach(el => el.classList.remove('cur'));
  const line = document.getElementById('log-' + i);
  if (line) { 
      line.classList.add('cur'); 
      line.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// ════════════════════════════════════════════
// Diagram Drawing
// ════════════════════════════════════════════
function showStep(i) {
  const step = traceData.trace[i];
  if (i > 0) {
    const from = traceData.trace[i - 1].state;
    const to   = traceData.trace[i].state;
    visitedTransitions.add(from + '->' + to);
  }
  drawDiagram(step.state, false, false);
  highlightLog(i);
  renderList(); 
  
  setTimeout(() => {
    const currentChar = document.querySelector('.tape-char.current');
    if (currentChar) {
      currentChar.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, 10);
}

function showResult() {
  drawDiagram(traceData.final_state, traceData.accepted, !traceData.accepted);
}

function svgEl(tag, attrs) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function getPositions() {
  const states = dfas[currentId].states;
  if (states.length === 0) return [];

  const LAYOUTS = {
    // DFA 1 — 24 states (Symmetrical Valley Grid)
    "DFA 1": {
      "q0":                { x: 50,  y: 230 },

      "q1":                { x: 150, y: 130 },
      "q11":               { x: 150, y: 330 },

      // Placed in the "valley" between column 2 and 3 so lines don't cross nodes!
      "trapstate_q2":      { x: 315, y: 60  }, 
      "q2":                { x: 260, y: 130 },
      "q12":               { x: 260, y: 230 },
      "q16":               { x: 260, y: 330 },
      "trapstate_q12_q16": { x: 315, y: 390 }, 

      "q3":                { x: 370, y: 130 },
      "q13":               { x: 370, y: 230 },
      "q17":               { x: 370, y: 330 },
      
      // Placed perfectly in the valley between column 3 and 4!
      "trapstate_q13_q17": { x: 425, y: 390 }, 

      "q4":                { x: 480, y: 130 },
      "q14":               { x: 480, y: 330 },

      "q5":                { x: 590, y: 70  },
      "q8":                { x: 590, y: 170 },
      "q15":               { x: 590, y: 290 },
      "q18":               { x: 590, y: 390 },

      "q6":                { x: 710, y: 70  },
      "q9":                { x: 710, y: 160 },
      "q7":                { x: 720, y: 250 },
      "q10":               { x: 720, y: 370 },

      "first_end_state":   { x: 850, y: 160 },
      "second_end_state":  { x: 850, y: 300 },
    },

    // DFA 2 — 14 states (q0-q13) Symmetrical Grid Layout
    "DFA 2": {
      "q0":  { x: 60,  y: 230 },
      "q1":  { x: 190, y: 90  }, 
      "q2":  { x: 190, y: 370 }, 
      "q5":  { x: 320, y: 90  }, 
      "q3":  { x: 320, y: 370 }, 
      "q6":  { x: 450, y: 90  }, 
      "q4":  { x: 450, y: 230 }, 
      "q8":  { x: 450, y: 370 }, 
      "q11": { x: 580, y: 90  }, 
      "q7":  { x: 580, y: 230 }, 
      "q12": { x: 580, y: 370 }, 
      "q10": { x: 710, y: 90  }, 
      "q9":  { x: 710, y: 370 }, 
      "q13": { x: 840, y: 230 },
    },
  };

  const layout = LAYOUTS[currentId];
  return states.map(s => {
    const pos = layout && layout[s.id] ? layout[s.id] : { x: 450, y: 230 };
    return { ...s, ...pos };
  });
}

function drawDiagram(activeId, accepted, rejected) {
  if (!dfas[currentId] || currentMode !== 'DFA') return;
  const svg = document.getElementById('automaton');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 900 460');
  const dfa   = dfas[currentId];
  const pos   = getPositions();
  const byId  = Object.fromEntries(pos.map(s => [s.id, s]));

  const defs = svgEl('defs', {});
  for (const [id, color] of [
    ['m-default', '#8c7a6b'],
    ['m-active',  '#d35400'],
    ['m-accept',  '#237804'],
  ]) {
    const m = svgEl('marker', { id, viewBox: '0 0 10 10', refX: '8', refY: '5',
                                 markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    m.appendChild(svgEl('path', { d: 'M2 1L8 5L2 9', fill: 'none',
                                   stroke: color, 'stroke-width': '1.5', 'stroke-linecap': 'round' }));
    defs.appendChild(m);
  }
  svg.appendChild(defs);

  const g = svgEl('g', { id: 'vp-group', transform: `translate(${vpX},${vpY}) scale(${vpScale})` });
  svg.appendChild(g);

  let activeTrans = null;
  if (animStep > 0 && traceData && animStep < traceData.trace.length) {
    activeTrans = { from: traceData.trace[animStep - 1].state, to: traceData.trace[animStep].state };
  }

  // --- UNIVERSAL GROUPING LOGIC ---
  const groupedTransitions = {};
  for (const t of dfa.transitions) {
    const key = t.from + '->' + t.to;
    if (!groupedTransitions[key]) {
      groupedTransitions[key] = { from: t.from, to: t.to, labels: [] };
    }
    if (!groupedTransitions[key].labels.includes(t.label)) {
       groupedTransitions[key].labels.push(t.label);
    }
  }

  for (const key in groupedTransitions) {
    const t = groupedTransitions[key];
    const from = byId[t.from], to = byId[t.to];
    if (!from || !to) continue;
    
    const isActive = activeTrans && activeTrans.from === t.from && activeTrans.to === t.to;
    const isVisited = visitedTransitions.has(key);
    const color = isActive ? '#d35400' : isVisited ? '#237804' : '#8c7a6b';
    const marker = isActive ? 'm-active' : isVisited ? 'm-accept' : 'm-default';
    const sw = isActive ? '3' : isVisited ? '2.5' : '1.5';
    const combinedLabel = t.labels.join(', ');

    if (t.from === t.to) drawLoop(g, from, combinedLabel, color, marker, sw);
    else                 drawArrow(g, dfa.transitions, from, to, combinedLabel, color, marker, sw);
  }

  for (const s of pos) drawState(g, s, s.id === activeId, accepted, rejected);
}

function drawLoop(svg, pos, label, color, marker, sw) {
  const lr = 18;
  // --- GRAVITY LOOPS FIX ---
  const isBottom = pos.y > 300; 

  const startX = isBottom ? pos.x + lr : pos.x - lr;
  const endX   = isBottom ? pos.x - lr : pos.x + lr;
  const startY = isBottom ? pos.y + R : pos.y - R;

  svg.appendChild(svgEl('path', {
    d: `M${startX} ${startY} A${lr} ${lr} 0 1 1 ${endX} ${startY}`,
    fill: 'none', stroke: color, 'stroke-width': sw, 'marker-end': `url(#${marker})`
  }));
  
  const textY = isBottom ? startY + lr * 1.5 + 4 : startY - lr * 1.5 - 2;
  
  const t = svgEl('text', {
    x: pos.x, y: textY,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: color, 'font-size': '16', 'font-family': 'monospace', 'font-weight': 'bold',
    stroke: '#ffedb3', 'stroke-width': '4', 'paint-order': 'stroke'
  });
  t.textContent = label;
  svg.appendChild(t);
}

function linePointDist(sx, sy, ex, ey, px, py) {
  const dx = ex - sx, dy = ey - sy;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - sx, py - sy);
  let t = ((px - sx) * dx + (py - sy) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - sx - t * dx, py - sy - t * dy);
}

function drawArrow(svg, transitions, from, to, label, color, marker, sw) {
  const pos = getPositions();
  const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist, uy = dy / dist;
  const nx = -uy, ny = ux;
  const sx = from.x + ux * R, sy = from.y + uy * R;
  const ex = to.x   - ux * R, ey = to.y   - uy * R;

  // ══════════════════════════════════════
  // UNIVERSAL UPGRADED MATH
  // ══════════════════════════════════════
  let offset = hasReverse ? 30 : 0; 
  
  if (offset === 0) {
    const CLEAR = R + 10;
    for (const s of pos) {
      if (s.id === from.id || s.id === to.id) continue;
      const d = linePointDist(sx, sy, ex, ey, s.x, s.y);
      if (d < CLEAR) {
        const cross = (to.x - from.x) * (s.y - from.y) - (to.y - from.y) * (s.x - from.x);
        const arcSide = cross > 0 ? 1 : -1;
        const needed = Math.ceil((CLEAR - d) / 10) * 18;
        if (Math.abs(needed * arcSide) > Math.abs(offset)) {
          offset = needed * arcSide;
        }
      }
    }
  }

  // Independent overrides based on current DFA mode
const ARC_OVERRIDES = { 
    "DFA 1": { 
        "q7->q10": 45, 
        "q10->q7": 45,  

        // --- Your New Custom Curves ---
        "q13->trapstate_q13_q17": 0, // Bends q13 to trapstate outward
        "q12->trapstate_q12_q16": 0, // Bends q12 to trapstate outward
        "q18->q7": -50,               // Sweeps q18 up to q7 from the left
        "q9->q10": -90,                // Bows q10 to q9 wide around the center traffic
        "q6->q7": -65,
        "q5->q7": -20,
        "q15->q7": -45,
        "q10->q7": 0,
        "q9->first_end_state": -40,                
        "first_end_state->q7": -60,
        "first_end_state->q10": -40,   
        "second_end_state->q7": 60    // Sweeps the bottom final state smoothly back to q7
    },
    "DFA 2": { 
        "q8->q11": -50, 
        "q12->q11": 70, 
        "q12->q3": 90 
    } 
  };
  
  const overrideKey = from.id + '->' + to.id;
  const activeArcs = ARC_OVERRIDES[currentId] || {};
  if (activeArcs[overrideKey] !== undefined) {
      offset = activeArcs[overrideKey];
  }
  
  const mx = (sx + ex) / 2 + nx * offset;
  const my = (sy + ey) / 2 + ny * offset;

  svg.appendChild(svgEl('path', {
    d: offset ? `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}` : `M${sx} ${sy} L${ex} ${ey}`,
    fill: 'none', stroke: color, 'stroke-width': sw, 'marker-end': `url(#${marker})`
  }));

  const TEXT_OVERRIDES = { 
      "DFA 1": { 
          "q2->q3": { x: 0, y: -15 }, 
          "q12->q13": { x: 0, y: -15 },
          "q16->q17": { x: 0, y: -15 } 
      },
      "DFA 2": { "q4->q7": { x: 0, y: 0 } } 
  };
  
  let tOffX = 0, tOffY = 0;
  const activeTexts = TEXT_OVERRIDES[currentId] || {};
  if (activeTexts[overrideKey]) {
    tOffX = activeTexts[overrideKey].x;
    tOffY = activeTexts[overrideKey].y;
  }

 // --- CENTERED TEXT MATH ---
  const midX = 0.25 * sx + 0.5 * mx + 0.25 * ex;
  const midY = 0.25 * sy + 0.5 * my + 0.25 * ey;
  
  const textDist = 0; 
  
  const lx = midX + nx * textDist + tOffX;
  const ly = midY + ny * textDist + tOffY;

  const t = svgEl('text', {
    x: lx, y: ly, 
    'text-anchor': 'middle', 'dominant-baseline': 'central', 
    fill: color, 'font-size': '16', 'font-family': 'monospace', 'font-weight': 'bold',
    stroke: '#ffedb3', 'stroke-width': '4', 'paint-order': 'stroke'
  });
  t.textContent = label;
  svg.appendChild(t);
}

function drawState(svg, state, isActive, accepted, rejected) {
  let fill = '#ffe6b3', stroke = '#8c7a6b', txtCol = '#4a3b2c';
  if      (isActive && accepted)  { fill = '#eafaf1'; stroke = '#237804'; txtCol = '#237804'; }
  else if (isActive && rejected)  { fill = '#fff0f0'; stroke = '#ff4d4f'; txtCol = '#a8071a';    }
  else if (isActive)              { fill = '#ffffff'; stroke = '#d35400'; txtCol = '#d35400'; }
  else if (state.accept)          {                   stroke = '#237804'; txtCol = '#237804'; }

  if (state.start) {
    svg.appendChild(svgEl('line', {
      x1: state.x - R - 24, y1: state.y,
      x2: state.x - R - 2,  y2: state.y,
      stroke: '#8c7a6b', 'stroke-width': '2', 'marker-end': 'url(#m-default)'
    }));
  }

  svg.appendChild(svgEl('circle', {
    cx: state.x, cy: state.y, r: R,
    fill, stroke, 'stroke-width': isActive ? '3' : '2'
  }));

  if (state.accept) {
    svg.appendChild(svgEl('circle', {
      cx: state.x, cy: state.y, r: R - 6,
      fill: 'none', stroke: isActive ? stroke : '#237804', 'stroke-width': '2'
    }));
  }

  const t = svgEl('text', {
    x: state.x, y: state.y,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: txtCol, 'font-size': '16', 'font-weight': 'bold', 'font-family': 'monospace'
  });
  t.textContent = state.label;
  svg.appendChild(t);
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('show');
}
function hideError() {
  document.getElementById('error-msg').classList.remove('show');
}

// ════════════════════════════════════════════
// Pan & Zoom
// ════════════════════════════════════════════
function applyViewport() {
  const g = document.getElementById('vp-group');
  if (g) g.setAttribute('transform', `translate(${vpX},${vpY}) scale(${vpScale})`);
}

function resetViewport() {
  vpX = 0; vpY = 0; vpScale = 1;
  applyViewport();
}

(function initPanZoom() {
  const svg = document.getElementById('automaton');

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const svgW = 900, svgH = 460;
    const mx = (e.clientX - rect.left) / rect.width  * svgW;
    const my = (e.clientY - rect.top)  / rect.height * svgH;

    const delta  = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.min(4, Math.max(0.3, vpScale * delta));

    vpX = mx - (mx - vpX) * (newScale / vpScale);
    vpY = my - (my - vpY) * (newScale / vpScale);
    vpScale = newScale;
    applyViewport();
  }, { passive: false });

  svg.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isPanning = true;
    panStartX = e.clientX; panStartY = e.clientY;
    panOriginX = vpX;      panOriginY = vpY;
    svg.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isPanning) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = 900 / rect.width;
    const scaleY = 460 / rect.height;
    vpX = panOriginX + (e.clientX - panStartX) * scaleX;
    vpY = panOriginY + (e.clientY - panStartY) * scaleY;
    applyViewport();
  });
  window.addEventListener('mouseup', () => {
    isPanning = false;
    svg.style.cursor = 'grab';
  });

  let lastTouchX = 0, lastTouchY = 0;
  svg.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });
  svg.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scaleX = 900 / rect.width;
      const scaleY = 460 / rect.height;
      vpX += (e.touches[0].clientX - lastTouchX) * scaleX;
      vpY += (e.touches[0].clientY - lastTouchY) * scaleY;
      lastTouchX = e.touches[0].clientX;
      lastTouchY = e.touches[0].clientY;
      applyViewport();
    }
  }, { passive: false });

  svg.addEventListener('dblclick', () => resetViewport());
  svg.style.cursor = 'grab';
})();

boot();

// ════════════════════════════════════════════
// MODAL LOGIC
// ════════════════════════════════════════════
window.openModal = function(type) {
  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('modal-content');
  
  if (type === 'manual') {
      titleEl.textContent = ' Usage Manual ';
      contentEl.innerHTML = `
          <p>Welcome to your <b>Automata Simulator</b>! Here is how to use this website:</p>
          <ul>
              <li><b>Power Up:</b> Make sure your Python backend (<code>app.py</code>) is running so the machine has a brain! </li>
              <li><b>Choose Machine:</b> Select DFA, PDA, or CFG from the top buttons.</li>
              <li><b>Toggle Logic:</b> Use the 'Change regex' switch to flip between different rule sets.</li>
              <li><b>Load the Tape:</b> Type a string into the yellow input box and press <b>Enter</b> to queue it up. You can queue up to 6 strings.</li>
              <li><b>Simulate:</b> Click the round button next to your string. Watch the tape head read each character while the diagram traces the path! </li>
          </ul>
          <p style="text-align:center; margin-top: 15px; color: #d35400;"><b>Green = Valid!  &nbsp;&nbsp;&nbsp; Red = Invalid! </b></p>
      `;
  } else if (type === 'about') {
      titleEl.textContent = ' About Us ';
      contentEl.innerHTML = `
          <p style="text-align:center;"><b>Automata Simulator</b></p>
          <p style="text-align:center;">Built by <b>Group 5 of BCS34</b>!</p>
          <p style="text-align:center; margin-top:15px; font-size: 28px;"></p>
          <div style="text-align:center; background: #fff0db; padding: 15px; border-radius: 12px; border: 2px dashed #eabf75;">
            <p style="margin-bottom: 8px;"><b>Members:</b></p>
            <p>Gem Eirien A. Capistrano</p>
            <p>Joseph Christian C. Cinco</p>
            <p>John Michael D. Kamantigue</p>
            <p>Justine Nicol D. Lagajino</p>
          </div>
      `;
  }
  
  document.getElementById('cute-modal').classList.add('show');
}

window.closeModal = function() {
  document.getElementById('cute-modal').classList.remove('show');
}