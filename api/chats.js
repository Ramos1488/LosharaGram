const { verify, cookies } = require('../lib/session');
const { ready } = require('../lib/db');

module.exports = async (req, res) => {
  const user = verify(cookies(req).lg_session);
  if (!user) return res.status(401).json({ error: 'Sign in to open your chats.' });

  try {
    const connection = await ready();
    if (req.method === 'GET') {
      const result = await connection.query(
        `SELECT c.id, c.kind,
          CASE WHEN c.kind = 'direct' THEN COALESCE(other.name, 'Deleted user') ELSE c.title END AS title,
          CASE WHEN c.kind = 'direct' THEN other.avatar ELSE NULL END AS avatar,
          latest.body AS last_message, latest.created_at AS last_at
         FROM chats c
         JOIN chat_members mine ON mine.chat_id = c.id AND mine.user_id = $1
         LEFT JOIN chat_members other_member ON other_member.chat_id = c.id AND other_member.user_id <> $1
         LEFT JOIN users other ON other.id = other_member.user_id
         LEFT JOIN LATERAL (
           SELECT body, created_at FROM messages WHERE chat_id = c.id ORDER BY id DESC LIMIT 1
         ) latest ON TRUE
         ORDER BY COALESCE(latest.created_at, c.created_at) DESC`,
        [user.id]
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ chats: result.rows });
    }

    if (req.method === 'POST') {
      const recipientId = String(req.body && req.body.userId || '');
      if (!recipientId || recipientId === user.id) {
        return res.status(400).json({ error: 'Choose another user to start a chat.' });
      }
      const recipient = await connection.query('SELECT id FROM users WHERE id = $1', [recipientId]);
      if (!recipient.rowCount) return res.status(404).json({ error: 'User not found.' });

      const directKey = JSON.stringify([user.id, recipientId].sort());
      const chat = await connection.query(
        `INSERT INTO chats (kind, direct_key, created_by) VALUES ('direct', $1, $2)
         ON CONFLICT (direct_key) DO UPDATE SET direct_key = EXCLUDED.direct_key RETURNING id`,
        [directKey, user.id]
      );
      await connection.query(
        `INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)
         ON CONFLICT DO NOTHING`,
        [chat.rows[0].id, user.id, recipientId]
      );
      return res.status(201).json({ chatId: chat.rows[0].id });
    }
    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    console.error('Chat request failed:', error);
    return res.status(503).json({ error: 'Could not load chats. Check the database configuration.' });
  }
};
