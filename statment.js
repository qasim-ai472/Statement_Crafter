// StatementCraft — statment.js
// Gemini 2.0 Flash · Groq · OpenAI
// Sequential requests — never fires two at once

const state = {
  currentStep: 1, totalSteps: 7,
  formData: {}, wordLimit: 650,
  tone: 'Passionate and Personal', outputChoice: 'both',
};
const STEP_LABELS = ['Type','Details','Spark','Journey','Hardships','Major','Output'];

// ── PROVIDERS ────────────────────────────────────────────
const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    placeholder: 'Paste your Groq key (gsk_...) — FREE at console.groq.com',
    validate: k => k.startsWith('AIza'),
    hint: 'Pakistan users: Gemini free tier is blocked here. Use Groq instead — free at console.groq.com',
    endpoint: k => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`,
    headers: () => ({'Content-Type':'application/json'}),
    body: p => JSON.stringify({contents:[{parts:[{text:p}]}],generationConfig:{temperature:0.85,topK:40,topP:0.95,maxOutputTokens:2048}}),
    extract: d => d?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('\n').trim(),
  },
  groq: {
    label: 'Groq (Free)',
    placeholder: 'Paste your Groq key (gsk_...) — FREE at console.groq.com',
    validate: k => k.startsWith('gsk_'),
    hint: 'FREE — Get your key at console.groq.com in 30 seconds. No billing. Works from Pakistan.',
    endpoint: () => 'https://api.groq.com/openai/v1/chat/completions',
    headers: k => ({'Content-Type':'application/json','Authorization':`Bearer ${k}`}),
    body: p => JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'user',content:p}],max_tokens:2048,temperature:0.85}),
    extract: d => d?.choices?.[0]?.message?.content?.trim(),
  },
  openai: {
    label: 'OpenAI',
    placeholder: 'Paste your OpenAI key (sk-...)',
    validate: k => k.startsWith('sk-'),
    hint: 'Get a key at platform.openai.com — billing required.',
    endpoint: () => 'https://api.openai.com/v1/chat/completions',
    headers: k => ({'Content-Type':'application/json','Authorization':`Bearer ${k}`}),
    body: p => JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:p}],max_tokens:2048,temperature:0.85}),
    extract: d => d?.choices?.[0]?.message?.content?.trim(),
  },
  puter: {
    label: 'Puter.js (No Key Needed)',
    placeholder: 'No API key needed — just click Generate',
    validate: () => true,   // no key required
    hint: 'Completely free, no signup, no API key. Works from anywhere including Pakistan.',
    endpoint: () => '',     // handled separately via Puter SDK
    headers: () => ({}),
    body: () => '',
    extract: d => d,        // raw string returned directly
  },
  openrouter: {
    label: 'OpenRouter (Free)',
    placeholder: 'Paste your OpenRouter key (sk-or-...)',
    validate: k => k.startsWith('sk-or-'),
    hint: 'FREE — Sign up at openrouter.ai, no credit card needed. Works from Pakistan.',
    endpoint: () => 'https://openrouter.ai/api/v1/chat/completions',
    headers: k => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${k}`,
      'HTTP-Referer': 'https://statementcraft.app',
      'X-Title': 'StatementCraft',
    }),
    body: p => JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: p }],
      max_tokens: 2048,
      temperature: 0.85,
    }),
    extract: d => {
      // OpenRouter wraps errors inside a 200 response sometimes
      if (d?.error) throw new Error(d.error.message || 'OpenRouter error');
      const text = d?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenRouter. The free model may be overloaded — try again in a moment.');
      return text.trim();
    },
  },
};

// ── DOM ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const heroSection   = $('heroSection');
const formSection   = $('formSection');
const outputSection = $('outputSection');
const progressSteps = $('progressSteps');
const progressFill  = $('progressBarFill');
const prevBtn       = $('prevBtn');
const nextBtn       = $('nextBtn');
const stepCounter   = $('stepCounter');
const generateBtn   = $('generateBtn');
const startBtn      = $('startBtn');
const backToFormBtn = $('backToFormBtn');
const toast         = $('toast');
const toastMsg      = $('toastMsg');

