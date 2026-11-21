export function hasNumber(value) {
  return value !== null && value !== undefined && typeof value !== 'boolean' && !(typeof value === 'string' && !value.trim()) && Number.isFinite(Number(value));
}
export function formatNumber(value, digits = 0) {
  if (!hasNumber(value)) return '—';
  const scale = 10 ** digits;
  const rounded = Math.round((Number(value) + Number.EPSILON) * scale) / scale;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}
export function sumNumbers(records, select) {
  const values = records.map(typeof select === 'function' ? select : r => r[select]).filter(hasNumber);
  return values.length ? values.reduce((total, value) => total + Number(value), 0) : undefined;
}
export function fraction(value, goal) {
  return hasNumber(value) && Number(goal) > 0 ? Math.max(0, Math.min(1, Number(value) / Number(goal))) : 0;
}
export function nutritionSummary(values) {
  return [['calories', '', 'kcal'], ['protein', '蛋白質 ', 'g'], ['carbs', '碳水 ', 'g'], ['fat', '脂肪 ', 'g']].filter(([key]) => hasNumber(values[key])).map(([key, label, unit]) => `${label}${formatNumber(values[key])} ${unit}`).join(' · ');
}
export function strengthSummary(record) {
  return [['weightKg', 'kg', 2], ['sets', '組', 0], ['reps', '次', 0]].filter(([key]) => hasNumber(record[key])).map(([key, unit, digits]) => `${formatNumber(record[key], digits)} ${unit}`).join(' × ');
}

export const calorieValue = record => hasNumber(record.calories) ? record.calories : record.value;
