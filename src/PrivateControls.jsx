import { useState } from 'react';
import { api, download } from './api';
import NumericField from './NumericField';
export default function PrivateControls({ profile, onChangeSetting }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [importData, setImportData] = useState(null), [preview, setPreview] = useState(null);
  async function run(fn) { setBusy(true); setMessage(''); try { await fn(); } catch (e) { setMessage(e.message); } finally { setBusy(false); } }
  return <>
    <section className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 space-y-4 border border-[#E8E4DF] dark:border-[#3A3A3A]">
      <h2 className="text-sm font-medium">減脂目標</h2>
      {[['calorieGoal', '每日熱量 kcal', 2150], ['proteinGoal', '每日蛋白質 g', 140], ['weightGoal', '階段體重 kg', 90]].map(([key, label, fallback]) => <NumericField key={key} label={label} min={1} max={10000} precision={key === 'weightGoal' ? 1 : 0} value={profile[key] ?? fallback} onChange={value => onChangeSetting({ [key]: value })}/>)}
    </section>
    <section className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 space-y-3 border border-[#E8E4DF] dark:border-[#3A3A3A]">
      <h2 className="text-sm font-medium">資料與備份</h2>
      <button className="soft-button w-full" disabled={busy} onClick={() => run(async () => { download(await api('/api/export'), 'weightapp-export.json'); setMessage('已匯出'); })}>匯出資料</button>
      <button className="soft-button w-full" disabled={busy} onClick={() => run(async () => { await api('/api/backup', { method: 'POST' }); setMessage('已備份'); })}>立即備份</button>
      <label className="field">匯入資料<input type="file" accept="application/json,.json" disabled={busy} onChange={e => { const file = e.target.files[0]; if (file) run(async () => { if (file.size > 16 * 1024 * 1024) throw new Error('檔案超過 16 MB'); const data = JSON.parse(await file.text()); const p = await api('/api/import', { method: 'POST', body: JSON.stringify({ data, preview: true }) }); setImportData(data); setPreview(p); }); e.target.value = ''; }}/></label>
      {preview && <div className="space-y-2 text-sm"><p>共 {preview.dates} 天，可新增 {preview.newDates} 天，重複 {preview.conflicts.length} 天。</p><button className="primary-button" disabled={busy} onClick={() => run(async () => { const r = await api('/api/import', { method: 'POST', body: JSON.stringify({ data: importData, skipExisting: true }) }); setMessage(`已匯入 ${r.imported} 天，保留 ${r.skipped} 天。`); setPreview(null); setImportData(null); })}>匯入（保留重複日期）</button></div>}
    </section>
    {message && <p role="status" className="text-sm leading-relaxed">{message}</p>}
  </>;
}