// ── INIT ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildProgressBar();
  restoreSession();
  bindOptionalToggles();
  bindWordLimitSync();
  bindAutoSave();
  bindProviderSelector();
});

// ── NAVIGATION ───────────────────────────────────────────
startBtn.addEventListener('click', () => {
  heroSection.classList.add('hidden');
  formSection.classList.remove('hidden');
  updateProgressBar(); updateNavButtons();
  window.scrollTo({top:0,behavior:'smooth'});
});
backToFormBtn.addEventListener('click', () => {
  outputSection.classList.add('hidden');
  formSection.classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
});
nextBtn.addEventListener('click', () => {
  if (!validateStep()) return;
  collectStep();
  if (state.currentStep < state.totalSteps) showStep(state.currentStep + 1);
});
prevBtn.addEventListener('click', () => {
  if (state.currentStep > 1) showStep(state.currentStep - 1);
});
function showStep(n) {
  $(`step-${state.currentStep}`).classList.add('hidden');
  state.currentStep = n;
  $(`step-${state.currentStep}`).classList.remove('hidden');
  updateProgressBar(); updateNavButtons();
  window.scrollTo({top:0,behavior:'smooth'});
}
function updateNavButtons() {
  prevBtn.classList.toggle('hidden', state.currentStep === 1);
  nextBtn.classList.toggle('hidden', state.currentStep === state.totalSteps);
  generateBtn.style.display = state.currentStep === state.totalSteps ? 'flex' : 'none';
}

// ── PROGRESS BAR ─────────────────────────────────────────
function buildProgressBar() {
  progressSteps.innerHTML = '';
  for (let i = 1; i <= state.totalSteps; i++) {
    const d = document.createElement('div');
    d.classList.add('progress-step'); d.dataset.step = i;
    d.innerHTML = `<div class="progress-dot"></div><div class="progress-step-label">${STEP_LABELS[i-1]}</div>`;
    progressSteps.appendChild(d);
  }
}
function updateProgressBar() {
  document.querySelectorAll('.progress-step').forEach((el,idx) => {
    const s = idx+1; el.classList.remove('active','done');
    if (s < state.currentStep) el.classList.add('done');
    if (s === state.currentStep) el.classList.add('active');
  });
  progressFill.style.width = ((state.currentStep-1)/(state.totalSteps-1)*100)+'%';
  stepCounter.textContent = `Step ${state.currentStep} of ${state.totalSteps}`;
}

// ── PROVIDER SELECTOR ─────────────────────────────────────
// Reads input[name="provider"] radio cards
function bindProviderSelector() {
  document.querySelectorAll('input[name="provider"]').forEach(r => {
    r.addEventListener('change', updateProviderUI);
  });
  updateProviderUI();
}
function updateProviderUI() {
  const p = getProvider();
  const cfg = PROVIDERS[p];
  if (!cfg) return;
  const keyEl   = $('apiKey');
  const hintEl  = $('apiKeyHint');
  const wrapEl  = document.querySelector('.api-input-wrap');

  if (keyEl) { keyEl.placeholder = cfg.placeholder; keyEl.value = ''; }
  if (hintEl) hintEl.textContent = cfg.hint;

  // Hide key input entirely when Puter is selected (no key needed)
  if (wrapEl) wrapEl.style.display = p === 'puter' ? 'none' : 'flex';
}
function getProvider() {
  const r = document.querySelector('input[name="provider"]:checked');
  return r ? r.value : 'puter';
}

