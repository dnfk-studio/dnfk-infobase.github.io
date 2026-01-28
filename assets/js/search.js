import { bootCommon, $, $$, toast } from "./app.js";
import { loadNotices, latestVersionIndex, lastUpdated, formatDate, normalize, noticeSearchText, includesAll } from "./data.js";

function uniq(arr){ return Array.from(new Set(arr)).filter(Boolean); }

function buildCard(notice, versionIdx){
  const v = notice.versions[versionIdx];
  const updated = lastUpdated(notice);
  const parts = [];
  const catTxt = (notice.category||[]).length ? (notice.category||[]).map(c=>escapeHtml(c)).join("/") : "—";
  parts.push(`<span><strong>分類</strong> ${catTxt}</span>`);
  if(v?.uploader) parts.push(`<span><strong>上傳者</strong> ${escapeHtml(v.uploader)}</span>`);
  if(v?.uploadTime) parts.push(`<span><strong>上傳</strong> ${escapeHtml(v.uploadTime)}</span>`);
  if(v?.description) parts.push(`<span><strong>說明</strong> ${escapeHtml(v.description)}</span>`);
  if(updated) parts.push(`<span><strong>最後更新</strong> ${formatDate(updated)}</span>`);

  const tags = (notice.tags||[]).slice(0,6).map(t=>`#${escapeHtml(t)}`).join(" ");

  return `
  <article class="card clickable reveal" data-id="${escapeAttr(notice.id)}">
    <div class="inner">
      <div class="meta-line">${parts.join(' <span class="pipe">|</span> ')}</div>
      <h3>${escapeHtml(notice.title)}</h3>
      <p>${escapeHtml((v?.content||"").slice(0,110))}${(v?.content||"").length>110?"…":""}</p>
      <div class="tags">${tags ? `<span class="tags-text">${tags}</span>` : ""}</div>
      <div class="actions">
        <button class="btn primary detailbtn" data-open="${escapeAttr(notice.id)}">查看詳情</button>
        <span class="ver">版本：${escapeHtml(v?.version||"")}</span>
      </div>
    </div>
  </article>`;
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
  // initial state
  btn.classList.toggle("is-open", wrap.getAttribute("data-open")==="1");
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

  // close other details when opening
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

function syncChips(chipsEl, keyword, catsSet, tagsSet, onRemove){
  if(!chipsEl) return;
  const chips = [];
  if(keyword) chips.push({k:"q", label:`搜尋：${keyword}`});
  [...catsSet].forEach(c=> chips.push({k:"cat", v:c, label:`分類：${c}`}));
  [...tagsSet].forEach(t=> chips.push({k:"tag", v:t, label:`標籤：${t}`}));

  chipsEl.innerHTML = chips.map(c=>`
    <span class="chip">
      ${escapeHtml(c.label)}
      <button aria-label="remove">移除</button>
    </span>
  `).join("");

  $$(".chip", chipsEl).forEach((el, i)=>{
    el.querySelector("button")?.addEventListener("click", ()=>{
      const c = chips[i];
      onRemove?.(c);
    });
  });
}

export async function bootSearch(){
  const qInput = $("#q");
  const resultsEl = $("#results");
  const chipsEl = $("#chips");
  const statsEl = $("#stats");

  const searchBtn = $("#searchBtn");
  const clearBtn = $("#clearBtn");

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
  // build filter lists
  const categories = uniq(notices.flatMap(n=>n.category||[])).sort((a,b)=>a.localeCompare(b,"zh-Hant"));
  const tags = uniq(notices.flatMap(n=>n.tags||[])).sort((a,b)=>a.localeCompare(b,"zh-Hant"));

  const catDD = setupDetailsMulti("#fdCategory", categories, ()=> render());
  const tagDD = setupDetailsMulti("#fdTag", tags, ()=> render());

  // latest top 5 (by last update)
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
      return `<div class="card clickable" data-id="${escapeAttr(n.id)}">
        <div class="inner">
          <div class="meta-line"><span><strong>最後更新</strong> ${formatDate(lastUpdated(n))}</span> <span class="pipe">|</span> <span><strong>版本</strong> ${escapeHtml(v.version||"")}</span></div>
          <h3>${escapeHtml(n.title)}</h3>
          <p>${escapeHtml((v.content||"").slice(0,76))}${(v.content||"").length>76?"…":""}</p>
        </div>
      </div>`;
    }).join("");
  }

  function openNotice(id){
    location.href = `document?id=${encodeURIComponent(id)}`;
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
  }
  wireClicks(document);

  // apply initial from URL
  const url = new URL(location.href);
  if(url.searchParams.get("q")) qInput.value = url.searchParams.get("q");

  qInput.addEventListener("input", ()=> render());
  searchBtn?.addEventListener("click", ()=> render(true));
  clearBtn?.addEventListener("click", ()=>{ qInput.value=""; catDD.set([]); tagDD.set([]); render(true); });
  qInput.addEventListener("keydown", (e)=>{
    if(e.key==="Enter"){ render(true); }
  });

  function render(pushUrl=false){
    const keyword = normalize(qInput.value);
    const words = keyword ? keyword.split(/\s+/).filter(Boolean) : [];
    const cats = [...catDD.selected];
    const tgs = [...tagDD.selected];

    const filtered = notices.filter(n=>{
      const vi = latestVersionIndex(n);
      const hay = noticeSearchText(n, vi);
      if(words.length && !includesAll(hay, words)) return false;
      // AND categories selected
      if(cats.length){
        const have = new Set((n.category||[]).map(x=>normalize(x)));
        if(!cats.every(c=> have.has(normalize(c)))) return false;
      }
      // AND tags selected
      if(tgs.length){
        const have = new Set((n.tags||[]).map(x=>normalize(x)));
        if(!tgs.every(t=> have.has(normalize(t)))) return false;
      }
      return true;
    }).sort((a,b)=>{
      const da = lastUpdated(a)?.getTime() || -Infinity;
      const db = lastUpdated(b)?.getTime() || -Infinity;
      return db-da;
    });

    resultsEl.innerHTML = filtered.map(n=>{
      const vi = latestVersionIndex(n);
      return buildCard(n, vi);
    }).join("") || `<div class="card reveal"><div class="inner"><h3>找不到符合的公告</h3><p>請調整搜尋關鍵字，或清除分類 / 標籤篩選。</p></div></div>`;

    if(statsEl){
      statsEl.textContent = `結果：${filtered.length} 筆`;
    }

    syncChips(chipsEl, keyword, catDD.selected, tagDD.selected, (chip)=>{
      if(chip.k==="q"){ qInput.value=""; }
      if(chip.k==="cat"){ catDD.selected.delete(chip.v); catDD.set([...catDD.selected]); }
      if(chip.k==="tag"){ tagDD.selected.delete(chip.v); tagDD.set([...tagDD.selected]); }
      render(true);
    });

    wireClicks(resultsEl);

    if(pushUrl){
      const u = new URL(location.href);
      if(keyword) u.searchParams.set("q", keyword); else u.searchParams.delete("q");
      history.replaceState({}, "", u.toString());
    }

    // reveal anim: mark newly created as reveal targets
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
