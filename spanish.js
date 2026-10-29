/* Spanish practice: workbook content + private, browser-local additions and review history. */
'use strict';
const SpanishCore = (() => {
  const normalize = text => text.trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
  const key = (kind, english, tense = '') => JSON.stringify([kind, normalize(english), tense]);
  function nextMonth(now) {
    const date = new Date(now), day = date.getDate();
    date.setDate(1); date.setMonth(date.getMonth() + 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last)); return date.getTime();
  }
  function grade(state, id, right, now = Date.now()) {
    state.attempts++;
    state.reviews[id] = right
      ? { right: true, dueAt: nextMonth(now) }
      : { right: false, dueAttempt: state.attempts + 5 };
  }
  const isDue = (review, state, now = Date.now()) => review && (review.right ? now >= review.dueAt : state.attempts >= review.dueAttempt);
  return { normalize, key, nextMonth, grade, isDue };
})();

const SpanishApp = (() => {
  const storageKey = 'math-app.spanish.v1';
  const labels = {sentences:'Say a sentence about my day', reverse:'Spanish → English sentences', verbs:'Conjugate a verb', nouns:'One noun', adjectives:'One adjective', pronouns:'One pronoun', conjunctions:'One conjunction', adverbs:'One adverb'};
  const tenses = {present:'Present · I do', preterit:'Preterit · I did', imperfect:'Imperfect · I used to', future:'Future · I will', imperative:'Imperative · do this', perfect:'Perfect · I have done', progressive:'Progressive · I am doing'};
  const subjects = ['yo', 'tú', 'él / ella / usted', 'nosotros / nosotras', 'ellos / ellas / ustedes'];
  let state = {version:1, attempts:0, additions:[], reviews:{}}, seed, root, current, view, verb, warning = '', loadMessage = '', requestId = 0;
  const $ = id => document.getElementById(id);
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button = (action, label, value = '', extra = '') => `<button type="button" data-action="${action}" data-value="${esc(value)}" ${extra}>${esc(label)}</button>`;
  function validState(value) {
    if (!value || value.version !== 1 || !Number.isSafeInteger(value.attempts) || value.attempts < 0 || !Array.isArray(value.additions) || !value.reviews || typeof value.reviews !== 'object' || Array.isArray(value.reviews)) return false;
    if (!value.additions.every(x => ['sentences','nouns','adjectives','pronouns','conjunctions','adverbs'].includes(x.kind) && typeof x.english === 'string' && typeof x.spanish === 'string' && x.english.trim() && x.spanish.trim())) return false;
    return Object.values(value.reviews).every(r => r && typeof r.right === 'boolean' && Number.isFinite(r.right ? r.dueAt : r.dueAttempt));
  }
  try { const stored = localStorage.getItem(storageKey); if (stored) {const parsed = JSON.parse(stored); if (validState(parsed)) state = parsed; else warning = 'Saved Spanish data could not be read. Restore a backup before grading.';} }
  catch { warning = 'Browser storage is unavailable. Download a backup to keep this session.'; }
  function save() { try {localStorage.setItem(storageKey, JSON.stringify(state));} catch {warning = 'Could not save in this browser. Download a backup before leaving.';} }
  function items(kind) {
    const tab = seed.tabs.find(t => t.key === kind);
    const all = (tab?.rows || []).filter(row => row[0]?.trim() && row[1]?.trim()).map(row => ({kind,english:row[0],spanish:row[1],notes:row[2] || ''}));
    for (const entry of state.additions.filter(x => x.kind === kind)) {
      const index = all.findIndex(x => SpanishCore.normalize(x.english) === SpanishCore.normalize(entry.english));
      if (index >= 0) all[index] = entry; else all.push(entry);
    }
    return all;
  }
  function cards() {
    const list = ['sentences','nouns','adjectives','pronouns','conjunctions','adverbs'].flatMap(items);
    const rows = seed.tabs.find(t => t.key === 'conjugations').rows;
    return list.concat(rows.filter(r => r.length >= 8 && tenses[r[2]]).map(r => ({kind:'verbs',english:r[0],spanish:r[1],tense:r[2],forms:r.slice(3,8),notes:r[8] || ''})));
  }
  const idOf = card => SpanishCore.key(card.kind, card.english, card.tense);
  const dueCards = () => cards().filter(c => SpanishCore.isDue(state.reviews[idOf(c)], state));
  const choose = list => list[Math.floor(Math.random() * list.length)];
  function render(body) {
    root.innerHTML = `<h2>Spanish</h2>${warning ? `<p role="alert">${esc(warning)}</p>` : ''}<div id="spStatus" role="status" aria-live="polite"></div>${body}`;
  }
  function home() {
    requestId++; view = 'home'; current = null;
    const due = dueCards().length;
    render(`<p>Right: monthly review. Wrong: review after five more graded Spanish questions.</p>${button('review', `Random review · ${due} due`, '', due ? '' : 'disabled')}${Object.entries(labels).map(([k,label]) => button('mode',label,k)).join('')}<p class="sp-small">${esc(loadMessage)} New entries and scores stay in this browser. New-text translation uses MyMemory; check translations before grading.</p>${button('backup','Download Spanish backup')}<label class="sp-label">Restore a backup (merges with this browser)<input id="spImport" type="file" accept="application/json,.json"></label>${button('exit','Back to Math menu')}`);
  }
  async function open() {
    if (!root) {
      root = document.createElement('section'); root.id = 'spanishArea'; root.className = 'card'; root.setAttribute('aria-label','Spanish practice');
      document.querySelector('.container').appendChild(root);
      const style = document.createElement('style'); style.textContent = '#spanishArea input,#spanishArea select,#spanishArea textarea{box-sizing:border-box;width:100%;padding:12px;font:inherit;margin:8px 0;border:1px solid #aaa;border-radius:8px}#spanishArea .sp-small{font-size:14px;color:#555;line-height:1.5}.sp-label{display:block;margin-top:16px}.sp-answer{font-size:24px;white-space:pre-line;overflow-wrap:anywhere;margin:20px 0}.sp-grades{display:flex;gap:12px}.sp-right{background:#d8f0dc}.sp-wrong{background:#fde0de}.sp-table{width:100%;border-collapse:collapse}.sp-table td,.sp-table th{padding:10px 5px;border-bottom:1px solid #ddd;text-align:left;overflow-wrap:anywhere}#spStatus{white-space:pre-line;line-height:1.5}#spanishArea button:disabled{opacity:.5;cursor:default}'; document.head.appendChild(style);
      root.addEventListener('click', event => {const target = event.target.closest('button[data-action]'); if (target && !target.disabled) act(target.dataset.action, target.dataset.value).catch(error => {if ($('spStatus')) $('spStatus').textContent = error.message;});});
      root.addEventListener('change', event => {if(event.target.id === 'spImport') restore(event.target.files[0]);});
    }
    document.getElementById('menu').classList.add('hidden'); root.classList.remove('hidden');
    if (!seed) {
      render('<p>Loading Spanish lists…</p>');
      try {const response = await fetch('spanish-data.json'); if (!response.ok) throw new Error(); seed = await response.json();}
      catch {render(`<p>Spanish data could not load. Check your connection and try again.</p>${button('retry','Try again')}${button('exit','Back to Math menu')}`); return;}
      // Match the existing app's published-workbook approach; packaged data remains available offline.
      const results = await Promise.allSettled(seed.tabs.map(async tab => {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 7000);
        try {
          const response = await fetch(`${publishedSheetBase}?gid=${tab.id}&single=true&output=csv`, {signal:controller.signal});
          if (!response.ok) throw new Error();
          const rows = parseCsv(await response.text());
          if (rows[0]?.[0]?.trim() !== 'English' || rows[0]?.[1]?.trim() !== 'Spanish') throw new Error();
          tab.rows = rows.slice(1).filter(row => row[0]?.trim() && row[1]?.trim());
        } finally {clearTimeout(timeout);}
      }));
      loadMessage = results.every(r => r.status === 'fulfilled') ? 'Lists loaded from Google Sheets.' : 'Some workbook tabs are unavailable; using their bundled starter lists.';
    }
    home();
  }
  function mode(kind) {
    requestId++; view = kind; current = null;
    const source = kind === 'reverse' ? 'sentences' : kind, list = items(source);
    render(`<h3>${esc(labels[kind])}</h3><label for="spSelect">Choose ${kind === 'verbs' ? 'a verb' : 'an entry'}</label><select id="spSelect">${list.map((c,i)=>`<option value="${i}">${esc(kind === 'reverse' ? c.spanish : c.english)}</option>`).join('')}</select>${button('select',kind === 'verbs' ? 'Choose tense' : 'Practice selected',kind)}${button('random','Random eligible entry',kind)}${kind !== 'reverse' && kind !== 'verbs' ? `<label for="spNew">Or type a new English ${kind === 'sentences' ? 'sentence' : 'word'}</label><textarea id="spNew" rows="2" maxlength="450"></textarea><p class="sp-small">Translate sends only this text to MyMemory. Saved entries use their existing translation.</p>${button('translateNew','Translate & save to my list',source)}` : ''}${button('home','Back to Spanish menu')}`);
  }
  function selectCard(card, reverse = false, review = false) {
    requestId++; current = {...card,reverse,review,revealed:false,graded:false};
    const question = card.kind === 'verbs' ? `${card.english} · ${card.spanish}\n${tenses[card.tense]}\nConjugate for yo, tú, él, nosotros, ellos.` : reverse ? card.spanish : card.english;
    render(`<h3>${review ? 'Scheduled review' : esc(labels[reverse ? 'reverse' : card.kind])}</h3><div class="question" style="white-space:pre-line" ${reverse ? 'lang="es"' : ''}>${esc(question)}</div>${button('reveal', card.kind === 'verbs' ? 'Show' : 'Translate')}<div id="spAnswer" class="hidden" aria-live="polite"></div><div id="spGrades" class="sp-grades hidden">${button('right','Right','','class="sp-right"')}${button('wrong','Wrong','','class="sp-wrong"')}</div>${button('cardBack',card.kind === 'verbs' && !review ? 'Back to tenses' : 'Back')}`);
  }
  function verbMenu(entry) {
    requestId++; verb = entry; view = 'verbs'; current = null;
    render(`<h3>${esc(entry.english)} · <span lang="es">${esc(entry.spanish)}</span></h3><p>Choose a tense, say all five forms, then show and grade the set.</p>${Object.entries(tenses).map(([key,label])=>button('tense',label,key)).join('')}${button('mode','Back to verb list','verbs')}`);
  }
  function reveal() {
    if (!current || current.revealed) return;
    current.revealed = true;
    $('spAnswer').classList.remove('hidden');
    $('spAnswer').innerHTML = current.kind === 'verbs' ? `<table class="sp-table"><thead><tr><th>Subject</th><th>Spanish</th></tr></thead><tbody>${subjects.map((s,i)=>`<tr><td>${esc(current.tense === 'imperative' && i===2 ? 'usted' : current.tense === 'imperative' && i===4 ? 'ustedes' : s)}</td><td lang="es">${esc(current.forms[i])}</td></tr>`).join('')}</tbody></table>` : `<div class="sp-answer" lang="${current.reverse?'en':'es'}">${esc(current.reverse?current.english:current.spanish)}</div>`;
    if (current.notes) $('spAnswer').innerHTML += `<p class="sp-small">${esc(current.notes)}</p>`;
    $('spAnswer').innerHTML += button('speak','Hear Spanish');
    $('spGrades').classList.remove('hidden');
  }
  function grade(right) {
    if (!current?.revealed || current.graded) return;
    SpanishCore.grade(state,idOf(current),right); current.graded = true; save();
    $('spGrades').querySelectorAll('button').forEach(b=>b.disabled=true);
    $('spStatus').textContent = right ? 'Saved. Monthly review due '+new Date(state.reviews[idOf(current)].dueAt).toLocaleDateString()+'.' : 'Saved. This will return after five more graded Spanish questions.';
    if(warning) $('spStatus').textContent += '\n'+warning;
  }
  function review() {const list = dueCards(); if(list.length) selectCard(choose(list),false,true); else home();}
  async function translateNew(kind) {
    const english = $('spNew').value.trim();
    if (!english) throw new Error('Type an English word or sentence first.');
    if (new TextEncoder().encode(english).length > 500) throw new Error('Please use a shorter sentence (under 500 UTF-8 bytes).');
    const existing = items(kind).find(x=>SpanishCore.normalize(x.english) === SpanishCore.normalize(english));
    if(existing) {selectCard(existing); reveal(); return;}
    const token = ++requestId, trigger = root.querySelector('[data-action="translateNew"]'); trigger.disabled=true;
    $('spStatus').textContent = 'Translating…';
    const controller = new AbortController(), timeout = setTimeout(()=>controller.abort(),15000);
    try {
      const response = await fetch('https://api.mymemory.translated.net/get?'+new URLSearchParams({q:english,langpair:'en|es'}),{signal:controller.signal});
      const result = await response.json();
      if (!response.ok || Number(result.responseStatus)!==200 || result.quotaFinished || !result.responseData?.translatedText?.trim()) throw new Error();
      if(token !== requestId) return;
      const decoder = document.createElement('textarea'); decoder.innerHTML=result.responseData.translatedText;
      const entry={kind,english,spanish:decoder.value.trim(),notes:'Machine translation; check before grading.'};
      state.additions.push(entry); save(); selectCard(entry); reveal();
    } catch {
      if(token !== requestId) return;
      $('spStatus').textContent='Translation is unavailable or its daily limit was reached. Try again, or enter a Spanish translation below.';
      if (!$('spManual')) {const panel=document.createElement('div'); panel.innerHTML=`<label for="spManual">Spanish translation</label><textarea id="spManual" rows="2"></textarea>${button('manual','Save translation',kind)}`; $('spStatus').after(panel);}
    } finally {clearTimeout(timeout); if(token===requestId) trigger.disabled=false;}
  }
  function backup() {const link=document.createElement('a'), url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));link.href=url;link.download='spanish-practice-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function restore(file) {
    if(!file) return;
    try {
      const incoming=JSON.parse(await file.text()); if(!validState(incoming)) throw new Error();
      const added=new Map(state.additions.map(c=>[idOf(c),c])); for(const c of incoming.additions) added.set(idOf(c),c);
      const attempts=Math.max(state.attempts,incoming.attempts), reviews={...state.reviews};
      // Rebase attempt-relative due dates when merging counters from different devices.
      for(const [id,r] of Object.entries(reviews)) if(!r.right) reviews[id]={...r,dueAttempt:attempts+Math.max(0,r.dueAttempt-state.attempts)};
      for(const [id,r] of Object.entries(incoming.reviews)) reviews[id]=r.right?r:{...r,dueAttempt:attempts+Math.max(0,r.dueAttempt-incoming.attempts)};
      state={version:1,attempts,additions:[...added.values()],reviews};save();home();$('spStatus').textContent='Backup restored and merged.';
    } catch {$('spStatus').textContent='That file is not a valid Spanish backup. Your current data was kept.';}
  }
  async function act(action,value) {
    if(action==='home') home();
    else if(action==='retry') await open();
    else if(action==='exit') {requestId++; window.speechSynthesis?.cancel();root.classList.add('hidden');$('menu').classList.remove('hidden');}
    else if(action==='mode') mode(value);
    else if(action==='select'||action==='random') {
      const kind=value==='reverse'?'sentences':value, list=items(kind);
      const eligible=list.filter(c=>!state.reviews[idOf(c)]||SpanishCore.isDue(state.reviews[idOf(c)],state));
      const card=action==='select'?list[Number($('spSelect').value)]:choose(eligible);
      if(!card) throw new Error('No eligible entries now. Choose an entry manually or use another mode.');
      if(kind==='verbs') verbMenu(card); else selectCard(card,value==='reverse');
    }
    else if(action==='tense') {const row=cards().find(c=>c.kind==='verbs'&&SpanishCore.normalize(c.english)===SpanishCore.normalize(verb.english)&&c.tense===value);if(!row) throw new Error('No conjugations found for this tense.');selectCard(row);}
    else if(action==='reveal') reveal();
    else if(action==='right'||action==='wrong') grade(action==='right');
    else if(action==='cardBack') {
      const previous=current;
      if(previous?.graded&&dueCards().length) review();
      else if(previous?.kind==='verbs'&&!previous.review) verbMenu(verb || previous);
      else if(previous?.review) home();
      else mode(previous?.reverse?'reverse':previous?.kind||view);
    }
    else if(action==='review') review();
    else if(action==='translateNew') await translateNew(value);
    else if(action==='manual') {const english=$('spNew').value.trim(),spanish=$('spManual').value.trim();if(!english||!spanish)throw new Error('Enter both English and Spanish.');const entry={kind:value,english,spanish,notes:'User translation.'};const index=state.additions.findIndex(c=>idOf(c)===idOf(entry));if(index>=0)state.additions[index]=entry;else state.additions.push(entry);save();selectCard(entry);reveal();}
    else if(action==='speak') {if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw new Error('Spanish speech is unavailable in this browser.');const text=current.forms?current.forms.filter(x=>x!=='—').join('. '):current.spanish;const utterance=new SpeechSynthesisUtterance(text);utterance.lang='es-ES';utterance.rate=.85;window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);}
    else if(action==='backup') backup();
  }
  return {open};
})();