// ── VALIDATION ───────────────────────────────────────────
function validateStep() {
  clearErrors();
  const s = state.currentStep;
  const req = (id, msg) => { if (!gv(id).trim()) { fe(id,msg); return true; } return false; };

  if (s===1 && !document.querySelector('input[name="admissionType"]:checked'))
    { err('admissionType','Please select your admission type.'); return false; }
  if (s===2) {
    if (req('q2','Please fill in your basic details.')) return false;
    if (req('q3','Please describe what draws you to this university.')) return false;
    if (req('q4','Please name a professor and describe their research.')) return false;
  }
  if (s===3) {
    if (!$('q6').value) { fe('q6','Please select the origin of your passion.'); return false; }
    if (req('q7','Please describe the specific spark moment.')) return false;
    if (req('q8','Please describe what that moment revealed.')) return false;
    if (req('q10','Please describe your journey.')) return false;
  }
  if (s===4) {
    if (req('q11','Please describe your most significant work.')) return false;
    if (req('q12','Please describe the skills you built.')) return false;
    if (req('q13','Please describe at least one project.')) return false;
    if (req('q14','Please describe your biggest difficulty.')) return false;
  }
  if (s===5) {
    if (req('q16','Please describe your biggest challenge.')) return false;
    if (req('q17','Please share the moment you almost gave up.')) return false;
    if (req('q18','Please describe a sacrifice you made.')) return false;
  }
  if (s===6) {
    if (req('q19','Please share the incident that confirmed your major.')) return false;
    if (req('q20','Please describe your specific focus area.')) return false;
    if (req('q21','Please describe what you are doing right now.')) return false;
    if (req('q22','Please describe your 10-year vision.')) return false;
  }
  if (s===7) {
    const provider = getProvider();
    const key = $('apiKey').value.trim();
    // Puter needs no key — skip validation entirely
    if (provider !== 'puter') {
      if (!key) { fe('apiKey','Please enter your API key.'); return false; }
      if (!PROVIDERS[provider].validate(key)) { fe('apiKey','This does not look like a valid ' + PROVIDERS[provider].label + ' key. ' + PROVIDERS[provider].hint); return false; }
    }
    if (!document.querySelector('input[name="tone"]:checked')) { err('toneSelector','Please select a tone.'); return false; }
    if (!document.querySelector('input[name="wordLimit"]:checked')) { err('wordLimit','Please select a word limit.'); return false; }
    if (!document.querySelector('input[name="outputChoice"]:checked')) { err('outputChoice','Please select which statements you need.'); return false; }
  }
  return true;
}
function gv(id) { const el=$(id); return el?el.value:''; }
function err(cid,msg) { const c=$(cid); if(!c) return; const e=document.createElement('p'); e.className='field-error'; e.textContent=msg; c.parentNode.insertBefore(e,c.nextSibling); }
function fe(fid,msg) { const f=$(fid); if(!f) return; f.classList.add('error'); const e=document.createElement('p'); e.className='field-error'; e.textContent=msg; f.parentNode.insertBefore(e,f.nextSibling); }
function clearErrors() { document.querySelectorAll('.field-error').forEach(e=>e.remove()); document.querySelectorAll('.error').forEach(e=>e.classList.remove('error')); }

// ── COLLECT DATA ─────────────────────────────────────────
function collectStep() {
  const s = state.currentStep;
  if (s===1){ const t=document.querySelector('input[name="admissionType"]:checked'); if(t) state.formData.admissionType=t.value; }
  if (s===2){ ['q2','q3','q4','q5'].forEach(k=>state.formData[k]=gv(k)); }
  if (s===3){ state.formData.q6=$('q6').value; ['q7','q8','q9','q10'].forEach(k=>state.formData[k]=gv(k)); }
  if (s===4){ ['q11','q12','q13','q14','q15'].forEach(k=>state.formData[k]=gv(k)); }
  if (s===5){ ['q16','q17','q18'].forEach(k=>state.formData[k]=gv(k)); }
  if (s===6){ ['q19','q20','q21','q22'].forEach(k=>state.formData[k]=gv(k)); }
  if (s===7){
    const tone=document.querySelector('input[name="tone"]:checked');
    const wl=document.querySelector('input[name="wordLimit"]:checked');
    const oc=document.querySelector('input[name="outputChoice"]:checked');
    if(tone) state.tone=tone.value;
    if(wl) state.wordLimit=parseInt(wl.value);
    if(oc) state.outputChoice=oc.value;
  }
  save();
}
function collectAll() {
  for(let s=1;s<=state.totalSteps;s++){ const p=state.currentStep; state.currentStep=s; collectStep(); state.currentStep=p; }
}

