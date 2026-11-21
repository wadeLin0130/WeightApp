import { hasNumber, sumNumbers } from './numbers.js';
const dayArray = (day, key) => Array.isArray(day?.[key]) ? day[key] : day?.[key] != null ? [{ value: day[key] }] : [];
export const dateString = d => d.toISOString().slice(0, 10);
export function trendData(records) {
  const dates = Object.keys(records).sort();
  const weight = dates.flatMap(date => { const a = dayArray(records[date], 'weight'); return a.length && hasNumber(a.at(-1).value) ? [{ date, value: Number(a.at(-1).value) }] : []; });
  const average = weight.map(p => { const cutoff = new Date(p.date + 'T00:00:00Z'); cutoff.setUTCDate(cutoff.getUTCDate() - 6); const a = weight.filter(w => w.date >= dateString(cutoff) && w.date <= p.date); return { date: p.date, value: a.reduce((s, w) => s + w.value, 0) / a.length }; });
  const calories = [], protein = [], weekly = {};
  for (const date of dates) {
    const foods = dayArray(records[date], 'diet');
    const intake = sumNumbers(foods, r => hasNumber(r.calories) ? r.calories : r.value), p = sumNumbers(foods, 'protein');
    if (hasNumber(intake)) calories.push({ date, value: intake });
    if (hasNumber(p)) protein.push({ date, value: p });
    const exerciseCount = dayArray(records[date], 'exercise').length;
    if (!exerciseCount) continue;
    const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    const monday = dateString(d); weekly[monday] = (weekly[monday] || 0) + exerciseCount;
  }
  return { weight, average, calories, protein, weekly: Object.entries(weekly).map(([date, value]) => ({ date, value })) };
}
