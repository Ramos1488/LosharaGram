const { verify, cookies } = require('../lib/session');
const { sb, isAdmin, GIFTS } = require('../lib/db');
const enc = encodeURIComponent;
const clean = s => String(s || '').replace(/[^\p{L}\p{N}_ ]/gu, '').slice(0, 40);
const fail = (res, m, c = 400) => res.status(c).json({ error: m });

module.exports = async (req, res) => {
  const s = verify(cookies(req).lg_session);
  if (!s) return fail(res, 'Not signed in', 401);
  const d = req.body || {}, me = enc(s.id), admin = isAdmin(s);
  try {
    switch (d.a) {
      case 'channels': {
        const q = clean(d.q);
        const ids = (await sb(`subs?user_id=eq.${me}&select=channel_id`)).map(x => x.channel_id);
        let f = 'channels?select=id,slug,title,about,owner,verified,verify_requested&order=verified.desc,created_at.desc&limit=50';
        if (d.mine) f += '&or=' + enc(`(owner.eq.${s.id}${ids.length ? ',id.in.(' + ids.join(',') + ')' : ''})`);
        else if (q) f += '&or=' + enc(`(title.ilike.*${q}*,slug.ilike.*${q}*)`);
        const rows = await sb(f), counts = {};
        if (rows.length) (await sb(`subs?channel_id=in.(${rows.map(r => r.id).join(',')})&select=channel_id`)).forEach(x => counts[x.channel_id] = (counts[x.channel_id] || 0) + 1);
        return res.json({ channels: rows.map(r => ({ ...r, subs: counts[r.id] || 0, joined: ids.includes(r.id) })) });
      }
      case 'createChannel': {
        const title = String(d.title || '').trim().slice(0, 64), slug = String(d.slug || '').toLowerCase();
        if (!title) return fail(res, 'Enter a title');
        if (!/^[a-z0-9_]{4,32}$/.test(slug)) return fail(res, 'Handle: 4-32 chars, a-z, 0-9, _');
        const [c] = await sb('channels', { method: 'POST', body: { slug, title, about: String(d.about || '').slice(0, 255), owner: s.id } });
        await sb('subs', { method: 'POST', body: { channel_id: c.id, user_id: s.id }, prefer: 'return=minimal' });
        return res.json({ channel: c });
      }
      case 'posts':
        return res.json({ posts: await sb(`posts?channel_id=eq.${enc(d.channel)}&order=created_at.asc&limit=100&select=id,text,created_at`) });
      case 'post': {
        const [c] = await sb(`channels?id=eq.${enc(d.channel)}&select=owner`);
        if (!c || c.owner !== s.id) return fail(res, 'Only the owner can post', 403);
        const text = String(d.text || '').trim().slice(0, 2000);
        if (!text) return fail(res, 'Empty post');
        const [p] = await sb('posts', { method: 'POST', body: { channel_id: d.channel, author: s.id, text } });
        return res.json({ post: p });
      }
      case 'sub':
        if (d.on) await sb('subs', { method: 'POST', body: { channel_id: d.channel, user_id: s.id }, prefer: 'resolution=ignore-duplicates,return=minimal' });
        else await sb(`subs?channel_id=eq.${enc(d.channel)}&user_id=eq.${me}`, { method: 'DELETE', prefer: 'return=minimal' });
        return res.json({ ok: 1 });
      case 'reqVerify':
        if (d.kind === 'channel') {
          const [c] = await sb(`channels?id=eq.${enc(d.id)}&select=owner,verified`);
          if (!c || c.owner !== s.id) return fail(res, 'Not your channel', 403);
          if (c.verified) return fail(res, 'Already verified');
          await sb(`channels?id=eq.${enc(d.id)}`, { method: 'PATCH', body: { verify_requested: true } });
        } else await sb(`users?id=eq.${me}`, { method: 'PATCH', body: { verify_requested: true } });
        return res.json({ ok: 1 });
      case 'requests':
        if (!admin) return fail(res, 'Admins only', 403);
        return res.json({
          users: await sb('users?verify_requested=eq.true&verified=eq.false&select=id,name,email'),
          channels: await sb('channels?verify_requested=eq.true&verified=eq.false&select=id,title,slug')
        });
      case 'setVerified':
        if (!admin) return fail(res, 'Admins only', 403);
        await sb(`${d.kind === 'channel' ? 'channels' : 'users'}?id=eq.${enc(d.id)}`, { method: 'PATCH', body: { verified: !!d.value, verify_requested: false } });
        return res.json({ ok: 1 });
      case 'grant': {
        if (!admin) return fail(res, 'Admins only', 403);
        const amt = Math.max(-100000, Math.min(100000, parseInt(d.amount) || 0));
        const [u] = await sb(`users?id=eq.${enc(d.id)}&select=coins`);
        if (!u) return fail(res, 'User not found');
        await sb(`users?id=eq.${enc(d.id)}`, { method: 'PATCH', body: { coins: Math.max(0, u.coins + amt) } });
        return res.json({ ok: 1 });
      }
      case 'gifts': {
        const [u] = await sb(`users?id=eq.${me}&select=coins`);
        return res.json({ catalog: GIFTS, coins: u ? u.coins : 0 });
      }
      case 'users': {
        const q = clean(d.q);
        if (q.length < 2) return res.json({ users: [] });
        return res.json({ users: await sb(`users?name=ilike.*${enc(q)}*&id=neq.${me}&select=id,name,avatar,verified&limit=8`) });
      }
      case 'sendGift': {
        const g = GIFTS.find(x => x.id === d.gift);
        if (!g) return fail(res, 'Unknown gift');
        if (!d.to || d.to === s.id) return fail(res, 'Pick another user');
        if (!(await sb(`users?id=eq.${enc(d.to)}&select=id`)).length) return fail(res, 'User not found');
        const [u] = await sb(`users?id=eq.${me}&select=coins`);
        if (!u || u.coins < g.price) return fail(res, 'Not enough coins');
        const upd = await sb(`users?id=eq.${me}&coins=eq.${u.coins}`, { method: 'PATCH', body: { coins: u.coins - g.price } });
        if (!upd.length) return fail(res, 'Try again');
        await sb('gift_log', { method: 'POST', body: { from_user: s.id, from_name: s.name, to_user: d.to, gift: g.id, price: g.price }, prefer: 'return=minimal' });
        return res.json({ coins: u.coins - g.price });
      }
      case 'myGifts':
        return res.json({ gifts: await sb(`gift_log?to_user=eq.${me}&order=created_at.desc&limit=50&select=gift,from_name,created_at`) });
      default: return fail(res, 'Unknown action');
    }
  } catch (e) {
    if (/23505|duplicate/i.test(e.message)) return fail(res, 'Handle already taken', 409);
    console.error(e);
    return fail(res, 'Server error', 500);
  }
};
