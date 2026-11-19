import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/calculator.js';
import { formatNumber, hasNumber, sumNumbers, fraction, strengthSummary, nutritionSummary } from '../src/numbers.js';
import { trendData } from '../src/trend-data.js';
test('calculator evaluates decimal arithmetic and precedence without executing code', () => {
  assert.equal(calculate('120+30×2'), 180);
  assert.equal(calculate('120÷3+10'), 50);
  assert.equal(calculate('0.1+0.2'), 0.3);
  assert.equal(calculate('82.7-0.4'), 82.3);
  assert.equal(calculate('1÷8'), 0.125);
  for (const expression of ['1÷0', '2+', '1.2.3', 'NaN', 'globalThis.process.exit()', '2**3']) assert.throws(() => calculate(expression));
});
test('missing values remain missing, explicit zero remains zero, and nutrition display rounds once', () => {
  for (const value of [undefined, null, '', ' ', NaN, Infinity, false]) {
    assert.equal(hasNumber(value), false);
    assert.equal(formatNumber(value), '—');
  }
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber('0'), '0');
  assert.equal(formatNumber(59.800000000007), '60');
  assert.equal(formatNumber(82.30000000001, 1), '82.3');
  assert.equal(formatNumber(2.5, 2), '2.5');
  assert.equal(sumNumbers([{ calories: '' }, {}], 'calories'), undefined);
  assert.equal(sumNumbers([{ calories: 0 }, {}], 'calories'), 0);
  assert.equal(formatNumber(sumNumbers([{ calories: 59.4 }, { calories: 60.4 }], 'calories')), '120');
  assert.equal(nutritionSummary({}), '');
  assert.equal(nutritionSummary({ protein: 0 }), '蛋白質 0 g');
  assert.equal(strengthSummary({ weightKg: '', sets: '', reps: '' }), '');
  assert.equal(strengthSummary({ sets: 3, reps: 8 }), '3 組 × 8 次');
  assert.equal(strengthSummary({ weightKg: 2.5, sets: 3, reps: 8 }), '2.5 kg × 3 組 × 8 次');
});
test('rings clamp their proportions and charts do not invent empty numeric records', () => {
  assert.equal(fraction(undefined, 100), 0);
  assert.equal(fraction(25, 100), .25);
  assert.equal(fraction(100, 100), 1);
  assert.equal(fraction(125, 100), 1);
  assert.equal(fraction(-10, 100), 0);
  assert.equal(fraction(10, 0), 0);
  const data = trendData({ '2026-01-01': { diet: [{ content: '未填數值' }], weight: [{ value: '' }] }, '2026-01-02': { diet: [{ calories: 100.4, protein: 0 }], exercise: [{ type: '重訓' }] } });
  assert.equal(data.weight.length, 0);
  assert.deepEqual(data.calories, [{ date: '2026-01-02', value: 100.4 }]);
  assert.deepEqual(data.protein, [{ date: '2026-01-02', value: 0 }]);
  assert.equal(data.weekly.length, 1);
  assert.equal(data.weekly[0].value, 1);
});
