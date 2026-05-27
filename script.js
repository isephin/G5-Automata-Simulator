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

// ════════════════════════════════════════════
// CFG — fetched from Flask, cached here
// ════════════════════════════════════════════
let cfgs = {};
let cfgTrace    = null;   // derivation steps from /api/cfg/validate
let cfgAnimStep = -1;
let cfgAnimTimer = null;

async function loadCfgs() {
  if (Object.keys(cfgs).length > 0) return true;
  try {
    const res = await fetch(API + '/cfgs');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    cfgs = await res.json();
    return true;
  } catch (e) {
    showError('Cannot load CFGs from Flask: ' + e.message);
    return false;
  }
}

function resetCfgAnim() {
  clearInterval(cfgAnimTimer);
  cfgTrace    = null;
  cfgAnimStep = -1;
}

// ════════════════════════════════════════════
// CFG Renderer — single column, top-to-bottom
// ════════════════════════════════════════════
async function drawCFG(highlightLhs = null, highlightRhs = null) {
  const ok = await loadCfgs();
  if (!ok) return;

  const key = currentId || Object.keys(cfgs)[0];
  const cfg = cfgs[key];
  if (!cfg) { showError('No CFG found for ' + key); return; }

  const svg = document.getElementById('automaton');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 900 460');
  hideError();

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, txt) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (txt !== undefined) el.textContent = txt;
    return el;
  };

  // ── defs ────────────────────────────────────────────────────────────
  const defs = mk('defs', {});
  const cardGrad = mk('linearGradient', { id:'cfg-card', x1:'0', y1:'0', x2:'0', y2:'1' });
  cardGrad.appendChild(mk('stop', { offset:'0%',   'stop-color':'#fdfcfb' }));
  cardGrad.appendChild(mk('stop', { offset:'100%', 'stop-color':'#f4f1ea' }));
  defs.appendChild(cardGrad);

  const activeGrad = mk('linearGradient', { id:'cfg-active', x1:'0', y1:'0', x2:'0', y2:'1' });
  activeGrad.appendChild(mk('stop', { offset:'0%',   'stop-color':'#fff8ee' }));
  activeGrad.appendChild(mk('stop', { offset:'100%', 'stop-color':'#ffe0a0' }));
  defs.appendChild(activeGrad);

  const filt = mk('filter', { id:'inset-sh', x:'-5%', y:'-5%', width:'110%', height:'110%' });
  const feF = mk('feFlood',       { 'flood-color':'rgba(0,0,0,0.15)', result:'f' });
  const feC = mk('feComposite',   { in:'f', in2:'SourceGraphic', operator:'in', result:'s' });
  const feB = mk('feGaussianBlur',{ in:'s', stdDeviation:'2', result:'b' });
  const feM = mk('feMerge', {});
  feM.appendChild(mk('feMergeNode', { in:'b' }));
  feM.appendChild(mk('feMergeNode', { in:'SourceGraphic' }));
  [feF, feC, feB, feM].forEach(n => filt.appendChild(n));
  defs.appendChild(filt);
  svg.appendChild(defs);

  // ── REGEX banner ─────────────────────────────────────────────────────
  const BW = 880, BH = 40, BX = 10, BY = 6;
  svg.appendChild(mk('rect', { x:BX, y:BY, width:BW, height:BH, rx:4,
    fill:'#ffcc80', stroke:'#d1cbbd', 'stroke-width':'2', filter:'url(#inset-sh)' }));
  svg.appendChild(mk('rect', { x:BX+1, y:BY+1, width:BW-2, height:BH-2, rx:3,
    fill:'none', stroke:'rgba(255,255,255,0.55)', 'stroke-width':'1.5' }));

  const rawRegex = cfg.regex.replace(/\*/g, "'").replace(/\|/g, '+');
  const alphabet = '\u03a3 = {' + cfg.alphabet.join(', ') + '}';
  svg.appendChild(mk('text', {
    x: BX+14, y: BY+BH/2, 'dominant-baseline':'central',
    'font-family':'Courier Prime, monospace', 'font-size':'13',
    'font-weight':'bold', fill:'#4a3b2c'
  }, `REGEX: ${rawRegex}    ${alphabet}`));

  // ── Single-column production rules ──────────────────────────────────
  const rules   = cfg.rules;
  const ROW_H   = 36;
  const TOP     = BY + BH + 8;
  const CARD_PAD = 10;
  const COL_W   = 880;
  const CHAR_W  = 9.6;

  // How many rows fit before we'd overflow (leave 32px for legend)
  const MAX_VISIBLE = Math.floor((460 - TOP - 32) / ROW_H);
  const visibleRules = rules.slice(0, MAX_VISIBLE);

  visibleRules.forEach((row, i) => {
    const cardX = BX;
    const cardY = TOP + i * ROW_H;
    const cardH = ROW_H - 3;
    const midY  = cardY + cardH / 2;

    const isActive = (row.lhs === highlightLhs && row.rhs.includes(highlightRhs));
    const isEven   = i % 2 === 0;

    // card bg
    svg.appendChild(mk('rect', {
      x: cardX, y: cardY, width: COL_W, height: cardH, rx: 4,
      fill: isActive ? 'url(#cfg-active)' : (isEven ? 'url(#cfg-card)' : '#ffe6b3'),
      stroke: isActive ? '#d35400' : '#d1cbbd',
      'stroke-width': isActive ? '2.5' : '1.5'
    }));
    // inner highlight
    svg.appendChild(mk('rect', {
      x: cardX+1, y: cardY+1, width: COL_W-2, height: cardH-2, rx:3,
      fill:'none', stroke: isActive ? 'rgba(255,200,100,0.6)' : 'rgba(255,255,255,0.6)',
      'stroke-width':'1'
    }));

    // active pulse marker (left edge bar)
    if (isActive) {
      svg.appendChild(mk('rect', {
        x: cardX, y: cardY, width: 5, height: cardH, rx:2,
        fill:'#d35400'
      }));
    }

    // LHS badge
    const isStart   = row.lhs === 'S';
    const badgeCol  = isActive ? '#d35400' : (isStart ? '#d35400' : '#8c7a6b');
    const badgeFill = isActive ? '#fff0db' : (isStart ? '#fff0db' : '#f4f1ea');
    svg.appendChild(mk('rect', {
      x: cardX+CARD_PAD, y: cardY+4, width:38, height:cardH-8, rx:4,
      fill: badgeFill, stroke: badgeCol, 'stroke-width': (isStart||isActive)?'2':'1.5'
    }));
    svg.appendChild(mk('text', {
      x: cardX+CARD_PAD+19, y: midY,
      'text-anchor':'middle', 'dominant-baseline':'central',
      'font-family':'Courier Prime, monospace', 'font-size':'17', 'font-weight':'bold',
      fill: badgeCol
    }, row.lhs));

    // arrow
    svg.appendChild(mk('text', {
      x: cardX+CARD_PAD+52, y: midY, 'dominant-baseline':'central',
      'font-family':'Courier Prime, monospace', 'font-size':'18',
      fill:'#b07a30', 'font-weight':'bold'
    }, '\u2192'));

    // RHS tokens
    const productionStr = row.rhs.join('  |  ');
    const tokens = productionStr.split(/(\s+)/);
    let cx = cardX + CARD_PAD + 76;

    for (const tok of tokens) {
      if (!tok) continue;
      if (tok.trim() === '') { cx += tok.length * (CHAR_W * 0.45); continue; }
      const t       = tok.trim();
      const isVar   = /^[A-Z][']*$/.test(t);
      const isSep   = t === '|';
      const isLambda= t === '\u039b';

      // highlight the specific matching production when active
      const isMatchProd = isActive && !isSep &&
        row.rhs.some(r => r === highlightRhs && r.split(' ').includes(t));

      let fill, fw;
      if (isSep)         { fill = '#b07a30'; fw = 'bold'; }
      else if (isLambda) { fill = '#8c7a6b'; fw = 'normal'; }
      else if (isVar)    { fill = isMatchProd ? '#d35400' : '#1a6e3d'; fw = 'bold'; }
      else               { fill = isMatchProd ? '#a04000' : '#2c5f9e'; fw = 'normal'; }

      if (isVar) {
        svg.appendChild(mk('rect', {
          x: cx-3, y: midY-10, width: t.length*CHAR_W+6, height:20, rx:3,
          fill: isMatchProd ? '#ffe0b2' : '#e8f5ee', stroke:'none'
        }));
      }

      svg.appendChild(mk('text', {
        x: cx, y: midY, 'dominant-baseline':'central',
        'font-family':'Courier Prime, monospace',
        'font-size':'16', 'font-weight':fw, fill,
        stroke: isVar ? (isMatchProd?'#ffe0b2':'#e8f5ee') : 'none',
        'stroke-width':'3', 'paint-order':'stroke'
      }, tok));

      cx += tok.length * CHAR_W;
    }
  });

  // ── Legend bar ───────────────────────────────────────────────────────
  const legY = TOP + visibleRules.length * ROW_H + 4;
  const legH = 26;
  svg.appendChild(mk('rect', {
    x:10, y:legY, width:880, height:legH, rx:4,
    fill:'#ffcc80', stroke:'#d1cbbd', 'stroke-width':'1.5', filter:'url(#inset-sh)'
  }));
  const legendItems = [
    { color:'#d35400', label:'S = Start variable' },
    { color:'#1a6e3d', label:'UPPER = Variables'  },
    { color:'#2c5f9e', label:'lower = Terminals'  },
    { color:'#8c7a6b', label:'\u039b = \u03b5 (empty)' },
    { color:'#d35400', label:'\u25ae = Active rule' },
  ];
  let lx = 22;
  for (const item of legendItems) {
    svg.appendChild(mk('circle', { cx:lx+5, cy:legY+legH/2, r:'5', fill:item.color }));
    svg.appendChild(mk('text', {
      x:lx+14, y:legY+legH/2, 'dominant-baseline':'central',
      'font-family':'Courier Prime, monospace', 'font-size':'11.5', fill:'#4a3b2c'
    }, item.label));
    lx += item.label.length * 7.2 + 22;
  }
}

