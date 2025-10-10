# Google Apps Script 佈署說明

> 目標：提供一個 Web App 端點，讓前端能「上傳 PDF 至指定 Drive 資料夾」，並把檔案 metadata 寫入試算表，前端再讀取該清單供搜尋。

## 準備
1. 建立 Google 雲端硬碟資料夾，記下 `資料夾 ID`。
2. 建立 Google 試算表，第一列欄位為：
   ```
   id | title | date | tags | desc | url
   ```
   記下 `試算表 ID`。

## 建立 Apps Script
1. 進入 <https://script.google.com> 建立新專案。
2. 貼上 `DriveUploader.gs` 程式碼。
3. 將檔案內的 `FOLDER_ID` 與 `SHEET_ID` 替換成你的 ID。
4. 「部署」→「新部署」→ 類型選「網頁應用程式」：
   - 誰可以存取：**任何人**
   - 記下「Web 應用程式 URL」

## 上傳策略（兩種）
### A. Base64 模式（範例）
- 由於 Apps Script 難以直接解析 multipart/form-data，本專案示範「將檔案讀為 base64 再傳」的做法。
- 你可以調整 `admin.html`，在送出前將 `file` 轉為 base64 填入 `FormData`。

### B. Google Drive Picker（建議）
- 使用 Google Picker（需建立 OAuth Client），讓使用者挑檔並複製至你的資料夾。
- 拿到檔案後，呼叫 Web App 寫入 metadata 到試算表。

> 若你已有 Google Workspace，亦可直接用「Google 表單（檔案上傳）」收件，再用 Apps Script 將新檔加入清單。

## 資料提供 API
- `GET ?list=docs`：回傳試算表中所有文件列。
- （可自行擴充公告表格，或直接在前端設定為 LOCAL_JSON 即可）

## CORS
Apps Script 預設回傳 `application/json`，若有跨域需求可包裝為 `JSONP` 或加上 `doOptions` 回應標頭。
