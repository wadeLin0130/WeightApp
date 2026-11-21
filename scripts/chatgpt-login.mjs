import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { hostId, readCredentials, saveJSON, credentialsPath } from '../server/credentials.mjs';
const random = () => randomBytes(32).toString('base64url');
const state = random(), nonce = random(), verifier = random();
const id = await hostId();
const old = await readCredentials();
const redirect = 'http://127.0.0.1:14559/auth/callback';
const discovery = await (await fetch('https://auth.openai.com/.well-known/openid-configuration')).json();
const url = new URL('https://auth.openai.com/api/accounts/authorize');
url.search = new URLSearchParams({ client_id: old?.client_id || 'dynamic_agent_client', ...(old?.client_id ? {} : { agent_name_hint: 'WeightApp' }), ext_agent_host_id: id, redirect_uri: redirect, response_type: 'code', scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct', resource: 'https://api.openai.com/v1', state, nonce, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') }).toString();
const server = createServer(async (req, res) => {
  const cb = new URL(req.url, redirect);
  if (cb.pathname !== '/auth/callback') { res.writeHead(404).end(); return; }
  if (cb.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid OAuth state'); return; }
  try {
    if (cb.searchParams.has('error')) throw new Error('授權未完成');
    const client_id = cb.searchParams.get('client_id') || old?.client_id;
    if (!client_id || client_id === 'dynamic_agent_client' || (old && old.client_id !== client_id)) throw new Error('Client registration mismatch');
    const code = cb.searchParams.get('code');
    if (!code) throw new Error('Missing authorization code');
    const r = await fetch('https://auth.openai.com/api/accounts/oauth/token', { method: 'POST', signal: AbortSignal.timeout(20000), body: new URLSearchParams({ grant_type: 'authorization_code', client_id, code, code_verifier: verifier, redirect_uri: redirect, resource: 'https://api.openai.com/v1' }) });
    if (!r.ok) throw new Error(`Token exchange failed (${r.status})`);
    const t = await r.json();
    const { payload } = await jwtVerify(t.id_token, createRemoteJWKSet(new URL(discovery.jwks_uri)), { issuer: discovery.issuer, audience: client_id, requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5 });
    if (payload.nonce !== nonce || (old && payload.sub !== old.subject)) throw new Error('Identity verification failed');
    const scopes = (t.scope || '').split(' ');
    if (!scopes.includes('chatgpt.tokens.use.direct')) throw new Error('未同意使用 ChatGPT 方案額度');
    await saveJSON(credentialsPath, { ...t, client_id, subject: payload.sub, email: payload.email, issuer: payload.iss, scopes, expires_at: Date.now() + t.expires_in * 1000 });
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('WeightApp 授權完成，可以關閉此頁。');
    console.log('WeightApp authorization saved securely.');
  } catch (e) { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end(e.message); console.error(e.message); }
  finally { server.close(); clearTimeout(timeout); }
});
server.listen(14559, '127.0.0.1', () => console.log('Continue with ChatGPT:\n' + url));
const timeout = setTimeout(() => { server.close(); console.error('OAuth attempt expired; run again.'); }, 10 * 60000);
