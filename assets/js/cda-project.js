import { bootCommon, $, $$, toast } from "./app.js";
import { loadNotices, latestVersionIndex, lastUpdated, formatDate, parseDate } from "./data.js";
function getLatestVid(n, latestVersionIndex){
  try{
    if(!n?.versions?.length) return null;
    const i = latestVersionIndex(n);
    const v = n.versions[i];
    return v?.id || v?.versionId || null;
  }catch(e){ return null; }
}



function uniq(arr){ return Array.from(new Set(arr)).filter(Boolean); }
function normalize(s){ return String(s||"").toLowerCase().trim(); }
function includesAll(hay, words){
  const h = normalize(hay);
  return (words||[]).every(w=> h.includes(normalize(w)));
}
function hash(str){ let h=0; for(let i=0;i<str.length;i++){ h=((h<<5)-h)+str.charCodeAt(i); h|=0; } return Math.abs(h); }
function setupDetailsMulti(detailsId, items, onChange){
  const el = document.querySelector(detailsId);
  if(!el) return { selected:new Set(), set:()=>{}, render:()=>{} };
  const panel = el.querySelector("[data-panel]");
  const countEl = el.querySelector("[data-count]");
  const sel = new Set();
  

function render(){
    if(!panel) return;
    panel.innerHTML = items.map(v=>{
      const id = `x_${detailsId.replace("#","")}_${hash(v)}`;
      return `<label class="item" for="${id}">
        <input id="${id}" type="checkbox" ${sel.has(v)?"checked":""}/>
        <span class="txt">${esc(v)}</span>
      </label>`;
    }).join("");
    panel.querySelectorAll("input").forEach(inp=>{
      inp.addEventListener("change", ()=>{
        const val = inp.closest("label")?.querySelector(".txt")?.textContent || "";
        if(inp.checked) sel.add(val); else sel.delete(val);
        updateCount();
        onChange?.();
      });
    });
  }
  function updateCount(){
    if(countEl) countEl.textContent = sel.size ? `已選 ${sel.size}` : "未選";
  }
  function set(vals){
    sel.clear();
    (vals||[]).forEach(v=> sel.add(v));
    render(); updateCount();
  }
  render(); updateCount();
  return { selected:sel, set, render };
}
function syncChips(rootEl, keyword, sets, onRemove){
  if(!rootEl) return;
  const chips=[];
  if(keyword) chips.push({k:"q", v:keyword, label:`關鍵字 ${keyword}`});
  Object.entries(sets||{}).forEach(([k,set])=>{
    [...set].forEach(v=> chips.push({k, v, label:`${k==="cat"?"類別":k==="status"?"狀態":"負責人"} ${v}` }));
  });
  rootEl.innerHTML = chips.map((c,i)=>`<span class="chip"><span>${esc(c.label)}</span><button type="button" aria-label="移除">×</button></span>`).join("");
  rootEl.querySelectorAll(".chip button").forEach((btn,i)=>{
    btn.addEventListener("click", ()=> onRemove?.(chips[i]));
  });
}

function stabilizeCalendarLayout(view){
  const wrap = document.getElementById("calendarWrap");
  const list = document.getElementById("calendarList");
  if(!wrap || !list) return;
  // avoid stale heights when switching views on mobile
  requestAnimationFrame(()=>{
    wrap.style.height = "auto";
    list.style.height = "auto";
    if(view === "list"){
      // list view can be taller; keep it readable without breaking layout
      list.style.maxHeight = "520px";
      list.style.overflow = "auto";
    }else{
      list.style.maxHeight = "";
      list.style.overflow = "";
    }
  });
}

