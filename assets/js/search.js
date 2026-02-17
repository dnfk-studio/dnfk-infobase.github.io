import { bootCommon, $, $$, toast } from "./app.js";
import { loadNotices, latestVersionIndex, lastUpdated, formatDate, normalize, noticeSearchText, includesAll } from "./data.js";

function uniq(arr){ return Array.from(new Set(arr)).filter(Boolean); }

function buildCard(notice, versionIdx){
  const v = notice.versions[versionIdx];
  const updated = lastUpdated(notice);
  const parts = [];
  const catArr = arrify(notice.category);
  const catTxt = catArr.length ? catArr.map(c=>escapeHtml(c)).join("/") : "—";
  parts.push(`<span><strong>分類</strong> ${catTxt}</span>`);
  if(v?.uploader) parts.push(`<span><strong>上傳者</strong> ${escapeHtml(v.uploader)}</span>`);
  if(v?.uploadTime) parts.push(`<span><strong>上傳</strong> ${escapeHtml(v.uploadTime)}</span>`);
  if(v?.description) parts.push(`<span><strong>說明</strong> ${escapeHtml(v.description)}</span>`);
  if(updated) parts.push(`<span><strong>最後更新</strong> ${formatDate(updated)}</span>`);

  const tags = arrify(notice.tags).slice(0,6).map(t=>`#${escapeHtml(t)}`).join(" ");

  return `
  <article class="card clickable reveal" data-id="${escapeAttr(getLatestVid(notice) || notice.id)}">
    <div class="inner">
      <div class="meta-line">${parts.join(' <span class="pipe">|</span> ')}</div>
      <h3>${escapeHtml(notice.title)}</h3>
      <p>${escapeHtml((v?.content||"").slice(0,110))}${(v?.content||"").length>110?"…":""}</p>
      <div class="tags">${tags ? `<span class="tags-text">${tags}</span>` : ""}</div>
      <div class="actions">
        <button class="btn primary detailbtn" data-open="${escapeAttr(getLatestVid(notice) || notice.id)}">查看詳情</button>
        <span class="ver">版本：${escapeHtml(v?.version||"")}</span>
      </div>
    </div>
  </article>`;
}

function arrify(x){
  if(Array.isArray(x)) return x;
  if(x==null) return [];
  return [x];
}

function getLatestVid(n){
  try{
    if(!n?.versions?.length) return null;
    const i = latestVersionIndex(n);
    const v = n.versions[i];
    return v?.id || v?.versionId || null;
  }catch(e){ return null; }
}


