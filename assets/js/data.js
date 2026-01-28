// Data helpers
export async function loadNotices(){
  const res = await fetch("/assets/data/notices.json", {cache:"no-store"});
  if(!res.ok) throw new Error("無法載入資料 notices.json");
  return await res.json();
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
