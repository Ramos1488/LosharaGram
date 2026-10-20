const { verify, cookies } = require('../../../lib/session');
const { ready } = require('../../../lib/db');

module.exports = async (req, res) => {
  const user = verify(cookies(req).lg_session);
  if (!user) return res.status(401).json({ error: 'Sign in to read messages.' });
  const chatId = String(req.query.id || '');
  if (!/^\d+$/.test(chatId)) return res.status(400).json({ error: 'Invalid chat.' });

  try {
    const connection = await ready();
    const member = await connection.query(
      'SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, user.id]
    );
    if (!member.rowCount) return res.status(404).json({ error: 'Chat not found.' });

    if (req.method === 'GET') {
      const result = await connection.query(
        `SELECT m.id, m.body, m.sender_id, m.created_at, u.name AS sender_name
         FROM messages m JOIN users u ON u.id = m.sender_id
         WHERE m.chat_id = $1 ORDER BY m.id DESC LIMIT 100`,
        [chatId]
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ messages: result.rows.reverse() });
    }

    if (req.method === 'POST') {
      const body = String(req.body && req.body.body || '').trim();
      if (!body || body.length > 4000) {
        return res.status(400).json({ error: 'Messages must contain 1–4000 characters.' });
      }
      const result = await connection.query(
        `INSERT INTO messages (chat_id, sender_id, body) VALUES ($1, $2, $3)
         RETURNING id, body, sender_id, created_at`,
        [chatId, user.id, body]
      );
      return res.status(201).json({ message: result.rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Message request failed:', error);
    return res.status(503).json({ error: 'Could not access messages. Check the database configuration.' });
  }
};
