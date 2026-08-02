import { supabase } from './client'
import type { GardenState } from '../../data/garden'

export type PublicGarden = {
  user_id: string
  public_snapshot: GardenState
  updated_at: string
}

// 推送公开快照（本地为源，整体覆写）
export async function syncGardenSnapshot(userId: string, state: GardenState): Promise<void> {
  if (!supabase) return
  await supabase.from('gardens').upsert(
    {
      user_id: userId,
      public_snapshot: { zones: state.zones, projects: state.projects },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

export async function getGardenByUserId(userId: string): Promise<PublicGarden | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('gardens').select().eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PublicGarden | null) ?? null
}
