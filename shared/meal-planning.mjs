export const preparationLabels = { eating_out: '外食', home_cooking: '自煮' };
const round = n => Math.round(n * 10) / 10;
const amount = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
export function localMoment(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export function recommendationContext(records, profile, timeZone, now = new Date()) {
  if (typeof timeZone !== 'string' || timeZone.length > 100) throw new Error('時區格式錯誤');
  const local = localMoment(timeZone, now);
  const diet = Array.isArray(records[local.date]?.diet) ? records[local.date].diet : [];
  const goals = { calories: amount(profile.calorieGoal) || 2150, protein: amount(profile.proteinGoal) || 140 };
  const consumed = { calories: round(diet.reduce((s, r) => s + amount(r.calories ?? r.value), 0)), protein: round(diet.reduce((s, r) => s + amount(r.protein), 0)) };
  const remaining = { calories: round(Math.max(0, goals.calories - consumed.calories)), protein: round(Math.max(0, goals.protein - consumed.protein)) };
  const meals = diet.map(r => ({ name: String(r.content || '').slice(0, 200), recordedAt: r.time || '', calories: amount(r.calories ?? r.value), protein: amount(r.protein), carbs: amount(r.carbs), fat: amount(r.fat), items: Array.isArray(r.items) ? r.items.map(i => ({ name: String(i.name || '').slice(0, 200), grams: amount(i.grams) })) : [] }));
  return { ...local, timeZone, goals, consumed, remaining, meals };
}
export function mealBudget(context) {
  return { calories: Math.min(context.remaining.calories, 750), protein: Math.min(context.remaining.protein, 50) };
}