// ── LOCAL STORAGE ─────────────────────────────────────────
function save() { try{ localStorage.setItem('sc_data',JSON.stringify(state.formData)); }catch(e){} }
function restoreSession() {
  try {
    const d = JSON.parse(localStorage.getItem('sc_data')||'{}');
    state.formData = d;
    ['q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12','q13','q14','q15','q16','q17','q18','q19','q20','q21','q22'].forEach(id=>{
      const el=$(id); if(el&&d[id]) el.value=d[id];
    });
    if(d.admissionType){ const r=document.querySelector(`input[name="admissionType"][value="${d.admissionType}"]`); if(r) r.checked=true; }
    if(d.q5){ const c=$('abroadContent'); if(c) c.classList.remove('hidden'); const a=document.querySelector('#abroadToggle .toggle-arrow'); if(a) a.classList.add('open'); }
    if(d.q9){ const c=$('nicknameContent'); if(c) c.classList.remove('hidden'); const a=document.querySelector('#nicknameToggle .toggle-arrow'); if(a) a.classList.add('open'); }
  } catch(e){}
}
function bindAutoSave() {
  document.querySelectorAll('.field-input,.field-select').forEach(el=>el.addEventListener('input',()=>collectStep()));
}

// ── OPTIONAL TOGGLES ─────────────────────────────────────
function bindOptionalToggles() {
  [['abroadToggle','abroadContent'],['nicknameToggle','nicknameContent']].forEach(([tid,cid])=>{
    const t=$(tid),c=$(cid); if(!t||!c) return;
    t.addEventListener('click',()=>{
      const open=!c.classList.contains('hidden');
      c.classList.toggle('hidden',open);
      const a=t.querySelector('.toggle-arrow'); if(a) a.classList.toggle('open',!open);
    });
  });
}
function bindWordLimitSync() {
  document.querySelectorAll('input[name="wordLimit"]').forEach(r=>{
    r.addEventListener('change',()=>{
      state.wordLimit=parseInt(r.value);
      document.querySelectorAll('.wl-opt').forEach(l=>l.classList.remove('active'));
      r.closest('.wl-opt')?.classList.add('active');
    });
  });
}

// ── GENERATE BUTTON ───────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  if (!validateStep()) return;
  collectAll();

  const apiKey   = $('apiKey').value.trim();
  const provider = getProvider();

  const choice = state.outputChoice;
  const showP1 = choice==='prompt1'||choice==='both';
  const showP2 = choice==='prompt2'||choice==='both';

  formSection.classList.add('hidden');
  outputSection.classList.remove('hidden');
  $('outputName').textContent = state.formData.q2?.split(',')[0]?.trim()||'Your Statement';
  $('panel1').style.display = showP1?'flex':'none';
  $('panel2').style.display = showP2?'flex':'none';
  window.scrollTo({top:0,behavior:'smooth'});

  // ── SEQUENTIAL — never fires both at once ──
  // Gemini free tier: 2 requests/min max, so we wait 65s between them.
  // Groq free tier: much higher limits, 8s gap is enough.
  const gap = provider === 'gemini' ? 65000 : 8000;
  const gapMsg = provider === 'gemini'
    ? 'Statement 1 ready — Gemini needs 65 seconds before Statement 2 (free tier limit)…'
    : 'Statement 1 ready — generating Statement 2 in 8 seconds…';
  // OpenRouter free: 20 req/min is fine, 8s gap is enough

  if (showP1 && showP2) {
    await gen(1, provider, apiKey, prompt1());
    showToast(gapMsg);
    await sleep(gap);
    await gen(2, provider, apiKey, prompt2());
  } else if (showP1) {
    await gen(1, provider, apiKey, prompt1());
  } else {
    await gen(2, provider, apiKey, prompt2());
  }
});

