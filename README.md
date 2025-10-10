
# 公告與文件搜尋網站（Cloudflare + GitHub Pages + Google Drive 上傳）

本專案提供：
- 公告欄（從 Google 試算表或本地 JSON 載入）
- 文件清單與即時搜尋（Fuse.js）
- PDF 預覽（以 PDF.js viewer 連結開啟）
- Admin 上傳頁（透過 Google Apps Script -> 儲存到 Google 雲端硬碟資料夾並回寫試算表）
- PWA 快取（App Shell；資料走網路優先）
- 星野背景與微動畫、美化樣式（Tailwind CDN + 自訂 CSS + JS）

## 快速開始（本地預覽）
1. 直接打開 `index.html` 可使用 *本地 sample JSON* 模式（搜尋/公告皆可演示）。
2. 若要啟用雲端上傳與雲端資料來源：
   - 參考 `apps_script/README_APPS_SCRIPT.md` 佈署 Google Apps Script Web App。
   - 取得 Web App URL、雲端硬碟資料夾 ID、試算表 ID，填入 `assets/js/config.js`。
   - 將 `CONFIG.MODE` 設為 `"APPS_SCRIPT"`。

## GitHub Pages 佈署
- 將整個資料夾推到 GitHub repository root。
- 啟用 GitHub Pages（Branch: `main` / root）。
- `sw.js` 與 `manifest.webmanifest` 會讓網站成為 PWA。

## Cloudflare 連接自訂網域
1. 將網域 NS 指到 Cloudflare 或至少把 DNS 託管在 Cloudflare。
2. 在 Cloudflare DNS 新增 CNAME 指向 `<username>.github.io`（把 Proxy 橙色開啟）。
3. 回到 GitHub Pages 設定自訂網域（等待 TLS 生效）。

## 功能自我檢查清單
- 首頁載入後是否能看到「公告欄」卡片？
- 搜尋框輸入關鍵字，列表是否即時過濾？
- 點擊任何文件是否能在新分頁開啟 PDF.js 預覽？
- 於 `admin.html` 上傳 PDF（在 APPS_SCRIPT 模式且已佈署 Web App），是否成功寫入 Drive 與試算表並立即回傳連結？
- PWA：重新載入頁面，離線時能否載入 App 外殼（首頁框架）？

---
產生時間：2025-10-10T04:52:39.841353
