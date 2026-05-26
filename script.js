// ════════════════════════════════════════════
// State & Variables
// ════════════════════════════════════════════
const API = 'http://localhost:5000/api';
const R   = 24;   
let visitedTransitions = new Set();
let dfas      = {};     
let dfaKeys   = [];
let currentId = null;   
let traceData = null;   
let animStep  = -1;     
let animTimer = null;   
let currentMode = 'DFA'; 

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
  
  // 4. Handle machine logic
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
  const count  = states.length;
  if (count === 0) return [];
  const W = 900, H = 460, padX = 80, padY = 70;
  const cols  = Math.max(2, Math.ceil(Math.sqrt(count * 1.6)));
  const rows  = Math.ceil(count / cols);
  const cellW = cols > 1 ? (W - padX * 2) / (cols - 1) : 0;
  const cellH = rows > 1 ? (H - padY * 2) / (rows - 1) : 0;
  return states.map((s, i) => ({
    ...s,
    x: padX + (i % cols) * cellW,
    y: padY + Math.floor(i / cols) * cellH,
  }));
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

  let activeTrans = null;
  if (animStep > 0 && traceData && animStep < traceData.trace.length) {
    activeTrans = { from: traceData.trace[animStep - 1].state, to: traceData.trace[animStep].state };
  }

  for (const t of dfa.transitions) {
    const from = byId[t.from], to = byId[t.to];
    if (!from || !to) continue;
    const isActive = activeTrans && activeTrans.from === t.from && activeTrans.to === t.to;
    const key = t.from + '->' + t.to;
    const isVisited = visitedTransitions.has(key);

    const color = isActive ? '#d35400' : isVisited ? '#237804' : '#8c7a6b';
    const marker = isActive ? 'm-active' : isVisited ? 'm-accept' : 'm-default';
    const sw = isActive ? '3' : isVisited ? '2.5' : '1.5';
    
    if (t.from === t.to) drawLoop(svg, from, t.label, color, marker, sw);
    else                 drawArrow(svg, dfa.transitions, from, to, t.label, color, marker, sw);
  }

  for (const s of pos) drawState(svg, s, s.id === activeId, accepted, rejected);
}

function drawLoop(svg, pos, label, color, marker, sw) {
  const lr = 20;
  const topY = pos.y - R;
  svg.appendChild(svgEl('path', {
    d: `M${pos.x - lr} ${topY} A${lr} ${lr} 0 1 1 ${pos.x + lr} ${topY}`,
    fill: 'none', stroke: color, 'stroke-width': sw, 'marker-end': `url(#${marker})`
  }));
  const t = svgEl('text', {
    x: pos.x, y: topY - lr * 2 - 4,
    'text-anchor': 'middle', fill: color, 'font-size': '16', 'font-family': 'monospace', 'font-weight': 'bold',
    stroke: '#ffedb3', 'stroke-width': '4', 'paint-order': 'stroke'
  });
  t.textContent = label;
  svg.appendChild(t);
}

function drawArrow(svg, transitions, from, to, label, color, marker, sw) {
  const hasReverse = transitions.some(t => t.from === to.id && t.to === from.id);
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist, uy = dy / dist;
  const nx = -uy, ny = ux;

  const sx = from.x + ux * R, sy = from.y + uy * R;
  const ex = to.x   - ux * R, ey = to.y   - uy * R;

  const side   = from.id > to.id ? -1 : 1;
  const offset = hasReverse ? 26 * side : 0;
  const mx = (sx + ex) / 2 + nx * offset;
  const my = (sy + ey) / 2 + ny * offset;

  svg.appendChild(svgEl('path', {
    d: offset ? `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}` : `M${sx} ${sy} L${ex} ${ey}`,
    fill: 'none', stroke: color, 'stroke-width': sw, 'marker-end': `url(#${marker})`
  }));

  const lx = (offset ? mx : (sx + ex) / 2) + nx * 14;
  const ly = (offset ? my : (sy + ey) / 2) + ny * 14 + (offset ? 0 : -8);
  
  const t = svgEl('text', {
    x: lx, y: ly, 'text-anchor': 'middle',
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

// Kick it off!
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
            <p>Joseph Cinco</p>
            <p>John Michael A. Kamantigue</p>
            <p>Justine Nicol D. Lagajino</p>
          </div>
      `;
  }
  
  document.getElementById('cute-modal').classList.add('show');
}

window.closeModal = function() {
  document.getElementById('cute-modal').classList.remove('show');
}