// ── API CALL — handles all providers including Puter (no key) ──
async function call(provider, key, prompt, retries=2) {

  // ── PUTER: free, no API key, uses SDK loaded in HTML ────
  if (provider === 'puter') {
    try {
      if (typeof puter === 'undefined') throw new Error('Puter.js not loaded. Check your internet connection and reload the page.');
      const resp = await puter.ai.chat(prompt, {model: 'gpt-4o-mini'});
      const text = typeof resp === 'string' ? resp : resp?.message?.content || resp?.text || '';
      if (!text) throw new Error('Empty response from Puter. Please try again.');
      return text;
    } catch(e) {
      if (retries > 0) {
        showToast('Puter error — retrying in 5 seconds… (' + retries + ' left)');
        await sleep(5000);
        return call(provider, key, prompt, retries - 1);
      }
      throw new Error(e.message || 'Puter.js failed. Please try another provider.');
    }
  }

  // ── ALL OTHER PROVIDERS: standard fetch ─────────────────
  const cfg = PROVIDERS[provider];

  let res;
  try {
    res = await fetch(cfg.endpoint(key), {
      method: 'POST',
      headers: cfg.headers(key),
      body: cfg.body(prompt),
    });
  } catch(networkErr) {
    throw new Error('Network error — check your internet connection.');
  }

  // Rate limit — wait and retry
  if ((res.status === 429 || res.status === 503) && retries > 0) {
    let waitMs = 35000;
    try {
      const errBody = await res.clone().json();
      const errMsg  = errBody?.error?.message || '';
      const match   = errMsg.match(/retry in ([\d.]+)s/i);
      if (match) waitMs = Math.ceil(parseFloat(match[1]) * 1000) + 3000;
    } catch(_){}
    const waitSec = Math.ceil(waitMs / 1000);
    showToast('Rate limit — waiting ' + waitSec + 's then retrying… (' + retries + ' left)');
    await sleep(waitMs);
    return call(provider, key, prompt, retries - 1);
  }

  // HTTP error
  if (!res.ok) {
    let msg = 'API error ' + res.status;
    try {
      const e = await res.json();
      const raw = e?.error?.message || e?.message || msg;
      msg = raw.split('\n')[0];
    } catch(_){}
    throw new Error(msg);
  }

  let data;
  try { data = await res.json(); } catch(_) { throw new Error('Could not parse response from server.'); }

  let text;
  try { text = cfg.extract(data); } catch(extractErr) { throw extractErr; }

  if (!text) throw new Error('Empty response. The model may be overloaded — please try again.');
  return text;
}

// ── GENERATE PANEL ────────────────────────────────────────
async function gen(num, provider, key, prompt) {
  const loading = $(`loading${num}`);
  const out     = $(`output${num}`);
  const wcNum   = $(`wc${num}`);
  const wcBar   = $(`wcBar${num}`);

  loading.classList.remove('hidden');
  out.value=''; out.style.display='none';

  try {
    const text = await call(provider, key, prompt);
    loading.classList.add('hidden');
    out.style.display='block';
    await typeText(out, text);
    updateWC(out,wcNum,wcBar);
    out.addEventListener('input',()=>updateWC(out,wcNum,wcBar));
  } catch(e) {
    loading.classList.add('hidden');
    out.style.display='block';
    // Give a clear, helpful message — especially for Pakistan Gemini users
    let errDisplay = e.message;
    let advice = PROVIDERS[provider]?.hint || '';
    if (provider === 'gemini' && (e.message.includes('limit: 0') || e.message.includes('quota') || e.message.includes('RESOURCE_EXHAUSTED'))) {
      errDisplay = 'Gemini free tier is blocked in your region (quota = 0).';
      advice = 'SOLUTION: Switch to Groq — it is free, has no regional blocks, and works from Pakistan.\nGet your key at console.groq.com in 30 seconds.';
    }
    out.value = '⚠  Error: ' + errDisplay + '\n\n' + advice;
  }
}

