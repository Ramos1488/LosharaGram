-- Run in Supabase: SQL Editor -> New query -> Run
create table users(id text primary key, name text, email text, avatar text, verified boolean default false, verify_requested boolean default false, coins int default 100, created_at timestamptz default now());
create table channels(id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, about text default '', owner text not null, verified boolean default false, verify_requested boolean default false, created_at timestamptz default now());
create table subs(channel_id uuid references channels on delete cascade, user_id text, primary key(channel_id, user_id));
create table posts(id bigserial primary key, channel_id uuid references channels on delete cascade, author text, text text not null, created_at timestamptz default now());
create table gift_log(id bigserial primary key, from_user text, from_name text, to_user text, gift text, price int, created_at timestamptz default now());
-- RLS on, no policies: only the server (service key) can read/write.
alter table users enable row level security; alter table channels enable row level security;
alter table subs enable row level security; alter table posts enable row level security; alter table gift_log enable row level security;
