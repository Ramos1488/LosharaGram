const { verify, cookies } = require('../lib/session');
const { ready } = require('../lib/db');

module.exports = async (req, res) => {
  const user = verify(cookies(req).lg_session);
  if (!user) return res.status(401).json({ error: 'Sign in to search for people.' });
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const query = String(req.query.q || '').trim().slice(0, 80);
  if (query.length < 2) return res.json({ users: [] });
  try {
    const connection = await ready();
    const result = await connection.query(
      `SELECT id, name, avatar FROM users
       WHERE id <> $1 AND (name ILIKE $2 OR email ILIKE $2)
       ORDER BY name LIMIT 20`,
      [user.id, `%${query}%`]
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ users: result.rows });
  } catch (error) {
    console.error('User search failed:', error);
    return res.status(503).json({ error: 'Could not search users. Check the database configuration.' });
  }
};
