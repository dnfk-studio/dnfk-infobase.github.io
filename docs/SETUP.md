# DNFK InfoBase 部署指引（GitHub Pages + Cloudflare Access + Worker + 單一 GAS + Google Drive JSON）

本專案分成兩包：
- `site.zip`：部署到 GitHub Pages 的網站（HTML/CSS/JS + 本地圖片）
- `drive-json.zip`：上傳到 Google Drive 的 JSON（pages / notices / cda-project / meta / config）
- `GAS_Code.gs`：單一 Google Apps Script（讀 Drive JSON 並輸出）

---

## 一、準備 Google Drive JSON

1. 解壓 `drive-json.zip`
2. 建議在 Google Drive 建立資料夾，例如：`InfoBase-Data`
3. 將以下檔案上傳到該資料夾：
   - `config.json`
   - `meta.json`
   - `pages.json`
   - `notices.json`
   - `cda-project.json`
4. 對每個檔案右鍵 → 取得連結：
   - **至少要確保 GAS 擁有者可以讀取**
   - 你現在選 B1（Cloudflare Access 會擋 /api），所以 Drive 檔案本身可以是「不公開」也沒問題（只要 GAS 有權限）

> 你提供的三個現有 Drive 檔案（pages/notices/cda-project）也可以直接用，不一定要用我這包；重點是要取得每個 JSON 的 `fileId`。

---

## 二、建立單一 Google Apps Script（GAS）

1. 打開 Google Apps Script → 新增專案
2. 建立檔案 `Code.gs`，把 `GAS_Code.gs` 的內容貼進去
3. 把 FILE_IDS 五個欄位替換成你的 Drive 檔案 fileId：
   - config.json 的 fileId
   - meta.json 的 fileId
   - pages.json 的 fileId
   - notices.json 的 fileId
   - cda-project.json 的 fileId
4. 右上角「部署」→「新增部署」→ 類型選「網頁應用程式」
5. 執行身分：選「我」
6. 存取權：選「任何人」（重要：因為 Access 會在 Cloudflare 擋住；GAS 這邊必須能被 Worker 呼叫）
7. 部署後你會得到一個 `.../exec` 的網址，留著，等下一步填到 Worker 裡

> 測試：在瀏覽器打開
> - `GAS_EXEC_URL?r=meta`
> - `GAS_EXEC_URL?r=notices`
> 應回 JSON（外層有 ok/route/data）。

---

## 三、建立 Cloudflare Worker（B1）

> 你不需要安裝任何東西，全程在 Cloudflare 後台操作。

1. Cloudflare 後台 → Workers & Pages → Create Worker
2. 貼上 `site/docs/cloudflare-worker.js` 的內容
3. 把 `REPLACE_WITH_YOUR_GAS_WEBAPP_EXEC_URL` 改成你第二步取得的 `.../exec` URL
4. Deploy
5. 到 Worker 的「Triggers / Routes」設定路由：
   - Route：`info-base.dnfk.qzz.io/api/data*`
   - 指向你剛部署的 Worker
6. 測試：
   - 打開 `https://info-base.dnfk.qzz.io/api/data?r=meta`
   - 若 Access 已啟用，你應該會先被要求登入；登入後回 JSON（純 data，不含 ok/route 包裝）

---

## 四、設定 Cloudflare Access（只允許指定帳號）

1. Cloudflare Zero Trust → Access → Applications → Add an application
2. 選 Self-hosted
3. Application domain：
   - `info-base.dnfk.qzz.io`
4. Path：
   - `/api/*`（至少要保護 API）
   - （建議）`/*`（把整站一起保護）
5. Policies → Include → Emails：
   - rkgrbg@gmail.com
   - dnfkyao@gmail.com
   - dnfkayfu@gmail.com
   - s1131314@stu.ccsh.tp.edu.tw
   - wayne001283@gmail.com
6. Save

---

## 五、部署網站到 GitHub Pages（Custom Domain）

1. 解壓 `site.zip`
2. 上傳到你的 GitHub repo（例如 `dnfk-infobase`）
   - 確保根目錄是 `index.html` 與資料夾 `search/ document/ ...`
3. GitHub → Settings → Pages：
   - Source：Deploy from a branch（main / root）
   - Custom domain：`info-base.dnfk.qzz.io`
4. 等 GitHub Pages 生效
5. 測試：
   - `https://info-base.dnfk.qzz.io/`
   - `https://info-base.dnfk.qzz.io/search/`
   - `https://info-base.dnfk.qzz.io/document/?id=PA-260101`

---

## 六、你要改資料（未來做後端前的「活化」方式）

你之後只要更新 Drive 上的 JSON 檔案內容即可（不需要改前端）：
- 新增/修改文書 → 改 `notices.json`
- 新增/修改 CDA 事務/事件 → 改 `cda-project.json`
- 改政策/關於頁 → 改 `pages.json`
- 改維護狀態 → 改 `config.json`（maintenanceActive true/false）
- 改版本號 → 改 `meta.json`

---

## 七、JSON 結構（重點）

### notices.json（每個版本是獨立 document id）
- `documents[]` 每筆就是一份「可直接用 id 連結」的文書
- 用 `seriesKey` 表示同系列版本（例如 PA-260101/02/03 的 seriesKey 都是 PA-2601）
- `relatedIds[]` 用於相關連結

### cda-project.json
- `docIds[]` 明確列出 CDA 頁要顯示的文書 id（不靠 tags）
- `tasks[]` / `events[]` 用於專案管理

### pages.json
- `pages[slug].contentHtml` 直接渲染（你不用學 Markdown 就能改內容）

---

如果你後續要「後端系統」：
- 我已把前端資料層集中在 `assets/js/data-client.js`
- 未來只要把 `ENV.API_BASE` 指到你的後端 API（或保持 /api/data，讓 Worker 轉到新後端）即可，前端其他頁面不用大改。
