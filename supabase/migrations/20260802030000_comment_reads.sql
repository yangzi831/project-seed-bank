-- M2: 留言已读标记（铃铛未读数用）
create table public.comment_reads (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now()
);

alter table public.comment_reads enable row level security;

-- 仅本人可读写自己的已读时间（未读数查询由 owner 用 comments 的公开 SELECT 完成）
create policy "comment_reads_select_self" on public.comment_reads
  for select using (auth.uid() = user_id);
create policy "comment_reads_insert_self" on public.comment_reads
  for insert with check (auth.uid() = user_id);
create policy "comment_reads_update_self" on public.comment_reads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
