/**
 * 主题系统 — 控制视觉呈现风格。
 *
 * - `garden`：PRD P0 花园主题（玻璃拟态、深绿自然）
 * - `dungeon`：种子地牢暗黑奇幻主题（3D 墓塔、石质 UI）
 *
 * 通过 React Context 提供，所有组件通过 hook 读取。
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeMode = 'garden' | 'dungeon'

export type ThemeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dungeon',
  setMode: () => {},
  toggle: () => {},
})

const STORAGE_KEY = 'project-seed-bank:theme'

function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'garden' || stored === 'dungeon') return stored
  } catch {
    // localStorage 不可用
  }
  return 'dungeon' // 默认地牢主题（保持向后兼容）
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(loadTheme)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // 静默失败
    }
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  const value: ThemeContextValue = {
    mode,
    setMode,
    toggle: () => setMode((prev) => (prev === 'garden' ? 'dungeon' : 'garden')),
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
