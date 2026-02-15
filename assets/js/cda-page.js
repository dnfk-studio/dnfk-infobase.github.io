import { bootPage } from "./page.js";
import { DataClient } from "./data-client.js";
import { qs, escapeHtml, fmtTime } from "./utils.js";
import { renderError, showLoading, hideLoading } from "./ui.js";

function renderTasks(tasks){
  const box = qs("#taskList");
  if(!tasks?.length){
    box.innerHTML = `<div class="card"><p>目前沒有事務。</p></div>`;
    return;
  }
  box.innerHTML = tasks.map(t=>`
    <div class="result reveal">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
        <div>
          <div style="font-weight:700">${escapeHtml(t.title)}</div>
          <div class="meta">
            <span class="badge">${escapeHtml(t.status || "待辦")}</span>
            ${t.progress!=null ? `<span>${escapeHtml(String(t.progress))}%</span>`:""}
            ${t.dueAt ? `<span>截止：${escapeHtml(fmtTime(t.dueAt))}</span>`:""}
          </div>
        </div>
        ${t.priority ? `<span class="badge">${escapeHtml(t.priority)}</span>`:""}
      </div>
      ${t.note ? `<div style="margin-top:8px; color:var(--muted); line-height:1.55">${escapeHtml(t.note)}</div>`:""}
    </div>
  `).join("");
}

function renderEvents(events){
  const box = qs("#eventList");
  if(!events?.length){
    box.innerHTML = `<div class="card"><p>目前沒有行事曆事件。</p></div>`;
    return;
  }
  const sorted = events.slice().sort((a,b)=>(a.startAt||"").localeCompare(b.startAt||""));
  box.innerHTML = sorted.map(ev=>`
    <div class="result reveal">
      <div style="font-weight:700">${escapeHtml(ev.title)}</div>
      <div class="meta">
        <span>${escapeHtml(fmtTime(ev.startAt))}</span>
        ${ev.endAt ? `<span>至 ${escapeHtml(fmtTime(ev.endAt))}</span>`:""}
        ${ev.location ? `<span>${escapeHtml(ev.location)}</span>`:""}
      </div>
      ${ev.note ? `<div style="margin-top:8px; color:var(--muted); line-height:1.55">${escapeHtml(ev.note)}</div>`:""}
    </div>
  `).join("");
}

function renderDocs(docs){
  const box = qs("#docList");
  if(!docs?.length){
    box.innerHTML = `<div class="card"><p>目前沒有專案相關文書。</p></div>`;
    return;
  }
  box.innerHTML = docs.map(d=>`
    <a class="result reveal" href="/document/?id=${encodeURIComponent(d.id)}">
      <div style="font-weight:700">${escapeHtml(d.titleZh || d.title || d.id)}</div>
      <div class="meta">
        <span class="badge">${escapeHtml(d.category || "未分類")}</span>
        <span>${escapeHtml(fmtTime(d.updatedAt || d.createdAt))}</span>
        <span>${escapeHtml(d.id)}</span>
      </div>
    </a>
  `).join("");
}

async function init(){
  const root = qs("#cdaRoot");
  try{
    showLoading("載入專案資料…");
    const [cda, notices] = await Promise.all([DataClient.getCda(), DataClient.getNotices()]);
    qs("#cdaTitle").textContent = cda?.project?.titleZh || "校園偵探社特別專案";
    qs("#cdaIntro").innerHTML = cda?.project?.introHtml || "<p style='color:var(--muted);'>（無專案介紹）</p>";

    renderTasks(cda?.tasks || []);
    renderEvents(cda?.events || []);

    const docs = notices?.documents || [];
    const docIds = cda?.docIds || [];
    const selected = docIds.map(id=>docs.find(d=>d.id===id)).filter(Boolean);
    renderDocs(selected);
  }catch(e){
    const btn = renderError(root, "載入失敗", String(e?.message || e));
    btn?.addEventListener("click", ()=>location.reload());
  }finally{
    hideLoading();
  }
}

bootPage(init);
