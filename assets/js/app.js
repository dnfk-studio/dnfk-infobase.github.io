/* DNFK Info‑Base (fresh build) — 可用性優先 · 無後端 · 行動先 */
const state = {
  docs: [], filtered: [],
  q: new URLSearchParams(location.search).get('q') || '',
  category: new URLSearchParams(location.search).get('cat') || '',
  tag: new URLSearchParams(location.search).get('tag') || '',
  id: new URLSearchParams(location.search).get('id') || '',
  v: new URLSearchParams(location.search).get('v') || '',
  sortBy: localStorage.getItem('sortBy') || 'recent',
};

const el = (id)=>document.getElementById(id);
const $cards = el('cards'), $q = el('q'), $categoryList = el('categoryList'), $tagCloud = el('tagCloud');
const $sortBy = el('sortBy'), $activeFilters = el('activeFilters'), $clearFilters = el('clearFilters'), $resultsInfo = el('resultsInfo');
const $drawer = el('drawer'), $drawerTitle = el('drawerTitle'), $meta = el('meta'), $versionList = el('versionList'), $viewer = el('viewer');
const $menuBtn = el('menuBtn'), $sidebar = el('sidebar'), $drawerMask = el('drawerMask');
const $intro = el('intro'), $enterBtn = el('enterBtn'), $skipIntro = el('skipIntro');

document.getElementById('lastUpdated').textContent = new Date().toLocaleString();

// Intro overlay
;(function introBoot(){
  if(sessionStorage.getItem('dnfk_intro_entered') === '1'){
    document.body.classList.add('hide-intro');
  }
  $enterBtn?.addEventListener('click', ()=>{
    document.body.classList.add('hide-intro');
    sessionStorage.setItem('dnfk_intro_entered','1');
  });
  $skipIntro?.addEventListener('click', ()=>{
    document.body.classList.add('hide-intro');
  });
})();

init();

async function init(){
  wireGlobalUI();
  try{
    const res = await fetch('data/docs.json?_=' + Date.now(), {cache:'no-store'});
    if(!res.ok) throw new Error(res.status + ' ' + res.statusText);
    const json = await res.json();
    if(!Array.isArray(json)) throw new Error('docs.json 應為陣列');
    state.docs = json;
    buildUI();
  }catch(e){
    $cards.innerHTML = `<div class="muted">載入 data/docs.json 失敗：${esc(String(e))}</div>`;
  }
}

function wireGlobalUI(){
  // 側欄（手機）
  $menuBtn.addEventListener('click', ()=>{
    const open = !$sidebar.classList.contains('open');
    $sidebar.classList.toggle('open', open);
    $menuBtn.setAttribute('aria-expanded', String(open));
  });

  // 快捷鍵
  document.addEventListener('keydown', (e)=>{
    if(e.key==='/' && !/input|textarea|select/i.test(document.activeElement.tagName)){ e.preventDefault(); $q.focus(); }
    if(e.key==='Escape'){ closeDrawer(); $sidebar.classList.remove('open'); $menuBtn.setAttribute('aria-expanded','false'); }
  });

  // 清除篩選
  $clearFilters.addEventListener('click', ()=>{ state.q=''; state.category=''; state.tag=''; state.id=''; state.v=''; $q.value=''; syncURL(); applyFilters(); });
}

function buildUI(){
  $q.value = state.q;
  $sortBy.value = state.sortBy;

  renderFilters();
  applyFilters();

  $q.addEventListener('input', ()=>{ state.q=$q.value; syncURL(); applyFilters(); });
  $sortBy.addEventListener('change', ()=>{ state.sortBy=$sortBy.value; localStorage.setItem('sortBy', state.sortBy); applyFilters(); });

  // 若網址帶 id/v，直接開啟
  if(state.id){
    const d = state.docs.find(x=>x.id===state.id);
    if(d) openDrawer(d, state.v || d.current || (d.versions?.[0]?.v));
  }
}

