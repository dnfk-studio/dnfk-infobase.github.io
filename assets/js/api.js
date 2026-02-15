export async function fetchJson(url, {timeoutMs=12000}={}){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(url, {signal: ctrl.signal, credentials: "include"});
    if(!res.ok){
      const text = await res.text().catch(()=> "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0,200)}`);
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}
