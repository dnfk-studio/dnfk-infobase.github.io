export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function debounce(fn, ms=250){
  let t;
  return (...args)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...args), ms);
  };
}

export function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

export function toTitleCase(s){
  return String(s??"").replace(/\b\w/g, m=>m.toUpperCase());
}

export function fmtTime(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return String(iso);
  const pad=n=>String(n).padStart(2,"0");
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function uniq(arr){
  const seen=new Set();
  const out=[];
  for(const x of arr){
    const k=String(x);
    if(seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
