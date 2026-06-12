-- LIMEZEST Voting / 취미 영업소 Supabase schema
-- Supabase Dashboard → SQL Editor에서 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_nickname text not null,
  is_private boolean not null default false,
  password_hash text,
  vote_mode text not null default 'single' check (vote_mode in ('single', 'multi', 'score')),
  reveal_mode text not null default 'countdown' check (reveal_mode in ('instant', 'countdown', 'manual')),
  status text not null default 'waiting' check (status in ('waiting', 'voting', 'closed', 'result')),
  show_voter_names boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null,
  role text not null default 'guest' check (role in ('host', 'guest')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.hobbies (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_participant_id uuid references public.participants(id) on delete set null,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  hobby_id uuid not null references public.hobbies(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  score integer check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique (hobby_id, participant_id)
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.hobbies enable row level security;
alter table public.votes enable row level security;
alter table public.admin_users enable row level security;

-- MVP용 공개 정책: 인증 없이 방/참여자/소재/투표를 읽고 생성/수정 가능.
-- 정식 출시 전에는 익명 세션 토큰/방 호스트 토큰 기반으로 더 잠그는 것을 권장합니다.
create policy "rooms public read" on public.rooms for select using (true);
create policy "rooms public insert" on public.rooms for insert with check (true);
create policy "rooms public update" on public.rooms for update using (true) with check (true);
create policy "rooms public delete" on public.rooms for delete using (true);

create policy "participants public read" on public.participants for select using (true);
create policy "participants public insert" on public.participants for insert with check (true);
create policy "participants public update" on public.participants for update using (true) with check (true);
create policy "participants public delete" on public.participants for delete using (true);

create policy "hobbies public read" on public.hobbies for select using (true);
create policy "hobbies public insert" on public.hobbies for insert with check (true);
create policy "hobbies public update" on public.hobbies for update using (true) with check (true);
create policy "hobbies public delete" on public.hobbies for delete using (true);

create policy "votes public read" on public.votes for select using (true);
create policy "votes public insert" on public.votes for insert with check (true);
create policy "votes public update" on public.votes for update using (true) with check (true);
create policy "votes public delete" on public.votes for delete using (true);

-- admin_users는 클라이언트에서 직접 읽지 않도록 막습니다. 관리자 인증은 후속 서버리스 API에서 처리 권장.

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function public.set_updated_at();

-- 실시간 구독용 publication 등록
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.hobbies;
alter publication supabase_realtime add table public.votes;
