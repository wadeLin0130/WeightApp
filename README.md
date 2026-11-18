# WeightApp 私人自架版

沿用 React、Vite、Tailwind、原本配色、月曆及紀錄操作，改成單人使用的 Node.js + SQLite 服務。伺服器只監聽 localhost，透過 Tailscale Serve HTTPS 使用。不需要 Firebase、Vercel、Gemini、Docker 或公開連接埠。

## 使用

首頁顯示每日熱量、蛋白質、營養素、最近體重與飲食／運動清單。點「拍照／選擇照片」，拍照或選圖，按 AI 辨識（需另行授權），確認各食材重量與營養數值後儲存。也可直接手動輸入並存成常用餐點，在「飲食 → 新增」快速重用。點紀錄可修改或刪除；原本月曆及滑動刪除保留。

設定預設 2,150 kcal、蛋白質 140 g、階段體重 90 kg，可自行修改後按「儲存設定」。運動消耗不加回每日可吃熱量。重訓支援動作、重量、組、次、備註；有氧支援名稱、分鐘、選填活動熱量及平均心率。

趨勢顯示體重與七個日曆日移動平均、每日熱量、每日蛋白質、每週運動紀錄筆數。沒有紀錄的飲食日期不填零；舊紀錄缺少蛋白質不自動估算。

首頁「推薦下一餐」可選外食或自煮，依當日餐點及剩餘目標產生選項。生成後可輸入文字微調；選擇餐點後進入既有編輯表單，按「儲存」才加入紀錄。

## 安裝與啟動

需求：Node.js 22.16 以上（使用內建 `node:sqlite`）、npm；部署端已有 Tailscale、systemd user service 與 Python 3。不安裝全域套件。

```sh
npm ci
npm test
npm run lint
npm run build
# 僅供本機開發，不經身分驗證；勿以 Serve 或其他代理發布此模式。
WEIGHTAPP_DEV=1 npm start
```

開啟 `http://127.0.0.1:3107`。需要前端熱更新時另跑 `npm run dev`；Vite 僅監聽 loopback，並代理 API。

部署到已登入 Tailscale 的 Linux：

```sh
./scripts/deploy.sh user@tailnet-host your-tailscale-login@example.com 13443
```

腳本檢查埠衝突，建立獨立的 `weightapp.service`，以使用者身分執行；只重啟 WeightApp。不修改其他服務或 ACL，也不使用 Funnel。已有的 Serve 路由保留。瀏覽器來源、Host 及 `Tailscale-User-Login` 必須符合設定，未授權請求回覆 403。此信任邊界假設伺服器本機帳號可信；其他本機程序可存取使用者的資料，不能拿 loopback header 驗證隔離惡意本機使用者。

預設位置：

| 內容 | Linux 路徑 |
| --- | --- |
| 程式 | `~/weightapp` |
| 環境與擁有者設定 | `~/.config/weightapp/runtime.env` |
| SQLite | `~/.local/share/weightapp/weightapp.sqlite` |
| 照片 | `~/.local/share/weightapp/photos/` |
| 自動備份 | `~/.local/share/weightapp/backups/<UTC時間>/` |
| OAuth 憑證（若授權） | `~/.config/weightapp/chatgpt.json`，權限 0600 |
| VM host ID | `~/.config/weightapp/host-id` |

```sh
systemctl --user status weightapp
systemctl --user restart weightapp
journalctl --user -u weightapp -n 30
```

iPhone：啟用擁有者帳號的 Tailscale，Safari 開啟部署輸出的 HTTPS 網址。可加入主畫面。「拍照」使用後置相機；「選擇照片」可開相簿。實際相機／HEIC 行為仍需在該 iPhone 驗證。照片上限 10 MB、解碼上限 4,000 萬像素，伺服器驗證 JPEG/PNG/WebP/HEIF 格式（HEIC 取決於 libvips 解碼器），縮到最長邊 1600 px 並重新編碼 JPEG，去除 EXIF。

## ChatGPT 訂閱授權

採用官方 Sign in with ChatGPT OSS 動態註冊（OAuth PKCE、nonce、state、JWKS 身分驗證）與公用 Responses API。此路徑不需要 API Key；不讀取或複製 Codex CLI 的登入憑證。既有 Codex CLI 顯示「已登入 ChatGPT」，不代表 WeightApp 已取得 `chatgpt.tokens.use.direct` 權限。

本 App 只需圖片／文字分析，因此直接呼叫 Responses，沒有 Shell、檔案編輯、MCP 或代理工具。只允許設定裡選定且出現在授權帳號清單中的模型；每次只允許一個辨識，120 秒逾時、不自動重試、不切換備援模型、不購買 Credits。不在背景執行辨識。

若官方同意頁顯示 `3p_delegated_access_policy_denied`，代表該次授權遭組織政策拒絕。請確認選定的帳號與工作區；若使用個人訂閱，應選自己的個人帳戶，仍需實測。組織工作區需由管理員檢查「全域管理員主控台 → 外部存取 → 所有開放原始碼軟體 (OSS) → 使用 ChatGPT 方案」及方案、工作區、個別應用程式限制。不要反覆重開相同授權或自行放寬整個組織權限；App 保持可手動使用。

在 Mac 的專案目錄執行：

```sh
npm run login:chatgpt
```

在同一台 Mac 瀏覽器開啟指令顯示的網址，選帳號及工作區，同意 WeightApp 使用方案額度。loopback callback 只監聽 `127.0.0.1:14559`，請求十分鐘逾時。Token 不回傳前端、不寫入 Git／日誌。回到本機的授權完成頁後，遵循官方 VM 流程安全轉移：