function esc(s){
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function makeDocUrl(id){
  const u = new URL("../document/", location.href);
  u.searchParams.set("id", String(id||""));
  return u.toString();
}


const CAT = ["行政","科技","資訊","企劃","藝術","音樂","雜項"];
const CAT_COLOR_VAR = {
  "行政":"var(--cat-admin)",
  "科技":"var(--cat-tech)",
  "資訊":"var(--cat-info)",
  "企劃":"var(--cat-plan)",
  "藝術":"var(--cat-art)",
  "音樂":"var(--cat-music)",
  "雜項":"var(--cat-misc)"
};

function normTags(tags){
  if(Array.isArray(tags)) return tags;
  if(typeof tags === "string" && tags.trim()) return [tags.trim()];
  return [];
}

function normArr(v){
  if(Array.isArray(v)) return v;
  if(v === null || v === undefined) return [];
  return [v];
}


function parseYMD(s){
  if(!s) return null;
  const [y,m,d] = String(s).split("-").map(Number);
  if(!y||!m||!d) return null;
  return new Date(y, m-1, d);
}
function ymd(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const da=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}
function startOfWeek(d){
  const x=new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day=x.getDay(); // 0 Sun
  const diff = (day+6)%7; // make Monday start
  x.setDate(x.getDate()-diff);
  x.setHours(0,0,0,0);
  return x;
}
function addDays(d,n){
  const x=new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
  x.setHours(0,0,0,0);
  return x;
}
function inRange(day, s, e){
  const t=day.getTime();
  return t>=s.getTime() && t<=e.getTime();
}

async function loadProject(){
  const res = await fetch("../assets/data/cda-project.json", {cache:"no-store"});
  if(!res.ok) throw new Error("無法載入 cda-project.json");
  return await res.json();
}

function buildDocCard(n){
  const versions = Array.isArray(n?.versions) ? n.versions : [];
  const vi = latestVersionIndex({versions});
  const v = versions[vi] || {};
  const updated = lastUpdated({versions});
  const cat = Array.isArray(n?.category) ? n.category.join("/") : (n?.category || "—");
  const up = formatDate(parseDate(v.uploadTime));
  const meta = `分類 ${esc(cat||"—")} | 上傳者 ${esc(v.uploader||"")} | 上傳 ${esc(up)} | 最後更新 ${esc(formatDate(updated))}`;
  const title = esc(n?.title || "");
  const vid = (v.id || v.versionId || n?.id || "");
  const href = makeDocUrl(vid);
  return `
    <article class="result clickable" data-open="${esc(vid)}">
      <div class="result-head">
        <div>
          <div class="meta-line">${meta}</div>
          <h3 class="result-title">${title}</h3>
        </div>
        <a class="detailbtn" href="${href}">查看詳情</a>
      </div>
    </article>
  `;
}

function autoTaskStatus(t){
  const p = Math.max(0, Math.min(100, Number(t?.percent||0)));
  if(p>=100) return "已完成";
  const running = !!(t?.isRunning ?? t?.running ?? t?.executing ?? t?.isExecuting);
  const paused = !!(t?.isPaused ?? t?.paused ?? t?.isPausedExec ?? t?.pauseExec);
  const dl = parseYMDStrict(t?.deadline);
  const now = new Date();
  const overdue = !!(dl && dl.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime());
  if(paused && running) return "暫停中";
  if(running && overdue) return "已過截止日期（仍在進行中）";
  if(running) return "進行中";
  return "尚未開始";
}
function parseYMDStrict(s){
  const mm = String(s||"").match(/(\d{4})-(\d{2})-(\d{2})/);
  if(!mm) return null;
  return new Date(Number(mm[1]), Number(mm[2])-1, Number(mm[3]));
}

function buildTaskCard(t){
  const p = Math.max(0, Math.min(100, Number(t.percent||0)));
  const color = CAT_COLOR_VAR[t.category] || "var(--stroke)";
  const meta1 = [
    t.category ? `類別 ${esc(t.category)}` : null,
    t.priority ? `優先度 ${esc(t.priority)}` : null,
    autoTaskStatus(t) ? `狀態 ${esc(autoTaskStatus(t))}` : null,
    t.owner ? `執行人 ${esc(t.owner)}` : null
  ].filter(Boolean).join(" | ");
  const meta2 = [
    t.start ? `開始 ${esc(t.start)}` : null,
    t.end ? `結束 ${esc(t.end)}` : null,
    t.deadline ? `期限 ${esc(t.deadline)}` : null
  ].filter(Boolean).join(" | ");

  const relDocsArr = normArr(t.relatedDocs).flatMap(x=>{
    if(x===null||x===undefined) return [];
    if(Array.isArray(x)) return x;
    return [x];
  }).map(String).map(s=>s.trim()).filter(Boolean);

  const relDocs = relDocsArr.map(id=>`<a href="${makeDocUrl(id)}">${esc(id)}</a>`).join("、");

  const relLinksArr = normArr(t.relatedLinks).flatMap(x=>{
    if(!x) return [];
    if(Array.isArray(x)) return x;
    return [x];
  }).map(x=>{
    if(typeof x === "string") return { url:x, title:x };
    if(typeof x === "object" && x.url) return { url:String(x.url), title:String(x.title||x.url) };
    return null;
  }).filter(Boolean);

  const relLinks = relLinksArr.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title||x.url)}</a>`).join("、");

  return `
    <article class="task" style="--task-accent:${color}">
      <div class="task-top">
        <h3 class="task-title">${esc(t.title||"")}</h3>
        ${meta1?`<div class="meta-line">${meta1}</div>`:""}
        ${meta2?`<div class="meta-line">${meta2}</div>`:""}
      </div>
      <div class="task-mid">
        <div class="progress"><div class="bar" style="width:${p}%"></div></div>
        <div class="meta-line">進度 ${p}%${t.summary?` | ${esc(t.summary)}`:""}</div>
        ${t.desc?`<div class="task-desc">${esc(t.desc)}</div>`:""}
        ${relDocs?`<div class="meta-line">相關文件 ${relDocs}</div>`:""}
        ${relLinks?`<div class="meta-line">相關內容 ${relLinks}</div>`:""}
      </div>
    </article>
  `;
}

function openModal(ev){
  const modal = $("#eventModal");
  if(!modal) return;
  $("#eventTitle").textContent = ev.title || "（未命名）";
  const range = ev.start === ev.end ? ev.start : `${ev.start}～${ev.end}`;
  $("#eventMeta").textContent = `${ev.category||""} | ${range}${ev.time?` | ${ev.time}`:""}`;
  const relDocs = normArr(ev.relatedDocs)
    .flatMap(x=> Array.isArray(x) ? x : [x])
    .map(x=> String(x ?? "").trim())
    .filter(Boolean)
    .map(id=>`<a href="../document/?id=${encodeURIComponent(id)}">${esc(id)}</a>`)
    .join("、");
  $("#eventBody").innerHTML = `
    ${ev.desc?`<p style="margin:0 0 10px">${esc(ev.desc)}</p>`:""}
    ${relDocs?`<div class="meta-line">相關文件 ${relDocs}</div>`:""}
  `;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){
  const modal = $("#eventModal");
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

function normalizeEvent(e){
  const start = e.start || e.date;
  const end = e.end || e.start || e.date;
  const s = start || "";
  const ed = end || start || "";
  return {
    ...e,
    start: s,
    end: ed,
    _s: parseYMD(s),
    _e: parseYMD(ed)
  };
}

function renderMonth(anchor, events){
  const wrap = $("#calendarWrap");
  if(!wrap) return;
  wrap.innerHTML = "";
  wrap.className = "calendar cal-month";

  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  $("#calTitle").textContent = `${y}年${m+1}月`;

  const first = new Date(y, m, 1);
  const last = new Date(y, m+1, 0);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(addDays(last, 7)), 6);

  const weekdays = ["一","二","三","四","五","六","日"];
  const head = document.createElement("div");
  head.className = "cal-weekdays";
  head.innerHTML = weekdays.map(w=>`<div class="cal-w">${w}</div>`).join("");
  wrap.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "cal-grid";
  wrap.appendChild(grid);

  // build list per day
  const days = [];
  for(let d=new Date(start); d<=end; d=addDays(d,1)){
    days.push(new Date(d));
  }

  days.forEach(day=>{
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    const inMonth = day.getMonth()===m;
    if(!inMonth) cell.classList.add("is-dim");
    const today = new Date(); today.setHours(0,0,0,0);
    if(day.getTime()===today.getTime()) cell.classList.add("is-today");

    const dayStr = ymd(day);
    const dayEvents = events.filter(ev=> ev._s && ev._e && inRange(day, ev._s, ev._e));

    const lines = dayEvents.slice(0,3).map((ev, idx)=>{
      const c = CAT_COLOR_VAR[ev.category] || "var(--stroke)";
      return `<button type="button" class="cal-evt" data-idx="${ev._idx}" style="--evc:${c}">
                <span class="dot"></span><span class="t">${esc(ev.title||"")}</span>
              </button>`;
    }).join("");

    const more = dayEvents.length>3 ? `<div class="cal-more">+${dayEvents.length-3}</div>` : "";

    cell.innerHTML = `
      <div class="cal-date">
        <span class="d">${day.getDate()}</span>
      </div>
      <div class="cal-events">
        ${lines}${more}
      </div>
    `;
    grid.appendChild(cell);
  });

  // click bindings
  $$(".cal-evt", wrap).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.getAttribute("data-idx"));
      const ev = events.find(e=>e._idx===idx);
      if(ev) openModal(ev);
    });
  });
}

function renderWeek(anchor, events){
  const wrap = $("#calendarWrap");
  if(!wrap) return;
  wrap.innerHTML = "";
  wrap.className = "calendar cal-week";

  const start = startOfWeek(anchor);
  const days = Array.from({length:7}, (_,i)=> addDays(start, i));
  const end = addDays(start, 6);
  $("#calTitle").textContent = `${ymd(start)} ～ ${ymd(end)}`;

  const grid = document.createElement("div");
  grid.className = "week-row";
  wrap.appendChild(grid);

  const weekdays = ["一","二","三","四","五","六","日"];
  days.forEach((day,i)=>{
    const col = document.createElement("div");
    col.className = "week-col";
    const ds = ymd(day);
    const dayEvents = events.filter(ev=> ev._s && ev._e && inRange(day, ev._s, ev._e));
    col.innerHTML = `
      <div class="week-head"><span class="w">${weekdays[i]}</span><span class="d">${day.getMonth()+1}/${day.getDate()}</span></div>
      <div class="week-events">
        ${dayEvents.length?dayEvents.map(ev=>{
          const c = CAT_COLOR_VAR[ev.category] || "var(--stroke)";
          return `<button type="button" class="cal-evt" data-idx="${ev._idx}" style="--evc:${c}">
                    <span class="dot"></span><span class="t">${esc(ev.title||"")}</span>
                  </button>`;
        }).join(""):`<div class="meta-line" style="padding:8px 0;color:var(--muted)">（無）</div>`}
      </div>
    `;
    grid.appendChild(col);
  });

  $$(".cal-evt", wrap).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.getAttribute("data-idx"));
      const ev = events.find(e=>e._idx===idx);
      if(ev) openModal(ev);
    });
  });
}

function renderList(anchor, events){
  const list = $("#calendarList");
  if(!list) return;
  list.innerHTML = "";

  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  $("#calTitle").textContent = `${y}年${m+1}月（選單）`;

  const start = new Date(y, m, 1);
  const end = new Date(y, m+1, 0);

  const inMonthEvents = events
    .filter(ev=> ev._s && ev._e && ev._e>=start && ev._s<=end)
    .sort((a,b)=> (a._s?.getTime()||0) - (b._s?.getTime()||0));

  if(!inMonthEvents.length){
    list.innerHTML = `<div class="meta-line" style="padding:10px 0;color:var(--muted)">（本月無事件）</div>`;
    return;
  }

  const groups = new Map();
  for(const ev of inMonthEvents){
    const key = ev.start;
    if(!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  }

  for(const [date, arr] of groups){
    const sec = document.createElement("div");
    sec.className = "list-day";
    sec.innerHTML = `
      <div class="list-date">${esc(date)}</div>
      <div class="list-items">
        ${arr.map(ev=>{
          const c = CAT_COLOR_VAR[ev.category] || "var(--stroke)";
          const range = ev.start===ev.end ? ev.start : `${ev.start}～${ev.end}`;
          return `<button type="button" class="list-ev" data-idx="${ev._idx}" style="--evc:${c}">
                    <span class="dot"></span>
                    <span class="t">${esc(ev.title||"")}</span>
                    <span class="m">${esc(ev.category||"")} | ${esc(range)}${ev.time?` | ${esc(ev.time)}`:""}</span>
                  </button>`;
        }).join("")}
      </div>
    `;
    list.appendChild(sec);
  }

  $$(".list-ev", list).forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.getAttribute("data-idx"));
      const ev = events.find(e=>e._idx===idx);
      if(ev) openModal(ev);
    });
  });
}

function syncView(view){
  const wrap = $("#calendarWrap");
  const list = $("#calendarList");
  if(!wrap || !list) return;
  if(view === "list"){
    wrap.style.display = "none";
    list.style.display = "block";
  }else{
    wrap.style.display = "block";
    list.style.display = "none";
  }
}

export async function bootCDA(){
  bootCommon();

  // collapsible sections
  $$("[data-collapse]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-collapse");
      const sec = id ? document.getElementById(id) : null;
      if(!sec) return;
      sec.classList.toggle("section-collapsed");
    });
  });


  // modal
  $("#eventModal")?.addEventListener("click", (e)=>{
    if(e.target?.matches?.("[data-close]") || e.target?.id==="eventModal") closeModal();
  });
  $$("#eventModal [data-close]").forEach(b=>b.addEventListener("click", closeModal));
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

  let noticesJson, projectJson;
  try{
    [noticesJson, projectJson] = await Promise.all([loadNotices(), loadProject()]);
  }catch(e){
    console.error(e);
    toast("專案資料載入失敗");
    return;
  }

  // notices.json may be one of:
  // 1) { site:{...}, notices:[...] }
  // 2) { notices:{ id1:{...}, id2:{...} } }
  // 3) [ ... ] (legacy)
  let notices = [];
  try{
    const raw = (noticesJson && typeof noticesJson === "object" && ("notices" in noticesJson))
      ? noticesJson.notices
      : noticesJson;
    if(Array.isArray(raw)){
      notices = raw;
    }else if(raw && typeof raw === "object"){
      notices = Object.values(raw);
    }else{
      notices = [];
    }
  }catch{
    notices = [];
  }
  const tagNeedle = String(projectJson?.project?.docTagWhitelist?.[0] || projectJson?.docTag || "CDA").toLowerCase();

  // docs (tag filter) + sort
let docs = [];
const docSortEl = $("#docSort");
const docListEl = $("#docList");
function sortDocsLocal(arr){
  const mode = docSortEl?.value || "time_desc";
  return arr.slice().sort((a,b)=>{
    if(mode==="name_asc") return (a.title||"").localeCompare((b.title||""),"zh-Hant");
    if(mode==="name_desc") return (b.title||"").localeCompare((a.title||""),"zh-Hant");
    const da = lastUpdated(a)?.getTime() || -Infinity;
    const db = lastUpdated(b)?.getTime() || -Infinity;
    if(mode==="time_asc") return da-db;
    return db-da;
  });
}
function renderDocs(){
  if(!docListEl) return;
  const sorted = sortDocsLocal(docs);
  $("#docStats").textContent = `文件：${sorted.length} 筆`;
  docListEl.innerHTML = sorted.length
    ? sorted.map(buildDocCard).join("")
    : `<div class="meta-line" style="color:var(--muted)">（無符合標籤 ${esc(tagNeedle)} 的公告）</div>`;
}
try{
  docs = notices.filter(n => normTags(n?.tags).some(t => String(t).toLowerCase()===tagNeedle));
  renderDocs();
  docSortEl?.addEventListener("change", renderDocs);
}catch(e){
  console.error(e);
  $("#docStats").textContent = "文件：—";
  if(docListEl) docListEl.innerHTML = `<div class="meta-line" style="color:var(--muted)">（文書清單載入失敗，請檢查 notices.json 格式）</div>`;
}


  // tasks + sort/filter/search (done items last by default)
let tasks = [];
const taskListEl = $("#taskList");
const taskStatsEl = $("#taskStats");
const taskSortEl = $("#taskSort");
const taskQEl = $("#taskQ");
const taskClearEl = $("#taskClear");
const taskChipsEl = $("#taskChips");

function parseYMDLocal(s){
  const mm = String(s||"").match(/(\d{4})-(\d{2})-(\d{2})/);
  if(!mm) return null;
  return new Date(Number(mm[1]), Number(mm[2])-1, Number(mm[3]));
}
function isDoneLocal(t){
  const p = Math.max(0, Math.min(100, Number(t.percent||0)));
  return p>=100 || normalize(autoTaskStatus(t))==="已完成";
}
function sortTasksLocal(arr){
  const mode = taskSortEl?.value || "deadline_near";
  return arr.slice().sort((a,b)=>{
    const adone = isDoneLocal(a), bdone = isDoneLocal(b);
    const ap = Math.max(0, Math.min(100, Number(a.percent||0)));
    const bp = Math.max(0, Math.min(100, Number(b.percent||0)));
    const ad = parseYMDLocal(a.deadline)?.getTime() ?? Infinity;
    const bd = parseYMDLocal(b.deadline)?.getTime() ?? Infinity;

    if(mode==="deadline_far"){
      if(adone!==bdone) return adone? 1 : -1;
      return bd-ad;
    }
    if(mode==="progress_desc") return bp-ap;
    if(mode==="progress_asc") return ap-bp;
    if(mode==="cat_asc") return String(a.category||"").localeCompare(String(b.category||""),"zh-Hant");
    if(mode==="cat_desc") return String(b.category||"").localeCompare(String(a.category||""),"zh-Hant");
    if(mode==="owner_asc") return String(a.owner||"").localeCompare(String(b.owner||""),"zh-Hant");
    if(mode==="owner_desc") return String(b.owner||"").localeCompare(String(a.owner||""),"zh-Hant");

    // default deadline_near: done last
    if(adone!==bdone) return adone? 1 : -1;
    return ad-bd;
  });
}

// build filters from data and hook details panels (if present)
const taskCats = uniq(tasks.map(t=>t.category)).sort((a,b)=>String(a||"").localeCompare(String(b||""),"zh-Hant"));
const taskStatuses = uniq(tasks.map(t=>t.status)).sort((a,b)=>String(a||"").localeCompare(String(b||""),"zh-Hant"));
const taskOwners = uniq(tasks.map(t=>t.owner)).sort((a,b)=>String(a||"").localeCompare(String(b||""),"zh-Hant"));

function renderTasks(){
  if(!taskListEl) return;
  const keyword = String(taskQEl?.value||"").trim();
  const words = keyword ? keyword.split(/\s+/).filter(Boolean) : [];
  const filtered = tasks.filter(t=>{
    if(!words.length) return true;
    const hay = [t.title, t.desc, t.summary, t.owner, t.category, t.status, t.priority].filter(Boolean).join(" ");
    return includesAll(hay, words);
  });
  const sorted = sortTasksLocal(filtered);
      try{ taskListEl.scrollTop = 0; }catch(e){}
  taskListEl.innerHTML = sorted.length
    ? sorted.map(buildTaskCard).join("")
    : `<div class="meta-line" style="color:var(--muted)">（無）</div>`;
  if(taskStatsEl) taskStatsEl.textContent = `事務：${sorted.length} 件`;
  // chips: keyword only
  if(taskChipsEl){
    taskChipsEl.innerHTML = keyword
      ? `<span class="chip"><span>${esc("關鍵字 " + keyword)}</span><button type="button" aria-label="移除">×</button></span>`
      : "";
    const btn = taskChipsEl.querySelector("button");
    btn?.addEventListener("click", ()=>{ if(taskQEl) taskQEl.value=""; renderTasks(); });
  }
}


    try{
  tasks = Array.isArray(projectJson?.tasks) ? projectJson.tasks : [];
  tasks = tasks.filter(Boolean).map(x=> (typeof x === "object" ? x : { title:String(x) }));
  renderTasks();
  taskSortEl?.addEventListener("change", renderTasks);
  taskQEl?.addEventListener("input", renderTasks);
  taskClearEl?.addEventListener("click", ()=>{ if(taskQEl) taskQEl.value=""; renderTasks(); });
}catch(e){
  console.error(e);
  if(taskStatsEl) taskStatsEl.textContent = "事務：—";
  if(taskListEl) taskListEl.innerHTML = `<div class="meta-line" style="color:var(--muted)">（事務資料載入失敗，請檢查 cda-project.json 格式）</div>`;
}

  // calendar
  const rawEvents = Array.isArray(projectJson?.events) ? projectJson.events : [];
  const events = rawEvents.map(normalizeEvent).filter(e=>e._s && e._e).map((e,i)=> ({...e, _idx:i}));
  const viewSel = $("#calView");
  let view = viewSel?.value || "month";
  let anchor = new Date(); anchor.setHours(0,0,0,0);

  function render(){
    syncView(view);
    stabilizeCalendarLayout(view);
    if(view === "month"){
      renderMonth(anchor, events);
    }else if(view === "week"){
      renderWeek(anchor, events);
    }else{
      renderList(anchor, events);
    }
  }

  $("#calPrev")?.addEventListener("click", ()=>{
    if(view==="month"){
      anchor = new Date(anchor.getFullYear(), anchor.getMonth()-1, 1);
    }else if(view==="week"){
      anchor = addDays(anchor, -7);
    }else{
      anchor = new Date(anchor.getFullYear(), anchor.getMonth()-1, 1);
    }
    render();
  });
  $("#calNext")?.addEventListener("click", ()=>{
    if(view==="month"){
      anchor = new Date(anchor.getFullYear(), anchor.getMonth()+1, 1);
    }else if(view==="week"){
      anchor = addDays(anchor, 7);
    }else{
      anchor = new Date(anchor.getFullYear(), anchor.getMonth()+1, 1);
    }
    render();
  });
  $("#calToday")?.addEventListener("click", ()=>{
    anchor = new Date(); anchor.setHours(0,0,0,0);
    render();
  });
  viewSel?.addEventListener("change", ()=>{
    view = viewSel.value;
    render();
  });

  render();
}

bootCDA();


// v18 修正：收合不再用 display:none，避免 scroll 區塊失效

document.querySelectorAll('[data-collapse-target]').forEach(btn=>{
  const target = document.querySelector(btn.dataset.collapseTarget);
  if(!target) return;
  btn.addEventListener('click', ()=>{
    const collapsed = target.classList.toggle('collapsed');
    target.style.maxHeight = collapsed ? '0px' : '';
    target.style.overflow = collapsed ? 'hidden' : 'auto';
  });
});function sortDocs(arr, mode){
  const m = mode || "time_desc";
  return arr.slice().sort((a,b)=>{
    if(m==="name_asc") return (a.title||"").localeCompare((b.title||""),"zh-Hant");
    if(m==="name_desc") return (b.title||"").localeCompare((a.title||""),"zh-Hant");
    const da = lastUpdated(a)?.getTime() || -Infinity;
    const db = lastUpdated(b)?.getTime() || -Infinity;
    if(m==="time_asc") return da-db;
    return db-da;
  });
}



function delegateDocOpen(){
  // allow clicking the whole doc card to open details
  document.addEventListener("click", (e)=>{
    const a = e.target.closest("a");
    if(a) return; // let links behave normally
    const card = e.target.closest(".result.clickable[data-open]");
    if(!card) return;
    const id = card.getAttribute("data-open") || "";
    if(!id) return;
    location.href = makeDocUrl(id);
  });
}
delegateDocOpen();

