const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

const State = { docs: [], current:null };

const CATS = [
  "公告",
  "規章/團體規章",
  "規章/部組規章",
  "企劃/企劃提案書",
  "企劃/企劃書",
  "企劃/職務報告",
  "企劃/財務報告",
  "會議/會議公告",
  "會議/會議紀錄"
];

function norm(d){
  return {
    ...d,
    _cat: d.category + (d.subcategory? "/"+d.subcategory:""),
    _tags: (d.tags||[]).map(x=>String(x).toLowerCase()),
    _updated: +new Date(d.updated_at || d.uploaded_at || Date.now()),
    _uploaded: +new Date(d.uploaded_at || Date.now())
  };
}

async function loadDocs(){
  try{
    const res = await fetch("data/docs.json", {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    State.docs = json.map(norm);
    return;
  }catch(e){
    const s = $("#docs-data");
    if(s && s.textContent.trim()){
      try{ State.docs = JSON.parse(s.textContent).map(norm); return; }
      catch(err){ console.error("inline JSON parse error", err); }
    }
    State.docs = [];
  }
}

function tokenize(str){
  return String(str||"").toLowerCase().normalize('NFKC').split(/[\s,;，。/\\\-]+/).filter(Boolean);
}

function matches(doc, queryTokens){
  if(!queryTokens.length) return true;
  const pool = [
    doc.title, doc.number, doc.author, doc.category, doc.subcategory, ...(doc.tags||[])
  ].join(" ").toLowerCase();
  return queryTokens.every(t => pool.includes(t));
}

function filterSort(){
  const q = $("#q").value.trim();
  const tokens = tokenize(q);
  const cat = $("#category").value;
  const tagStr = $("#tagFilter").value.trim().toLowerCase();
  const tags = tagStr ? tagStr.split(/\s+/).filter(Boolean) : [];
  const sortBy = $("#sort").value;

  let list = [...State.docs];
  if(cat) list = list.filter(d => d._cat === cat);
  if(tags.length) list = list.filter(d => tags.every(t => d._tags.includes(t)));
  if(tokens.length) list = list.filter(d => matches(d, tokens));

  switch(sortBy){
    case "uploaded_desc": list.sort((a,b)=> b._uploaded - a._uploaded); break;
    case "number_asc": list.sort((a,b)=> a.number.localeCompare(b.number,'zh-Hant',{numeric:true})); break;
    case "title_asc": list.sort((a,b)=> a.title.localeCompare(b.title,'zh-Hant')); break;
    default: list.sort((a,b)=> b._updated - a._updated);
  }
  return list;
}

function renderQuickCats(){
  const box = $("#quickCats"); box.innerHTML = "";
  CATS.forEach(c=>{
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = c;
    btn.addEventListener("click", ()=> { $("#category").value=c; render(); });
    box.appendChild(btn);
  });
}

function hotTags(){
  const freq = new Map();
  State.docs.forEach(d => (d.tags||[]).forEach(t => freq.set(t, (freq.get(t)||0)+1)));
  return [...freq.entries()].sort((a,b)=> b[1]-a[1]).slice(0,12).map(([t])=>t);
}

function renderHotTags(){
  const box = $("#hotTags"); box.innerHTML = "";
  hotTags().forEach(t=>{
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = "#"+t;
    btn.addEventListener("click", ()=> {
      const f = $("#tagFilter");
      f.value = (f.value? f.value+" ":"")+t;
      render();
    });
    box.appendChild(btn);
  });
}

function fmt(s){ if(!s) return "—"; const d=new Date(s); return d.toLocaleString('zh-TW',{hour12:false}); }

function render(){
  const list = filterSort();
  $("#stats").textContent = `共 ${State.docs.length} 份 · 顯示 ${list.length} 份`;

  const ul = $("#list");
  ul.className = "grid";
  ul.innerHTML="";
  if(!list.length){ $("#empty").classList.remove("hidden"); return; }
  $("#empty").classList.add("hidden");

  list.forEach(d => {
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <div class="icon">📄</div>
      <div style="flex:1;min-width:0">
        <h3>${d.title}</h3>
        <p class="meta">
          <span class="badge">${d._cat}</span>
          <span class="badge"># ${d.number}</span>
          <span class="badge">作者：${d.author || "—"}</span>
          <span class="badge">上傳：${fmt(d.uploaded_at)}</span>
          <span class="badge">更新：${fmt(d.updated_at)}</span>
          ${d.versions?.length? `<span class="badge">${d.versions.length} 版本</span>` : ""}
        </p>
        <div class="tags">${(d.tags||[]).map(t=> `<span class="tag">#${t}</span>`).join("")}</div>
        <div class="actions">
          <button class="primary" data-open="${d.id}">檢視</button>
          <a class="ghost" href="#/doc/${encodeURIComponent(d.id)}">連結</a>
        </div>
      </div>`;
    ul.appendChild(li);
  });

  $$('button[data-open]').forEach(b => b.onclick = ()=> openDrawer(b.dataset.open));
}

function openDrawer(id){
  const d = State.docs.find(x=> x.id === id);
  if(!d) return;
  State.current = d;
  $("#dTitle").textContent = `${d.title}（${d.number}）`;
  $("#dMeta").textContent = `${d._cat}｜作者：${d.author||"—"}｜上傳：${fmt(d.uploaded_at)}｜更新：${fmt(d.updated_at)}`;
  $("#dTags").innerHTML = (d.tags||[]).map(t=> `<span class="chip">#${t}</span>`).join("");

  const sel = $("#version"); sel.innerHTML="";
  const versions = (d.versions?.length? d.versions: [{version:"v1",file:`docs/${d.id}/v1.pdf`,date:d.uploaded_at,notes:""}])
    .slice().sort((a,b)=> a.date<b.date?1:-1);
  versions.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v.file;
    opt.textContent = `${v.version}｜${fmt(v.date)}${v.notes? "｜"+v.notes:""}`;
    sel.appendChild(opt);
  });

  const file = sel.value;
  $("#frame").src = file;
  $("#download").href = file;

  $("#timeline").innerHTML = versions.map(v=> `<li><strong>${v.version}</strong> — ${fmt(v.date)} ${v.notes? "｜"+v.notes:""}<br><code>${v.file}</code></li>`).join("");

  $("#drawer").classList.add("open");
  $("#drawer").setAttribute("aria-hidden","false");
  history.replaceState(null,"",`#/doc/${encodeURIComponent(d.id)}`);
}

function init(){
  $("#year").textContent = new Date().getFullYear();
  $("#q").addEventListener("input", render);
  $("#clear").addEventListener("click", ()=> { $("#q").value=""; render(); });
  $("#category").addEventListener("change", render);
  $("#tagFilter").addEventListener("input", render);
  $("#sort").addEventListener("change", render);
  $("#drawerClose").addEventListener("click", ()=>{
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden","true");
    $("#frame").src = "";
    history.replaceState(null,"","#/");
  });
  $("#open").addEventListener("click", ()=> { window.open($("#version").value, "_blank"); });
  $("#version").addEventListener("change", ()=> {
    const url = $("#version").value;
    $("#frame").src = url; $("#download").href = url;
  });
  window.addEventListener("keydown", (e)=>{
    if((e.ctrlKey||e.metaKey) && e.key === "/"){ e.preventDefault(); $("#q").focus(); }
    if(e.key === "Escape" && $("#drawer").classList.contains("open")) $("#drawerClose").click();
  });

  // Deep link
  if(location.hash.startsWith("#/doc/")){
    const id = decodeURIComponent(location.hash.replace("#/doc/",""));
    setTimeout(()=> openDrawer(id), 100);
  }
}

(async function main(){
  await loadDocs();
  // if file:// usage, seed inline JSON to make future reloads easier
  if($("#docs-data") && !$("#docs-data").textContent.trim()){
    $("#docs-data").textContent = JSON.stringify(State.docs, null, 2);
  }
  renderQuickCats();
  renderHotTags();
  render();
  init();
})();