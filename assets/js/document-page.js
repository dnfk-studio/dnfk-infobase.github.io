import { bootPage } from "./page.js";
import { DataClient } from "./data-client.js";
import { qs, escapeHtml, fmtTime } from "./utils.js";
import { renderError, showLoading, hideLoading } from "./ui.js";

function parseDriveFileId(url){
  if(!url) return null;
  const s = String(url);
  // /file/d/<id>/
  let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  // id=<id>
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  return null;
}
function drivePreviewUrl(fileId){ return `https://drive.google.com/file/d/${fileId}/preview`; }
function driveDownloadUrl(fileId){ return `https://drive.google.com/uc?export=download&id=${fileId}`; }

async function init(){
  const root = qs("#docRoot");
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if(!id){
    const btn = renderError(root, "缺少參數", "請使用 /document/?id=PA-260101 這種格式進入。");
    btn?.addEventListener("click", ()=>location.href="/search/");
    return;
  }

  try{
    showLoading("載入文書詳情…");
    const notices = await DataClient.getNotices();
    const docs = (notices?.documents ?? []);
    const doc = docs.find(d=>String(d.id)===String(id));
    if(!doc){
      const btn = renderError(root, "找不到文書", `找不到文書 ID：${escapeHtml(id)}`);
      btn?.addEventListener("click", ()=>location.href="/search/");
      return;
    }

    qs("#docTitle").textContent = doc.titleZh || doc.title || doc.id;
    qs("#docId").textContent = doc.id;
    qs("#docCat").textContent = doc.category || "未分類";
    qs("#docTime").textContent = fmtTime(doc.updatedAt || doc.createdAt) || "—";
    qs("#docTags").innerHTML = (doc.tags||[]).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join("") || `<span class="badge">無</span>`;

    // series versions
    const seriesKey = doc.seriesKey;
    const series = seriesKey ? docs.filter(d=>d.seriesKey===seriesKey).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))) : [];
    const versions = qs("#docVersions");
    if(series.length>1){
      versions.innerHTML = series.map(v=>{
        const active = v.id===doc.id ? `style="border-color: rgba(169,214,255,.55)"` : "";
        return `<a class="pill" ${active} href="/document/?id=${encodeURIComponent(v.id)}">${escapeHtml(v.id)}</a>`;
      }).join("");
    }else{
      versions.innerHTML = `<span class="pill">無其他版本</span>`;
    }

    // content
    qs("#docSummary").innerHTML = doc.summaryZh ? escapeHtml(doc.summaryZh) : "—";
    qs("#docBody").innerHTML = doc.contentHtml || `<p style="color:var(--muted); line-height:1.7;">（此文書目前未提供內文。）</p>`;

    // PDF
    const fileId = doc.pdf?.driveFileId || parseDriveFileId(doc.pdf?.driveUrl);
    const pdfWrap = qs("#pdfWrap");
    if(fileId){
      const preview = drivePreviewUrl(fileId);
      const download = driveDownloadUrl(fileId);
      pdfWrap.innerHTML = `
        <div class="pdf reveal"><iframe title="PDF Preview" src="${preview}" loading="lazy"></iframe></div>
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <a class="btn primary" href="${download}" target="_blank" rel="noopener">下載 PDF</a>
          <a class="btn" href="${preview}" target="_blank" rel="noopener">新分頁開啟</a>
        </div>
      `;
    }else{
      pdfWrap.innerHTML = `<div class="card"><p>此文書未提供 PDF 檔案。</p></div>`;
    }

    // related
    const related = (doc.relatedIds||[]).map(rid=> docs.find(d=>d.id===rid)).filter(Boolean);
    const relEl = qs("#relatedList");
    relEl.innerHTML = related.map(d=>`
      <a class="result reveal" href="/document/?id=${encodeURIComponent(d.id)}">
        <div style="font-weight:700">${escapeHtml(d.titleZh || d.title || d.id)}</div>
        <div class="meta">
          <span class="badge">${escapeHtml(d.category || "未分類")}</span>
          <span>${escapeHtml(fmtTime(d.updatedAt || d.createdAt))}</span>
          <span>${escapeHtml(d.id)}</span>
        </div>
      </a>
    `).join("") || `<div class="card"><p>無相關文書。</p></div>`;

  }catch(e){
    const btn = renderError(root, "載入失敗", String(e?.message || e));
    btn?.addEventListener("click", ()=>location.reload());
  }finally{
    hideLoading();
  }
}

bootPage(init);
