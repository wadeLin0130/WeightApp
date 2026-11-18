import { DatabaseSync, backup } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { mkdir, cp, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
export const dataDir = process.env.WEIGHTAPP_DATA || join(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
chmodSync(dataDir, 0o700);
export const photosDir = join(dataDir, 'photos');
mkdirSync(photosDir, { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(join(dataDir, 'weightapp.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS days(date TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);');
export function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
export function state() {
  return { records: Object.fromEntries(db.prepare('SELECT * FROM days ORDER BY date').all().map(r => [r.date, { ...JSON.parse(r.data), _revision: r.revision }])), profile: JSON.parse(db.prepare('SELECT data FROM settings WHERE id=1').get()?.data || '{}') };
}
export function checkDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new Error('日期格式不正確');
}
export async function photo(buffer) {
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new Error('照片上限 10 MB');
  const image = sharp(buffer, { limitInputPixels: 40_000_000, animated: false });
  const meta = await image.metadata();
  if (!['jpeg', 'png', 'webp', 'heif'].includes(meta.format) || meta.pages > 1) throw new Error('請選擇 JPEG、PNG、WebP 或可解碼的 HEIC 照片');
  const output = await image.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const filename = createHash('sha256').update(output).digest('hex') + '.jpg';
  await writeFile(join(photosDir, filename), output, { mode: 0o600 });
  return '/photos/' + filename;
}
export async function normalizeDay(day) {
  if (!day || typeof day !== 'object' || Array.isArray(day)) throw new Error('紀錄格式錯誤');
  const out = { ...day }; delete out._revision;
  for (const category of ['weight', 'water', 'diet', 'exercise']) {
    if (out[category] == null) continue;
    const arr = Array.isArray(out[category]) ? out[category] : ['weight', 'water'].includes(category) ? [{ id: 'legacy', time: '00:00', value: out[category] }] : null;
    if (!arr || arr.length > 500) throw new Error('紀錄格式錯誤或單日筆數過多');
    const ids = new Set();
    out[category] = await Promise.all(arr.map(async record => {
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('紀錄格式錯誤');
      const r = { ...record, id: String(record.id || '') };
      if (!r.id || r.id.length > 100 || ids.has(r.id)) throw new Error('紀錄 ID 重複或缺漏'); ids.add(r.id);
      for (const k of ['value', 'calories', 'protein', 'carbs', 'fat', 'duration', 'weightKg', 'sets', 'reps', 'heartRate']) {
        if (r[k] !== undefined && r[k] !== '') { const n = Number(r[k]); if (!Number.isFinite(n) || n < 0 || n > 100000) throw new Error('數值須為非負數'); r[k] = n; }
      }
      for (const k of ['content', 'type', 'notes', 'assumptions']) if (r[k] != null && (typeof r[k] !== 'string' || r[k].length > 10000)) throw new Error('文字過長或格式錯誤');
      if (r.image?.startsWith('data:image/')) {
        if (!/^data:image\/(jpeg|png|webp|heic|heif);base64,[A-Za-z0-9+/=]+$/.test(r.image)) throw new Error('照片格式錯誤');
        r.image = await photo(Buffer.from(r.image.split(',')[1], 'base64'));
      } else if (r.image && !/^\/photos\/[a-f0-9]{64}\.jpg$/.test(r.image)) throw new Error('照片路徑不正確');
      return r;
    }));
  }
  return out;
}
let backingUp;
export function makeBackup() {
  if (!backingUp) backingUp = (async () => {
    const root = join(dataDir, 'backups'); await mkdir(root, { recursive: true, mode: 0o700 });
    const dir = join(root, new Date().toISOString().replace(/[:.]/g, '-'));
    await mkdir(dir); await backup(db, join(dir, 'weightapp.sqlite'));
    await cp(photosDir, join(dir, 'photos'), { recursive: true });
    const all = (await readdir(root)).sort();
    for (const entry of all.slice(0, -14)) await rm(join(root, entry), { recursive: true });
    return dir;
  })().finally(() => { backingUp = null; });
  return backingUp;
}
