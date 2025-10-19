const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const State = {
  docs: [],
  index: null,
  quickTags: [],
  current: null,
};

const catMap = [
  { id:"公告", label:"公告" },
  { id:"規章/團體規章", label:"規章／團體規章" },
  { id:"規章/部組規章", label:"規章／部組規章" },
  { id:"企劃/企劃提案書", label:"企劃／企劃提案書" },
  { id:"企劃/企劃書", label:"企劃／企劃書" },
  { id:"企劃/職務報告", label:"企劃／職務報告" },
  { id:"企劃/財務報告", label:"企劃／財務報告" },
  { id:"會議/會議公告", label:"會議／會議公告" },
  { id:"會議/會議紀錄", label:"會議／會議紀錄" },
];

function fmtDate(s){
  if(!s) return "—";
  const d = new Date(s);
  if(Number.isNaN(d)) return s;
  return d.toLocaleString('zh-TW', {hour12:false});
}

function normalize(doc){
  return {
    ...doc,
    _updated: new Date(doc.updated_at || doc.uploaded_at || Date.now()).getTime(),
    _uploaded: new Date(doc.uploaded_at || Date.now()).getTime(),
    _cat: doc.category + (doc.subcategory? ("/"+doc.subcategory):""),
    _tags: (doc.tags||[]).map(t=>String(t).toLowerCase()),
  };
}

async function loadDocs(){
  const res = await fetch('data/docs.json?_=' + Date.now());
  const json = await res.json();
  State.docs = json.map(normalize);
}

function buildIndex(){
  if(typeof lunr === 'undefined'){ console.warn('lunr not loaded'); return;}
  State.index = lunr(function(){
    this.ref('id');
    this.field('title', { boost: 3 });
    this.field('number', { boost: 2 });
    this.field('author');
    this.field('category');
    this.field('subcategory');
    this.field('tags');
    State.docs.forEach(d=> this.add({
      id: d.id,
      title: d.title,
      number: d.number,
      author: d.author,
      category: d.category,
      subcategory: d.subcategory || '',
      tags: (d.tags||[]).join(' '),
    }));
  });
}

function renderQuickCats(){
  const box = $('#quickCats');
  box.innerHTML = '';
  catMap.forEach(c =>{
    const el = document.createElement('button');
    el.className = 'chip';
    el.textContent = c.label;
    el.dataset.val = c.id;
    el.addEventListener('click',()=>{
      $('#filterCategory').value = c.id;
      renderList();
    });
    box.appendChild(el);
  });
}

function collectHotTags(){
  const freq = new Map();
  State.docs.forEach(d=> (d.tags||[]).forEach(t=> freq.set(t, (freq.get(t)||0)+1)));
  return [...freq.entries()].sort((a,b)=> b[1]-a[1]).slice(0,12).map(([t])=>t);
}

function renderHotTags(){
  const box = $('#hotTags');
  box.innerHTML = '';
  State.quickTags = collectHotTags();
  State.quickTags.forEach(tag=>{
    const el = document.createElement('button');
    el.className = 'chip';
    el.textContent = '#' + tag;
    el.addEventListener('click',()=>{
      const f = $('#filterTag');
      f.value = (f.value? f.value + ' ' : '') + tag;
      renderList();
    });
    box.appendChild(el);
  });
}

function getFilters(){
  const q = $('#q').value.trim();
  const cat = $('#filterCategory').value;
  const tagInput = $('#filterTag').value.trim().toLowerCase();
  const tags = tagInput? tagInput.split(/\s+/).filter(Boolean) : [];
  const sortBy = $('#sortBy').value;
  return { q, cat, tags, sortBy };
}

function matchTags(docTags, wanted){
  return wanted.every(t => docTags.includes(t));
}

function applyFilters(){
  const {q, cat, tags} = getFilters();
  let list = [...State.docs];

  if(cat){ list = list.filter(d=> d._cat === cat); }
  if(tags.length){ list = list.filter(d=> matchTags(d._tags, tags)); }
  if(q && State.index){
    const res = State.index.search(q + '*');
    const ids = new Set(res.map(r=> r.ref));
    list = list.filter(d=> ids.has(d.id));
  }
  return list;
}

function sortList(list, sortBy){
  switch(sortBy){
    case 'uploaded_desc': return list.sort((a,b)=> b._uploaded - a._uploaded);
    case 'number_asc': return list.sort((a,b)=> a.number.localeCompare(b.number, 'zh-Hant', {numeric:true}));
    case 'title_asc': return list.sort((a,b)=> a.title.localeCompare(b.title, 'zh-Hant'));
    default: return list.sort((a,b)=> b._updated - a._updated);
  }
}

