import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { request } from 'node:http';
import { trendData } from '../src/trend-data.js';
const owner = 'owner@example.test', origin = 'https://private.example.test:13443';
test('private API: identity, origin, CRUD, photos, migration, backup and restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'weightapp-test-'));
  const port = 32000 + Math.floor(Math.random() * 10000);
  let child;
  async function start() {
    child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, WEIGHTAPP_DEV: '0', PORT: String(port), WEIGHTAPP_DATA: dir, WEIGHTAPP_CONFIG: join(dir, 'config'), WEIGHTAPP_OWNER: owner, WEIGHTAPP_ORIGIN: origin }, stdio: ['ignore', 'pipe', 'pipe'] });
    await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('exit', c => reject(new Error('Server exited ' + c))); });
  }
  async function stop() { await new Promise(resolve => { child.once('exit', resolve); child.kill('SIGTERM'); }); }
  async function req(path, method = 'GET', data, extra = {}) {
    return new Promise((resolve, reject) => {
      const r = request({ hostname: '127.0.0.1', port, path, method, headers: { Host: new URL(origin).host, 'Tailscale-User-Login': owner, ...(method !== 'GET' ? { Origin: origin } : {}), ...extra } }, res => {
        let text = ''; res.setEncoding('utf8'); res.on('data', c => { text += c; }); res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(text) }));
      });
      r.on('error', reject); r.end(data === undefined ? undefined : Buffer.isBuffer(data) ? data : JSON.stringify(data));
    });
  }
  try {
    await start();
    assert.equal((await req('/api/state', 'GET', undefined, { 'Tailscale-User-Login': '' })).status, 403);
    assert.equal((await req('/api/export', 'GET', undefined, { 'Tailscale-User-Login': 'other@example.test' })).status, 403);
    assert.equal((await req('/api/profile', 'PUT', {}, { Origin: 'https://evil.test' })).status, 403);
    const invalid = await req('/api/profile', 'PUT', { calorieGoal: -1 }); assert.equal(invalid.status, 400, JSON.stringify(invalid));
    assert.equal((await req('/api/profile', 'PUT', { calorieGoal: 2150, proteinGoal: 140, weightGoal: 90, aiModel: 'test-model' })).status, 200);
    assert.equal((await req('/api/ai/status')).data.model, 'test-model');
    const planning = await req('/api/recommendation-context?timeZone=UTC');
    assert.equal(planning.status, 200);
    assert.deepEqual(planning.data.remaining, { calories: 2150, protein: 140 });
    assert.equal((await req('/api/ai/recommend', 'POST', { timeZone: 'UTC', mode: 'invalid' })).data.error, '請選擇外食或自煮');
    const original = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#ffcc00' } }).jpeg().withExif({ IFD0: { Artist: 'should be removed' } }).toBuffer();
    const uploaded = await req('/api/photos', 'POST', original); assert.equal(uploaded.status, 201);
    const image = uploaded.data.image;
    const metadata = await sharp(await readFile(join(dir, image))).metadata();
    assert.equal(metadata.width, 1600); assert.equal(metadata.exif, undefined);
    assert.equal((await req('/api/photos', 'POST', Buffer.from('not a photo'))).status, 400);
    assert.equal((await req('/api/days/2026-02-30', 'PUT', {})).status, 400);
    const optional = await req('/api/days/2026-11-16', 'PUT', { exercise: [{ id: 'optional', type: '重訓', calories: 400, weightKg: null, sets: '', reps: 0 }] });
    assert.equal(optional.status, 200);
    assert.equal(optional.data.exercise[0].weightKg, null);
    assert.equal(optional.data.exercise[0].sets, '');
    assert.equal(optional.data.exercise[0].reps, 0);
    assert.equal('duration' in optional.data.exercise[0], false);
    let day = { diet: [{ id: 'food', time: '12:30', content: '雞胸肉', calories: 330, protein: 62, carbs: 0, fat: 7, image }], weight: [{ id: 'w', value: 95 }], water: [{ id: 'water', value: 500 }], exercise: [{ id: 'e', type: '深蹲', kind: 'strength', weightKg: 40, sets: 3, reps: 10 }] };
    let saved = await req('/api/days/2026-11-18', 'PUT', day); assert.equal(saved.status, 200); day = saved.data;
    assert.equal((await req('/api/days/2026-11-18', 'PUT', { diet: [] })).status, 409);
    day.diet[0].calories = 300; saved = await req('/api/days/2026-11-18', 'PUT', day); day = saved.data; assert.equal(day.diet[0].calories, 300);
    const exported = await req('/api/export'); assert.match(exported.data.records['2026-11-18'].diet[0].image, /^data:image\/jpeg;base64,/);
    const migration = { records: { '2026-11-18': { weight: 1 }, '2026-11-17': { weight: 96, water: 250, diet: [{ id: 'old', calories: '200', image: exported.data.records['2026-11-18'].diet[0].image }] } } };
    assert.deepEqual((await req('/api/import', 'POST', { data: migration, preview: true })).data.conflicts, ['2026-11-18']);
    assert.equal((await req('/api/import', 'POST', { data: migration })).status, 409);
    assert.equal((await req('/api/import', 'POST', { data: migration, skipExisting: true })).data.imported, 1);

    const move = { from: '2026-11-18', to: '2026-11-17', revision: day._revision, meal: { ...day.diet[0], calories: 280 } };
    const beforeMove = (await req('/api/state')).data.records;
    assert.equal((await req('/api/diet/move', 'POST', { ...move, to: '2026-02-30' })).status, 400);
    assert.equal((await req('/api/diet/move', 'POST', { ...move, revision: move.revision - 1 })).status, 409);
    assert.deepEqual((await req('/api/state')).data.records, beforeMove);
    const moved = await req('/api/diet/move', 'POST', move);
    assert.equal(moved.status, 200);
    assert.deepEqual(moved.data[move.from].diet, []);
    assert.deepEqual(moved.data[move.from].exercise, day.exercise);
    assert.deepEqual(moved.data[move.to].diet, [...beforeMove[move.to].diet, move.meal]);
    assert.equal((await req('/api/diet/move', 'POST', move)).status, 409);
    assert.equal((await req('/api/days/' + move.to, 'PUT', beforeMove[move.to])).status, 409);
    assert.equal((await req('/api/ai/analyze', 'POST', { text: '蛋', model: 'test-model' })).status, 400);
    assert.equal((await req('/api/backup', 'POST')).status, 200);
    assert.ok((await readdir(join(dir, 'backups'))).length);
    await stop(); await start();
    const restored = (await req('/api/state')).data;
    assert.equal(restored.records['2026-11-18'].weight[0].value, 95);
    assert.equal(restored.records['2026-11-17'].water[0].value, 250);
    assert.equal(restored.records['2026-11-16'].exercise[0].weightKg, null);
    assert.equal(restored.profile.calorieGoal, 2150);
    assert.deepEqual(restored.records[move.from].diet, []);
    day = restored.records[move.to];
    assert.deepEqual(day.diet.at(-1), move.meal);
    day.diet = day.diet.filter(meal => meal.id !== move.meal.id);
    assert.equal((await req('/api/days/' + move.to, 'PUT', day)).status, 200);
    assert.deepEqual((await req('/api/state')).data.records[move.to].diet, beforeMove[move.to].diet);
  } finally { if (child?.exitCode === null) await stop(); await rm(dir, { recursive: true, force: true }); }
});
test('seven-day average uses calendar days; missing nutrition stays absent', () => {
  const r = trendData({ '2026-11-01': { weight: 100, diet: [{ calories: 500 }] }, '2026-11-09': { weight: 90, diet: [{ calories: 600, protein: 40 }], exercise: [{}, {}] }, '2026-11-10': { weight: 92 } });
  assert.equal(r.average.at(-1).value, 91);
  assert.equal(r.protein.length, 1);
  assert.equal(r.weekly.at(-1).value, 2);
});
