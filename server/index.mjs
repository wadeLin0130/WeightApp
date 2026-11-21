import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { db, state, transaction, normalizeDay, checkDate, photo, photosDir, makeBackup } from './data.mjs';
import { recommendationContext } from '../shared/meal-planning.mjs';
import { analyze, models, aiStatus, recommend } from './ai.mjs';
const port = Number(process.env.PORT || 3107);
const origin = process.env.WEIGHTAPP_ORIGIN;
const owner = process.env.WEIGHTAPP_OWNER;
const dev = process.env.WEIGHTAPP_DEV === '1';
if (!dev && (!origin?.startsWith('https://') || !owner)) throw new Error('Set WEIGHTAPP_ORIGIN and WEIGHTAPP_OWNER before starting');
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
async function body(req, limit = 16 * 1024 * 1024) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('檔案超過大小限制'); chunks.push(c); }
  return Buffer.concat(chunks);
}
const parse = async req => JSON.parse((await body(req)).toString());
const readDay = db.prepare('SELECT data,revision FROM days WHERE date=?');
const upsertDay = db.prepare('INSERT INTO days VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET data=excluded.data,revision=excluded.revision');
const revisionConflict = { error: '另一頁已修改此日紀錄，請重新載入後再試。' };

function writeDay(date, day, currentRevision) {
  const revision = currentRevision + 1;
  upsertDay.run(date, JSON.stringify(day), revision);
  return { ...day, _revision: revision };
}