function escapeHtml(s){
  return (s??"").toString()
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(s){ return escapeHtml(s).replaceAll("`","&#096;"); }

function setupCollapsibleLatest(){
  const wrap = $("#latestWrap");
  const btn = $("#latestToggle");
  if(!wrap || !btn) return;
  btn.addEventListener("click", ()=>{
    const open = wrap.getAttribute("data-open")==="1";
    wrap.setAttribute("data-open", open?"0":"1");
    const body = $("#latestBody");
    if(window.gsap && body){
      if(open){
        gsap.to(body, {height:0, opacity:0, duration:.35, ease:"power2.inOut"});
      }else{
        gsap.set(body, {height:"auto"});
        const h = body.getBoundingClientRect().height;
        gsap.fromTo(body, {height:0, opacity:0}, {height:h, opacity:1, duration:.45, ease:"power3.out", onComplete:()=> body.style.height="auto"});
      }
    }else if(body){
      body.style.display = open ? "none" : "block";
    }
    btn.classList.toggle("is-open", !open);
  });

  btn.classList.toggle("is-open", wrap.getAttribute("data-open")==="1");
}

function makeDocUrl(id){
  const u = new URL("../document/", location.href);
  u.searchParams.set("id", String(id||""));
  return u.toString();
}



function setupDetailsMulti(detailsId, items, onChange){
  const wrap = $(detailsId);
  if(!wrap) return {selected:new Set(), set:()=>{}};
  const panel = wrap.querySelector(".filter-panel");
  const countEl = wrap.querySelector("[data-count]");
  const sel = new Set();

  function render(){
    if(!panel) return;
    panel.innerHTML = items.map(v=>{
      const id = `x_${detailsId.replace("#","")}_${hash(v)}`;
      return `
        <label class="item" for="${id}">
          <input id="${id}" type="checkbox" ${sel.has(v)?"checked":""}/>
          <span class="txt">${escapeHtml(v)}</span>
        </label>
      `;
    }).join("");

    panel.querySelectorAll("input").forEach(inp=>{
      inp.addEventListener("change", (e)=>{
        const label = inp.closest("label");
        const val = label?.querySelector(".txt")?.textContent || "";
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
    render();
    updateCount();
  }


  wrap.addEventListener("toggle", ()=>{
    if(wrap.open){
      $$(".filter-details").forEach(d=>{
        if(d!==wrap) d.open = false;
      });
    }
  });

  render();
  updateCount();
  return {selected:sel, set};
}


function hash(s){
  let h=0; for(let i=0;i<s.length;i++){ h=((h<<5)-h)+s.charCodeAt(i); h|=0; }
  return Math.abs(h);
}

export async function bootSearch(){
  const qInput = $("#q");
  const resultsEl = $("#results");
  const chipsEl = $("#chips");
  const statsEl = $("#stats");

  const searchBtn = $("#searchBtn");
  const clearBtn = $("#clearBtn");
  const sortSel = $("#sortSel");

  if(!qInput || !resultsEl) return;

  setupCollapsibleLatest();

  let json;
  try{
    json = await loadNotices();
  }catch(e){
    toast("資料載入失敗");
    console.error(e);
    return;
  }

  const notices = json.notices || [];

  const categories = uniq(notices.flatMap(n=>arrify(n.category))).sort((a,b)=>a.localeCompare(b,"zh-Hant"));
  const tags = uniq(notices.flatMap(n=>arrify(n.tags))).sort((a,b)=>a.localeCompare(b,"zh-Hant"));

const catSel = $("#catSel");
const tagSel = $("#tagSel");
if(catSel){
  catSel.innerHTML = `<option value="">分類 未選</option>` + categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  catSel.addEventListener("change", render);
}
if(tagSel){
  tagSel.innerHTML = `<option value="">標籤 未選</option>` + tags.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  tagSel.addEventListener("change", render);
}


const latest = notices.slice().sort((a,b)=>{
  const da = lastUpdated(a)?.getTime() || -Infinity;
  const db = lastUpdated(b)?.getTime() || -Infinity;
  return db-da;
}).slice(0,5);
const latestList = $("#latestList");
if(latestList){
  latestList.innerHTML = latest.map(n=>{
    const vi = latestVersionIndex(n);
    const v = n.versions[vi];
    const excerpt = (v.content||"").slice(0,60);
    const more = (v.content||"").length>60 ? "…" : "";
    return `<div class="latest-item" data-id="${escapeAttr(getLatestVid(n) || n.id)}">
      <div class="latest-title">${escapeHtml(n.title)}</div>
      <div class="latest-sub">${escapeHtml(excerpt)}${more}</div>
      <div class="latest-meta">最後更新 ${formatDate(lastUpdated(n))} | 版本 ${escapeHtml(v.version||"")}</div>
    </div>`;
  }).join("");
}


if(latestList){
  latestList.addEventListener("click", (e)=>{
    const item = e.target.closest(".latest-item");
    if(!item) return;
    const id = item.getAttribute("data-id");
    if(id) openNotice(id);
  });
}
resultsEl.addEventListener("click", (e)=>{
  const btn = e.target.closest("[data-open]");
  if(btn){
    const id = btn.getAttribute("data-open");
    if(id) return openNotice(id);
  }
  const card = e.target.closest(".card.clickable[data-id], article.clickable[data-id], article.card[data-id]");
  if(card){
    const id = card.getAttribute("data-id");
    if(id) return openNotice(id);
  }
});


function openNotice(id){
    location.href = makeDocUrl(id);
  }

  function wireClicks(root){
    $$(".card.clickable", root).forEach(card=>{
      card.addEventListener("click", (e)=>{
        const id = card.getAttribute("data-id");
        if(id) openNotice(id);
      });
      card.querySelectorAll("[data-open]").forEach(btn=>{
        btn.addEventListener("click", (e)=>{ e.stopPropagation(); openNotice(btn.getAttribute("data-open")); });
      });
    });
$$(".latest-item", root).forEach(row=>{
  row.addEventListener("click", ()=>{
    const id = row.getAttribute("data-id");
    if(id) openNotice(id);
  });
});
  }
  wireClicks(document);


  const url = new URL(location.href);
  if(url.searchParams.get("q")) qInput.value = url.searchParams.get("q");

  qInput.addEventListener("input", ()=> render());
  searchBtn?.addEventListener("click", ()=> render(true));
  sortSel?.addEventListener("change", ()=> render(true));
  clearBtn?.addEventListener("click", ()=>{ qInput.value=""; $("#catSel").value=""; $("#tagSel").value=""; render(true); });
  qInput.addEventListener("keydown", (e)=>{
    if(e.key==="Enter"){ render(true); }
  });

  function render(pushUrl=false){
    const keyword = normalize(qInput.value);
    const words = keyword ? keyword.split(/\s+/).filter(Boolean) : [];
    const cat = String($("#catSel")?.value||"").trim();
    const tag = String($("#tagSel")?.value||"").trim();

    const filtered = notices.filter(n=>{
      const vi = latestVersionIndex(n);
      const hay = noticeSearchText(n, vi);
      if(words.length && !includesAll(hay, words)) return false;

      if(cat){
        const have = new Set(arrify(n.category).map(x=>normalize(x)));
        if(!have.has(normalize(cat))) return false;
      }

      if(tag){
        const have = new Set(arrify(n.tags).map(x=>normalize(x)));
        if(!have.has(normalize(tag))) return false;
      }
      return true;
    }).sort((a,b)=>{
      const mode = sortSel?.value || "time_desc";
      if(mode==="name_asc") return (a.title||"").localeCompare((b.title||""),"zh-Hant");
      if(mode==="name_desc") return (b.title||"").localeCompare((a.title||""),"zh-Hant");
      const da = lastUpdated(a)?.getTime() || -Infinity;
      const db = lastUpdated(b)?.getTime() || -Infinity;
      if(mode==="time_asc") return da-db;
      return db-da;
    });

    resultsEl.innerHTML = filtered.map(n=>{
      const vi = latestVersionIndex(n);
      return buildCard(n, vi);
    }).join("") || `<div class="card reveal"><div class="inner"><h3>找不到符合的公告</h3><p>請調整搜尋關鍵字，或清除分類 / 標籤篩選。</p></div></div>`;

    if(statsEl){
      statsEl.textContent = `結果：${filtered.length} 筆`;
    }


  const chipParts = [];
  if(words.length) chipParts.push({k:"q", v: qInput.value.trim(), label: "關鍵字 " + qInput.value.trim()});
  if(cat) chipParts.push({k:"cat", v: cat, label: "分類 " + cat});
  if(tag) chipParts.push({k:"tag", v: tag, label: "標籤 " + tag});
  if(chipsEl){
    chipsEl.innerHTML = chipParts.map(c=>`<span class="chip"><span>${escapeHtml(c.label)}</span><button type="button" aria-label="移除">×</button></span>`).join("");
    [...chipsEl.querySelectorAll("button")].forEach((btn,i)=>{
      btn.addEventListener("click", ()=>{
        const c = chipParts[i];
        if(c.k==="q") qInput.value = "";
        if(c.k==="cat") $("#catSel").value = "";
        if(c.k==="tag") $("#tagSel").value = "";
        render();
      });
    });
  }

    if(window.gsap){
      $$(".reveal", resultsEl).forEach(el=>{
        gsap.fromTo(el, {y: 14, opacity: 0}, {y:0, opacity:1, duration:.55, ease:"power3.out"});
      });
    }
  }

  render(false);
}

export function boot(){
  bootCommon();
  bootSearch();
}

boot();