async function typeText(el, text) {
  el.value='';
  for(let i=0;i<text.length;i+=8){ el.value+=text.slice(i,i+8); el.scrollTop=el.scrollHeight; await sleep(12); }
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function regenerate(num) {
  const key = $('apiKey')?.value?.trim();
  const provider = getProvider();
  if (!key) { showToast('Please go back and enter your API key.'); return; }
  await gen(num, provider, key, num===1?prompt1():prompt2());
}

function updateWC(ta,numEl,barEl) {
  const w=ta.value.trim().split(/\s+/).filter(Boolean).length;
  numEl.textContent=w;
  const pct=Math.min((w/state.wordLimit)*100,100);
  barEl.style.width=pct+'%';
  barEl.classList.remove('warn','over');
  if(pct>=100) barEl.classList.add('over');
  else if(pct>=80) barEl.classList.add('warn');
}

function copyText(id) {
  const el=$(id); if(!el||!el.value.trim()){ showToast('Nothing to copy yet.'); return; }
  navigator.clipboard.writeText(el.value).then(()=>showToast('✓ Copied!')).catch(()=>{ el.select(); document.execCommand('copy'); showToast('✓ Copied!'); });
}
function downloadText(id,filename) {
  const el=$(id); if(!el||!el.value.trim()){ showToast('Nothing to download yet.'); return; }
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([el.value],{type:'text/plain;charset=utf-8'}));
  a.download=`${filename}_${Date.now()}.txt`; a.click();
  showToast('✓ Downloaded!');
}

let toastTimer;
function showToast(msg) {
  toastMsg.textContent=msg; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),3500);
}

window.copyText=copyText; window.downloadText=downloadText; window.regenerate=regenerate;

// ── PROMPTS ──────────────────────────────────────────────
function prompt1() {
  const d=state.formData;
  return `You are a world-class university admissions consultant writing personal statements that read like compelling human stories.

APPLICANT DATA:
- Admission type: ${d.admissionType||'university admission'}
- Basic info: ${d.q2}
- Why this university: ${d.q3}
- Professor whose research inspires them: ${d.q4}
${d.q5?`- Why this country/city: ${d.q5}`:''}
- Passion origin: ${d.q6}
- Specific spark moment: ${d.q7}
- What it revealed about them: ${d.q8}
${d.q9?`- Doubt/nickname overcame: ${d.q9}`:''}
- Raw journey sentence → transform into opening line: ${d.q10}
- Most significant work: ${d.q11}
- Skills built: ${d.q12}
- Activities with proof: ${d.q13}
- Biggest difficulty overcome: ${d.q14}
- What work reveals about character: ${d.q15}
- Major challenge: ${d.q16}
- Almost gave up moment: ${d.q17}
- Sacrifice made: ${d.q18}
- Confirming incident for major: ${d.q19}
- Specific focus area: ${d.q20}
- Current active work: ${d.q21}
- 10-year vision + university's role: ${d.q22}

TASK — "Interest in the Major/Academic Programme" — ${state.wordLimit} words — Tone: ${state.tone}

RULES:
1. Transform q10 into ONE unforgettable opening line — this is the FIRST sentence.
2. Exactly 4 paragraphs. Each ends with a bridge sentence into the next.
3. LAST sentence echoes FIRST — full narrative circle.
4. NEVER use: "ever since I was young", "passionate about", "I have always been."
5. Vary sentence lengths. First-person conviction. One honest moment of doubt.
6. BANNED WORDS: "stands as", "serves as a testament", "underscores", "pivotal", "vibrant", "groundbreaking", "nestled", "showcasing", "exemplifies", "highlighting", "contributing to", "symbolizing."
7. NO generic endings.

¶1 — SPARK: Opening line. Exact origin moment (${d.q6}). Character quality (q8).${d.q9?' Include doubt/nickname.':''} Bridge → ¶2.
¶2 — JOURNEY: Significant work (q11). Skills (q12), activities (q13). Difficulty (q14). Hardships/sacrifice (q16,q17,q18) as proof. Bridge → "this led me to this major."
¶3 — MAJOR (largest): Confirming incident (q19). Connect back to ¶1. Focus area (q20) + current work (q21). How university reaches 10-year goal (q22). Bridge → "and this is why this university."
¶4 — UNIVERSITY: Why this university (q3). Professor (q4) — name them, connect research to applicant's focus specifically.${d.q5?' Country/city (q5) and what they bring home.':''} Echo first line to close the circle.

OUTPUT: Personal statement only. No headers. No labels. Pure flowing prose.`;
}

