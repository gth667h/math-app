// Run through the local development harness. No production code depends on this file.
(async () => {
  const results = [], assert = (condition, name) => {if (!condition) throw new Error(name);results.push(name);};
  const click = (action,value) => {const node=[...document.querySelectorAll('#spanishArea [data-action]')].find(b=>b.dataset.action===action && (value===undefined || b.dataset.value===value));if(!node)throw new Error('Missing button '+action+' '+value);node.click();};
  const tick = () => new Promise(resolve=>setTimeout(resolve,0));
  try {
    localStorage.removeItem('math-app.spanish.v1');
    const testState={attempts:0,reviews:{}};
    SpanishCore.grade(testState,'wrong',false,0);
    for(let i=0;i<4;i++) SpanishCore.grade(testState,'filler'+i,true,0);
    assert(!SpanishCore.isDue(testState.reviews.wrong,testState,0),'Wrong is not due after four other grades');
    SpanishCore.grade(testState,'fifth',true,0);
    assert(SpanishCore.isDue(testState.reviews.wrong,testState,0),'Wrong is due after five other grades');
    const jan31=new Date(2026,0,31,10).getTime(), feb28=new Date(2026,1,28,10).getTime();
    assert(SpanishCore.nextMonth(jan31)===feb28,'Monthly scheduling clamps January 31 to February 28');
    SpanishCore.grade(testState,'right',true,jan31);
    assert(!SpanishCore.isDue(testState.reviews.right,testState,feb28-1),'Right is excluded before monthly due date');
    assert(SpanishCore.isDue(testState.reviews.right,testState,feb28),'Right is eligible on monthly due date');
    const seed=await (await fetch('spanish-data.json')).json();
    assert(seed.tabs.find(t=>t.key==='conjugations').rows.length===56,'Eight verbs have all seven tense sets');
    assert(seed.tabs.find(t=>t.key==='conjugations').rows.every(r=>r.slice(3,8).length===5&&r.slice(3,8).every(Boolean)),'Every tense has five subject slots');
    const originalFetch=window.fetch.bind(window);
    window.fetch=async (url,options)=>{
      if(String(url).includes('mymemory'))return {ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Hoy caminé al parque.'}})};
      if(String(url).includes('docs.google.com')) {
        const id=Number(new URL(url).searchParams.get('gid')),tab=seed.tabs.find(t=>t.id===id);
        const csv=[tab.headers,...tab.rows].map(r=>r.map(v=>'"'+v.replace(/"/g,'""')+'"').join(',')).join('\r\n');
        return {ok:true,text:async()=>csv};
      }
      return originalFetch(url,options);
    };
    await SpanishApp.open();
    assert(document.querySelectorAll('[data-action="mode"]').length===8,'All eight Spanish modes are shown');
    for(const kind of ['sentences','nouns','adjectives','pronouns','conjunctions','adverbs']) {
      click('mode',kind);click('select',kind);click('reveal');
      assert(!document.getElementById('spGrades').classList.contains('hidden'),kind+' reveals answer and grading');
      click('right');click('right');
      const saved=JSON.parse(localStorage.getItem('math-app.spanish.v1'));
      assert(saved.attempts===results.filter(x=>x.endsWith('reveals answer and grading')).length,'Double grading is prevented for '+kind);
      click('cardBack');click('home');
    }
    click('mode','reverse');click('select','reverse');click('reveal');
    assert(document.getElementById('spAnswer').textContent.includes('how was your weekend?'),'Spanish to English uses the shared sentence list');
    click('cardBack');click('home');click('mode','verbs');click('select','verbs');
    for(const tense of ['present','preterit','imperfect','future','imperative','perfect','progressive']) {
      click('tense',tense);click('reveal');assert(document.querySelectorAll('.sp-table tbody tr').length===5,tense+' shows five subject rows');click('right');click('cardBack');
      assert(document.querySelectorAll('[data-action="tense"]').length===7,'Back returns to tense choices for '+tense);
    }
    click('mode','verbs');click('home');click('mode','sentences');document.getElementById('spNew').value='Today I walked to the park.';click('translateNew','sentences');await tick();
    assert(document.getElementById('spAnswer').textContent.includes('Hoy caminé al parque.'),'New sentence is translated and revealed');
    assert(JSON.parse(localStorage.getItem('math-app.spanish.v1')).additions.length===1,'New sentence is saved automatically');
    click('wrong');click('cardBack');click('home');click('mode','sentences');document.getElementById('spNew').value='  TODAY I WALKED TO THE PARK.  ';click('translateNew','sentences');await tick();
    assert(JSON.parse(localStorage.getItem('math-app.spanish.v1')).additions.length===1,'Adding the same normalized English entry does not duplicate it');
    click('cardBack');click('home');click('mode','nouns');document.getElementById('spNew').value='unavailable translation';window.fetch=async(url,options)=>String(url).includes('mymemory')?{ok:true,json:async()=>({responseStatus:429})}:originalFetch(url,options);click('translateNew','nouns');await tick();
    assert(Boolean(document.getElementById('spManual')),'Translation failures offer manual entry');
    document.getElementById('spManual').value='traducción manual';click('manual','nouns');assert(document.getElementById('spAnswer').textContent.includes('traducción manual'),'Manual translation saves and reveals');
    click('cardBack');click('home');click('exit');
    assert(!document.getElementById('menu').classList.contains('hidden'),'Back to Math restores the existing menu');
    startMode('m2x1');assert(document.getElementById('question').textContent.includes('×'),'Existing multiplication still runs');backToMenu();
    await fetch('/test-report',{method:'POST',body:JSON.stringify({passed:results.length,results})});
  } catch(error) {await fetch('/test-report',{method:'POST',body:JSON.stringify({passed:results.length,results,error:error.stack})});}
})();
