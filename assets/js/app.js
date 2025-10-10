/* 主應用：載入公告與文件，建立搜尋與排序、渲染列表 */
const state = {
  announcements: [],
  docs: [],
  tags: new Set(),
  fuse: null,
  filtered: []
};

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('fetch failed: ' + url);
  return res.json();
}

async function loadAnnouncements() {
  try {
    if (CONFIG.ANNOUNCEMENTS_SOURCE === 'APPS_SCRIPT' && CONFIG.APPS_SCRIPT_URL) {
      const url = CONFIG.APPS_SCRIPT_URL + '?list=ann';
      state.announcements = (await fetchJSON(url)).data ?? [];
    } else {
      state.announcements = (await fetchJSON(CONFIG.LOCAL_ANN_JSON));
    }
  } catch (e) {
    console.warn('公告載入失敗，使用空集合', e);
    state.announcements = [];
  }
}

async function loadDocs() {
  try {
    if (CONFIG.DOCS_SOURCE === 'APPS_SCRIPT' && CONFIG.APPS_SCRIPT_URL) {
      const url = CONFIG.APPS_SCRIPT_URL + '?list=docs';
      state.docs = (await fetchJSON(url)).data ?? [];
    } else {
      state.docs = (await fetchJSON(CONFIG.LOCAL_DOCS_JSON));
    }
  } catch (e) {
    console.warn('文件載入失敗，使用空集合', e);
    state.docs = [];
  }
  // 正規化欄位
  state.docs = state.docs.map(d => ({
    id: d.id || crypto.randomUUID(),
    title: d.title || '未命名文件',
    date: d.date || new Date().toISOString().slice(0,10),
    tags: Array.isArray(d.tags) ? d.tags : (typeof d.tags === 'string' ? d.tags.split(',').map(s => s.trim()).filter(Boolean) : []),
    desc: d.desc || '',
    url: d.url || '#'
  }));
  // 建立標籤集合
  state.tags = new Set();
  state.docs.forEach(d => d.tags.forEach(t => state.tags.add(t)));
}

function renderAnnouncements() {
  const wrap = document.getElementById('annBoard');
  const cnt = document.getElementById('annCount');
  wrap.innerHTML = '';
  (state.announcements || []).forEach((a, i) => {
    const el = document.createElement('div');
    el.className = 'glass rounded-2xl p-4 space-y-2 card-hover transition';
    el.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20">🗒️</span>
        <div class="font-medium">${a.title || '未命名公告'}</div>
      </div>
      <div class="text-sm text-slate-300/90">${a.content || ''}</div>
      <div class="text-xs text-slate-400">${a.date || ''}</div>
      ${a.link ? `<a class="text-sm underline" target="_blank" href="${a.link}">相關連結</a>` : ''}
    `;
    wrap.appendChild(el);
  });
  cnt.textContent = `(${state.announcements.length} 則)`;
}

function renderTagChips() {
  const wrap = document.getElementById('tagChips');
  wrap.innerHTML = '';
  const mk = (name) => {
    const btn = document.createElement('button');
    btn.className = 'chip px-2 py-1.5 rounded-xl text-sm text-slate-200/90 hover:bg-cyan-500/20 transition';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      const q = document.getElementById('searchInput');
      const val = q.value.trim();
      q.value = val ? (val + ' ' + name) : name;
      applySearch();
    });
    wrap.appendChild(btn);
  };
  ['全部'].concat([...state.tags]).forEach(mk);
}

function openPDF(url) {
  const viewer = CONFIG.PDFJS_VIEWER + encodeURIComponent(url);
  window.open(viewer, '_blank', 'noopener');
}

function renderDocs(list) {
  const wrap = document.getElementById('docList');
  const empty = document.getElementById('emptyState');
  wrap.innerHTML = '';
  if (!list.length) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.forEach(d => {
    const el = document.createElement('div');
    el.className = 'glass rounded-2xl p-4 space-y-3 card-hover transition';
    el.innerHTML = `
      <div class="flex items-center gap-3">
        <i data-lucide="file-text" class="w-5 h-5"></i>
        <div class="font-medium">${d.title}</div>
      </div>
      <div class="text-sm text-slate-300/90 line-clamp-2">${d.desc}</div>
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <i data-lucide="calendar" class="w-4 h-4"></i><span>${d.date}</span>
      </div>
      <div class="flex flex-wrap gap-2">
        ${d.tags.map(t => `<span class="chip px-2 py-1 rounded-lg text-xs">${t}</span>`).join('')}
      </div>
      <div class="flex gap-2">
        <a target="_blank" class="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30" href="${d.url}">直接下載</a>
        <button class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700" data-open="${d.url}">預覽</button>
      </div>
    `;
    wrap.appendChild(el);
  });
  lucide.createIcons();
  wrap.querySelectorAll('button[data-open]').forEach(btn => {
    btn.addEventListener('click', () => openPDF(btn.getAttribute('data-open')));
  });
}

function applySearch() {
  const q = document.getElementById('searchInput').value.trim();
  const sort = document.getElementById('sortSelect').value;
  let result = [];
  if (!q) {
    result = [...state.docs];
  } else {
    const hits = state.fuse.search(q);
    result = hits.map(h => h.item);
  }
  // 排序
  if (sort === 'newest') {
    result.sort((a,b) => b.date.localeCompare(a.date));
  } else if (sort === 'oldest') {
    result.sort((a,b) => a.date.localeCompare(b.date));
  } else if (sort === 'title') {
    result.sort((a,b) => a.title.localeCompare(b.title, 'zh-Hant'));
  }
  state.filtered = result;
  renderDocs(state.filtered);
}

async function boot() {
  await Promise.all([loadAnnouncements(), loadDocs()]);
  renderAnnouncements();
  renderTagChips();
  state.fuse = new Fuse(state.docs, CONFIG.FUSE_OPTIONS);
  applySearch();

  document.getElementById('searchInput').addEventListener('input', applySearch);
  document.getElementById('sortSelect').addEventListener('change', applySearch);
}

document.addEventListener('DOMContentLoaded', boot);
