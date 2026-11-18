const dayArray = (day, key) => Array.isArray(day?.[key]) ? day[key] : day?.[key] != null ? [{ value: day[key] }] : [];
export const dateString = d => d.toISOString().slice(0, 10);
export function trendData(records) {
  const dates = Object.keys(records).sort();
  const weight = dates.flatMap(date => { const a = dayArray(records[date], 'weight'); return a.length ? [{ date, value: Number(a.at(-1).value) }] : []; });
  const average = weight.map(p => { const cutoff = new Date(p.date + 'T00:00:00Z'); cutoff.setUTCDate(cutoff.getUTCDate() - 6); const a = weight.filter(w => w.date >= dateString(cutoff) && w.date <= p.date); return { date: p.date, value: a.reduce((s, w) => s + w.value, 0) / a.length }; });
  const calories = [], protein = [], weekly = {};
  for (const date of dates) {
    const foods = dayArray(records[date], 'diet');
    if (foods.length) { calories.push({ date, value: foods.reduce((s, f) => s + Number(f.calories ?? f.value ?? 0), 0) }); if (foods.some(f => f.protein != null)) protein.push({ date, value: foods.reduce((s, f) => s + Number(f.protein || 0), 0) }); }
    const d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
    const monday = dateString(d); weekly[monday] = (weekly[monday] || 0) + dayArray(records[date], 'exercise').length;
  }
  return { weight, average, calories, protein, weekly: Object.entries(weekly).map(([date, value]) => ({ date, value })) };
}
