/**
 * Core barrel — P0 纯前端种子银行的所有核心模块。
 *
 * 导入规则：
 * - P0 组件和逻辑只从 `src/core/` 导入
 * - 不要从 core 导入 extensions（3D、Agent、World 等）
 * - extensions 可以从 core 导入
 */

export { getFeatureFlags, loadFeatureFlags, __resetFeatureFlagsForTest } from './flags'
export type { FeatureFlags } from './flags'

export { ThemeProvider, useTheme } from './theme'
export type { ThemeMode, ThemeContextValue } from './theme'

export {
  validateTitle,
  validateDescription,
  validateLogText,
  validateOutcomeTitle,
  validateOutcomeValue,
  validateZoneId,
  validateCreateProject,
  validateAddOutcome,
  LIMITS,
} from './validation'
export type { ValidationError, ValidationResult } from './validation'