const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  const url = new URL(req.url, 'http://localhost');
  try {
    // Only Tailscale Serve on loopback is trusted to supply identity headers.
    if (!dev && (req.headers['tailscale-user-login'] !== owner || req.headers.host !== new URL(origin).host)) return json(res, 403, { error: '此裝置未獲授權，請使用擁有者的 Tailscale 帳號連線。' });
    if (!['GET', 'HEAD'].includes(req.method) && (req.headers.origin !== (dev ? `http://${req.headers.host}` : origin))) return json(res, 403, { error: '來源驗證失敗，請從 App 操作。' });
    if (url.pathname === '/api/state' && req.method === 'GET') return json(res, 200, state());
    if (url.pathname === '/api/profile' && req.method === 'PUT') {
      const p = await parse(req);
      if (!p || typeof p !== 'object' || Array.isArray(p) || JSON.stringify(p).length > 200000) throw new Error('設定格式不正確');
      for (const k of ['calorieGoal', 'proteinGoal', 'weightGoal']) if (p[k] !== undefined && (!Number.isFinite(Number(p[k])) || Number(p[k]) <= 0 || Number(p[k]) > 10000)) throw new Error('目標必須是大於零的數值');
      transaction(() => db.prepare('INSERT INTO settings VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(JSON.stringify(p)));
      return json(res, 200, p);
    }
    if (url.pathname.startsWith('/api/days/') && req.method === 'PUT') {
      const date = url.pathname.slice('/api/days/'.length); checkDate(date);
      const input = await parse(req); const day = await normalizeDay(input);
      const result = transaction(() => {
        const revision = readDay.get(date)?.revision || 0;
        if ((input._revision || 0) !== revision) return null;
        return writeDay(date, day, revision);
      });
      return json(res, result ? 200 : 409, result || revisionConflict);
    }
    if (url.pathname === '/api/diet/move' && req.method === 'POST') {
      const { from, to, revision, meal } = await parse(req);
      checkDate(from); checkDate(to);
      if (from === to) throw new Error('請選擇不同日期');
      const { diet: [updated] } = await normalizeDay({ diet: [meal] });
      const result = transaction(() => {
        const source = readDay.get(from);
        if (!source || source.revision !== revision) return null;
        const sourceDay = JSON.parse(source.data);
        const original = sourceDay.diet?.find(record => record.id === updated.id);
        if (!original) return null;

        const destination = readDay.get(to);
        const destinationDay = destination ? JSON.parse(destination.data) : {};
        const meals = destinationDay.diet || [];
        if (meals.length >= 500) throw new Error('目標日期的飲食紀錄已達上限');
        const id = meals.some(record => record.id === updated.id) ? randomUUID() : updated.id;
        destinationDay.diet = [...meals, { ...updated, id, time: original.time }];
        sourceDay.diet = sourceDay.diet.filter(record => record.id !== updated.id);
        return {
          [from]: writeDay(from, sourceDay, source.revision),
          [to]: writeDay(to, destinationDay, destination?.revision || 0),
        };
      });
      return json(res, result ? 200 : 409, result || revisionConflict);
    }
    if (url.pathname === '/api/photos' && req.method === 'POST') return json(res, 201, { image: await photo(await body(req, 10 * 1024 * 1024)) });
    if (url.pathname === '/api/export' && req.method === 'GET') {
      const data = { version: 1, exportedAt: new Date().toISOString(), ...state() };
      for (const day of Object.values(data.records)) for (const category of ['diet', 'exercise']) for (const r of day[category] || []) if (r.image) r.image = 'data:image/jpeg;base64,' + (await readFile(join(photosDir, r.image.split('/').pop()))).toString('base64');
      res.setHeader('Content-Disposition', 'attachment; filename="weightapp-export.json"');
      return json(res, 200, data);
    }
    if (url.pathname === '/api/import' && req.method === 'POST') {
      const input = await parse(req); const data = input.data;
      const records = data?.records || data?.wt_records;
      if (!records || typeof records !== 'object' || Array.isArray(records) || Object.keys(records).length > 10000) throw new Error('請匯入 WeightApp 匯出的 JSON');
      const dates = Object.keys(records); dates.forEach(checkDate);
      const current = state(); const conflicts = dates.filter(d => current.records[d]);
      if (input.preview) return json(res, 200, { dates: dates.length, newDates: dates.length - conflicts.length, conflicts });
      if (conflicts.length && !input.skipExisting) return json(res, 409, { error: '有重複日期，請先預覽並選擇保留現有日期。' });
      await makeBackup();
      const prepared = [];
      for (const d of dates) if (!conflicts.includes(d)) prepared.push([d, await normalizeDay(records[d])]);
      transaction(() => {
        for (const [d, day] of prepared) db.prepare('INSERT INTO days VALUES(?,?,1)').run(d, JSON.stringify(day));
        if (!db.prepare('SELECT 1 FROM settings').get()) {
          const p = data.profile || data.wt_profile?.data || {};
          db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify(p));
        }
      });
      return json(res, 200, { imported: prepared.length, skipped: conflicts.length });
    }
    if (url.pathname === '/api/backup' && req.method === 'POST') { await makeBackup(); return json(res, 200, { ok: true }); }
    if (url.pathname === '/api/ai/status' && req.method === 'GET') return json(res, 200, await aiStatus());
    if (url.pathname === '/api/ai/models' && req.method === 'GET') return json(res, 200, await models());
    if (url.pathname === '/api/recommendation-context' && req.method === 'GET') {
      const data = state();
      return json(res, 200, recommendationContext(data.records, data.profile, url.searchParams.get('timeZone')));
    }
    if (url.pathname === '/api/ai/recommend' && req.method === 'POST') {
      const input = await parse(req), data = state();
      const context = recommendationContext(data.records, data.profile, input.timeZone);
      const controller = new AbortController();
      res.once('close', () => controller.abort());
      return json(res, 200, await recommend({ context, mode: input.mode, preferences: input.preferences, adjustment: input.adjustment, previousMeals: input.previousMeals, model: data.profile.aiModel || process.env.WEIGHTAPP_MODEL, signal: controller.signal }));
    }
    if (url.pathname === '/api/ai/analyze' && req.method === 'POST') {
      const input = await parse(req); return json(res, 200, await analyze({ ...input, model: input.model || state().profile.aiModel || process.env.WEIGHTAPP_MODEL }));
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: '找不到此操作' });
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: '不支援此操作' });
    let path;
    if (url.pathname.startsWith('/photos/')) {
      if (!/^\/photos\/[a-f0-9]{64}\.jpg$/.test(url.pathname)) return json(res, 404, { error: '找不到照片' });
      path = join(photosDir, url.pathname.split('/').pop());
    } else {
      const root = resolve('dist'); path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!path.startsWith(root + '/') && path !== root) return json(res, 404, { error: '找不到檔案' });
      try { if (!(await stat(path)).isFile()) path = join(root, 'index.html'); } catch { path = join(root, 'index.html'); }
    }
    const data = await readFile(path);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : data);
  } catch (e) {
    if (res.destroyed) return;
    // Never log request bodies, credentials or upstream error payloads.
    json(res, e.code === 'ENOENT' ? 404 : 400, { error: e.code === 'ENOENT' ? '找不到檔案' : e.message?.startsWith('ChatGPT') || e.message?.startsWith('AI ') || !e.code ? e.message : '無法完成操作，請稍後再試' });
  }
});
server.requestTimeout = 130000;
server.listen(port, '127.0.0.1', () => console.log(`WeightApp listening on 127.0.0.1:${port}`));
makeBackup().catch(() => console.error('WeightApp backup failed'));
const timer = setInterval(() => makeBackup().catch(() => console.error('WeightApp backup failed')), 24 * 3600000); timer.unref();
process.on('SIGTERM', () => server.close(() => { db.close(); process.exit(0); }));
