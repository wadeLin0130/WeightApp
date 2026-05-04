export function getArrayData(data, key) {
  if (!data || data[key] === undefined) return [];
  if (Array.isArray(data[key])) return data[key];
  if (key === 'weight' || key === 'water') return [{ id: 'legacy', time: '00:00', value: data[key] }];
  return [];
}