function renderList(){
  const {sortBy} = getFilters();
  let list = applyFilters();
  list = sortList(list, sortBy);

  const total = State.docs.length;
  $('#stats').textContent = `共 ${total} 份文件 · 顯示 ${list.length} 份`;

  const ul = $('#docList');
  ul.innerHTML = '';

  if(!list.length){
    $('#emptyState').classList.remove('hidden');
    return;
  } else {
    $('#emptyState').classList.add('hidden');
  }

  list.forEach(d=>{
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="icon"><i class="ti ti-file-description"></i></div>
      <div style="flex:1;min-width:0">
        <h3>${d.title}</h3>
        <p class="meta">
          <span class="badge"><span class="dot"></span>${d._cat}</span>
          <span class="badge"><i class="ti ti-hash"></i> ${d.number}</span>
          <span class="badge"><i class="ti ti-user"></i> ${d.author || '—'}</span>
          <span class="badge"><i class="ti ti-upload"></i> 上傳 ${fmtDate(d.uploaded_at)}</span>
          <span class="badge"><i class="ti ti-edit"></i> 更新 ${fmtDate(d.updated_at)}</span>
          ${d.versions?.length? `<span class="badge yellow"><span class="dot"></span> ${d.versions.length} 個版本</span>`: ''}
        </p>
        <div class="tags">${(d.tags||[]).map(t=> `<span class="tag">#${t}</span>`).join('')}</div>
        <div class="card-actions">
          <button class="primary" data-open="${d.id}"><i class="ti ti-eye"></i> 檢視</button>
          <a class="ghost" href="#/doc/${encodeURIComponent(d.id)}"><i class="ti ti-link"></i> 連結</a>
        </div>
      </div>`;
    ul.appendChild(li);
  });

  $$('button[data-open]').forEach(btn=> btn.addEventListener('click', ()=> openDrawer(btn.dataset.open)));
}

function openDrawer(id){
  const d = State.docs.find(x=> x.id === id);
  if(!d) return;
  State.current = d;
  $('#docTitle').textContent = `${d.title}（${d.number}）`;
  $('#docMeta').textContent = `${d._cat}｜作者：${d.author||'—'}｜上傳：${fmtDate(d.uploaded_at)}｜更新：${fmtDate(d.updated_at)}`;
  $('#docTags').innerHTML = (d.tags||[]).map(t=> `<span class="tag">#${t}</span>`).join('');

  const sel = $('#versionSelect');
  sel.innerHTML = '';
  const versions = (d.versions?.length? d.versions : [{version:'v1', file:`docs/${d.id}/v1.pdf`, date:d.uploaded_at, notes:''}]).slice().sort((a,b)=> (a.date<b.date?1:-1));
  versions.forEach(v=>{
    const opt = document.createElement('option');
    opt.value = v.file;
    opt.textContent = `${v.version}｜${fmtDate(v.date)}${v.notes? '｜'+v.notes:''}`;
    sel.appendChild(opt);
  });

  const file = sel.value;
  $('#pdfFrame').src = file;
  $('#downloadPdf').href = file;

  const timeline = $('#versionTimeline');
  timeline.innerHTML = versions.map(v=> `<li><strong>${v.version}</strong> — ${fmtDate(v.date)} ${v.notes? '｜'+v.notes:''}<br><code>${v.file}</code></li>`).join('');

  $('#drawer').classList.remove('hidden');
  history.replaceState(null, '', `#/doc/${encodeURIComponent(d.id)}`);
}

function initEvents(){
  $('#q').addEventListener('input', renderList);
  $('#filterCategory').addEventListener('change', renderList);
  $('#filterTag').addEventListener('input', renderList);
  $('#sortBy').addEventListener('change', renderList);
  $('#clearSearch').addEventListener('click', ()=> { $('#q').value=''; renderList(); });
  $('#drawerClose').addEventListener('click', ()=>{
    $('#drawer').classList.add('hidden');
    $('#pdfFrame').src = '';
    history.replaceState(null, '', `#/`);
  });
  $('#openPdf').addEventListener('click', ()=>{
    const url = $('#versionSelect').value;
    window.open(url, '_blank');
  });
  $('#versionSelect').addEventListener('change', ()=>{
    const url = $('#versionSelect').value;
    $('#pdfFrame').src = url;
    $('#downloadPdf').href = url;
  });

  // keyboard: Ctrl+/ focus search
  window.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key === '/'){ e.preventDefault(); $('#q').focus(); }
    if(e.key === 'Escape' && !$('#drawer').classList.contains('hidden')){ $('#drawerClose').click(); }
  });

  // deep link
  if(location.hash.startsWith('#/doc/')){
    const id = decodeURIComponent(location.hash.replace('#/doc/',''));
    setTimeout(()=> openDrawer(id), 100);
  }
}

(async function main(){
  $('#year').textContent = new Date().getFullYear();
  try{
    await loadDocs();
  }catch(e){
    console.error('資料載入失敗', e);
    State.docs = [];
  }
  buildIndex();
  renderQuickCats();
  renderHotTags();
  renderList();
  initEvents();
})();
