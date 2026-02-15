import { bootPage } from "./page.js";
import { DataClient } from "./data-client.js";
import { qs } from "./utils.js";
import { showLoading, hideLoading } from "./ui.js";

async function init(){
  showLoading("讀取維護狀態…");
  try{
    const cfg = await DataClient.getConfig();
    qs("#maintMsg").textContent = cfg?.messageZh || "後端系統自主維護中";
    qs("#maintMsgEn").textContent = cfg?.messageEn || "The system is under maintenance.";
    qs("#maintHint").textContent = cfg?.timeHint || "請稍後再試。";
  }finally{
    hideLoading();
  }
}
bootPage(init);