function prompt2() {
  const d=state.formData;
  return `You are a world-class university admissions consultant writing personal statements that read like compelling human stories.

APPLICANT DATA:
- Admission type: ${d.admissionType||'university admission'}
- Basic info: ${d.q2}
- Why this university: ${d.q3}
- Professor: ${d.q4}
${d.q5?`- Why this country/city: ${d.q5}`:''}
- Passion origin: ${d.q6} — specifically: ${d.q7}
- Character quality: ${d.q8}
${d.q9?`- Nickname/doubt: ${d.q9}`:''}
- Raw journey: ${d.q10}
- Most significant project: ${d.q11}
- Skills built: ${d.q12}
- Activities with proof: ${d.q13}
- Biggest difficulty: ${d.q14}
- Character revealed by work: ${d.q15}
- Major challenge: ${d.q16}
- Almost gave up: ${d.q17}
- Sacrifice: ${d.q18}
- Confirming incident: ${d.q19}
- Specific focus: ${d.q20}
- Current work: ${d.q21}
- 10-year vision: ${d.q22}

TASK — "Ambitions, Skills, and Experience" — ${state.wordLimit} words — Tone: ${state.tone}

RULES:
1. Craft ONE unforgettable opening line from q10 — framed around ambition, anchored in origin.
2. Exactly 4 paragraphs with bridge sentences between each.
3. LAST sentence echoes FIRST — complete circle.
4. First-person throughout. One honest crack in the story.
5. BANNED: "stands as", "serves as a testament", "underscores", "pivotal", "vibrant", "groundbreaking", "nestled", "showcasing", "exemplifies", "highlighting", "contributing to", "symbolizing."
6. BANNED CLOSINGS: "the future looks bright", "I look forward to", "I am ready for the next chapter."

¶1 — AMBITIONS: Opening line. Academic and career goals (q20,q22). Character through hardship (q16) and sacrifice (q18). Bridge → "these ambitions grew from real work."
¶2 — SKILLS: Stories not lists (q12,q13). Problem-solving through q14. Character through q15. Bridge → "these skills point toward a specific direction."
¶3 — EXPERIENCES & MAJOR (largest): Skills → confirming moment (q19). Focus (q20) + current work (q21). Full arc back to ¶1. University alignment (q3). Bridge → university as earned next step.
¶4 — UNIVERSITY: Skills → thriving. Unique opportunities (q3). Professor (q4) — research connected to focus.${d.q5?' Country/city (q5).':''} Echo first line.

OUTPUT: Personal statement only. No headers. No labels. Pure flowing prose.`;
}