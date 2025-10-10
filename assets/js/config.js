// 全域設定：切換資料來源與 API 端點
const CONFIG = {
  // APPS_SCRIPT（雲端）或 LOCAL_JSON（僅示範）
  MODE: "LOCAL_JSON",

  // Apps Script Web App URL（部屬後會是 https://script.google.com/macros/s/xxx/exec）
  APPS_SCRIPT_URL: "",

  // 來源選擇：公告欄與文件清單
  ANNOUNCEMENTS_SOURCE: "LOCAL_JSON", // 可改 "APPS_SCRIPT"
  DOCS_SOURCE: "LOCAL_JSON",         // 可改 "APPS_SCRIPT"

  // 本地示範 JSON（未接雲端時使用）
  LOCAL_ANN_JSON: "data/announcements.sample.json",
  LOCAL_DOCS_JSON: "data/docs.sample.json",

  // PDF.js viewer（以 iframe 方式開啟）
  PDFJS_VIEWER: "https://mozilla.github.io/pdf.js/web/viewer.html?file=",

  // 搜尋設定
  FUSE_OPTIONS: {
    includeScore: true,
    threshold: 0.35,
    keys: ["title", "desc", "tags"]
  }
};
