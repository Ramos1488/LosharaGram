# LosharaGram

## Web (Vercel)
1. Push this folder to GitHub, import it in Vercel (no build step).
2. Create OAuth apps and set the callback URL to `https://<your-domain>/api/auth/<provider>`
   (`github`, `discord`, `google`). Google scopes: openid, email, profile.
3. Vercel env vars: `GITHUB_CLIENT_ID/SECRET`, `DISCORD_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`,
   `SESSION_SECRET` (long random string), `ADMIN_IDS` (comma list of ids like `github:12345`,
   or verified emails). Redeploy.

## Desktop (Qt 6 / C++)
```
cd desktop && cmake -B build -DCMAKE_PREFIX_PATH=<Qt6 path> && cmake --build build --config Release
set LOSHARAGRAM_URL=https://<your-domain>   (or edit main.cpp)
```
