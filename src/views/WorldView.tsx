import { useEffect, useMemo, useState } from 'react'
import type { ProjectSeed } from '../data/garden'
import type { Room } from '../game/world'
import { createLocalWorldProvider, OWN_ROOM_ID } from '../game/world'
import type { AgentActionOutput } from '../services/ai/types'
import { WorldMapScene } from '../three/WorldMapScene'
import { FarmRoomScene } from '../three/FarmRoomScene'

type Props = {
  /** 当前用户的项目（自己房间的作物）。 */
  ownProjects: ProjectSeed[]
  ownName?: string
  onProjectOpen?: (projectId: string) => void
}

/**
 * 世界视图：/world 为大地图（浮岛房间群），/room/:id 为单个农场房间。
 * 邻居房间数据由 WorldProvider 提供（当前为本地 mock，未来接后端）。
 */
export function WorldView({ ownProjects, ownName = '我', onProjectOpen }: Props) {
  const provider = useMemo(() => createLocalWorldProvider(ownProjects, ownName), [ownProjects, ownName])
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [agentBark, setAgentBark] = useState<string>('')
  const [agentThinking, setAgentThinking] = useState(false)

  useEffect(() => {
    let alive = true
    void provider.listRooms().then((list) => {
      if (alive) setRooms(list)
    })
    return () => {
      alive = false
    }
  }, [provider])

  const currentRoom = useMemo(() => rooms.find((r) => r.id === currentRoomId), [rooms, currentRoomId])

  function handleAgentAction(action: AgentActionOutput) {
    setAgentBark(action.dialogue ?? '')
    setAgentThinking(false)
  }

  // 进入大地图（/world）
  if (!currentRoom) {
    return (
      <div className="world-stage">
        <WorldMapScene rooms={rooms} onEnterRoom={(roomId) => setCurrentRoomId(roomId)} />
        <div className="world-hint">
          <h2>种子世界</h2>
          <p>点击任意一座浮岛，进入对应主人的农场房间。中央是你的家。</p>
        </div>
      </div>
    )
  }

  // 进入某个农场房间（/room/:id）
  return (
    <div className="world-stage">
      <FarmRoomScene
        key={currentRoom.id}
        ownerName={currentRoom.ownerName}
        accent={currentRoom.accent}
        projects={currentRoom.projects}
        isOwn={currentRoom.isOwn}
        onProjectOpen={onProjectOpen}
        onExitToWorld={() => setCurrentRoomId(null)}
        onAgentAction={handleAgentAction}
      />
      <div className="room-topbar">
        <button type="button" className="ghost-button" onClick={() => setCurrentRoomId(null)}>
          ← 返回大地图
        </button>
        <div className="room-title">
          <strong>{currentRoom.isOwn ? '我的农场' : `${currentRoom.ownerName} 的农场`}</strong>
          <small>{currentRoom.isOwn ? OWN_ROOM_ID : currentRoom.id}</small>
        </div>
      </div>
      {agentBark ? (
        <div className="agent-bark" role="status">
          <span className="agent-bark-dot" aria-hidden="true" />
          {agentBark}
        </div>
      ) : null}
      {agentThinking ? <div className="agent-thinking">园丁精灵正在思考…</div> : null}
    </div>
  )
}
