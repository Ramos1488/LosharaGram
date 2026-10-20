const c = require('crypto');
const key = () => process.env.SESSION_SECRET || 'dev-secret-change-me';
const mac = b => c.createHmac('sha256', key()).update(b).digest('base64url');
exports.sign = o => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + mac(b); };
exports.verify = t => {
  if (!t) return null;
  const [b, s] = t.split('.'); if (!b || !s) return null;
  const e = mac(b);
  if (s.length !== e.length || !c.timingSafeEqual(Buffer.from(s), Buffer.from(e))) return null;
  try { const o = JSON.parse(Buffer.from(b, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch { return null; }
};
exports.cookies = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(x => { const i = x.indexOf('='); return [x.slice(0, i), decodeURIComponent(x.slice(i + 1))]; }));
exports.setCookie = (res, n, v, age) => {
  const prev = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [].concat(prev, `${n}=${encodeURIComponent(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`));
};
