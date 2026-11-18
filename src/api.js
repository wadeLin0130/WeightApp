export async function api(path, options = {}) {
  let r;
  try { r = await fetch(path, { ...options, headers: { ...(typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...options.headers } }); }
  catch { throw new Error('無法連線到伺服器，資料尚未儲存。請保留表單並重試。'); }
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) throw new Error(data?.error || '伺服器暫時無法完成操作，資料尚未儲存。請保留表單並重試。');
  return data;
}
export function download(data, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
