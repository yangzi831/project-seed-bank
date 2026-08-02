-- M1: 社交数据地基（见 DESIGN_DOC.md 第 3 节）
-- profiles / gardens / comments 三表 + RLS

-- ========== profiles：用户档案（认领 handle 时写入） ==========
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  handle     text not null,
  nickname   text,
  created_at timestamptz not null default now(),
  -- handle 统一小写存储（应用层先归一化），3–20 位字母/数字/下划线
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$')
);

-- 大小写不敏感的全局唯一（约束里已强制小写，此索引用于搜索与兜底）
create unique index profiles_handle_unique_lower on public.profiles (lower(handle));

-- ========== gardens：公开花园快照（本地变更后防抖推送，整体覆写） ==========
create table public.gardens (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  public_snapshot jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

-- ========== comments：留言（project_id 为空 = 花园级访客簿） ==========
create table public.comments (
  id             uuid primary key default gen_random_uuid(),
  garden_user_id uuid not null references auth.users (id) on delete cascade,
  project_id     text,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name    text not null,
  text           text not null check (char_length(text) between 1 and 500),
  created_at     timestamptz not null default now()
);

create index comments_garden_created_idx on public.comments (garden_user_id, created_at desc);
create index comments_garden_project_idx on public.comments (garden_user_id, project_id, created_at desc);

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.gardens enable row level security;
alter table public.comments enable row level security;

-- profiles：公开可读；写入仅本人
create policy "profiles_select" on public.profiles
  for select using (true);
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- gardens：公开可读；写入仅本人
create policy "gardens_select" on public.gardens
  for select using (true);
create policy "gardens_insert_self" on public.gardens
  for insert with check (auth.uid() = user_id);
create policy "gardens_update_self" on public.gardens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- comments：公开可读；插入对游客开放；删除 = 园主删自己花园的 或 留言者删自己的
create policy "comments_select" on public.comments
  for select using (true);
create policy "comments_insert_public" on public.comments
  for insert with check (true);
create policy "comments_delete_garden_owner" on public.comments
  for delete using (garden_user_id = auth.uid());
create policy "comments_delete_author" on public.comments
  for delete using (author_user_id = auth.uid());
