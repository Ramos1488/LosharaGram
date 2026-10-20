const { verify, cookies } = require('../lib/session');
const { saveUser } = require('../lib/db');
module.exports = async (req, res) => {
  const s = verify(cookies(req).lg_session);
  if (!s) return res.status(401).json({ user: null });
  const admins = (process.env.ADMIN_IDS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  const isAdmin = admins.includes(s.id.toLowerCase()) || (!!s.email && admins.includes(s.email.toLowerCase()));
  res.setHeader('Cache-Control', 'no-store');
  try {
    await saveUser(s);
    return res.json({ user: { id: s.id, name: s.name, email: s.email, avatar: s.avatar, isAdmin } });
  } catch (error) {
    console.error('User sync failed:', error);
    return res.status(503).json({ error: 'Could not connect to the database. Check DATABASE_URL.' });
  }
};
