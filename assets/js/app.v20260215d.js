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
    fav.href = mode === "light" ? LOGO_DARK : LOGO_LIGHT;
  }
}

export function ensureLoading(){
  let el = $("#loading");
  if(el) return el;
  el = document.createElement("div");
  el.id = "loading";
  el.className = "loading-overlay";
  el.innerHTML = `
    <div class="loading-card">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-text" id="loadingText">載入中…</div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}
export function showLoading(text="載入中…"){
  const el = ensureLoading();
  const t = $("#loadingText", el);
  if(t) t.textContent = text;
  el.classList.add("show");
}
export function hideLoading(){
  const el = $("#loading");
  if(el) el.classList.remove("show");
}
export function setUiLocked(locked=true){
  document.documentElement.toggleAttribute("data-locked", !!locked);
  // disable interactive controls
  $$("button, a.btn, input, select, textarea").forEach(el=>{
    if(!el) return;
    if(locked){
      el.setAttribute("data-disabled-by-loading","1");
      el.setAttribute("disabled","disabled");
      el.style.pointerEvents = "none";
      el.style.opacity = "0.65";
    }else{
      if(el.getAttribute("data-disabled-by-loading")==="1"){
        el.removeAttribute("data-disabled-by-loading");
        el.removeAttribute("disabled");
        el.style.pointerEvents = "";
        el.style.opacity = "";
      }
    }
  });
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


export function showAuthGate(loginUrl="/api/data?r=meta"){
  // Full-screen gate prompting user to authenticate via Cloudflare Access
  let gate = document.getElementById("authGate");
  if(gate) return;
  gate = document.createElement("div");
  gate.id = "authGate";
  gate.setAttribute("role","dialog");
  gate.setAttribute("aria-modal","true");
  gate.style.cssText = [
    "position:fixed","inset:0","z-index:99999",
    "display:flex","align-items:center","justify-content:center",
    "background:rgba(0,0,0,.55)","backdrop-filter: blur(6px)"
  ].join(";");
  const card = document.createElement("div");
  card.style.cssText = [
    "width:min(520px, calc(100vw - 32px))",
    "border-radius:16px",
    "padding:18px 18px 16px",
    "background:var(--card, #0f172a)",
    "border:1px solid rgba(255,255,255,.10)",
    "box-shadow:0 18px 60px rgba(0,0,0,.45)"
  ].join(";");
  card.innerHTML = `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10)">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7v3H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a7 7 0 0 0-7-7zm-5 10V9a5 5 0 0 1 10 0v3H7zm5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/></svg>
      </div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:16px;line-height:1.2;margin-top:2px">需要登入才能讀取資料</div>
        <div style="opacity:.82;margin-top:6px;line-height:1.5">此網站資料由 Cloudflare Access 保護。請先登入允許的帳號後再使用。</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
      <a class="btn primary" href="${loginUrl}" style="text-decoration:none">前往登入</a>
      <button class="btn" id="authGateReload" type="button">我已登入，重新整理</button>
    </div>
  `;
  gate.appendChild(card);
  document.body.appendChild(gate);
  const btn = document.getElementById("authGateReload");
  if(btn){
    btn.addEventListener("click", ()=> location.reload());
  }
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