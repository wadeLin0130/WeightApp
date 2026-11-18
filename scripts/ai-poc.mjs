import { readFile, writeFile } from 'node:fs/promises';
import { photo } from '../server/data.mjs';
import { models, analyze, aiStatus } from '../server/ai.mjs';
const imagePath = process.argv[2], model = process.argv[3];
if (!imagePath || !model) { console.log('Usage: node scripts/ai-poc.mjs /path/to/food.jpg exact-model-slug [output.json]'); console.log(await aiStatus()); console.log(await models()); process.exit(1); }
const catalog = await models();
if (!catalog.some(m => m.slug === model)) throw new Error('Choose a model from the authorized account catalog');
const image = await photo(await readFile(imagePath));
const meal = await analyze({ image, model });
const result = { checkedAt: new Date().toISOString(), model, image, ...meal };
if (process.argv[4]) await writeFile(process.argv[4], JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify(result, null, 2));
