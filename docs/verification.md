# 私人版驗證紀錄

檢查日期：2026-11-18。

原版：React 19 / Vite 8 / Tailwind 4，單一 App.jsx，Firestore 依 UID 儲存 profile 及月／日文件，本地快取 wt_records、wt_profile；照片是紀錄內的 Base64。原 Gemini 代理只回傳單一熱量值，且會重試多次。新版移除執行路徑與套件依賴，原碼保留在 main。

Linux 實測：Node 22.22.1、npm 9.2.0、Docker 29.6.1（本 App 未使用）、Tailscale 1.104.5、Codex CLI 0.160.0（已登入 ChatGPT），根磁碟約 268 GB 可用。沒有找到既有 WeightApp 部署。新建獨立 user service，後端只監聽 127.0.0.1:3107。新增 HTTPS 13443 Serve 路由；逐項比對原有六條路由均未變更，Funnel 未啟用。正式安裝使用 npm ci --omit=dev，audit 回報零漏洞；建置工具鏈尚有 picomatch 間接依賴的五個高風險通報，未強制降版 Vite。正式端不安裝 Vite 或該依賴。

| 項目 | 證據與結果 |
| --- | --- |
| 建置、lint | npm run build、npm run lint 通過 |
| 隔離整合測試 | Node 內建 test，暫存 SQLite；身分與 Origin 拒絕、飲食新增修改刪除、版本衝突、舊數值格式與 Base64 匯入、備份及重啟保存通過 |
| 照片處理 | 測試 JPEG 2000px 縮到 1600px，原 EXIF Artist 已移除；非圖片拒絕 |
| 趨勢計算 | 七個日曆日移動平均及缺少蛋白質資料不補值測試通過 |
| 正式首頁 | 透過 Tailscale HTTPS 200，Chrome 顯示 2150 kcal／140 g／90 kg 預設 |
| 正式飲食流程 | Chrome 新增測試餐、修改 78→80 kcal，重新啟動服務後仍顯示 80；最後在 UI 刪除成功 |
| 正式身體／運動 | 經 HTTPS API 新增測試體重、飲水、重訓重量／組／次與心率；只重啟 WeightApp，讀回值相符；測試資料已清理 |
| SQLite | 正式庫 integrity_check = ok |
| 未授權保護 | 隔離測試缺少／錯誤擁有者的資料及匯出請求回 403；正式端未帶 Serve 身分的 localhost 請求回 403。未借用另一台未授權實體裝置測試 |
| iPhone Safari | 已提供實際 HTTPS 網址，等待使用者手機開啟與拍照／選圖確認；不可聲稱實機通過 |
| AI 授權與照片 PoC | 官方 SIWC flow 實際到達帳號、工作區與最終方案額度同意畫面；等待擁有者完成。尚無 WeightApp 方案 Token，未執行成功照片 PoC，不宣稱模型或圖片權限已確認 |
| Firebase 歷史遷移 | 缺少原專案環境設定／原版登入 session，尚未取得完整舊紀錄；已提供唯讀快取匯出、預覽、備份、保留現有日期的 JSON 匯入。未刪除雲端資料 |

官方文件已核對：SIWC OSS 概覽、登入、VM、模型與推論、app-server、preview limitations。採用直接 Responses OAuth 而非 app-server，因為餐點分析不需要任何代理執行工具；無 API key、無自動購買、無付費 fallback。只有 SSE 完成且資料驗證通過才回傳估算，仍需使用者確認儲存。未安裝本機 LLM。
