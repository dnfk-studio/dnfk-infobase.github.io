/**
 * Google Apps Script：接收前端 FormData 上傳 PDF，存入指定 Drive 資料夾，並寫入試算表。
 * 需先填入 FOLDER_ID 與 SHEET_ID（sheet 欄位：id, title, date, tags, desc, url）
 */

const FOLDER_ID = 'REPLACE_WITH_DRIVE_FOLDER_ID';
const SHEET_ID  = 'REPLACE_WITH_SHEET_ID';

function doPost(e) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    const title = e.parameter.title || '未命名文件';
    const date  = e.parameter.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const tags  = e.parameter.tags || '';
    const desc  = e.parameter.desc || '';

    // 取檔案
    const blob = e?.parameter?.file ? Utilities.newBlob(Utilities.base64Decode(e.parameter.file), e.parameter.mimeType || 'application/pdf', e.parameter.filename || (title+'.pdf')) : null;
    // 若使用原生 FormData，需要用 e.postData 并從其內容解析
    let fileBlob = blob;
    if (!fileBlob && e.postData && e.postData.length > 0) {
      const data = e.postData.getDataAsString();
      // 由於 Apps Script 無法直接解析 multipart/form-data，使用 HTMLService 搭配 <input type="file"> 通常需 Google Picker。
      // 這裡改用更簡潔作法：直接讓 HTML 以 fetch 傳 raw 檔案 blob 不容易。
      // 因此建議改用「Google 表單（檔案上傳）」或前端使用 Google Picker。
      // 為配合本專案 demo，我們支援 XHR 傳送檔案為 base64 的做法（見 README_APPS_SCRIPT.md）。
      // 若您仍使用 multipart/form-data，請參考外部程式庫或改用 WebApp+Picker。
      return ContentService.createTextOutput(JSON.stringify({ ok:false, error: '請依 README_APPS_SCRIPT.md 使用 base64 上傳模式或 Google Picker。'}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const file = folder.createFile(fileBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = file.getUrl();
    const id  = Utilities.getUuid();

    sheet.appendRow([id, title, date, tags, desc, url]);

    return ContentService.createTextOutput(JSON.stringify({ ok:true, id, url })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const mode = e.parameter.list || '';
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const values = sheet.getDataRange().getValues();
    const head = values.shift();
    const idx = Object.fromEntries(head.map((h,i)=>[String(h).trim(), i]));
    const rows = values.map(r => ({
      id:   r[idx['id']]   || '',
      title:r[idx['title']]|| '',
      date: r[idx['date']] || '',
      tags: r[idx['tags']] || '',
      desc: r[idx['desc']] || '',
      url:  r[idx['url']]  || ''
    }));
    return ContentService.createTextOutput(JSON.stringify({ ok:true, data: rows })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
