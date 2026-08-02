/**
 * P0 字段校验 — 对齐 PRD 第 5 章数据字典约束。
 *
 * 规则摘要：
 * - title: 去首尾空白后 1–80 字符
 * - description: 0–500 字符
 * - log text: 去首尾空白后 1–2000 字符
 * - outcome title: 去首尾空白后 1–120 字符
 * - outcome text value: 1–5000 字符
 * - link/image URL: 仅 http/https
 * - file: 不校验本地文件存在性
 */

import type { OutcomeType, ZoneKey } from '../data/garden'

export type ValidationError = {
  field: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

const VALID_URL_RE = /^https?:\/\/.+$/i

const FORBIDDEN_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:']

// ─── 长度限制（对齐 PRD） ───

export const LIMITS = {
  title: { min: 1, max: 80 },
  description: { min: 0, max: 500 },
  logText: { min: 1, max: 2000 },
  outcomeTitle: { min: 1, max: 120 },
  outcomeTextValue: { min: 1, max: 5000 },
} as const

// ─── 单项校验 ───

export function validateTitle(value: string): ValidationError | null {
  const trimmed = value.trim()
  if (!trimmed) return { field: 'title', message: '标题不能为空' }
  if (trimmed.length > LIMITS.title.max) return { field: 'title', message: `标题不能超过 ${LIMITS.title.max} 个字符` }
  return null
}

export function validateDescription(value: string): ValidationError | null {
  if (value.length > LIMITS.description.max) return { field: 'description', message: `描述不能超过 ${LIMITS.description.max} 个字符` }
  return null
}

export function validateLogText(value: string): ValidationError | null {
  const trimmed = value.trim()
  if (!trimmed) return { field: 'log', message: '日志内容不能为空' }
  if (trimmed.length > LIMITS.logText.max) return { field: 'log', message: `日志不能超过 ${LIMITS.logText.max} 个字符` }
  return null
}

export function validateOutcomeTitle(value: string): ValidationError | null {
  const trimmed = value.trim()
  if (!trimmed) return { field: 'outcomeTitle', message: '成果标题不能为空' }
  if (trimmed.length > LIMITS.outcomeTitle.max) return { field: 'outcomeTitle', message: `成果标题不能超过 ${LIMITS.outcomeTitle.max} 个字符` }
  return null
}

export function validateOutcomeValue(type: OutcomeType, value: string): ValidationError | null {
  const trimmed = value.trim()
  if (!trimmed) return { field: 'outcomeValue', message: '成果内容不能为空' }

  if (type === 'link' || type === 'image') {
    // 先检查危险协议
    const lower = trimmed.toLowerCase()
    for (const proto of FORBIDDEN_PROTOCOLS) {
      if (lower.startsWith(proto)) {
        return { field: 'outcomeValue', message: `不允许使用 ${proto} 协议` }
      }
    }
    // 再检查 URL 格式
    if (!VALID_URL_RE.test(trimmed)) {
      return { field: 'outcomeValue', message: '请输入有效的 http/https 链接' }
    }
  }

  if (type === 'text' && trimmed.length > LIMITS.outcomeTextValue.max) {
    return { field: 'outcomeValue', message: `文本成果不能超过 ${LIMITS.outcomeTextValue.max} 个字符` }
  }

  return null
}

export function validateZoneId(value: string): value is ZoneKey {
  return ['flower', 'water', 'exhibition', 'woodland', 'experiment'].includes(value)
}

/** 复合校验：创建项目表单 */
export function validateCreateProject(input: {
  title: string
  description: string
  zoneId: string
  plantVariant?: string
}): ValidationResult {
  const errors: ValidationError[] = []

  const titleError = validateTitle(input.title)
  if (titleError) errors.push(titleError)

  const descError = validateDescription(input.description)
  if (descError) errors.push(descError)

  if (!validateZoneId(input.zoneId)) {
    errors.push({ field: 'zoneId', message: '请选择有效的花园分区' })
  }

  if (!input.plantVariant) {
    errors.push({ field: 'plantVariant', message: '请选择一种灵植' })
  }

  return { valid: errors.length === 0, errors }
}

/** 复合校验：新增成果 */
export function validateAddOutcome(input: {
  title: string
  type: OutcomeType
  value: string
}): ValidationResult {
  const errors: ValidationError[] = []

  const titleError = validateOutcomeTitle(input.title)
  if (titleError) errors.push(titleError)

  const valueError = validateOutcomeValue(input.type, input.value)
  if (valueError) errors.push(valueError)

  return { valid: errors.length === 0, errors }
}
