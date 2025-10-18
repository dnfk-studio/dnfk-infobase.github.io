/* 暗夜飛鳶工作室 線上資訊庫：前端驅動的文件索引與檢視器（純靜態） */
const state = {
  docs: [],
  filtered: [],
  q: new URLSearchParams(location.search).get('q') || '',
  category: new URLSearchParams(location.search).get('cat') || '',
  tag: new URLSearchParams(location.search).get('tag') || '',
  id: new URLSearchParams(location.search).get('id') || '',
  v: new URLSearchParams(location.search).get('v') || '',
  sortBy: localStorage.getItem('sortBy') || 'recent',
};

const el = (id)=>document.getElementById(id);
const $cards = el('cards');
const $q = el('q');
const $categoryList = el('categoryList');
const $tagCloud = el('tagCloud');
const $sortBy = el('sortBy');
const $activeFilters = el('activeFilters');
const $clearFilters = el('clearFilters');
const $resultsInfo = el('resultsInfo');
const $drawer = el('drawer');
const $drawerTitle = el('drawerTitle');
const $meta = el('meta');
const $versionList = el('versionList');
const $viewer = el('viewer');

document.getElementById('lastUpdated').textContent = new Date().toLocaleString();

init();

async function init(){
  try{
    const res = await fetch('data/docs.json?_=' + Date.now());
    const json = await res.json();
    state.docs = json;
    prepareUI();
  }catch(e){
    console.error(e);
    $cards.innerHTML = `<div class="text-sm text-red-300">載入 data/docs.json 失敗：${e}</div>`;
  }
}

function prepareUI(){
  $q.value = state.q;
  $sortBy.value = state.sortBy;

  renderFilters();
  applyFilters();

  $q.addEventListener('input', ()=>{ state.q=$q.value; syncURL(); applyFilters(); });
  $sortBy.addEventListener('change', ()=>{ state.sortBy=$sortBy.value; localStorage.setItem('sortBy', state.sortBy); applyFilters(); });
  $clearFilters.addEventListener('click', ()=>{ state.q=''; state.category=''; state.tag=''; state.id=''; state.v=''; $q.value=''; syncURL(); applyFilters(); });
  document.addEventListener('keydown', (e)=>{
    if(e.key==='/' && !/input|textarea|select/i.test(document.activeElement.tagName)){
      e.preventDefault(); $q.focus();
    }
    if(e.key==='Escape'){ closeDrawer(); }
  });

  // 若網址帶 id/v，嘗試直接開啟
  if(state.id){
    const d = state.docs.find(x=>x.id===state.id);
    if(d) openDrawer(d, state.v || d.current || (d.versions?.[0]?.v));
  }
}

