import { supabase } from './client'

export type Comment = {
  id: string
  garden_user_id: string
  project_id: string | null
  author_user_id: string | null
  author_name: string
  text: string
  created_at: string
}

export async function getGardenComments(gardenUserId: string): Promise<Comment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('comments')
    .select()
    .eq('garden_user_id', gardenUserId)
    .is('project_id', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Comment[]) ?? []
}

export async function getProjectComments(gardenUserId: string, projectId: string): Promise<Comment[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('comments')
    .select()
    .eq('garden_user_id', gardenUserId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Comment[]) ?? []
}

export async function addComment(input: {
  gardenUserId: string
  projectId?: string
  authorUserId?: string
  authorName: string
  text: string
}): Promise<Comment | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('comments')
    .insert({
      garden_user_id: input.gardenUserId,
      project_id: input.projectId ?? null,
      author_user_id: input.authorUserId ?? null,
      author_name: input.authorName,
      text: input.text,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return (data as Comment) ?? null
}

// 铃铛未读数：今日/上次已读之后的新留言数
export async function getUnreadCommentCount(gardenUserId: string): Promise<number> {
  if (!supabase) return 0
  const { data: read } = await supabase.from('comment_reads').select('last_read_at').eq('user_id', gardenUserId).maybeSingle()
  const since = read?.last_read_at ?? new Date(0).toISOString()
  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('garden_user_id', gardenUserId)
    .gt('created_at', since)
  return count ?? 0
}

export async function markCommentsRead(gardenUserId: string): Promise<void> {
  if (!supabase) return
  await supabase.from('comment_reads').upsert(
    { user_id: gardenUserId, last_read_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
}
