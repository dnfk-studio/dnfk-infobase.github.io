import { bootPage } from "./page.js";
import { DataClient } from "./data-client.js";
import { qs } from "./utils.js";
import { renderError, showLoading, hideLoading } from "./ui.js";

async function init(){
  const root = qs("#contentRoot");
  const slug = document.body.dataset.slug;
  if(!slug){
    const btn = renderError(root, "頁面設定錯誤", "缺少 slug。");
    btn?.addEventListener("click", ()=>location.href="/");
    return;
  }
  try{
    showLoading("載入頁面內容…");
    const pages = await DataClient.getPages();
    const page = pages?.pages?.[slug];
    if(!page){
      const btn = renderError(root, "找不到頁面內容", `找不到 slug：${slug}`);
      btn?.addEventListener("click", ()=>location.href="/");
      return;
    }
    qs("#pageTitle").textContent = page.titleZh || page.title || slug;
    qs("#pageBody").innerHTML = page.contentHtml || "<p>（無內容）</p>";
  }catch(e){
    const btn = renderError(root, "載入失敗", String(e?.message || e));
    btn?.addEventListener("click", ()=>location.reload());
  }finally{
    hideLoading();
  }
}
bootPage(init);