```sh
ssh user@tailnet-host 'umask 077; mkdir -p ~/.config/weightapp'
scp ~/.config/weightapp/chatgpt.json user@tailnet-host:.config/weightapp/chatgpt.json
ssh user@tailnet-host 'chmod 600 ~/.config/weightapp/chatgpt.json'
```

部署腳本已為 VM 產生獨立 host ID，勿複製 Mac 的 `host-id`。轉移後由 VM 獨佔 refresh；Mac 不再使用或刷新那份 session，可刪除本機憑證副本（不呼叫 revoke）。VM 下次重新授權應使用 VM host ID，可透過 SSH loopback forwarding 在 Mac 瀏覽器完成。Token 失效時重新授權，不貼到聊天。辨識模型由伺服器設定管理（`profile.aiModel` 或 `WEIGHTAPP_MODEL`）。

最小 PoC（已授權的主機上）：

```sh
# 使用實際帳號模型目錄中的 slug
node scripts/ai-poc.mjs /secure/path/food.jpg exact-model-slug /secure/path/poc-result.json
```

回傳經 JSON Schema 請求與後端數值／加總驗證的食材陣列、重量、熱量、三大營養素、整餐合計。必須等到 SSE `response.completed` 才視為成功；額度不足、拒絕、串流中斷與格式錯誤都顯示錯誤並保留手動紀錄。只使用同意的方案額度；實際額度、帳號及模型權限由 OpenAI 決定，尚未授權時不宣稱辨識成功。

官方文件：

- [OSS 概覽](https://developers.openai.com/siwc/token-sharing-open-source)
- [註冊與登入](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [自架 VM](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms)
- [模型與推論](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [Codex app-server 替代整合](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [預覽限制](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)

## 舊資料遷移

原版資料位於 Firestore：`artifacts/{appId}/users/{uid}/profile/main`，以及 `health_records/{YYYY-MM}` 或舊的 `{YYYY-MM-DD}` 文件。月文件內用日期作鍵；`weight`、`water` 舊版可能是純數值，新版是含 id/time/value 的陣列，飲食及運動也是陣列。圖片是紀錄內的 Base64，沒有使用 Firebase Storage 上傳。原版 localStorage 的 `wt_records` 與 `wt_profile` 是同步快取。

目前沒有 Firebase 專案設定或可用的原版登入 session，無法證明雲端歷史資料已完整取得。**未刪除 Firebase 雲端資料或原版部署設定，main 保留原碼。** 新版不會自動把任一瀏覽器的快取覆蓋到伺服器。

在原版網址、原本有資料的瀏覽器登入原帳號並等待同步完成，再用開發者主控台執行以下唯讀匯出。原始 localStorage 完全保留；匯出本身不寫入 Firebase：

```js
const data = {
  version: 1,
  exportedAt: new Date().toISOString(),
  records: JSON.parse(localStorage.getItem('wt_records') || '{}'),
  profile: JSON.parse(localStorage.getItem('wt_profile') || '{}').data || {}
};
const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
const a = document.createElement('a'); a.href = url; a.download = 'weightapp-legacy.json'; a.click();
setTimeout(() => URL.revokeObjectURL(url), 10000);
```

這份只代表當前快取；請對照原版歷史月份與日期筆數。若快取不完整，應由 Firebase 擁有者匯出上述該 UID 的文件，依日期鍵整理成同一格式，不應放寬 Firestore 規則或提供 service-account 私鑰給前端。

新版設定 → 匯入 JSON → 預覽日期數 → 確認。預設保留所有現有日期，只新增其他日期，匯入前自動備份。Base64 照片會驗證並移到本機照片目錄，SQLite 只存路徑。重複日期不偷偷合併或覆蓋，先核對備份再手動處理。舊熱量與未知欄位保留，不捏造缺少的營養素。

大於 16 MB 的 JSON 請透過 SSH 放到伺服器私有目錄，先預覽再套用：

```sh
cd ~/weightapp
WEIGHTAPP_DATA=$HOME/.local/share/weightapp node scripts/import-json.mjs /secure/path/weightapp-legacy.json
WEIGHTAPP_DATA=$HOME/.local/share/weightapp node scripts/import-json.mjs /secure/path/weightapp-legacy.json --apply
```

匯入後核對日期、各類筆數、熱量及照片，再保留原匯出和 Firebase 一段時間。若需匯入原設定，請在第一次儲存新版設定前匯入；已有設定時會保留現值。

## 備份與復原

啟動及每 24 小時透過 SQLite backup API 製作一致快照並複製照片，保留最近 14 份。也可按「立即備份」。照片不會隨刪除紀錄即刻移除，以便舊快照仍可還原；目前不做自動垃圾回收。設定 → 匯出 JSON 包含紀錄、設定與照片，便於移機；Base64 僅出現在可攜式匯出檔，不留在資料庫。

備份位於同一台主機，可恢復誤刪，無法防止整顆磁碟損壞；可定期把 JSON 下載到自己的裝置。復原只停這個服務：

```sh
systemctl --user stop weightapp
# 先把目前整個資料目錄另存備份；勿直接覆寫唯一副本。
# 將選定快照的 weightapp.sqlite 與 photos/ 複製到一個新的資料目錄。
# 修改 runtime.env 的 WEIGHTAPP_DATA 指向該目錄，再啟動。
systemctl --user start weightapp
```

移除存取路由只用 `sudo tailscale serve --https=13443 off`；勿 reset 整份 Serve 設定。
