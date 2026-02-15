import { bootPage } from "./page.js";
import { DataClient } from "./data-client.js";
import { qs, escapeHtml, fmtTime, uniq, debounce } from "./utils.js";
import { renderError, showLoading, hideLoading } from "./ui.js";

let allDocs = [];

function getFilters(){
  return {
    q: qs("#q").value.trim(),
    category: qs("#category").value,
    tag: qs("#tag").value,
    sort: qs("#sort").value,
  };
}

function applyFilters(){
  const {q, category, tag, sort} = getFilters();
  let list = allDocs.slice();

  if(category && category!=="__all__") list = list.filter(d=> (d.category||"")===category);
  if(tag && tag!=="__all__") list = list.filter(d=> (d.tags||[]).includes(tag));
  if(q){
    const needle = q.toLowerCase();
    list = list.filter(d=>{
      const hay = [
        d.id, d.titleZh, d.titleEn, d.title, d.category,
        ...(d.tags||[]), d.summaryZh, d.summaryEn
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }

  if(sort==="updated_desc"){
    list.sort((a,b)=> (b.updatedAt||"").localeCompare(a.updatedAt||""));
  }else if(sort==="updated_asc"){
    list.sort((a,b)=> (a.updatedAt||"").localeCompare(b.updatedAt||""));
  }else if(sort==="id_asc"){
    list.sort((a,b)=> String(a.id).localeCompare(String(b.id)));
  }else if(sort==="id_desc"){
    list.sort((a,b)=> String(b.id).localeCompare(String(a.id)));
  }

  renderResults(list);
}

function renderResults(list){
  const box = qs("#results");
  const count = qs("#resultCount");
  count.textContent = String(list.length);

  if(!list.length){
    box.innerHTML = `<div class="card reveal"><p>沒有找到符合條件的文書。</p></div>`;
    return;
  }
  box.innerHTML = list.map(d=>`
    <a class="result reveal" href="/document/?id=${encodeURIComponent(d.id)}">
      <div style="font-weight:700">${escapeHtml(d.titleZh || d.title || d.id)}</div>
      <div class="meta">
        <span class="badge">${escapeHtml(d.category || "未分類")}</span>
        ${(d.tags||[]).slice(0,3).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("")}
        <span>${escapeHtml(fmtTime(d.updatedAt || d.createdAt))}</span>
        <span>${escapeHtml(d.id)}</span>
      </div>
      ${d.summaryZh ? `<div style="margin-top:8px; color:var(--muted); line-height:1.55">${escapeHtml(d.summaryZh)}</div>`:""}
    </a>
  `).join("");
}

async function init(){
  const root = qs("#searchRoot");
  try{
    showLoading("載入文書資料…");
    const notices = await DataClient.getNotices();
    allDocs = (notices?.documents ?? []).slice();

    // build selects
    const categories = uniq(allDocs.map(d=>d.category).filter(Boolean)).sort((a,b)=>a.localeCompare(b));
    const tags = uniq(allDocs.flatMap(d=>d.tags||[])).sort((a,b)=>a.localeCompare(b));

    const catSel = qs("#category");
    catSel.innerHTML = `<option value="__all__">全部分類</option>` + categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");

    const tagSel = qs("#tag");
    tagSel.innerHTML = `<option value="__all__">全部標籤</option>` + tags.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

    const handler = debounce(applyFilters, 120);
    ["input","change"].forEach(evt=>{
      qs("#q").addEventListener(evt, handler);
      catSel.addEventListener(evt, handler);
      tagSel.addEventListener(evt, handler);
      qs("#sort").addEventListener(evt, handler);
    });

    applyFilters();
  }catch(e){
    const btn = renderError(root, "載入失敗", String(e?.message || e));
    btn?.addEventListener("click", ()=>location.reload());
  }finally{
    hideLoading();
  }
}

bootPage(init);