// ════════════════════════════════════════════
// CFG Derivation Log
// ════════════════════════════════════════════
function buildCfgLog(steps, accepted) {
  const logEl = document.getElementById('trace-log');
  if (!steps || steps.length === 0) {
    logEl.innerHTML = accepted
      ? '<div class="log-step" style="color:#237804">✓ Empty string — accepted (Λ)</div>'
      : '<div class="log-step" style="color:#ff4d4f">✗ No derivation found</div>';
    return;
  }
  logEl.innerHTML = steps.map((s, i) =>
    `<div class="log-step cfg-log-step" id="cfg-log-${i}">
      <b>${s.rule_lhs}</b> → <b>${s.rule_rhs}</b>
      <span style="color:#8c7a6b;font-size:11px"> [${s.sentential}]</span>
    </div>`
  ).join('');
}

function highlightCfgLog(i) {
  document.querySelectorAll('.cfg-log-step').forEach(el => el.classList.remove('cur'));
  const line = document.getElementById('cfg-log-' + i);
  if (line) { line.classList.add('cur'); line.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
}

// ════════════════════════════════════════════
// CFG Simulation (called from handleSimulate)
// ════════════════════════════════════════════
async function handleCfgSimulate(index) {
  if (!listData[index] || listData[index].text === '') return;

  resetCfgAnim();
  activeIndex = index;
  listData[index].status = null;
  renderList();

  const inputString = listData[index].text;
  hideError();

  let result;
  try {
    const res = await fetch(API + '/cfg/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cfg_id: currentId, input: inputString })
    });
    if (!res.ok) { showError((await res.json()).error || 'Server error'); return; }
    result = await res.json();
  } catch (e) {
    showError('Cannot reach Flask: ' + e.message);
    return;
  }

  cfgTrace = result;
  buildCfgLog(result.steps, result.accepted);

  if (!result.steps || result.steps.length === 0) {
    // accepted empty or rejected immediately
    listData[index].status = result.accepted ? 'valid' : 'invalid';
    renderList();
    await drawCFG();
    return;
  }

  // ── Animate derivation steps ─────────────────────────────────────
  cfgAnimStep = 0;
  const showCfgStep = async (si) => {
    const step = cfgTrace.steps[si];
    highlightCfgLog(si);
    await drawCFG(step.rule_lhs, step.rule_rhs);

    // update string cell to show "after" sentential form
    const row = listData[index];
    row._derivation = step.after;
    renderList();
  };

  await showCfgStep(0);

  cfgAnimTimer = setInterval(async () => {
    cfgAnimStep++;
    if (cfgAnimStep < cfgTrace.steps.length) {
      await showCfgStep(cfgAnimStep);
    } else {
      clearInterval(cfgAnimTimer);
      // final result
      listData[index].status = cfgTrace.accepted ? 'valid' : 'invalid';
      listData[index]._derivation = null;
      renderList();
      await drawCFG();   // clear highlight
      // show final accepted/rejected log line
      const logEl = document.getElementById('trace-log');
      const finalLine = document.createElement('div');
      finalLine.className = 'log-step cur';
      finalLine.style.color = cfgTrace.accepted ? '#237804' : '#ff4d4f';
      finalLine.innerHTML = cfgTrace.accepted
        ? `<b>✓ ACCEPTED</b> — "${inputString}" is in the language`
        : `<b>✗ REJECTED</b> — "${inputString}" is not in the language`;
      logEl.appendChild(finalLine);
      finalLine.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
  }, 700);
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
  
  if (mode === 'CFG') {
    resetAnim();
    hideError();
    // drawCFG loads cfgs; after that, pre-fill samples
    drawCFG().then(() => {
      const key = currentId || Object.keys(cfgs)[0];
      const cfg = cfgs[key];
      if (cfg && cfg.samples && cfg.samples.length > 0) {
        // Only pre-fill if list is currently empty
        const isEmpty = listData.every(d => d.text === '');
        if (isEmpty) {
          listData = Array(6).fill(null).map((_, i) => ({
            text: cfg.samples[i] || '', status: null
          }));
          activeIndex = -1;
          renderList();
        }
      }
    });
  } else if (mode !== 'DFA') {
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
  if (currentMode === 'CFG') {
    drawCFG().then(() => {
      const key = currentId || Object.keys(cfgs)[0];
      const cfg = cfgs[key];
      if (cfg && cfg.samples) {
        listData = Array(6).fill(null).map((_, i) => ({
          text: cfg.samples[i] || '', status: null
        }));
        activeIndex = -1;
        renderList();
      }
    });
  }
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

    if (currentMode === 'CFG') {
      // In CFG mode: show derivation sentential form during animation, plain text otherwise
      const pointer = (activeIndex === i && data.text !== '') ? '> ' : '';
      if (activeIndex === i && data._derivation) {
        // show the live sentential form, styling variables orange, terminals blue
        const tokens = data._derivation.split(' ');
        const styledTokens = tokens.map(t => {
          if (/^[A-Z][']*$/.test(t)) return `<span style="color:#d35400;font-weight:bold">${t}</span>`;
          if (t === 'Λ') return `<span style="color:#8c7a6b">${t}</span>`;
          return `<span style="color:#2c5f9e">${t}</span>`;
        });
        displayText = '⇒ ' + styledTokens.join(' ');
      } else {
        displayText = data.text !== '' ? pointer + data.text : '';
      }
    } else {
      // DFA tape animation
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
  if (currentMode === 'CFG') {
    await handleCfgSimulate(index);
    return;
  }
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
  resetCfgAnim();
  document.getElementById('trace-log').innerHTML = '— Waiting for input —';
  if (currentMode === 'DFA') {
    drawDiagram(null, false, false);
    visitedTransitions.clear();
  }
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