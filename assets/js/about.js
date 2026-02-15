import { bootCommon, showLoading, hideLoading, setUiLocked, toast, showAuthGate } from "./app.js?v=20260215b";
import { loadPages } from "./data.js";

bootCommon();

async function bootAbout(){
  const slug = document.body.getAttribute("data-page-slug");
  if(!slug) return;

  showLoading("載入內容…");
  setUiLocked(true);
  try{
    const raw = await loadPages();
    const pages = raw?.pages || raw || {};
    const entry = pages[slug] || pages[slug.replace(/\//g,'-')] || null;
    if(!entry){
      toast("找不到頁面內容（pages.json）");
      return;
    }

    const html = entry.contentHtml || entry.html || (entry.content && (entry.content.bodyHtml || entry.content.html)) || entry.content || "";
    if(!html){
      toast("頁面內容為空");
      return;
    }

    // Extract the meaningful part if the stored content is a full page.
    let injected = html;
    try{
      const doc = new DOMParser().parseFromString(html, "text/html");
      const c = doc.querySelector(".container");
      if(c) injected = c.innerHTML; // only inner content
      else {
        const main = doc.querySelector("main") || doc.body;
        if(main && main.innerHTML.trim()) injected = main.innerHTML;
      }
    }catch(e){
      // fallback to raw html
    }

    const host = document.querySelector(".container");
    if(host){
      host.innerHTML = injected;
    }
  }catch(err){
    if(err && err.code === "AUTH_REQUIRED"){
      showAuthGate(err.loginUrl);
      return;
    }
    console.error(err);
    toast("載入失敗，請稍後重試");
  }finally{
    hideLoading();
    setUiLocked(false);
  }
}

document.addEventListener("DOMContentLoaded", bootAbout);
