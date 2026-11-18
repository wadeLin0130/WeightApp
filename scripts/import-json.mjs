// Run locally on the VM as its service user. Never writes to Firebase.
import { readFile } from 'node:fs/promises';
import { db, state, normalizeDay, checkDate, transaction, makeBackup } from '../server/data.mjs';
const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/import-json.mjs /secure/path/export.json [--apply]');
const input = JSON.parse(await readFile(path, 'utf8'));
const records = input.records || input.wt_records;
if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('Invalid WeightApp export');
const dates = Object.keys(records); dates.forEach(checkDate);
const existing = state().records;
const available = dates.filter(d => !existing[d]);
console.log(JSON.stringify({ dates: dates.length, newDates: available.length, skipped: dates.length - available.length }));
if (process.argv.includes('--apply')) {
  await makeBackup();
  const days = [];
  for (const d of available) days.push([d, await normalizeDay(records[d])]);
  transaction(() => {
    for (const [d, day] of days) db.prepare('INSERT INTO days VALUES(?,?,1)').run(d, JSON.stringify(day));
    if (!db.prepare('SELECT 1 FROM settings').get()) db.prepare('INSERT INTO settings VALUES(1,?)').run(JSON.stringify(input.profile || input.wt_profile?.data || {}));
  });
  console.log('Import complete. Existing dates preserved.');
}
db.close();
