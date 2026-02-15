import { ENV } from "./env.js";
import { qs, qsa } from "./utils.js";
import { initReveal } from "./animate.js";

export function setTheme(theme){
  const root = document.documentElement;
  root.dataset.theme = theme;
  localStorage.setItem("theme", theme);
  const logo = qs("#brandLogo");
  if(logo){
    logo.src = theme==="light" ? "/assets/img/logo-light.png" : "/assets/img/logo-dark.png";
  }
}

export function initTheme(){
  const saved = localStorage.getItem("theme");
  if(saved==="light" || saved==="dark"){
    setTheme(saved);
    return;
  }
  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  setTheme(prefersLight ? "light" : "dark");
}

export function initTopbar(){
  const titleZh = qs("#siteTitleZh");
  const titleEn = qs("#siteTitleEn");
  if(titleZh) titleZh.textContent = ENV.SITE_NAME_ZH;
  if(titleEn) titleEn.textContent = ENV.SITE_NAME_EN;

  const btn = qs("#themeToggle");
  if(btn){
    btn.addEventListener("click", ()=>{
      const cur = document.documentElement.dataset.theme || "dark";
      setTheme(cur==="dark" ? "light" : "dark");
    });
  }

  const year = qs("#year");
  if(year) year.textContent = String(new Date().getFullYear());

  // active link
  const path = location.pathname.replace(/\/+$/,"") || "/";
  for(const a of qsa("[data-nav]")){
    const target = a.getAttribute("href").replace(/\/+$/,"") || "/";
    if(target===path) a.style.borderColor = "rgba(169,214,255,.35)";
  }
}

export function bootCommon(){
  initTheme();
  initTopbar();
  initReveal();
}
