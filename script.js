// ════════════════════════════════════════════
// State & Variables
// ════════════════════════════════════════════
const API = '/api'
const R   = 24;   
let visitedTransitions = new Set();
let dfas      = {};     
let dfaKeys   = [];
let currentId = null;   
let traceData = null;   
let animStep  = -1;     
let animTimer = null;   
let currentMode = 'DFA';
let pdas = {};
let pdaKeys = [];

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
    // 1. Fetch DFAs
    const res = await fetch(API + '/dfas');
    dfas = await res.json();
    dfaKeys = Object.keys(dfas);
    
    // 2. Fetch PDAs
    const resPda = await fetch(API + '/pdas');
    pdas = await resPda.json();
    pdaKeys = Object.keys(pdas);
    
    selectDfa(dfaKeys[0], false);

    // 3. Pre-load CFGs
    const ok = await loadCfgs();
    if (ok) {
      const key = currentId || Object.keys(cfgs)[0];
      const cfg = cfgs[key];
      if (cfg && cfg.samples && cfg.samples.length > 0) {
        const isEmpty = listData.every(d => d.text === '');
        if (isEmpty) {
          listData = Array(6).fill(null).map((_, i) => ({ text: cfg.samples[i] || '', status: null }));
          activeIndex = -1;
          renderList();
        }
      }
    }
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
// CFG Renderer — Analog Calculator / Ledger Layout
// ════════════════════════════════════════════
async function drawCFG(highlightLhs = null, highlightRhs = null) {
  const ok = await loadCfgs();
  if (!ok) return;

  const key = currentId || Object.keys(cfgs)[0];
  const cfg = cfgs[key];
  if (!cfg) { showError('No CFG found for ' + key); return; }

const svg = document.getElementById('automaton');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', currentMode === 'PDA' ? '150 0 1100 700' : '0 0 900 460');
  hideError();

  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, txt) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (txt !== undefined) el.textContent = txt;
    return el;
  };

  // --- ALPHABET DISPLAY ---
  const alphabetStr = `Σ = { ${cfg.alphabet.join(', ')} }`;
  svg.appendChild(mk('text', {
      x: 870, y: 25, 'text-anchor': 'end', 'dominant-baseline': 'central',
      'font-family': 'Courier Prime, monospace', 'font-size': '16', 'font-weight': 'bold',
      fill: '#53463c'
  }, alphabetStr));

  const rules   = cfg.rules;
  const ROW_H   = 44;   
  const TOP     = 10;   
  const CARD_PAD = 15;
  const BX = 20;

  const MAX_VISIBLE = Math.floor((460 - TOP - 35) / ROW_H);
  const visibleRules = rules.slice(0, MAX_VISIBLE);

  visibleRules.forEach((row, i) => {
    const cardY = TOP + i * ROW_H;
    const midY  = cardY + ROW_H / 2;

    const isActive = (row.lhs === highlightLhs && row.rhs.includes(highlightRhs));
    const isStart   = row.lhs === 'S';

    if (isActive) {
       svg.appendChild(mk('rect', {
         x: BX, y: cardY, width: 860, height: ROW_H, rx: 4,
         fill: 'rgba(211, 84, 0, 0.08)' 
       }));
       svg.appendChild(mk('rect', {
         x: BX - 8, y: cardY + 8, width: 6, height: ROW_H - 16, rx: 2,
         fill: '#d35400'
       }));
    }

    // Ledger Lines
    if (i < visibleRules.length) {
        svg.appendChild(mk('line', {
            x1: BX, y1: cardY + ROW_H, x2: BX + 860, y2: cardY + ROW_H,
            stroke: 'rgba(140, 122, 107, 0.25)', 'stroke-width': '1.5'
        }));
    }

    // LHS Key (Keeps the Skeuomorphic 3D Style so it looks like a row label)
    const badgeCol  = isActive ? '#d35400' : (isStart ? '#d35400' : '#8c7a6b');
    const badgeFill = isActive ? '#fff0db' : (isStart ? '#fff0db' : '#fdfcfb');
    
    svg.appendChild(mk('rect', {
      x: BX + CARD_PAD, y: cardY + 10, width: 42, height: 28, rx: 6,
      fill: '#d1cbbd'
    }));
    svg.appendChild(mk('rect', {
      x: BX + CARD_PAD, y: cardY + 8, width: 42, height: 28, rx: 6,
      fill: badgeFill, stroke: badgeCol, 'stroke-width': (isStart||isActive)?'2':'1'
    }));
    
    svg.appendChild(mk('text', {
      x: BX + CARD_PAD + 21, y: midY - 1, 
      'text-anchor':'middle', 'dominant-baseline':'central',
      'font-family':'Courier Prime, monospace', 'font-size':'20', 'font-weight':'bold',
      fill: badgeCol
    }, row.lhs));

    // Arrow
    svg.appendChild(mk('text', {
      x: BX + CARD_PAD + 60, y: midY, 'dominant-baseline':'central',
      'font-family':'Courier Prime, monospace', 'font-size':'22',
      fill:'#6b5b51', 'font-weight':'bold'
    }, '\u2192'));

    // RHS tokens
    const productionStr = row.rhs.join('  |  ');
    const tokens = productionStr.split(/(\s+)/);
    let cx = BX + CARD_PAD + 90;

    for (const tok of tokens) {
      if (!tok) continue;
      if (tok.trim() === '') { cx += 8; continue; } // Space width
      const t       = tok.trim();
      const isVar   = /^[A-Z][']*$/.test(t);
      const isSep   = t === '|';
      const isLambda= t === '\u039b';

      const isMatchProd = isActive && !isSep &&
        row.rhs.some(r => r === highlightRhs && r.split(' ').includes(t));

      let fillCol, fw;
      if (isSep)         { fillCol = '#a39587'; fw = 'bold'; }
      else if (isLambda) { fillCol = '#6b5c4f'; fw = 'normal'; }
      else if (isVar)    { fillCol = isMatchProd ? '#d35400' : '#026135e9'; fw = 'bold'; } 
      else               { fillCol = isMatchProd ? '#a04000' : '#071166'; fw = 'bold'; } 

      // Flat, subtle highlight logic
      const charWidth = 12;
      const padding = isVar ? 14 : 0; 
      const elementWidth = (t.length * charWidth) + padding;

      if (isVar) {
        // Flat typewriter "ink stamp" highlight (NO 3D SHADOWS)
        svg.appendChild(mk('rect', {
          x: cx, y: midY - 13, width: elementWidth, height: 26, rx: 4,
          fill: isMatchProd ? 'rgba(211, 84, 0, 0.12)' : 'rgba(248, 233, 219, 0.55)',
          stroke: isMatchProd ? '#d35400' : 'rgba(5, 53, 21, 0.68)', 'stroke-width': '1'
        }));
      }

      svg.appendChild(mk('text', {
        x: cx + elementWidth / 2, y: midY, 
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-family': 'Courier Prime, monospace',
        'font-size': '20', 'font-weight': fw, fill: fillCol
      }, t));

      cx += elementWidth + 8; // Advance exactly past the text
    }
  });

// ── Legend (Anchored to the bottom, bigger font) ──────────────────
  // The SVG canvas height is 460, so 435 puts this perfectly at the bottom edge
  const legY = 435; 

  const legendItems = [
    { color:'#d35400', label:'S = Start' },
    { color:'#1a6e3d', label:'UPPER = Variables'  },
    { color:'#2c5f9e', label:'lower = Terminals'  },
    { color:'#8c7a6b', label:'\u039b = Empty' },
    { color:'#d35400', label:'\u25ae = Active' },
  ];
  
  let lx = BX + 10;
  for (const item of legendItems) {
    // Slightly bigger dot (r: 6) to match the new text
    svg.appendChild(mk('circle', { cx: lx + 6, cy: legY, r: '6', fill: item.color }));
    
    // Increased font size to 18
    svg.appendChild(mk('text', {
      x: lx + 18, y: legY, 'dominant-baseline': 'central',
      'font-family': 'Courier Prime, monospace', 'font-size': '18', 'font-weight': 'bold', fill: '#6b5a48'
    }, item.label));
    
    // Increased horizontal spacing multiplier to account for the wider font
    lx += item.label.length * 11 + 35; 
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

// --- ADD THESE UTILITIES JUST IN CASE THEY ARE MISSING ---
function showError(msg) {
  const el = document.getElementById('error-msg');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideError() {
  const el = document.getElementById('error-msg');
  if (el) el.classList.remove('show');
}

// ════════════════════════════════════════════
// Core Navigation & Mode Switching
// ════════════════════════════════════════════
window.setMode = function(mode) {
  currentMode = mode;
  
  // 1. Update Buttons
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + mode).classList.add('active');
  
  // 2. Update LEDs
  document.getElementById('led-DFA').className = 'led';
  document.getElementById('led-PDA').className = 'led';
  document.getElementById('led-CFG').className = 'led';
  document.getElementById('led-' + mode).classList.add('led-green');
  
  // 3. Update Title
  let fullTitle = '';
  if (mode === 'DFA') fullTitle = 'Deterministic Finite Automaton (DFA)';
  else if (mode === 'CFG') fullTitle = 'Context-Free Grammar (CFG)';
  else if (mode === 'PDA') fullTitle = 'Pushdown Automaton (PDA)';
  document.getElementById('diagram-title-text').textContent = fullTitle;
  
  hideError();
  
  // 4. Render the correct screen
  if (mode === 'CFG') {
    resetAnim();
    drawCFG().then(() => {
      const key = currentId || Object.keys(cfgs)[0];
      if (cfgs[key] && cfgs[key].samples && listData.every(d => d.text === '')) {
        listData = Array(6).fill(null).map((_, i) => ({ text: cfgs[key].samples[i] || '', status: null }));
        activeIndex = -1; renderList();
      }
    });
  } else {
    // Both DFA and PDA share diagram logic
    if (currentId) selectDfa(currentId, true); 
  }
}

function selectDfa(id, keepList = false) {
  currentId = id;
  resetViewport();
  
  // Grab from PDAS if in PDA mode, otherwise DFAS
  const machineDict = currentMode === 'PDA' ? pdas : dfas;
  const machine = machineDict[currentId];
  
  // Safely update the top orange banner
  if (machine && machine.description) {
      let regexStr = machine.description.replace(/\|/g, "+");
      regexStr = regexStr.replace(/\(/g, '<wbr>(').replace(/\)/g, ')<wbr>');
      document.getElementById('regex-display').innerHTML = regexStr;
  }
  
  if (!keepList) { 
    activeIndex = -1; 
    listData = Array(6).fill(null).map(() => ({ text: "", status: null }));
  }
  
  resetAnim();
  drawDiagram(null, false, false);
  renderList();
}

window.toggleDFA = function() {
  const keys = currentMode === 'PDA' ? pdaKeys : dfaKeys;
  if (keys.length === 0) return;
  let idx = keys.indexOf(currentId);
  idx = (idx + 1) % keys.length;
  
  if (currentMode === 'CFG') {
    selectDfa(dfaKeys[idx], true);  
    loadCfgs().then(() => {
      const key = dfaKeys[idx];
      const cfg = cfgs[key];
      if (cfg && cfg.samples) {
        listData = Array(6).fill(null).map((_, i) => ({ text: cfg.samples[i] || '', status: null }));
      } else {
        listData = Array(6).fill(null).map(() => ({ text: '', status: null }));
      }
      activeIndex = -1;
      renderList();        
      drawCFG();           
    });
  } else {
    const newId = keys[idx];
    selectDfa(newId, true);  
    const machineDict = currentMode === 'PDA' ? pdas : dfas;
    const machine = machineDict[newId];
    if (machine && machine.samples && machine.samples.length > 0) {
      listData = Array(6).fill(null).map((_, i) => ({ text: machine.samples[i] || '', status: null }));
    } else {
      listData = Array(6).fill(null).map(() => ({ text: '', status: null }));
    }
    activeIndex = -1;
    renderList();
  }
}

function resetAnim() {
  clearInterval(animTimer);
  traceData = null;
  animStep  = -1;
  
  if (typeof resetCfgAnim === 'function') {
      resetCfgAnim();
  }
  
  document.getElementById('trace-log').innerHTML = '— Waiting for input —';
  
  // Clear the green lines and redraw the base diagram for BOTH DFA and PDA
  if (currentMode === 'DFA' || currentMode === 'PDA') {
    visitedTransitions.clear();
    drawDiagram(null, false, false);
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
    e.target.style.borderColor = '';
    e.target.style.boxShadow  = '';
    renderList();
  }
});

// Live CFG input validation (green / red border as you type)
let _cfgLiveTimer = null;
document.getElementById('str-input').addEventListener('input', e => {
  const input = e.target;
  const val   = input.value;
  if (currentMode !== 'CFG') {
    input.style.borderColor = '';
    input.style.boxShadow   = '';
    return;
  }
  if (val === '') {
    input.style.borderColor = '';
    input.style.boxShadow   = '';
    return;
  }
  clearTimeout(_cfgLiveTimer);
  _cfgLiveTimer = setTimeout(async () => {
    const key = currentId || Object.keys(cfgs)[0];
    try {
      const res = await fetch(API + '/cfg/validate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cfg_id: key, input: val })
      });
      if (!res.ok) return;
      const result = await res.json();
      if (input.value !== val) return;
      if (result.accepted) {
        input.style.borderColor = '#237804';
        input.style.boxShadow   = '0 0 0 2px rgba(35,120,4,0.25)';
      } else {
        input.style.borderColor = '#ff4d4f';
        input.style.boxShadow   = '0 0 0 2px rgba(255,77,79,0.25)';
      }
    } catch (_) {}
  }, 350);
});

