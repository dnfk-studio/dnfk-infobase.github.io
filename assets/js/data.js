// Data helpers (refit: fetch via /api/data and normalize shapes)

async function fetchRoute(route){
  const url = `/api/data?r=${encodeURIComponent(route)}&v=${Date.now()}`;
  const res = await fetch(url, {cache:"no-store", credentials:"include"});
  if(!res.ok) throw new Error(`無法載入資料 ${route}`);
  const payload = await res.json();
  return (payload && typeof payload==="object" && "data" in payload) ? payload.data : payload;
}

function isObj(x){ return !!x && typeof x==="object" && !Array.isArray(x); }

function normalizeNoticesShape(raw){
  // Target legacy shape: { site:{...}, notices:[{title,category,tags,versions:[{id,version,content,pdf,uploader,uploadTime,description,related}]}] }
  if(!raw) return { site:{}, notices:[] };

  // Already legacy
  if(isObj(raw) && Array.isArray(raw.notices)){
    return raw;
  }

  // Legacy alternate: { notices: {k:notice} }
  if(isObj(raw) && isObj(raw.notices) && !Array.isArray(raw.notices)){
    return { site: raw.site || {}, notices: Object.values(raw.notices) };
  }

  // New structured: { site, documents:[...] } or {documents:[...]}
  const docs = (isObj(raw) && Array.isArray(raw.documents)) ? raw.documents : null;
  if(docs){
    const site = raw.site || {};
    const byKey = new Map();
    for(const d of docs){
      const key = d.seriesKey || d.title || d.group || "未分類";
      if(!byKey.has(key)){
        byKey.set(key, {
          id: d.seriesKey || null,
          title: d.title || key,
          category: Array.isArray(d.category) ? d.category : (d.category ? [d.category] : []),
          tags: Array.isArray(d.tags) ? d.tags : (d.tags ? [d.tags] : []),
          versions: []
        });
      }
      const n = byKey.get(key);
      const pdfUrl = d?.pdf?.driveUrl || d?.pdf?.url || d?.pdfUrl || d?.pdf || "";
      n.versions.push({
        id: d.id || d.versionId,
        version: d.versionLabel || d.version || d.id || "",
        content: d.content || d.summary || d.title || "",
        pdf: pdfUrl,
        uploader: d.uploader || d.author || "",
        uploadTime: d.uploadTime || d.updatedAt || d.createdAt || "",
        description: d.description || d.note || "",
        related: d.related || []
      });
    }
    return { site, notices: Array.from(byKey.values()) };
  }

  // If raw itself is array, assume it's notices array
  if(Array.isArray(raw)){
    return { site:{}, notices: raw };
  }

  return { site: raw.site || {}, notices: [] };
}

export async function loadNotices(){
  const raw = await fetchRoute("notices");
  return normalizeNoticesShape(raw);
}

export async function loadProject(){
  const raw = await fetchRoute("cda");
  return raw || {};
}

export async function loadPages(){
  const raw = await fetchRoute("pages");
  return raw || {};
}

export async function loadMeta(){
  const raw = await fetchRoute("meta");
  return raw || {};
}

export function parseDate(s){
  // Expect YYYY-MM-DD or ISO
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function lastUpdated(notice){
  if(!notice?.versions?.length) return null;
  const ds = notice.versions
    .map(v=> parseDate(v.uploadTime))
    .filter(Boolean)
    .sort((a,b)=> b - a);
  return ds[0] || null;
}

function versionTime(v){
  const s = v.updatedAt || v.uploadedAt || v.uploadTime || v.date || v.time || v.upload_date;
  if(!s) return -Infinity;
  const d = parseDate(s);
  return d ? d.getTime() : -Infinity;
}

export function latestVersionIndex(notice){
  if(!notice?.versions?.length) return 0;
  let best = 0, bestDate = -Infinity;
  notice.versions.forEach((v,i)=>{
    const d = parseDate(v.uploadTime);
    const t = d ? d.getTime() : -Infinity;
    if(t >= bestDate){ bestDate = t; best = i; }
  });
  return best;
}

export function formatDate(d){
  if(!d) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

export function normalize(s){
  return (s||"").toString().trim().toLowerCase();
}

export function noticeSearchText(notice, versionIdx){
  const v = notice.versions?.[versionIdx ?? 0] || {};
  const parts = [
    notice.title,
    (notice.category||[]).join(" "),
    (notice.tags||[]).join(" "),
    v.content,
    v.uploader,
    v.description
  ];
  return normalize(parts.join(" "));
}

export function includesAll(hay, needles){
  for(const n of needles){
    if(!n) continue;
    if(!hay.includes(n)) return false;
  }
  return true;
}
