// DNFK Announcement Site — common boot
export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

export function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

const THEME_KEY = "dnfk-theme";
const DEFAULT_THEME = "system";
const LOGO_DARK  = new URL("../img/logo-dark.png", import.meta.url).href;
const LOGO_LIGHT = new URL("../img/logo-light.png", import.meta.url).href;


export function getThemePref(){
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
}
export function setThemePref(v){
  localStorage.setItem(THEME_KEY, v);
  applyTheme();
}

export function applyTheme(){
  const pref = getThemePref();
  let mode = pref;
  if(pref === "system"){
    mode = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  document.documentElement.dataset.theme = mode === "light" ? "light" : "dark";
  // swap logos (if exist) — update all occurrences (topbar, drawer, sidebar)
  const logos = document.querySelectorAll('img[data-role="logo"]');
  if(logos && logos.length){
    const src = mode === "light" ? LOGO_DARK : LOGO_LIGHT;
    logos.forEach(img=>{
      img.src = src;
      img.alt = "暗夜飛鳶工作室 DNFK Studio";
    });
  }
  // favicon
  const fav = document.querySelector('link[rel="icon"]');
  if(fav){
    fav.href = mode === "light" ? "LOGO_DARK" : "LOGO_LIGHT";
  }
}

export function toast(msg, ms=2200){
  let el = $("#toast");
  if(!el){
    el = document.createElement("div");
    el.id="toast";
    el.className="toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.classList.remove("show"), ms);
}


let __loadingCount = 0;

function ensureLoadingOverlay(){
  let el = document.getElementById("globalLoading");
  if(el) return el;
  el = document.createElement("div");
  el.id = "globalLoading";
  el.className = "global-loading";
  el.innerHTML = `
    <div class="global-loading-backdrop" aria-hidden="true"></div>
    <div class="global-loading-box" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <div class="global-loading-text">資料載入中…</div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

export function showLoading(text){
  __loadingCount++;
  const el = ensureLoadingOverlay();
  const t = el.querySelector(".global-loading-text");
  if(t) t.textContent = text || "資料載入中…";
  el.classList.add("show");
  document.documentElement.classList.add("is-loading");
}

export function hideLoading(){
  __loadingCount = Math.max(0, __loadingCount-1);
  if(__loadingCount !== 0) return;
  const el = document.getElementById("globalLoading");
  if(el) el.classList.remove("show");
  document.documentElement.classList.remove("is-loading");
}

let __siteInfoPromise = null;

export async function fetchSiteInfo(){
  // 修正：檢查 window.__DNFK_INFO__ 是否存在且具有有效內容 (例如 major 不為空)
  // 避免 Worker 回傳的空殼物件被誤認為有效資料
  if(window.__DNFK_INFO__ && window.__DNFK_INFO__.major !== "") {
    return window.__DNFK_INFO__;
  }

  if(__siteInfoPromise) return __siteInfoPromise;
  
  __siteInfoPromise = (async ()=>{
    try{
      const u = new URL("/api/data/info.json", location.origin);
      u.searchParams.set("v", String(Date.now()));
      const r = await fetch(u.toString(), { cache: "no-store", redirect: "follow" });
      if(!r.ok) throw new Error("info.json fetch failed: " + r.status);

      const ct = (r.headers.get("content-type") || "").toLowerCase();
      if(ct.includes("text/html")) throw new Error("info.json returned HTML");

      const data = await r.json();
      
      // 雙重保險：如果 fetch 回來的也是空的 (可能是 Worker cache 了錯誤回應)，拋出錯誤讓它重試
      if (!data || !data.major && data.major !== 0) {
         throw new Error("Fetched data is empty");
      }
      
      return data;
    }catch(e){
      __siteInfoPromise = null;
      throw e;
    }
  })();
  return __siteInfoPromise;
}

export function formatVersion(info){
  if(!info) return "";
  
  // 確保轉為字串，避免 undefined/null
  const major = String(info.major ?? "");
  const minor = String(info.minor ?? "");
  const patch = String(info.patch ?? "");
  
  // 處理 dataId 大小寫相容與 statue
  const dataID = String(info.dataID ?? info.dataId ?? "").trim();
  const dataStatue = String(info.dataStatue ?? "").trim();

  // 合併 dataId 與 statue (直接連接，無符號)
  const tail = dataID + dataStatue;

  // 核心修正：使用 v !== "" 而非 Boolean(v)，確保 "0" 能被保留
  const base = [major, minor, patch].filter(v => v !== "").join(".");

  // 格式規則：如果有版號與尾綴，用 "." 連接
  if(base && tail) return base + "." + tail;
  
  return base || tail;
}

async function applySiteInfo(){
  try{
    const info = await fetchSiteInfo();
    window.__DNFK_SITE_INFO__ = info;
    const v = formatVersion(info);
    if(!v) return;
    // Some pages might render the version placeholder late; retry a few times.
    let tries = 0;
    const apply = ()=>{
      const nodes = document.querySelectorAll("[data-site-version]");
      if(nodes && nodes.length){
        nodes.forEach(el=>{ el.textContent = "v " + v; });
        return true;
      }
      return false;
    };

    if(apply()) return;
    while(tries < 10){
      await new Promise(r=>setTimeout(r, 150));
      tries++;
      if(apply()) return;
    }
  }catch(e){
    // fail-soft: version not critical, but retry once after a short delay.
    console.warn("Site info load failed:", e);
    setTimeout(()=>{
      // try again once; if it still fails, keep placeholder
      applySiteInfo().catch(()=>{});
    }, 1200);
  }
}


function setupThemeToggle(){
  const buttons = $$('[data-action="theme-toggle"]');
  // Back-compat: if pages still use id, include it
  const legacy = $("#themeToggle") || $("#themeBtn");
  if(legacy && !buttons.includes(legacy)) buttons.push(legacy);

  if(!buttons.length) return;

  const nextPref = (pref)=> (pref === "system" ? "dark" : pref === "dark" ? "light" : "system");

  const updateLabels = ()=>{
    const pref = getThemePref();
    const text = pref === "system" ? "系統" : pref === "dark" ? "深色" : "淺色";
    buttons.forEach(btn=>{
      const label = btn.querySelector("[data-theme-label]");
      if(label) label.textContent = text;
    });
  };

  buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const pref = getThemePref();
      const next = nextPref(pref);
      setThemePref(next);
      toast(next === "system" ? "主題：跟隨系統" : next === "dark" ? "主題：深色" : "主題：淺色");
      updateLabels();
    });
  });

  updateLabels();
}

function setupDrawer(){
  const overlay = $("#overlay");
  const drawer = $("#drawer");
  if(!overlay || !drawer) return;

  const openBtn = $("#hamburger") || $("#burger") || $("#burgerBtn");
  const closeBtn = $("#drawerClose") || drawer.querySelector(".close");
  const open = ()=>{
    overlay.classList.add("show");
    // gsap anim if present
    if(window.gsap){
      gsap.to(drawer, {x: 0, duration: .42, ease: "power3.out"});
      gsap.fromTo(drawer, {opacity: .9}, {opacity: 1, duration: .2});
    }else{
      drawer.style.transform = "translateX(0)";
    }
  };
  const close = ()=>{
    overlay.classList.remove("show");
    if(window.gsap){
      gsap.to(drawer, {x: "-110%", duration: .35, ease: "power3.in"});
    }else{
      drawer.style.transform = "translateX(-110%)";
    }
  };

  if(openBtn) openBtn.addEventListener("click", open);
  if(closeBtn) closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);

  // init position for gsap
  if(window.gsap){
    gsap.set(drawer, {x: "-110%"});
  }
}

function setupActiveNav(){
  const path = location.pathname.split("/").pop() || "index.html";
  $$(".nav a").forEach(a=>{
    const href = (a.getAttribute("href")||"").split("#")[0];
    if(href === path) a.classList.add("active");
  });
}

function setupDropdowns(){
  // generic dropdown
  $$(".dropdown").forEach(dd=>{
    const btn = dd.querySelector(".dropbtn");
    const menu = dd.querySelector(".menu");
    if(!btn || !menu) return;
    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      // close others
      $$(".dropdown .menu.show").forEach(m=>{ if(m!==menu) m.classList.remove("show"); });
      menu.classList.toggle("show");
    });
  });
  document.addEventListener("click", ()=> $$(".dropdown .menu.show").forEach(m=>m.classList.remove("show")));
}

function setupReveal(){
  const els = $$(".reveal");
  if(!els.length) return;
  const obs = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      if(window.gsap){
        gsap.fromTo(e.target, {y: 16, opacity: 0}, {y:0, opacity:1, duration:.6, ease:"power3.out"});
      }
      obs.unobserve(e.target);
    }
  }, {threshold: .18});
  els.forEach(el=> obs.observe(el));
}

function setupBackground(){
  const canvas = $("#starfield");
  if(!canvas) return;

  const ctx = canvas.getContext("2d");
  const stars = [];
  let w=0,h=0, dpr=1;

  function resize(){
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth+"px";
    canvas.style.height = innerHeight+"px";
    stars.length = 0;
    const n = Math.floor((innerWidth*innerHeight)/18000);
    for(let i=0;i<n;i++){
      stars.push({
        x: Math.random()*w,
        y: Math.random()*h,
        r: (Math.random()*1.2+0.4)*dpr,
        a: Math.random()*0.6+0.25,
        v: (Math.random()*0.15+0.05)*dpr
      });
    }
  }

  function tick(){
    ctx.clearRect(0,0,w,h);
    const theme = document.documentElement.dataset.theme || "dark";
    ctx.fillStyle = theme === "light" ? "rgba(10,20,40,.55)" : "rgba(255,255,255,.65)";
    for(const s of stars){
      s.y += s.v;
      if(s.y>h){ s.y = -10; s.x = Math.random()*w; }
      ctx.globalAlpha = s.a * (0.6 + 0.4*Math.sin((Date.now()/900)+s.x*0.0008));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize, {passive:true});
  resize();
  tick();
}

function setupBlobs(){
  const blobs = $$(".blob");
  if(!blobs.length || !window.gsap) return;
  blobs.forEach((b, i)=>{
    const dx = i%2===0 ? 40 : -50;
    const dy = i%2===0 ? -28 : 36;
    gsap.to(b, {x:`+=${dx}`, y:`+=${dy}`, duration: 6 + i*1.2, yoyo:true, repeat:-1, ease:"sine.inOut"});
    gsap.to(b, {rotation: i%2? -10: 12, duration: 10+i*2, yoyo:true, repeat:-1, ease:"sine.inOut"});
  });
}

export function bootCommon(){
  applyTheme();
  setupThemeToggle();
  setupDrawer();
  setupActiveNav();
  setupDropdowns();
  setupReveal();
  setupBackground();
  setupBlobs();
  applySiteInfo();

  // Safety: ensure site info is attempted after DOM is fully ready.
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=>{
    applySiteInfo().catch(()=>{});
    // Retry a few times in case an auth layer briefly redirects during initial load.
    let tries = 0;
    const timer = setInterval(()=>{
      const el = document.querySelector("[data-site-version]");
      const txt = (el && el.textContent || "").trim();
      if(txt && txt !== "v —"){ clearInterval(timer); return; }
      tries++;
      if(tries > 6){ clearInterval(timer); return; }
      applySiteInfo().catch(()=>{});
    }, 1500);
  }, {once:true});
  }

  // smooth page fade (optional)
  const pf = document.body.getAttribute("data-pagefade");
  if(pf && window.gsap){
    gsap.fromTo(document.body, {opacity: 0}, {opacity: 1, duration: .35, ease:"power2.out"});
  }

  // re-apply theme on system change if pref is system
  if(window.matchMedia){
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", ()=> { if(getThemePref()==="system") applyTheme(); });
  }
}