function renderFilters(){
  const cats = ['公告','規章/團體規章','規章/部組規章','企劃/企劃提案書','企劃/企劃書','企劃/職務報告','企劃/財務報告','會議/會議公告','會議/會議紀錄'];
  $categoryList.innerHTML = '';
  for(const c of cats){
    const b = document.createElement('button');
    b.className = 'chip' + (state.category===c ? ' active' : '');
    b.type='button'; b.textContent = c.replace('/', ' › ');
    b.setAttribute('aria-pressed', String(state.category===c));
    b.onclick = ()=>{ state.category = (state.category===c?'':c); syncURL(); applyFilters(); };
    $categoryList.appendChild(b);
  }

  const tagCount = new Map();
  for(const d of state.docs){ (d.tags||[]).forEach(t=> tagCount.set(t, (tagCount.get(t)||0)+1)); }
  const tags = [...tagCount.entries()].sort((a,b)=> b[1]-a[1]).map(x=>x[0]).slice(0,50);
  $tagCloud.innerHTML = '';
  for(const t of tags){
    const b = document.createElement('button');
    b.className = 'chip' + (state.tag===t? ' active' : ''); b.type='button';
    b.innerHTML = `#${esc(t)}`; b.title = `共 ${tagCount.get(t)||0} 筆`;
    b.setAttribute('aria-pressed', String(state.tag===t));
    b.onclick = ()=>{ state.tag = (state.tag===t?'':t); syncURL(); applyFilters(); };
    $tagCloud.appendChild(b);
  }
}

