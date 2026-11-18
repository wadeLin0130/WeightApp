import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { recommendationContext, mealBudget } from '../shared/meal-planning.mjs';
const now = new Date('2026-11-18T10:47:00Z');
const records = { '2026-11-17': { diet: [{ calories: 9999 }] }, '2026-11-18': { diet: [
  { content: '早餐', time: '08:00', calories: 500, protein: 30 },
  { content: '雞肉飯', time: '12:00', calories: 1000, protein: 60 },
], exercise: [{ calories: 1000 }] } };
const context = recommendationContext(records, { calorieGoal: 2000, proteinGoal: 130 }, 'Asia/Taipei', now);
test('uses local date, latest recorded meals and remaining goals without exercise addback', () => {
  assert.equal(context.date, '2026-11-18'); assert.equal(context.time, '18:47');
  assert.deepEqual(context.remaining, { calories: 500, protein: 40 });
  assert.equal(context.meals.length, 2);
  assert.deepEqual(mealBudget(context), { calories: 500, protein: 40 });
  const nextDay = recommendationContext(records, {}, 'Asia/Taipei', new Date('2026-11-18T16:30:00Z'));
  assert.equal(nextDay.date, '2026-11-19'); assert.equal(nextDay.time, '00:30');
  assert.equal(nextDay.consumed.calories, 0);
  assert.throws(() => recommendationContext(records, {}, 'not_a_zone', now));
});
test('keeps recorded times as metadata without choosing a meal type', () => {
  const c = recommendationContext({ '2026-11-18': { diet: [{ content: '補登餐點', time: '18:00', calories: 500 }] } }, {}, 'Asia/Taipei', now);
  assert.equal(c.meals[0].recordedAt, '18:00');
  assert.equal(Object.hasOwn(c, 'mealType'), false);
  assert.equal(Object.hasOwn(c.meals[0], 'mealType'), false);
});
const dir = await mkdtemp(join(tmpdir(), 'weightapp-recommend-'));
process.env.WEIGHTAPP_DATA = dir;
process.env.WEIGHTAPP_CONFIG = join(dir, 'config');
await mkdir(process.env.WEIGHTAPP_CONFIG);
await writeFile(join(process.env.WEIGHTAPP_CONFIG, 'chatgpt.json'), JSON.stringify({ scopes: ['chatgpt.tokens.use.direct'], expires_at: Date.now() + 3600000, access_token: 'test-only-token' }));
const { recommend, validateRecommendations } = await import('../server/ai.mjs');
const { db, state } = await import('../server/data.mjs');
after(async () => { db.close(); await rm(dir, { recursive: true, force: true }); });
const meal = name => ({ name, items: [{ name: '雞胸肉', grams: 120, calories: 200, protein: 35, carbs: 0, fat: 6 }], totals: { calories: 200, protein: 35, carbs: 0, fat: 6 } });
test('validates recommendation totals, calorie budget and portion sizes', () => {
  assert.equal(validateRecommendations({ meals: [meal('A'), meal('B')] }, { calories: 500 }).length, 2);
  assert.throws(() => validateRecommendations({ meals: [meal('A'), meal('B')] }, { calories: 199 }));
  const wrong = meal('bad'); wrong.totals.calories = 500;
  assert.throws(() => validateRecommendations({ meals: [wrong, meal('B')] }, { calories: 600 }));
  const huge = meal('huge'); huge.items[0].grams = 5000;
  assert.throws(() => validateRecommendations({ meals: [huge, meal('B')] }, { calories: 600 }));
});
test('passes preferences and consumed meals, requires completed inference, never writes or falls back', async t => {
  const before = state(), requests = [];
  let fail = false;
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/models')) return Response.json({ models: [{ slug: 'test-model', visibility: 'list' }] });
    const result = { meals: [meal('雞胸餐'), meal('雞胸沙拉')] };
    const events = [{ type: 'response.output_text.delta', delta: JSON.stringify(result) }, fail ? { type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } } : { type: 'response.completed', response: { status: 'completed' } }];
    return new Response(events.map(e => 'data: ' + JSON.stringify(e) + '\n\n').join(''), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const result = await recommend({ context, mode: 'eating_out', preferences: '想吃超商，不吃豆腐', model: 'test-model' });
  assert.equal(result.mode, 'eating_out'); assert.equal(result.meals.length, 2);
  const body = JSON.parse(requests.at(-1).options.body);
  assert.match(body.input[0].content[0].text, /想吃超商，不吃豆腐/);
  assert.match(body.input[0].content[0].text, /雞肉飯/);
  assert.equal(body.store, false); assert.equal(body.stream, true); assert.deepEqual(body.tools, []);
  assert.match(body.input[0].content[0].text, /用餐方式：外食/);
  const refined = await recommend({ context, mode: 'eating_out', preferences: '想吃超商，不吃豆腐', adjustment: '換掉雞肉，蛋白質多一點', previousMeals: result.meals, model: 'test-model' });
  assert.equal(refined.meals.length, 2);
  const refinementBody = JSON.parse(requests.at(-1).options.body);
  assert.match(refinementBody.input[0].content[0].text, /換掉雞肉，蛋白質多一點/);
  assert.match(refinementBody.input[0].content[0].text, /雞胸沙拉/);
  await recommend({ context, mode: 'home_cooking', preferences: '家裡有雞蛋和馬鈴薯', model: 'test-model' });
  assert.match(JSON.parse(requests.at(-1).options.body).input[0].content[0].text, /用餐方式：自煮/);
  await assert.rejects(recommend({ context, mode: 'invalid', model: 'test-model' }), /外食或自煮/);
  assert.deepEqual(state(), before);
  fail = true; const previous = requests.length;
  await assert.rejects(recommend({ context, mode: 'eating_out', model: 'test-model' }), error => error.code === 'subscription_sharing_usage_limit_exceeded' && error.message === 'AI 額度已用完，請稍後再試');
  assert.equal(requests.length - previous, 2); // One catalog request and one inference, no retry.
  assert.deepEqual(state(), before);
  const noBudget = { ...context, remaining: { calories: 0, protein: 0 } };
  const count = requests.length;
  assert.deepEqual((await recommend({ context: noBudget, mode: 'home_cooking' })).meals, []);
  assert.equal(requests.length, count);
});
