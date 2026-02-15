import { bootPage } from "./page.js";
import { DataClient } from "./data-client.js";
import { qs, escapeHtml, fmtTime } from "./utils.js";
import { renderError } from "./ui.js";

async function init(){
  const root = qs("#homeRoot");
  const latestEl = qs("#latestList");
  try{
    const [meta, notices] = await Promise.all([DataClient.getMeta(), DataClient.getNotices()]);
    if(qs("#siteVersion")) qs("#siteVersion").textContent = meta?.site?.version ?? "v0.0.0";
    if(qs("#siteUpdated")) qs("#siteUpdated").textContent = meta?.site?.updatedAt ? fmtTime(meta.site.updatedAt) : "—";

    const docs = (notices?.documents ?? []).slice()
      .sort((a,b)=> (b.updatedAt||"").localeCompare(a.updatedAt||""))
      .slice(0, 6);

    latestEl.innerHTML = docs.map(d=>`
      <a class="result reveal" href="/document/?id=${encodeURIComponent(d.id)}" data-docid="${escapeHtml(d.id)}">
        <div style="font-weight:700">${escapeHtml(d.titleZh || d.title || d.id)}</div>
        <div class="meta">
          <span class="badge">${escapeHtml(d.category || "未分類")}</span>
          <span>${escapeHtml(fmtTime(d.updatedAt || d.createdAt))}</span>
          <span>${escapeHtml(d.id)}</span>
        </div>
      </a>
    `).join("") || `<div class="card"><p>目前沒有可顯示的最新文書。</p></div>`;
  }catch(e){
    const btn = renderError(root, "載入失敗", String(e?.message || e));
    btn?.addEventListener("click", ()=>location.reload());
  }
}

bootPage(init);
