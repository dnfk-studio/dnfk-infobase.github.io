import { bootCommon } from "./app.js";

export function bootIndex(){
  bootCommon();


  if(window.gsap){
    const tl = gsap.timeline({defaults:{ease:"power3.out"}});
    tl.fromTo("#homeIntro", {opacity:0, y: 18}, {opacity:1, y:0, duration:.8})
      .fromTo(".home-logo", {opacity:0, y: -10, scale:.98}, {opacity:1, y:0, scale:1, duration:.6}, "<+.05")
      .fromTo(".home-rule", {scaleX:0, opacity:0}, {scaleX:1, opacity:1, duration:.7, transformOrigin:"50% 50%"}, "<+.10")
      .fromTo(".home-title", {opacity:0, y: 10}, {opacity:1, y:0, duration:.6}, "<+.05")
      .fromTo(".home-actions a", {opacity:0, y: 10}, {opacity:1, y:0, duration:.45, stagger:.06}, "<+.10")
      .fromTo(".home-meta", {opacity:0}, {opacity:1, duration:.5}, "<+.15");
  }
}

bootIndex();
