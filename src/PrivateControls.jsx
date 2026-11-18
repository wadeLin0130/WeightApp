import { useEffect, useState } from 'react';
import { api, download } from './api';
export default function PrivateControls({ profile, onChangeSetting }) {
  const [status, setStatus] = useState(null), [models, setModels] = useState([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [importData, setImportData] = useState(null), [preview, setPreview] = useState(null);
  useEffect(() => { api('/api/ai/status').then(setStatus).catch(e => setMessage(e.message)); }, []);
  async function run(fn) { setBusy(true); setMessage(''); try { await fn(); } catch (e) { setMessage(e.message); } finally { setBusy(false); } }
  return <>
    <section className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 space-y-4 border border-[#E8E4DF] dark:border-[#3A3A3A]">
      <h2 className="text-sm font-medium">減脂目標</h2>
      {[['calorieGoal', '每日熱量 kcal', 2150], ['proteinGoal', '每日蛋白質 g', 140], ['weightGoal', '階段體重 kg', 90]].map(([k, label, fallback]) => <label className="field" key={k}>{label}<input type="number" min="1" step="any" value={profile[k] ?? fallback} onChange={e => onChangeSetting({ [k]: e.target.value })}/></label>)}
      <p className="text-xs opacity-70">修改後請按「儲存所有變更」。運動消耗不加回攝取目標。</p>
    </section>
    <section className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 space-y-4 border border-[#E8E4DF] dark:border-[#3A3A3A]">
      <h2 className="text-sm font-medium">ChatGPT 方案</h2>
      <p className="text-sm">{status?.authorized ? `已授權：${status.account || 'ChatGPT 帳號'}` : '尚未授權；可繼續手動紀錄。'}</p>
      {status?.registration && <p className="text-xs break-all opacity-70">工作區授權：{status.registration}</p>}
      <p className="text-xs leading-relaxed opacity-70">僅在按下辨識時使用方案額度。不會購買 Credits，也不會切換付費 API。授權失效時請在 Mac 執行登入指令。</p>
      <button className="soft-button w-full" disabled={busy || !status?.authorized} onClick={() => run(async () => setModels(await api('/api/ai/models')))}>取得此帳號的模型</button>
      <label className="field">辨識模型<select value={profile.aiModel || ''} onChange={e => onChangeSetting({ aiModel: e.target.value })}><option value="">請選擇模型</option>{profile.aiModel && !models.some(m => m.slug === profile.aiModel) && <option value={profile.aiModel}>{profile.aiModel}</option>}{models.map(m => <option key={m.slug} value={m.slug}>{m.name || m.slug}</option>)}</select></label>
      <p className="text-xs opacity-70">模型清單不代表已驗證圖片權限；以辨識成功為準。</p>
    </section>
    <section className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 space-y-3 border border-[#E8E4DF] dark:border-[#3A3A3A]">
      <h2 className="text-sm font-medium">資料與備份</h2>
      <button className="soft-button w-full" disabled={busy} onClick={() => run(async () => { download(await api('/api/export'), 'weightapp-export.json'); setMessage('已匯出紀錄與照片。'); })}>匯出 JSON（含照片）</button>
      <button className="soft-button w-full" disabled={busy} onClick={() => run(async () => { await api('/api/backup', { method: 'POST' }); setMessage('伺服器備份完成。'); })}>立即備份</button>
      <label className="field">匯入舊版／備份 JSON<input type="file" accept="application/json,.json" disabled={busy} onChange={e => { const file = e.target.files[0]; if (file) run(async () => { if (file.size > 16 * 1024 * 1024) throw new Error('JSON 上限 16 MB，較大資料請使用伺服器匯入指令'); const data = JSON.parse(await file.text()); const p = await api('/api/import', { method: 'POST', body: JSON.stringify({ data, preview: true }) }); setImportData(data); setPreview(p); }); e.target.value = ''; }}/></label>
      {preview && <div className="space-y-2 text-sm"><p>共 {preview.dates} 天，可新增 {preview.newDates} 天，重複 {preview.conflicts.length} 天。</p><p>現有日期全部保留，匯入前會自動備份。</p><button className="primary-button" disabled={busy} onClick={() => run(async () => { const r = await api('/api/import', { method: 'POST', body: JSON.stringify({ data: importData, skipExisting: true }) }); setMessage(`已匯入 ${r.imported} 天，保留 ${r.skipped} 天。請重新載入。`); setPreview(null); setImportData(null); })}>確認匯入新日期</button></div>}
      <p className="text-xs leading-relaxed opacity-70">每日自動備份保留最近 14 份。舊紀錄沒有營養素時，保留空白；不會自動補算。</p>
    </section>
    {message && <p role="status" className="text-sm leading-relaxed">{message}</p>}
  </>;
}
