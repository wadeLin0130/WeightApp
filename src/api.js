export async function api(path, options = {}) {
  const r = await fetch(path, { ...options, headers: { ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || '操作失敗，請稍後再試');
  return data;
}
export function download(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
