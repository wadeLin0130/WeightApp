import { useRef, useState } from 'react';
import { Camera, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from './api';
const emptyFood = () => ({ name: '', grams: '', calories: '', protein: '', carbs: '', fat: '' });
const numeric = ['calories', 'protein', 'carbs', 'fat'];
const labels = { grams: '重量 g', calories: '熱量 kcal', protein: '蛋白質 g', carbs: '碳水 g', fat: '脂肪 g' };
export default function RecordEditor({ category, item, onSave, onFavorite, onDelete, profile }) {
  const diet = category === 'diet', exercise = category === 'exercise';
  const [name, setName] = useState(item?.content || item?.type || '');
  const [image, setImage] = useState(item?.image || null);
  const [foods, setFoods] = useState(item?.items?.length ? item.items : [{ ...emptyFood(), name: item?.content || '', ...Object.fromEntries(numeric.map(k => [k, item?.[k] ?? (k === 'calories' ? item?.value ?? '' : '')])) }]);
  const [assumptions, setAssumptions] = useState(item?.assumptions || '');
  const [details, setDetails] = useState({ value: item?.value ?? '', kind: item?.kind || 'cardio', duration: item?.duration || '', calories: item?.calories ?? '', weightKg: item?.weightKg || '', sets: item?.sets || '', reps: item?.reps || '', heartRate: item?.heartRate || '', notes: item?.notes || '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [favorite, setFavorite] = useState(false);
  const fileRef = useRef(null), cameraRef = useRef(null);
  const totals = Object.fromEntries(numeric.map(k => [k, Math.round(foods.reduce((s, f) => s + (Number(f[k]) || 0), 0) * 10) / 10]));
  const field = (key, title, type = 'number') => <label className="field" key={key}>{title}<input type={type} min={type === 'number' ? '0' : undefined} step="any" value={details[key]} onChange={e => setDetails({ ...details, [key]: e.target.value })} /></label>;
  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setError(''); setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('照片上限 10 MB');
      const data = await api('/api/photos', { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } }); setImage(data.image);
    } catch (e) { setError(e.message); } finally { setBusy(false); e.target.value = ''; }
  }
  async function estimate() {
    setError(''); setBusy(true);
    try {
      const m = await api('/api/ai/analyze', { method: 'POST', body: JSON.stringify({ image, text: name, model: profile.aiModel }) });
      setName(m.name); setFoods(m.items); setAssumptions(m.assumptions.join('\n'));
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if ((diet || exercise) && !name.trim()) throw new Error('請輸入名稱');
      const data = diet ? { content: name, image, items: foods.map(f => ({ ...f, ...Object.fromEntries(['grams', ...numeric].map(k => [k, Number(f[k]) || 0])) })), ...totals, assumptions } : exercise ? { type: name, image, ...details } : { value: details.value };
      if (!diet && !exercise && (!details.value || Number(details.value) <= 0)) throw new Error('請輸入大於零的數值');
      await onSave(data);
      if (diet && favorite) await onFavorite({ ...data, image: null });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <form className="space-y-4" onSubmit={save}>
    {(diet || exercise) && <>
      <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={upload} />
      <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={upload} />
      {image && <div className="relative"><img src={image} alt="餐點或運動照片" className="w-full h-40 object-cover rounded-2xl" /><button type="button" aria-label="移除照片" className="absolute top-2 right-2 bg-white rounded-full p-2" onClick={() => setImage(null)}><Trash2 size={18}/></button></div>}
      <div className="flex gap-2"><button className="soft-button flex-1" type="button" disabled={busy} onClick={() => cameraRef.current.click()}><Camera size={18}/>拍照</button><button className="soft-button flex-1" type="button" disabled={busy} onClick={() => fileRef.current.click()}>選擇照片</button></div>
      <label className="field">{diet ? '餐點名稱／描述' : '運動名稱'}<input value={name} required onChange={e => setName(e.target.value)} placeholder={diet ? '例如：雞胸肉、水煮蛋和馬鈴薯' : '例如：VR BodyCombat、跑步、深蹲'} /></label>
    </>}
    {diet && <>
      <button className="primary-button" type="button" disabled={busy || (!image && !name)} onClick={estimate}>{busy ? <Loader2 className="animate-spin" size={18}/> : null}AI 辨識與估算</button>
      <p className="text-xs leading-relaxed opacity-70">照片估算僅供參考；請確認份量、油與醬汁，修改後再儲存。</p>
      {foods.map((food, i) => <fieldset className="food-row" key={i}><legend>食物 {i + 1}</legend>
        <div className="flex gap-2"><label className="field flex-1">食物／食材<input value={food.name} onChange={e => setFoods(foods.map((f, n) => n === i ? { ...f, name: e.target.value } : f))}/></label><button type="button" aria-label={`移除食物 ${i + 1}`} disabled={foods.length === 1} onClick={() => setFoods(foods.filter((_, n) => n !== i))}><Trash2 size={18}/></button></div>
        <div className="grid grid-cols-2 gap-2">{['grams', ...numeric].map(k => <label key={k} className="field">{labels[k]}<input type="number" min="0" max="100000" step="any" value={food[k]} onChange={e => setFoods(foods.map((f, n) => n === i ? { ...f, [k]: e.target.value } : f))}/></label>)}</div>
      </fieldset>)}
      <button className="soft-button w-full" type="button" onClick={() => setFoods([...foods, emptyFood()])}><Plus size={18}/>新增食材</button>
      <p className="text-sm leading-7">整餐 {totals.calories} kcal · 蛋白質 {totals.protein} g<br/>碳水 {totals.carbs} g · 脂肪 {totals.fat} g</p>
      <label className="field">不確定項目／假設<textarea value={assumptions} onChange={e => setAssumptions(e.target.value)}/></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)}/>同時儲存為常用食物／餐點</label>
    </>}
    {exercise && <>
      <label className="field">運動類型<select value={details.kind} onChange={e => setDetails({ ...details, kind: e.target.value })}><option value="cardio">有氧</option><option value="strength">重訓</option></select></label>
      {details.kind === 'strength' && <div className="grid grid-cols-3 gap-2">{field('weightKg', '重量 kg')}{field('sets', '組數')}{field('reps', '次數／組')}</div>}
      {field('duration', '運動時間（分鐘）')}
      <div className="grid grid-cols-2 gap-2">{field('calories', '活動熱量 kcal（選填）')}{field('heartRate', '平均心率（選填）')}</div>
      {field('notes', '備註', 'text')}
      <p className="text-xs opacity-70">運動熱量只作參考，不加回每日攝取目標。</p>
    </>}
    {!diet && !exercise && field('value', category === 'weight' ? '體重 kg' : '飲水 ml')}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {onDelete && <button type="button" className="soft-button w-full text-red-700" disabled={busy} onClick={async () => { try { setBusy(true); await onDelete(); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>刪除此筆紀錄</button>}
    <button className="primary-button" disabled={busy} type="submit">{busy ? '處理中…' : '確認並儲存紀錄'}</button>
  </form>;
}
