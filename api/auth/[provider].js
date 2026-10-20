const crypto = require('crypto');
const { sign, cookies, setCookie } = require('../../lib/session');
const J = (u, h) => fetch(u, { headers: h }).then(r => r.json());
const P = {
  github: {
    auth: 'https://github.com/login/oauth/authorize', token: 'https://github.com/login/oauth/access_token', scope: 'read:user user:email',
    profile: async t => {
      const h = { Authorization: 'Bearer ' + t, 'User-Agent': 'LosharaGram' };
      const u = await J('https://api.github.com/user', h);
      const l = await J('https://api.github.com/user/emails', h);
      const e = Array.isArray(l) ? l.find(x => x.primary && x.verified) : null;
      return { id: 'github:' + u.id, name: u.name || u.login, email: e ? e.email : null, avatar: u.avatar_url };
    }
  },
  discord: {
    auth: 'https://discord.com/api/oauth2/authorize', token: 'https://discord.com/api/oauth2/token', scope: 'identify email',
    profile: async t => {
      const u = await J('https://discord.com/api/users/@me', { Authorization: 'Bearer ' + t });
      return { id: 'discord:' + u.id, name: u.global_name || u.username, email: u.verified ? u.email : null,
        avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null };
    }
  },
  google: {
    auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', scope: 'openid email profile',
    profile: async t => {
      const u = await J('https://openidconnect.googleapis.com/v1/userinfo', { Authorization: 'Bearer ' + t });
      return { id: 'google:' + u.sub, name: u.name, email: u.email_verified ? u.email : null, avatar: u.picture };
    }
  }
};
module.exports = async (req, res) => {
  const name = req.query.provider, p = P[name];
  if (!p) return res.status(404).end('Unknown provider');
  const K = name.toUpperCase(), id = process.env[K + '_CLIENT_ID'], secret = process.env[K + '_CLIENT_SECRET'];
  if (!id || !secret) return res.status(500).end('Missing ' + K + '_CLIENT_ID / ' + K + '_CLIENT_SECRET');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirect = `${proto}://${host}/api/auth/${name}`;
  const { code, state } = req.query;
  if (!code) {
    const s = crypto.randomBytes(16).toString('hex');
    setCookie(res, 'oauth_state', s, 600);
    const q = new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: 'code', scope: p.scope, state: s });
    res.writeHead(302, { Location: p.auth + '?' + q }); return res.end();
  }
  if (!state || state !== cookies(req).oauth_state) return res.status(400).end('Bad state');
  const r = await fetch(p.token, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri: redirect, grant_type: 'authorization_code' })
  });
  const t = await r.json();
  if (!t.access_token) return res.status(400).end('Token exchange failed');
  const u = await p.profile(t.access_token);
  setCookie(res, 'lg_session', sign({ ...u, exp: Date.now() + 30 * 864e5 }), 30 * 86400);
  res.writeHead(302, { Location: '/' }); res.end();
};
