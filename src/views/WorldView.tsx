import { useEffect, useMemo, useState } from 'react'
import type { ProjectSeed } from '../data/garden'
import type { Room } from '../game/world'
import { createLocalWorldProvider, OWN_ROOM_ID, countPartnerManors, countClues, countLitTonight } from '../game/world'
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
 * 世界视图：/world 为庄园星图（纯 3D 星系地图），/room/:id 为单个农场房间。
 * 邻居房间数据由 WorldProvider 提供（当前为本地 mock，未来接后端）。
 */
export function WorldView({ ownProjects, ownName = '我', onProjectOpen }: Props) {
  const provider = useMemo(() => createLocalWorldProvider(ownProjects, ownName), [ownProjects, ownName])
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
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
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId), [rooms, selectedRoomId])

  // 状态摘要
  const partnerCount = countPartnerManors(rooms)
  const clueCount = countClues(rooms)
  const litTonight = countLitTonight(rooms)

  function handleAgentAction(action: AgentActionOutput) {
    setAgentBark(action.dialogue ?? '')
    setAgentThinking(false)
  }

  // 进入大地图（/world）
  if (!currentRoom) {
    return (
      <div className="world-stage">
        <WorldMapScene
          rooms={rooms}
          onEnterRoom={(roomId) => setCurrentRoomId(roomId)}
          onSelectRoom={(roomId) => setSelectedRoomId(roomId)}
          selectedRoomId={selectedRoomId}
        />

        {/* 右上状态条 */}
        <div className="world-status">
          <span>
            <strong>{partnerCount}</strong>
            <small>座伙伴庄园</small>
          </span>
          <span>
            <strong>{clueCount}</strong>
            <small>条园丁线索</small>
          </span>
          <span>
            <strong>{litTonight}</strong>
            <small>今晚亮起</small>
          </span>
        </div>

        {/* 底部选中面板 */}
        {selectedRoom ? (
          <div className="manor-panel">
            <div className="manor-panel-info">
              <div className="manor-panel-header">
                <span className="manor-planet-dot" style={{ background: selectedRoom.accent, boxShadow: `0 0 12px ${selectedRoom.accent}` }} />
                <div>
                  <strong>{selectedRoom.isOwn ? '我的庄园' : selectedRoom.ownerName}</strong>
                  <small>
                    {selectedRoom.isOwn
                      ? `${selectedRoom.projects.length} 个项目`
                      : `${selectedRoom.projects.length} 个项目 · ${new Set(selectedRoom.projects.map((p) => p.plantCategory)).size} 种植物`}
                  </small>
                </div>
              </div>
              {selectedRoom.projects.some((p) => p.status === 'mature' || p.status === 'harvested') && (
                <span className="manor-tag">✦ 新线索</span>
              )}
            </div>
            <button
              type="button"
              className="manor-visit-button"
              onClick={() => {
                setCurrentRoomId(selectedRoom.id)
                setSelectedRoomId(null)
              }}
            >
              {selectedRoom.isOwn ? '进入我的庄园' : '沿星路拜访'}
            </button>
          </div>
        ) : (
          <div className="world-hint">
            <h2>庄园星图</h2>
            <p>点击任意一颗星球，查看庄园情况。沿星路拜访伙伴的农场。</p>
          </div>
        )}
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
          ← 返回星图
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