import { bootCommon, $, $$, showAuthGate } from "./app.js?v=20260215b";
import { loadNotices, latestVersionIndex, lastUpdated, formatDate } from "./data.js";

function escapeHtml(s){
  return (s??"").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("`","&#096;"); }

function card(notice){
  const vi = latestVersionIndex(notice);
  const v = notice.versions[vi];
  return `
  <article class="card clickable reveal" data-id="${escapeAttr(notice.id)}">
    <div class="inner">
      <div class="meta">
        <span class="badge"><strong>最後更新</strong> ${formatDate(lastUpdated(notice))}</span>
        <span class="badge"><strong>版本</strong> ${escapeHtml(v.version||"")}</span>
        <span class="badge"><strong>上傳者</strong> ${escapeHtml(v.uploader||"")}</span>
      </div>
      <h3>${escapeHtml(notice.title)}</h3>
      <p>${escapeHtml((v.content||"").slice(0,120))}${(v.content||"").length>120?"…":""}</p>
      <div class="tags">${(notice.tags||[]).slice(0,8).map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join("")}</div>
      <div class="actions">
        <button class="btn primary" data-open="${escapeAttr(notice.id)}">查看詳情</button>
      </div>
    </div>
  </article>`;
}

export async function bootLatest(){
  const el = $("#latestListFull");
  if(!el) return;
  const json = await loadNotices();
  const notices = json.notices || [];
  const sorted = notices.slice().sort((a,b)=>{
    const da = lastUpdated(a)?.getTime() || -Infinity;
    const db = lastUpdated(b)?.getTime() || -Infinity;
    return db-da;
  });
  el.innerHTML = sorted.map(card).join("");

  $$(".card.clickable", el).forEach(c=>{
    c.addEventListener("click", ()=>{
      const id = c.getAttribute("data-id");
      location.href = `../document/?id=${encodeURIComponent(id)}`;
    });
    c.querySelector("[data-open]")?.addEventListener("click", (e)=>{
      e.stopPropagation();
      const id = c.getAttribute("data-open");
      location.href = `../document/?id=${encodeURIComponent(id)}`;
    });
  });
}

export function boot(){
  bootCommon();
  bootLatest();
}

boot();
