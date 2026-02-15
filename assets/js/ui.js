import { qs } from "./utils.js";

let loadingCount = 0;

export function ensureLoading(){
  let el = qs("#loadingOverlay");
  if(el) return el;
  el = document.createElement("div");
  el.id = "loadingOverlay";
  el.className = "loading";
  el.innerHTML = `
    <div class="panel">
      <div class="row">
        <div class="spinner" aria-hidden="true"></div>
        <div>
          <div style="font-weight:700; letter-spacing:.2px;">載入中</div>
          <div class="msg" id="loadingMsg">請稍候…</div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  return el;
}

export function showLoading(msg="請稍候…"){
  const el = ensureLoading();
  const msgEl = qs("#loadingMsg", el);
  if(msgEl) msgEl.textContent = msg;
  loadingCount++;
  el.classList.add("active");
}

export function hideLoading(){
  const el = ensureLoading();
  loadingCount = Math.max(0, loadingCount-1);
  if(loadingCount===0) el.classList.remove("active");
}

export function renderError(container, title, detail){
  container.innerHTML = `
    <div class="card">
      <h2>${title}</h2>
      <p>${detail ?? "請稍後再試，或聯繫網站管理員。"}</p>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn primary" id="retryBtn">重試</button>
        <a class="btn" href="/">回到首頁</a>
      </div>
    </div>
  `;
  const btn = container.querySelector("#retryBtn");
  return btn;
}