// ════════════════════════════════════════════
// Simulation Logic
// ════════════════════════════════════════════
window.handleSimulate = async function(index) {
  if (currentMode === 'CFG') {
    await handleCfgSimulate(index);
    return;
  }
  if (currentMode !== 'DFA' && currentMode !== 'PDA') { return; }
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
      const logEl = document.getElementById('trace-log');
      const finalLine = document.createElement('div');
      finalLine.className = 'log-step cur';
      finalLine.style.color = traceData.accepted ? '#237804' : '#ff4d4f';
      finalLine.innerHTML = traceData.accepted
        ? `<b>✓ ACCEPTED</b> — "${inputString}" is in the language`
        : `<b>✗ REJECTED</b> — "${inputString}" is not in the language`;
      logEl.appendChild(finalLine);
      finalLine.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 600);
}


async function fetchTrace(input) {
  const endpoint = currentMode === 'PDA' ? '/pda/run' : '/run';
  const bodyKey  = currentMode === 'PDA' ? 'pda_id' : 'dfa_id';
  try {
    const res = await fetch(API + endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [bodyKey]: currentId, input })
    });
    if (!res.ok) { showError((await res.json()).error || 'Server error'); return null; }
    return await res.json();
  } catch (e) {
    showError('Cannot reach Flask: ' + e.message); return null;
  }
}

