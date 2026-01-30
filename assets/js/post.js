import { bootCommon, $, $$, toast } from "./app.js";
import { loadNotices, latestVersionIndex, lastUpdated, formatDate } from "./data.js";

function escapeHtml(s){
  return (s??"").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("`","&#096;"); }

async function renderPdf(url){
  const iframe = $("#pdfIframe");
  if(!iframe) return;
  iframe.src = url;
}

function buildRelated(list){
  const el = $("#relatedList");
  if(!el) return;
  if(!list || !list.length){
    el.innerHTML = `<p style="margin:0;color:var(--muted)">（無）</p>`;
    return;
  }
  el.innerHTML = list.map(r=>{
    const url = r.url || "#";
    const ext = /^https?:\/\//i.test(url);
    return `
      <div class="card clickable" style="margin-top:10px" data-url="${escapeAttr(url)}">
        <div class="inner">
          <div class="meta-line"><span><strong>相關資料</strong> ${ext ? "外部連結" : "站內頁面"}</span></div>
          <h3>${escapeHtml(r.title||url)}</h3>
          <p>${escapeHtml(url)}</p>
        </div>
      </div>`;
  }).join("");

  $$(".card.clickable", el).forEach(c=>{
    c.addEventListener("click", ()=>{
      const url = c.getAttribute("data-url");
      if(url) location.href = url;
    });
  });
}

export async function bootPost(){
  const json = await loadNotices();
  const notices = json.notices || [];

  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if(!id){
    toast("缺少公告 id，將回到搜尋頁");
    setTimeout(()=> location.href="/search", 700);
    return;
  }
  const notice = notices.find(n=>n.id===id);
  if(!notice){
    toast("找不到公告，將回到搜尋頁");
    setTimeout(()=> location.href="/search", 800);
    return;
  }

  // version
  let vi = 0;
  const vParam = url.searchParams.get("v");
  if(vParam!=null){
    const num = parseInt(vParam, 10);
    if(!isNaN(num)) vi = Math.max(0, Math.min(notice.versions.length-1, num));
  }else{
    vi = latestVersionIndex(notice);
  }

  const v = notice.versions[vi];

  // header
  $("#postTitle").textContent = notice.title;
  const metaParts = [];
  metaParts.push(`<span><strong>分類</strong> ${(notice.category||[]).map(escapeHtml).join("/")||"—"}</span>`);
  metaParts.push(`<span><strong>標籤</strong> ${(notice.tags||[]).map(t=>"#"+escapeHtml(t)).join(" ")||"—"}</span>`);
  metaParts.push(`<span><strong>上傳者</strong> ${escapeHtml(v.uploader||"—")}</span>`);
  metaParts.push(`<span><strong>上傳時間</strong> ${escapeHtml(v.uploadTime||"—")}</span>`);
  metaParts.push(`<span><strong>最後更新</strong> ${formatDate(lastUpdated(notice))}</span>`);
  $("#postMeta").innerHTML = `<div class="meta-line">${metaParts.join(' <span class="pipe">|</span> ')}</div>`;

  $("#postDesc").textContent = v.description || "—";
  $("#postContent").textContent = v.content || "—";

  // version selector
  const sel = $("#versionSelect");
  if(sel){
    sel.innerHTML = notice.versions.map((x,i)=>`<option value="${i}" ${i===vi?"selected":""}>${escapeHtml(x.version||("v"+(i+1)))} — ${escapeHtml(x.uploadTime||"")}</option>`).join("");
    sel.addEventListener("change", ()=>{
      const next = parseInt(sel.value,10) || 0;
      const u = new URL(location.href);
      u.searchParams.set("v", String(next));
      location.href = u.toString();
    });
  }

  // pdf links
  const pdfUrl = v.pdf || json.site?.defaultPdf || "/document/503.pdf";
  const dl = $("#pdfDownload");
  if(dl){ dl.href = pdfUrl; dl.setAttribute("download",""); }

  // render pdf
  await renderPdf(pdfUrl);

  // related
  buildRelated(v.related || []);

  // back
  $("#backBtn")?.addEventListener("click", ()=> history.length>1 ? history.back() : (location.href="/search"));
}

export function boot(){
  bootCommon();
  bootPost();
}

boot();
