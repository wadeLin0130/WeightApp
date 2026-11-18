import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
export const configDir = process.env.WEIGHTAPP_CONFIG || join(homedir(), '.config/weightapp');
export const credentialsPath = join(configDir, 'chatgpt.json');
export async function saveJSON(path, value) {
  await mkdir(configDir, { recursive: true, mode: 0o700 });
  await chmod(configDir, 0o700);
  await writeFile(path + '.tmp', JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(path + '.tmp', path);
}
export async function hostId() {
  const path = join(configDir, 'host-id');
  try { return (await readFile(path, 'utf8')).trim(); } catch {
    const id = `urn:uuid:${randomUUID()}`;
    await mkdir(configDir, { recursive: true, mode: 0o700 });
    await writeFile(path, id, { mode: 0o600, flag: 'wx' });
    return id;
  }
}
export async function readCredentials() {
  try { return JSON.parse(await readFile(credentialsPath, 'utf8')); } catch { return null; }
}
let refreshing;
export async function accessCredentials() {
  const c = await readCredentials();
  if (!c?.scopes?.includes('chatgpt.tokens.use.direct')) throw new Error('請先完成 WeightApp 的 Continue with ChatGPT 授權；仍可手動紀錄。');
  if (c.expires_at > Date.now() + 60000) return c;
  if (!refreshing) refreshing = (async () => {
    const r = await fetch('https://auth.openai.com/api/accounts/oauth/token', {
      method: 'POST', signal: AbortSignal.timeout(20000),
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: c.client_id, refresh_token: c.refresh_token, resource: 'https://api.openai.com/v1' }),
    });
    if (!r.ok) throw new Error('ChatGPT 授權已失效，請重新登入；仍可手動紀錄。');
    const t = await r.json();
    const next = { ...c, ...t, scopes: t.scope ? t.scope.split(' ') : c.scopes, expires_at: Date.now() + t.expires_in * 1000 };
    await saveJSON(credentialsPath, next);
    return next;
  })().finally(() => { refreshing = null; });
  return refreshing;
}
