import { applyTheme, bootCommon } from "./app.js?v=20260215b";

function safeTween(fn){
  try{ fn(); }catch(e){ /* ignore animation errors */ }
}

bootCommon();
applyTheme();

// Home animations (guard missing targets)
document.addEventListener("DOMContentLoaded", ()=>{
  const hasGsap = typeof window.gsap !== "undefined";
  if(!hasGsap) return;

  safeTween(()=>{
    const tl = window.gsap.timeline({defaults:{ease:"power2.out"}});

    const logo = document.querySelector(".home-logo");
    const title = document.querySelector(".home-title");
    const sub = document.querySelector(".home-sub");
    const actions = document.querySelectorAll(".home-actions .btn");
    const rules = document.querySelectorAll(".home-rule");

    if(logo)   tl.fromTo(logo, {opacity:0, y:10}, {opacity:1, y:0, duration:.6});
    if(title)  tl.fromTo(title,{opacity:0, y:10}, {opacity:1, y:0, duration:.55}, "<+.05");
    if(sub)    tl.fromTo(sub,  {opacity:0, y:10}, {opacity:1, y:0, duration:.45}, "<+.05");
    if(rules?.length) tl.fromTo(rules, {opacity:0, scaleX:.6}, {opacity:1, scaleX:1, duration:.5}, "<+.05");
    if(actions?.length) tl.fromTo(actions, {opacity:0, y:10}, {opacity:1, y:0, stagger:.06, duration:.45}, "<+.10");
  });
});
