import { bootCommon } from "./app.js";
import { showLoading, hideLoading } from "./ui.js";
import { enforceMaintenance } from "./guard.js";

export async function bootPage(initFn){
  bootCommon();
  showLoading("初始化中…");
  const ok = await enforceMaintenance();
  if(!ok) return;
  try{
    await initFn();
  } finally {
    hideLoading();
  }
}