// ════════════════════════════════════════════
// Transition Log Drawing
// ════════════════════════════════════════════
function buildLog(data) {
  const logEl = document.getElementById('trace-log');
  if (!data || !data.trace) return;
  
  logEl.innerHTML = data.trace.map((step, i) => {
    let stackHtml = '';
    // If we are in PDA mode, render the stack!
    if (currentMode === 'PDA' && step.stack) {
       const stackContent = step.stack.length > 0 ? step.stack.join(', ') : 'Λ';
       stackHtml = `<span style="color:#2c5f9e; margin-left: 10px;">[Stack: <b>${stackContent}</b>]</span>`;
    }

    if (i === 0) return `<div class="log-step" id="log-0">START → <b>${step.state}</b> ${stackHtml}</div>`;
    const prev = data.trace[i - 1].state;
    return `<div class="log-step" id="log-${i}">
      read <b>'${step.symbol}'</b> → <b>${prev}</b> → <b>${step.state}</b> ${stackHtml}
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
  const machineDict = currentMode === 'PDA' ? pdas : dfas;
  const states = machineDict[currentId].states;
  if (states.length === 0) return [];

  // --- NEW: PDA Flowchart Layouts ---
  if (currentMode === 'PDA') {
const PDA_LAYOUTS = {
        // ── PDA "DFA 1" layout ────────────────────────────────────────
        // Spine runs top→bottom down x=700.
        // Left wing  (a-path: s_start→q3→q2→q8→q11) fans left.
        // Right wing (b-path: s_start→q4→q5→q6→q10) fans right then loops.
        // Bottom section (q13/q15/q16/q17 → q19–q24 → acc) spreads wide.
        "DFA 1": {
          // ── Start & Splitting ──
          "s_start": { x: 100,  y: 500 },
          "q4":      { x: 320,  y: 500 },
          "q9":      { x: 540,  y: 500 }, // Reject for q4 and q12
          "q3":      { x: 540,  y: 250 }, // Top path
          "q5":      { x: 540,  y: 750 }, // Bottom path

          // ── Top Branch ──
          "q2":      { x: 760,  y: 250 },
          "q1":      { x: 760,  y: 100 }, // Reject
          "q8":      { x: 980,  y: 250 },
          "q11":     { x: 1200, y: 250 },
          "q14":     { x: 1420, y: 250 },

          // ── Middle Convergence ──
          "q12":     { x: 760,  y: 500 },
          "q15":     { x: 980,  y: 500 },
          "q18":     { x: 980,  y: 350 }, // Reject for q15

          // ── Bottom Branch ──
          "q6":      { x: 760,  y: 750 },
          "q7":      { x: 760,  y: 900 }, // Reject
          "q10":     { x: 980,  y: 750 },
          "q13":     { x: 1200, y: 750 },
          "q16":     { x: 1420, y: 650 },
          "q17":     { x: 1420, y: 850 },

          // ── Pre-Accept Cluster ──
          "q19":     { x: 1640, y: 500 },
          "q20":     { x: 1640, y: 750 },

          // ── Accept Cluster ──
          "q23":     { x: 1860, y: 250 }, // Top Outer
          "q21":     { x: 1860, y: 450 }, // Top Inner
          "q22":     { x: 1860, y: 650 }, // Bottom Inner
          "q24":     { x: 1860, y: 850 }, // Bottom Outer

          "acc":     { x: 2080, y: 550 },
        },
        // ── PDA "DFA 2" layout — symmetric grid/railroad ─────────────
        // 5 vertical columns, evenly spaced at x = 160, 380, 600, 820, 1040
        // Each row is 160px apart.  Left wing occupies cols 0-1, right wing
        // cols 3-4, center spine col 2.  All wings run the same number of
        // rows so the layout is a clean rectangle, not a triangle.
        //
        //  col:   0    1    2    3    4
        //  row 0:           s_start
        //  row 1: l3   l2   q1   r2   r3      (REJECT nodes at the far ends)
        //  row 2: --   l1   q2   r1   --      (q2=REJECT, l1/r1 branch off q1)
        //  row 3: --   l4   q3   r4   --      (q3=REJECT, wings' second nodes)
        //  row 4: --   l5   q4   r5   --      (bottom dispatcher)
        //  row 5: --   l6   --   r6   --      (wing tails that feed into q3)
        //  row 6: --   bl1  q3   br1  --      (q3 = center-mid after wings merge)
        //  row 7: --   bl2  q4   br2  --
        //  row 8: --   --   bm1  --   --
        //  row 9: --   --   bm2  --   --
        //  row10: --   --   acc  --   --
"DFA 2": {
          // ── Center spine ──
          "s_start": { x: 50,  y: 500 },
          "q1":      { x: 280,  y: 500 },
          
          // ── Top Wing (1s path) ──
          "q2":      { x: 460,  y: 250 },
          "q3":      { x: 740,  y: 250 },
          "q4":      { x: 1040, y: 250 },
          "q5":      { x: 1340, y: 250 },
          "q15":     { x: 1640, y: 250 },

          // ── Bottom Wing (0s path) ──
          "q6":      { x: 460,  y: 750 },
          "q7":      { x: 740,  y: 750 },
          "q8":      { x: 1040, y: 750 },
          "q9":      { x: 1340, y: 750 },
          "q14":     { x: 1640, y: 750 },

          // ── Middle Connections / Convergences ──
          "q10":     { x: 900,  y: 500 },
          "q12":     { x: 1500, y: 500 },
          "q13":     { x: 1200, y: 500 },

          // ── Final Stretch ──
          "q11":     { x: 1900, y: 350 },
          "q16":     { x: 1900, y: 650 },

          // ── Accept States ──
          "acc_1":   { x: 2100, y: 500 }
        }
      };
      const layout = PDA_LAYOUTS[currentId];
      return states.map(s => ({ ...s, ...(layout && layout[s.id] ? layout[s.id] : { x: 450, y: 230 }) }));
  }

  // --- EXISTING: DFA Circular Layouts ---
  const LAYOUTS = {
    "DFA 1": {
      "q0":                { x: 50,  y: 230 },
      "q1":                { x: 150, y: 130 },
      "q11":               { x: 150, y: 330 },
      "trapstate_q2":      { x: 315, y: 60  }, 
      "q2":                { x: 260, y: 130 },
      "q12":               { x: 260, y: 230 },
      "q16":               { x: 260, y: 330 },
      "trapstate_q12_q16": { x: 315, y: 390 }, 
      "q3":                { x: 370, y: 130 },
      "q13":               { x: 370, y: 230 },
      "q17":               { x: 370, y: 330 },
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
    "DFA 2": {
      "q0":  { x: 60,  y: 230 },  "q1":  { x: 190, y: 90  }, 
      "q2":  { x: 190, y: 370 },  "q5":  { x: 320, y: 90  }, 
      "q3":  { x: 320, y: 370 },  "q6":  { x: 450, y: 90  }, 
      "q4":  { x: 450, y: 230 },  "q8":  { x: 450, y: 370 }, 
      "q11": { x: 580, y: 90  },  "q7":  { x: 580, y: 230 }, 
      "q12": { x: 580, y: 370 },  "q10": { x: 710, y: 90  }, 
      "q9":  { x: 710, y: 370 },  "q13": { x: 840, y: 230 },
    },
  };

  const layout = LAYOUTS[currentId];
  return states.map(s => {
    const pos = layout && layout[s.id] ? layout[s.id] : { x: 450, y: 230 };
    return { ...s, ...pos };
  });
}

function drawDiagram(activeId, accepted, rejected) {
  const machineDict = currentMode === 'PDA' ? pdas : dfas;
  if (!machineDict[currentId] || (currentMode !== 'DFA' && currentMode !== 'PDA')) return;
  
const svg = document.getElementById('automaton');
  svg.innerHTML = '';
  // UPDATE: Tightened width to 1850 to fit the screen better
  svg.setAttribute('viewBox', currentMode === 'PDA' ? '0 0 2150 1095' : '0 0 900 460');
  
  const dfa = machineDict[currentId];
  const pos = getPositions();
  const byId  = Object.fromEntries(pos.map(s => [s.id, s]));

  const defs = svgEl('defs', {});
  for (const [id, color] of [['m-default', '#8c7a6b'], ['m-active', '#d35400'], ['m-accept', '#237804']]) {
    const m = svgEl('marker', { id, viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '6', markerHeight: '6', orient: 'auto-start-reverse' });
    m.appendChild(svgEl('path', { d: 'M2 1L8 5L2 9', fill: 'none', stroke: color, 'stroke-width': '1.5', 'stroke-linecap': 'round' }));
    defs.appendChild(m);
  }
  svg.appendChild(defs);

  const g = svgEl('g', { id: 'vp-group', transform: `translate(${vpX},${vpY}) scale(${vpScale})` });
  svg.appendChild(g);

  let activeTrans = null;
  if (animStep > 0 && traceData && animStep < traceData.trace.length) {
    activeTrans = { from: traceData.trace[animStep - 1].state, to: traceData.trace[animStep].state };
  }

  const groupedTransitions = {};
  for (const t of dfa.transitions) {
    const key = t.from + '->' + t.to;
    if (!groupedTransitions[key]) groupedTransitions[key] = { from: t.from, to: t.to, labels: [] };
    
    // Support DFA labels AND PDA read labels
    const textLabel = t.label !== undefined ? t.label : (t.read || 'Λ');
    if (!groupedTransitions[key].labels.includes(textLabel)) {
       groupedTransitions[key].labels.push(textLabel);
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
    x: pos.x, y: textY, 'text-anchor': 'middle', 'dominant-baseline': 'central',
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

  // THE MAGIC FIX: Exact edge detection so arrows don't hide under shapes
  function shapeR(state) {
    if (currentMode !== 'PDA') return R;
    const sh = state.shape || 'circle';
    
    // Snaps to the edge of the new giant diamonds
    if (sh === 'diamond') return 1 / (Math.abs(ux) / 85 + Math.abs(uy) / 50) + 12; 
    // Snaps to the edge of the new giant ovals
    if (sh === 'oval')    return 1 / Math.sqrt((ux * ux) / (85 * 85) + (uy * uy) / (40 * 40)) + 12;
    return 50; 
  }

  const sx = from.x + ux * shapeR(from), sy = from.y + uy * shapeR(from);
  const ex = to.x   - ux * shapeR(to),   ey = to.y   - uy * shapeR(to);

  let offset = hasReverse ? 30 : 0;

  if (currentMode === 'DFA') {
    if (offset === 0) {
      const CLEAR = R + 10;
      for (const s of pos) {
        if (s.id === from.id || s.id === to.id) continue;
        const d = linePointDist(sx, sy, ex, ey, s.x, s.y);
        if (d < CLEAR) {
          const cross = (to.x - from.x) * (s.y - from.y) - (to.y - from.y) * (s.x - from.x);
          const arcSide = cross > 0 ? 1 : -1;
          const needed = Math.ceil((CLEAR - d) / 10) * 18;
          if (Math.abs(needed * arcSide) > Math.abs(offset)) offset = needed * arcSide;
        }
      }
    }
    const ARC_OVERRIDES = {
      "DFA 1": {
        "q7->q10": 45, "q10->q7": 45, "q13->trapstate_q13_q17": 0, "q12->trapstate_q12_q16": 0,
        "q18->q7": -50, "q9->q10": -90, "q6->q7": -65, "q5->q7": -20, "q15->q7": -45, "q10->q7": 0,
        "q9->first_end_state": -40, "first_end_state->q7": -60, "first_end_state->q10": -40, "second_end_state->q7": 60
      },
      "DFA 2": { "q8->q11": -50, "q12->q11": 70, "q12->q3": 90 }
    };
    const overrideKey = from.id + '->' + to.id;
    if (ARC_OVERRIDES[currentId] && ARC_OVERRIDES[currentId][overrideKey] !== undefined) {
      offset = ARC_OVERRIDES[currentId][overrideKey];
    }
  } else {
    // PDA arcs
// PDA arcs
    const PDA_ARC_OVERRIDES = {
      "DFA 1": {
        "q23->q22": -190,  // Curves outward to bypass q21
        "q24->q21": -190, // Curves outward to bypass q22
        "q21->q22": 40, 
        "q16->q21": 80,
        "q14->q22": 250,
        "q22->q21": 40    // Slight curve between the inner nodes
      },
"DFA 2": {
        // Massive return jumps spanning across multiple states
        "l6->l2":   250, // Swings way up over the top
        "r6->r2":  -250, // Swings way down under the bottom
        
        // Jumps to Accept state curving around the inner nodes
        "l6->acc": -150, 
        "r6->acc":  150
      }
    };
    const pdaOverrideKey = from.id + '->' + to.id;
    if (PDA_ARC_OVERRIDES[currentId] && PDA_ARC_OVERRIDES[currentId][pdaOverrideKey] !== undefined) {
      offset = PDA_ARC_OVERRIDES[currentId][pdaOverrideKey];
    }
  }

  const mx = (sx + ex) / 2 + nx * offset;
  const my = (sy + ey) / 2 + ny * offset;

  svg.appendChild(svgEl('path', {
    d: offset ? `M${sx} ${sy} Q${mx} ${my} ${ex} ${ey}` : `M${sx} ${sy} L${ex} ${ey}`,
    fill: 'none', stroke: color, 'stroke-width': sw, 'marker-end': `url(#${marker})`
  }));

  const TEXT_OVERRIDES = {
    "DFA 1": { "q2->q3": { x: 0, y: -15 }, "q12->q13": { x: 0, y: -15 }, "q16->q17": { x: 0, y: -15 } },
    "DFA 2": { "q4->q7": { x: 0, y: 0 } }
  };
  let tOffX = 0, tOffY = 0;
  const overrideKeyForText = from.id + '->' + to.id;
  if (TEXT_OVERRIDES[currentId] && TEXT_OVERRIDES[currentId][overrideKeyForText]) {
    tOffX = TEXT_OVERRIDES[currentId][overrideKeyForText].x;
    tOffY = TEXT_OVERRIDES[currentId][overrideKeyForText].y;
  }

  const midX = 0.25 * sx + 0.5 * mx + 0.25 * ex;
  const midY = 0.25 * sy + 0.5 * my + 0.25 * ey;
  const lx = midX + tOffX;
  const ly = midY + tOffY;

const arrowFontSize = currentMode === 'PDA' ? '24' : '16';
  const arrowStrokeW  = currentMode === 'PDA' ? '6' : '4';

  const t = svgEl('text', {
    x: lx, y: ly,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: color, 'font-size': arrowFontSize, 'font-family': 'monospace', 'font-weight': 'bold',
    stroke: '#ffedb3', 'stroke-width': arrowStrokeW, 'paint-order': 'stroke'
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

function drawLoop(svg, pos, label, color, marker, sw) {
  const lr = 18;
  const isBottom = pos.y > 300; 
  const startX = isBottom ? pos.x + lr : pos.x - lr;
  const endX   = isBottom ? pos.x - lr : pos.x + lr;
  const startY = isBottom ? pos.y + R : pos.y - R;

  // Make the loop line thicker for PDA mode
  const finalStrokeWidth = currentMode === 'PDA' ? (parseFloat(sw) * 1.5).toString() : sw;

  svg.appendChild(svgEl('path', {
    d: `M${startX} ${startY} A${lr} ${lr} 0 1 1 ${endX} ${startY}`,
    fill: 'none', stroke: color, 'stroke-width': finalStrokeWidth, 'marker-end': `url(#${marker})`
  }));
  

  const fontSize = currentMode === 'PDA' ? '24' : '16';
  const textY = isBottom ? startY + lr * 1.5 + (currentMode === 'PDA' ? 12 : 4) : startY - lr * 1.5 - (currentMode === 'PDA' ? 10 : 2);
  const t = svgEl('text', {
    x: pos.x, y: textY, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: color, 'font-size': fontSize, 'font-family': 'monospace', 'font-weight': 'bold',
    stroke: '#ffedb3', 'stroke-width': currentMode === 'PDA' ? '8' : '4', 'paint-order': 'stroke'
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

const shape = state.shape || 'circle';
  const isPDA = currentMode === 'PDA';

  if (shape === 'diamond') {
    const rx = isPDA ? 85 : 45;   // Increased from 58
    const ry = isPDA ? 50 : 30;   // Increased from 38
    const pts = `${state.x},${state.y - ry} ${state.x + rx},${state.y} ${state.x},${state.y + ry} ${state.x - rx},${state.y}`;
    svg.appendChild(svgEl('polygon', {
      points: pts,
      fill, stroke, 'stroke-width': isActive ? '3' : '2'
    }));
  } else if (shape === 'oval') {
    const orx = isPDA ? 85 : 45;  // Increased from 58
    const ory = isPDA ? 40 : 22;  // Increased from 28
    svg.appendChild(svgEl('ellipse', {
      cx: state.x, cy: state.y, rx: orx, ry: ory,
      fill, stroke, 'stroke-width': isActive ? '3' : '2'
    }));
  } else {
    // --- Circle (used by PDA circles too) ---
    const r = isPDA ? 40 : R;     // Increased from 28
    if (state.start) {
      svg.appendChild(svgEl('line', {
        x1: state.x - r - (isPDA ? 35 : 24), y1: state.y, // Extended line for bigger circle
        x2: state.x - r - 2,  y2: state.y,
        stroke: '#8c7a6b', 'stroke-width': '2', 'marker-end': 'url(#m-default)'
      }));
    }
    svg.appendChild(svgEl('circle', {
      cx: state.x, cy: state.y, r: r,
      fill, stroke, 'stroke-width': isActive ? '3' : '2'
    }));
    if (state.accept) {
      svg.appendChild(svgEl('circle', {
        cx: state.x, cy: state.y, r: r - 6,
        fill: 'none', stroke: isActive ? stroke : '#237804', 'stroke-width': '2'
      }));
    }
  }

  // UPDATE: Adjust font size for the new massive shapes
  const fontSize = isPDA ? '24' : ((shape === 'circle') ? '16' : '14');
  const t = svgEl('text', {
    x: state.x, y: state.y,
    'text-anchor': 'middle', 'dominant-baseline': 'central',
    fill: txtCol, 'font-size': fontSize, 'font-weight': 'bold', 'font-family': 'monospace'
  });
  t.textContent = state.label;
  svg.appendChild(t);
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
  
window.openModal = function(type) {
  const titleEl = document.getElementById('modal-title');
  const contentEl = document.getElementById('modal-content');
  
  if (type === 'manual') {
      titleEl.textContent = ' Usage Manual ';
      contentEl.innerHTML = `
          <p>Welcome to the <b>G5 Automata Simulator</b>! Here is how to operate the machine:</p>
          <ul>
              <li><b>Choose Machine:</b> Select DFA, CFG, or PDA from the top control buttons.</li>
              <li><b>Toggle Logic:</b> Use the 'Change regex' switch to flip between different pre-loaded rule sets.</li>
              <li><b>Load the Tape:</b> Type a string into the yellow input box and press <b>Enter</b> to queue it up. You can test up to 6 strings at once.</li>
              <li><b>Simulate:</b> Click the simulate button next to your string. Watch the tape head read each character while the diagram traces the exact path! </li>
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