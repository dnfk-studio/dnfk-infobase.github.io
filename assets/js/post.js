import { bootCommon, $, $$, toast, showLoading, hideLoading, setUiLocked } from "./app.js";
import { loadNotices, latestVersionIndex, lastUpdated, formatDate, parseDate } from "./data.js";

function escapeHtml(s){
  return (s??"").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("`","&#096;"); }

function getDriveFileId(url){
  if(!url) return null;
  try{
    const u = new URL(url, location.href);
    // /file/d/<id>/...
    const m = u.pathname.match(/\/file\/d\/([^\/]+)/);
    if(m) return m[1];
    // open?id=<id> or uc?id=<id>
    const id = u.searchParams.get("id");
    if(id) return id;
    return null;
  }catch(e){
    // fallback regex
    const m = String(url).match(/\/file\/d\/([^\/]+)/);
    if(m) return m[1];
    const m2 = String(url).match(/[?&]id=([^&]+)/);
    if(m2) return m2[1];
    return null;
  }
}

function normalizePdfLinks(url){
  const id = getDriveFileId(url);
  if(!id) return { preview:url, download:url, isDrive:false };
  const preview = `https://drive.google.com/file/d/${id}/preview`;
  const download = `https://drive.google.com/uc?export=download&id=${id}`;
  return { preview, download, isDrive:true };
}

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
  showLoading("載入文書…");
  setUiLocked(true);
  let json;
  try{
    json = await loadNotices();
  }catch(e){
    console.error(e);
    hideLoading();
    setUiLocked(false);
    toast("文書資料載入失敗");
    setTimeout(()=> location.href="/search/", 900);
    return;
  }
  hideLoading();
  setUiLocked(false);
  const notices = json.notices || [];

  const url = new URL(location.href);
  const id = url.searchParams.get("id");
  if(!id){
    toast("缺少公告 id，將回到搜尋頁");
    setTimeout(()=> location.href="/search", 700);
    return;
  }
  let notice = notices.find(n=>n.id===id);
  let vi = 0;
  if(!notice){
    notice = notices.find(n=> Array.isArray(n.versions) && n.versions.some(v=> (v.id||v.versionId)===id));
    if(notice){
      vi = notice.versions.findIndex(v=> (v.id||v.versionId)===id);
      if(vi<0) vi = 0;
    }
  }
  if(!notice){
    toast("找不到公告，將回到搜尋頁");
    setTimeout(()=> location.href="/search", 800);
    return;
  }

  // version (by version id; fallback latest)
  if(!Array.isArray(notice.versions)) notice.versions = [];
  if(!notice.versions.length){
    toast("公告缺少版本資料，將回到搜尋頁");
    setTimeout(()=> location.href="/search", 800);
    return;
  }
  // if entered via notice id (not specific version), default to latest
  if(id===notice.id){
    vi = latestVersionIndex(notice);
  }
  // backward compat: if v param exists, map to index and then redirect to version id if possible
  const vParam = url.searchParams.get("v");
  if(vParam!=null){
    const num = parseInt(vParam,10);
    if(!isNaN(num)) vi = Math.max(0, Math.min(notice.versions.length-1, num));
  }
  const v = notice.versions[vi];
  const vid = (v.id||v.versionId||null);
  if(vParam!=null && vid){
    const u = new URL(location.href);
    u.searchParams.delete("v");
    u.searchParams.set("id", vid);
    location.replace(u.toString());
    return;
  }

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

  // version selector (list old→new; open latest by default)
const sel = $("#versionSelect");
if(sel){
  const ordered = notice.versions.map((x,i)=>({x,i,t:(parseDate(x.uploadTime)?.getTime() ?? -Infinity)}))
    .sort((a,b)=>a.t-b.t);
  sel.innerHTML = ordered.map(({x,i})=>{
    const vidOpt = x.id || x.versionId || null;
    const label = `${escapeHtml(x.version || vidOpt || ("v"+(i+1)))} — ${escapeHtml(x.uploadTime||"")}`;
    const value = escapeHtml(vidOpt || String(i));
    const selected = (i===vi) ? "selected" : "";
    return `<option value="${value}" ${selected}>${label}</option>`;
  }).join("");
  sel.addEventListener("change", ()=>{
    const picked = sel.value;
    const found = notice.versions.find(vv => (vv.id||vv.versionId||"") === picked);
    const u = new URL(location.href);
    u.searchParams.delete("v");
    if(found){
      u.searchParams.set("id", picked);
    }else{
      // fallback for old data without version id
      const idx = parseInt(picked,10) || 0;
      u.searchParams.set("v", String(idx));
      u.searchParams.set("id", notice.id);
    }
    location.href = u.toString();
  });
}

  // pdf links
  const pdfUrl = v.pdf || json.site?.defaultPdf || "/document/503.pdf";
  const { preview: pdfPreview, download: pdfDownload, isDrive } = normalizePdfLinks(pdfUrl);

  const dl = $("#pdfDownload");
  if(dl){
    dl.href = pdfDownload;
    // Google Drive 的下載不一定支援 download 屬性，但保留不會有害
    dl.setAttribute("download","");
    dl.toggleAttribute("data-drive", !!isDrive);
  }

  // render pdf
  await renderPdf(pdfPreview);
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
