# LosharaGram

## Web (Vercel)
1. Push this folder to GitHub, import it in Vercel (no build step).
2. Create a PostgreSQL database (for example, Neon or Supabase) and set `DATABASE_URL` in
   Vercel to its connection string. `POSTGRES_URL` is also supported. Use the provider's
   SSL-enabled connection string. On first use, LosharaGram creates its tables and indexes.
3. Create OAuth apps and set the callback URL to `https://<your-domain>/api/auth/<provider>`
   (`github`, `discord`, `google`). Google scopes: openid, email, profile.
4. Set these Vercel environment variables:
   `GITHUB_CLIENT_ID/SECRET`, `DISCORD_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`,
   `SESSION_SECRET` (long random string), `ADMIN_IDS` (comma list of ids like `github:12345`,
   or verified emails). Redeploy. OAuth credentials and `SESSION_SECRET` are still needed
   independently of the database connection.

Chats, memberships, and messages are stored in PostgreSQL and shared between users and
devices. Messages are limited to 4,000 characters; the chat view loads the latest 100.

### API

- `GET /api/users?q=<name>` — search registered users.
- `GET /api/chats` — list the signed-in user's chats.
- `POST /api/chats` with `{"userId":"..."}` — create or reopen a direct chat.
- `GET /api/chats/<id>/messages` — load the latest 100 messages.
- `POST /api/chats/<id>/messages` with `{"body":"..."}` — send a message.

## Desktop (Qt 6 / C++)
```
cd desktop
cmake -B build -DCMAKE_PREFIX_PATH=<Qt6 path>
cmake --build build --config Release
set LOSHARAGRAM_URL=https://<your-domain>   (or edit main.cpp)
```
