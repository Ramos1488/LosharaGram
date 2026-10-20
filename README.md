# LosharaGram

## 1. Database (Supabase)
Create a project, open SQL Editor, run `schema.sql`. Then Project Settings -> API: copy the Project URL and the
`service_role` key (server only, never put it in the page).

## 2. Web (Vercel)
Push this folder to GitHub, import in Vercel (no build step). Callback URLs for the OAuth apps:
`https://<domain>/api/auth/github`, `/discord`, `/google`.

Environment variables: `GITHUB_CLIENT_ID/SECRET`, `DISCORD_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`,
`SESSION_SECRET`, `ADMIN_IDS` (your verified email or `github:12345`), `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`.
Redeploy after changing them.

## 3. Desktop (Qt 6 / C++)
```
cd desktop && cmake -B build -DCMAKE_PREFIX_PATH=<Qt6 path> && cmake --build build --config Release
set LOSHARAGRAM_URL=https://<domain>   (or edit main.cpp)
```
