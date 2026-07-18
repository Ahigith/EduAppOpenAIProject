create table users (
  id uuid primary key,
  handle text not null unique,
  created_at timestamptz not null default now()
);

create table levels (
  id text primary key,
  slug text not null unique,
  topic text not null,
  tier integer not null check (tier in (1, 2)),
  xp_reward integer not null check (xp_reward >= 0),
  order_index integer not null
);

create table progress (
  user_id uuid not null references users(id) on delete cascade,
  level_id text not null references levels(id) on delete cascade,
  status text not null check (status in ('locked', 'unlocked', 'in_progress', 'completed')),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  level_id text not null references levels(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  score jsonb,
  created_at timestamptz not null default now()
);

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  role text not null check (role in ('player', 'persona')),
  content text not null,
  created_at timestamptz not null default now()
);
