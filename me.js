const { verify, cookies } = require('../lib/session');
const { sb, isAdmin } = require('../lib/db');
module.exports = async (req, res) => {
  const s = verify(cookies(req).lg_session);
  if (!s) return res.status(401).json({ user: null });
  res.setHeader('Cache-Control', 'no-store');
  const user = { id: s.id, name: s.name, email: s.email, avatar: s.avatar, isAdmin: isAdmin(s), verified: false, coins: 0, verify_requested: false };
  try {
    const [row] = await sb('users?on_conflict=id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=representation', body: { id: s.id, name: s.name, email: s.email, avatar: s.avatar } });
    Object.assign(user, { verified: row.verified, coins: row.coins, verify_requested: row.verify_requested });
  } catch (e) { user.dbError = true; }
  res.json({ user });
};