function renderFilters(){
  // 類別
  const cats = ['公告','規章/團體規章','規章/部組規章','企劃/企劃提案書','企劃/企劃書','企劃/職務報告','企劃/財務報告','會議/會議公告','會議/會議紀錄'];
  $categoryList.innerHTML = '';
  for(const c of cats){
    const [main, sub] = c.split('/');
    const btn = document.createElement('button');
    btn.className = 'chip' + (state.category===c ? ' active' : '');
    btn.textContent = c.replace('/', ' › ');
    btn.onclick = ()=>{ state.category = (state.category===c?'':c); syncURL(); applyFilters(); };
    $categoryList.appendChild(btn);
  }

  // 標籤雲（統計）
  const tagCount = new Map();
  for(const d of state.docs){
    (d.tags||[]).forEach(t=> tagCount.set(t, (tagCount.get(t)||0)+1));
  }
  const tags = [...tagCount.entries()].sort((a,b)=> b[1]-a[1]).map(x=>x[0]).slice(0,30);
  $tagCloud.innerHTML = '';
  for(const t of tags){
    const b = document.createElement('button');
    b.className = 'chip' + (state.tag===t? ' active' : '');
    b.innerHTML = `#${t}`;
    b.title = `共有 ${tagCount.get(t)||0} 筆`;
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

  // 排序
  const k = state.sortBy;
  const parseDate = s => s ? new Date(s) : new Date(0);
  state.filtered.sort((a,b)=>{
    if(k==='recent') return (parseDate(b.revised_at||b.uploaded_at)) - (parseDate(a.revised_at||a.uploaded_at));
    if(k==='uploaded') return parseDate(b.uploaded_at) - parseDate(a.uploaded_at);
    if(k==='title') return (a.title||'').localeCompare(b.title||'');
    if(k==='id') return (a.id||'').localeCompare(b.id||'');
    return 0;
  });

  // active filters UI
  $activeFilters.innerHTML = '';
  if(state.q) addActive(`🔎 ${state.q}`, ()=>{ state.q=''; $q.value=''; syncURL(); applyFilters(); });
  if(state.category) addActive(`📂 ${state.category.replace('/',' › ')}`, ()=>{ state.category=''; syncURL(); applyFilters(); });
  if(state.tag) addActive(`🏷️ ${state.tag}`, ()=>{ state.tag=''; syncURL(); applyFilters(); });
  $clearFilters.classList.toggle('hidden', !(state.q||state.category||state.tag));

  // 統計
  $resultsInfo.textContent = `共 ${state.filtered.length} 筆結果`;

  // Cards
  $cards.innerHTML = '';
  for(const d of state.filtered){
    const card = document.createElement('article');
    card.className = 'card-doc';
    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="leading-tight">${esc(d.title||'(未命名)')}</h3>
          <div class="meta mt-1">
            <span class="badge">${esc(d.id)}</span>
            <span class="ml-2">${esc(d.category||'未分類')}</span>
          </div>
        </div>
        <button class="btn" title="開啟">開啟</button>
      </div>
      <div class="meta">
        上傳：${esc(d.uploaded_by||'未知')} · ${esc(fmtDate(d.uploaded_at))}
        ${d.revised_at? ` · 更新：${esc(fmtDate(d.revised_at))}` : ''}
      </div>
      <div class="tags">
        ${(d.tags||[]).map(t=>`<span class="chip">#${esc(t)}</span>`).join('')}
      </div>
    `;
    card.querySelector('.btn').onclick = ()=> openDrawer(d, d.current || (d.versions?.[0]?.v));
    card.onclick = (e)=>{ if(e.target.closest('.btn')) return; openDrawer(d, d.current || (d.versions?.[0]?.v)); };
    $cards.appendChild(card);
  }
}

function matchCategory(docCat, selected){
  if(!selected) return true;
  if(!docCat) return false;
  if(!selected.includes('/')) return docCat.split('/')[0]===selected;
  return docCat===selected;
}

function addActive(text, onRemove){
  const span = document.createElement('span');
  span.className = 'chip active';
  span.innerHTML = `${esc(text)} <button class="icon-btn" title="移除">✕</button>`;
  span.querySelector('button').onclick = onRemove;
  $activeFilters.appendChild(span);
}

function fmtDate(s){
  if(!s) return '';
  try{
    return new Date(s).toLocaleDateString();
  }catch{ return s; }
}

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

// Drawer
function openDrawer(doc, version){
  state.id = doc.id; state.v = version || '';
  syncURL();
  $drawerTitle.textContent = doc.title || '(未命名)';
  const props = doc.properties || {};
  $meta.innerHTML = `
    <div>編號：<b>${esc(doc.id)}</b></div>
    <div>分類：${esc(doc.category||'未分類')}</div>
    <div>上傳者：${esc(doc.uploaded_by||'未知')}</div>
    <div>上傳時間：${esc(fmtDate(doc.uploaded_at))}</div>
    ${doc.revised_at? `<div>最後更新：${esc(fmtDate(doc.revised_at))}</div>`:''}
    ${Object.keys(props).length? `<div class="mt-2">屬性：${Object.entries(props).map(([k,v])=>`<span class="chip">${esc(k)}：${esc(v)}</span>`).join(' ')}</div>`:''}
    ${(doc.tags||[]).length? `<div class="mt-2">標籤：${(doc.tags||[]).map(t=>`<span class="chip">#${esc(t)}</span>`).join(' ')}</div>`:''}
  `;

  // 版本列表
  $versionList.innerHTML = '';
  for(const v of (doc.versions||[])){
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-3 bg-slate-800/60 border border-white/5 rounded-lg px-3 py-2';
    row.innerHTML = `
      <div class="text-sm">
        <div class="font-medium">v${esc(v.v)} <span class="text-xs opacity-70">· ${esc(fmtDate(v.date||''))}</span></div>
        ${v.note? `<div class="text-xs opacity-80">${esc(v.note)}</div>` : ''}
      </div>
      <div class="flex items-center gap-2">
        <a class="btn-secondary" href="${esc(v.file)}" target="_blank">下載</a>
        <button class="btn">預覽</button>
      </div>
    `;
    row.querySelector('.btn').onclick = ()=> loadPDF(v.file, doc, v.v);
    $versionList.appendChild(row);
  }
  document.body.style.overflow='hidden';
  $drawer.classList.remove('hidden');
  if(version){
    const vobj = (doc.versions||[]).find(x=>x.v===version);
    if(vobj) loadPDF(vobj.file, doc, version);
  }else{
    $viewer.innerHTML = '<div class="text-sm text-slate-300/80 p-3">請選擇版本。</div>';
  }
}
function closeDrawer(){
  $drawer.classList.add('hidden');
  document.body.style.overflow='';
  state.id=''; state.v=''; syncURL();
}
document.getElementById('drawerClose').onclick = closeDrawer;
$drawer.querySelector('.drawer-mask').onclick = closeDrawer;

function loadPDF(file, doc, v){
  state.v = v; syncURL();
  // 優先用瀏覽器原生 PDF 檢視（最穩定），必要時可改為 pdf.js
  const url = file;
  $viewer.innerHTML = `<embed src="${url}" type="application/pdf" />` +
    `<div class="p-2 text-xs text-slate-400/80">若未內嵌顯示，請點右上角 <a class="underline" target="_blank" href="${url}">下載/新分頁開啟</a>。</div>`;
}
