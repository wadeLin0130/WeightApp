import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from './api';
import { preparationLabels } from '../shared/meal-planning.mjs';
export default function MealRecommendation({ onSelect }) {
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [context, setContext] = useState(null), [mode, setMode] = useState('eating_out');
  const [preferences, setPreferences] = useState(''), [adjustment, setAdjustment] = useState('');
  const [meals, setMeals] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const requestRef = useRef(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api('/api/recommendation-context?timeZone=' + encodeURIComponent(timeZone), { signal: controller.signal }).then(data => {
      if (active) setContext(data);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; controller.abort(); requestRef.current?.abort(); };
  }, [timeZone]);
  async function generate(event, refining = false) {
    event.preventDefault(); setBusy(true); setError('');
    const controller = new AbortController(); requestRef.current = controller;
    try {
      const data = await api('/api/ai/recommend', { method: 'POST', signal: controller.signal, body: JSON.stringify({ timeZone, mode, preferences, ...(refining ? { adjustment, previousMeals: meals } : {}) }) });
      if (!controller.signal.aborted) {
        setContext(data.context); setMeals(data.meals);
        if (refining) { setPreferences(previous => previous ? previous + '；' + adjustment : adjustment); setAdjustment(''); }
      }
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <div className="space-y-4">
    {!context && !error && <p className="text-sm">載入中…</p>}
    {context && <>
      <p className="text-sm">剩餘 {context.remaining.calories} kcal · 蛋白質 {context.remaining.protein} g</p>
      <div className="grid grid-cols-2 gap-2">{Object.entries(preparationLabels).map(([key, label]) => <button key={key} type="button" disabled={busy} aria-pressed={mode === key} className={mode === key ? 'primary-button' : 'soft-button'} onClick={() => { if (key === mode) return; setMode(key); setMeals([]); setAdjustment(''); setError(''); }}>{label}</button>)}</div>
      {context.remaining.calories <= 0 ? <p className="text-sm">熱量目標已達成</p> : !meals.length && <form className="space-y-3" onSubmit={generate}>
        <label className="field">需求（選填）<input value={preferences} maxLength={1000} disabled={busy} onChange={e => setPreferences(e.target.value)} placeholder="例如：想吃超商、家裡有雞蛋和豆腐"/></label>
        <button className="primary-button" type="submit" disabled={busy}>{busy && <Loader2 size={18} className="animate-spin"/>}{busy ? '推薦中…' : '產生推薦'}</button>
      </form>}
      {meals.map((meal, index) => <section key={index} className="space-y-3 border-t border-[#d6d0c4] pt-4">
        <h3 className="text-base font-medium">{meal.name}</h3>
        <ul className="space-y-1 text-sm">{meal.items.map((food, i) => <li key={i} className="flex justify-between gap-3"><span>{food.name}</span><span className="shrink-0">{food.grams} g</span></li>)}</ul>
        <p className="text-sm">{meal.totals.calories} kcal · 蛋白質 {meal.totals.protein} g<br/>碳水 {meal.totals.carbs} g · 脂肪 {meal.totals.fat} g</p>
        <button className="soft-button w-full" type="button" disabled={busy} onClick={() => onSelect(meal, context.date)}>選擇這餐</button>
      </section>)}
      {meals.length > 0 && context.remaining.calories > 0 && <form className="space-y-3 border-t border-[#d6d0c4] pt-4" onSubmit={event => generate(event, true)}>
        <label className="field">微調<input value={adjustment} maxLength={1000} disabled={busy} onChange={e => setAdjustment(e.target.value)} placeholder="例如：換掉魚、不用開火、蛋白質再多一點"/></label>
        <button className="primary-button" type="submit" disabled={busy || !adjustment.trim()}>{busy && <Loader2 size={18} className="animate-spin"/>}{busy ? '調整中…' : '調整推薦'}</button>
      </form>}
    </>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </div>;
}