function applyFilters(){
  const q = state.q.trim().toLowerCase();
  state.filtered = state.docs.filter(d=>{
    const catOk = state.category ? matchCategory(d.category, state.category) : true;
    const tagOk = state.tag ? (d.tags||[]).includes(state.tag) : true;
    const text = [d.id, d.title, d.category, ...(d.tags||[]), d.uploaded_by, d.properties?.性質, d.properties?.標籤].filter(Boolean).join(' ').toLowerCase();
    const qOk = q ? text.includes(q) : true;
    return catOk && tagOk && qOk;
  });

  const k = state.sortBy, parseDate = s => s ? new Date(s) : new Date(0);
  state.filtered.sort((a,b)=>{
    if(k==='recent') return (parseDate(b.revised_at||b.uploaded_at)) - (parseDate(a.revised_at||a.uploaded_at));
    if(k==='uploaded') return parseDate(b.uploaded_at) - parseDate(a.uploaded_at);
    if(k==='title') return (a.title||'').localeCompare(b.title||'');
    if(k==='id') return (a.id||'').localeCompare(b.id||'');
    return 0;
  });

  $activeFilters.innerHTML = '';
  if(state.q) addActive(`🔎 ${state.q}`, ()=>{ state.q=''; $q.value=''; syncURL(); applyFilters(); });
  if(state.category) addActive(`📂 ${state.category.replace('/',' › ')}`, ()=>{ state.category=''; syncURL(); applyFilters(); });
  if(state.tag) addActive(`🏷️ ${state.tag}`, ()=>{ state.tag=''; syncURL(); applyFilters(); });

  $resultsInfo.textContent = `共 ${state.filtered.length} 筆結果`;

  $cards.innerHTML = '';
  for(const d of state.filtered){
    const card = document.createElement('article');
    card.className = 'card'; card.tabIndex = 0;
    card.innerHTML = `
      <div class="row" style="display:flex; align-items:center; justify-content:space-between; gap:10px">
        <div>
          <h4>${esc(d.title||'(未命名)')}</h4>
          <div class="meta" style="margin-top:4px">
            <span class="badge">${esc(d.id)}</span>
            <span>${esc(d.category||'未分類')}</span>
          </div>
        </div>
        <button class="btn" title="開啟" aria-label="開啟 ${esc(d.title||'文件')}">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 12h14v2H5z"/><path fill="currentColor" d="M12 5l7 7-7 7V5z"/></svg>
          開啟
        </button>
      </div>
      <div class="meta">
        上傳：${esc(d.uploaded_by||'未知')} · ${esc(fmtDate(d.uploaded_at))}
        ${d.revised_at? ` · 更新：${esc(fmtDate(d.revised_at))}` : ''}
      </div>
      <div class="chips">
        ${(d.tags||[]).map(t=>`<span class="chip" tabindex="0">#${esc(t)}</span>`).join('')}
      </div>
    `;
    const open = ()=> openDrawer(d, d.current || (d.versions?.[0]?.v));
    card.querySelector('.btn').onclick = open;
    card.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); open(); } });
    card.addEventListener('click', (e)=>{ if(e.target.closest('.btn')) return; open(); });
    $cards.appendChild(card);
  }
}

function matchCategory(docCat, selected){
  if(!selected) return true;
  if(!docCat) return false;
  if(!selected.includes('/')) return String(docCat).split('/')[0]===selected;
  return docCat===selected;
}

function addActive(text, onRemove){
  const span = document.createElement('span');
  span.className = 'chip active';
  span.textContent = text + ' ';
  const btn = document.createElement('button');
  btn.className = 'icon-btn'; btn.textContent = '✕'; btn.style.minHeight='28px'; btn.style.minWidth='28px';
  btn.setAttribute('aria-label', '移除篩選 ' + text);
  btn.onclick = onRemove;
  span.appendChild(btn);
  $activeFilters.appendChild(span);
}

function fmtDate(s){ if(!s) return ''; try{ return new Date(s).toLocaleDateString(); }catch{ return s; } }
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

function syncURL(){
  const params = new URLSearchParams();
  if(state.q) params.set('q', state.q);
  if(state.category) params.set('cat', state.category);
  if(state.tag) params.set('tag', state.tag);
  if(state.id) params.set('id', state.id);
  if(state.v) params.set('v', state.v);
  history.replaceState(null, '', '?' + params.toString());
}

/* ===== Drawer ===== */
function openDrawer(doc, version){
  state.id = doc.id; state.v = version || ''; syncURL();
  $drawerTitle.textContent = doc.title || '(未命名)';
  const props = doc.properties || {};
  $meta.innerHTML = `
    <div>編號：<b>${esc(doc.id)}</b></div>
    <div>分類：${esc(doc.category||'未分類')}</div>
    <div>上傳者：${esc(doc.uploaded_by||'未知')}</div>
    <div>上傳時間：${esc(fmtDate(doc.uploaded_at))}</div>
    ${doc.revised_at? `<div>最後更新：${esc(fmtDate(doc.revised_at))}</div>`:''}
    ${Object.keys(props).length? `<div class="chips" style="margin-top:6px">${Object.entries(props).map(([k,v])=>`<span class="chip">${esc(k)}：${esc(v)}</span>`).join(' ')}</div>`:''}
    ${(doc.tags||[]).length? `<div class="chips" style="margin-top:6px">${(doc.tags||[]).map(t=>`<span class="chip">#${esc(t)}</span>`).join(' ')}</div>`:''}
  `;

  // 版本列表
  $versionList.innerHTML='';
  for(const v of (doc.versions||[])){
    const row = document.createElement('div');
    row.className = 'vrow';
    row.innerHTML = `
      <div>
        <div class="small" style="font-weight:700">v${esc(v.v)} <span class="muted">· ${esc(fmtDate(v.date||''))}</span></div>
        ${v.note? `<div class="small muted">${esc(v.note)}</div>` : ''}
      </div>
      <div style="display:flex; gap:8px">
        <a class="btn ghost" href="${encodeURI(v.file)}" target="_blank" rel="noopener" aria-label="下載 v${esc(v.v)}">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 20h14v-2H5v2zm7-18l-5.5 9h11L12 2z"/></svg>
          下載
        </a>
        <button class="btn" aria-label="預覽 v${esc(v.v)}">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 12a5 5 0 110-10 5 5 0 010 10z"/></svg>
          預覽
        </button>
      </div>
    `;
    row.querySelector('button.btn').onclick = ()=> loadPDF(v.file, doc, v.v);
    $versionList.appendChild(row);
  }

  $drawer.hidden = false;
  document.body.style.overflow='hidden';
  if(version){
    const vobj = (doc.versions||[]).find(x=>x.v===version);
    if(vobj) loadPDF(vobj.file, doc, version);
  }else{
    $viewer.innerHTML = '<div class="muted pad">請選擇版本。</div>';
  }
}

function closeDrawer(){
  $drawer.hidden = true;
  document.body.style.overflow='';
  state.id=''; state.v=''; syncURL();
}
el('drawerClose').onclick = closeDrawer;
$drawerMask.onclick = closeDrawer;

function loadPDF(file, doc, v){
  state.v = v || ''; syncURL();
  const url = encodeURI(file);
  $viewer.innerHTML = `<embed src="${url}" type="application/pdf" />` +
    `<div class="pad small muted">若未內嵌顯示，請<a class="ghost-btn" style="margin-left:6px" target="_blank" rel="noopener" href="${url}">以新分頁開啟/下載</a>。</div>`;
}
