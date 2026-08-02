import { describe, it, expect } from 'vitest'
import {
  validateTitle,
  validateDescription,
  validateLogText,
  validateOutcomeTitle,
  validateOutcomeValue,
  validateCreateProject,
  validateAddOutcome,
  validateZoneId,
  LIMITS,
} from '../core/validation'

describe('validateTitle', () => {
  it('should accept valid titles', () => {
    expect(validateTitle('My Project')).toBeNull()
    expect(validateTitle('A')).toBeNull()
    expect(validateTitle('A'.repeat(80))).toBeNull()
  })

  it('should reject empty titles', () => {
    const error = validateTitle('')
    expect(error).not.toBeNull()
    expect(error!.field).toBe('title')
  })

  it('should reject whitespace-only titles', () => {
    const error = validateTitle('   ')
    expect(error).not.toBeNull()
    expect(error!.field).toBe('title')
  })

  it('should reject titles exceeding max length', () => {
    const error = validateTitle('A'.repeat(81))
    expect(error).not.toBeNull()
    expect(error!.message).toContain(String(LIMITS.title.max))
  })
})

describe('validateDescription', () => {
  it('should accept empty description', () => {
    expect(validateDescription('')).toBeNull()
  })

  it('should accept descriptions within limit', () => {
    expect(validateDescription('Short description')).toBeNull()
    expect(validateDescription('A'.repeat(500))).toBeNull()
  })

  it('should reject descriptions exceeding max length', () => {
    const error = validateDescription('A'.repeat(501))
    expect(error).not.toBeNull()
    expect(error!.message).toContain(String(LIMITS.description.max))
  })
})

describe('validateLogText', () => {
  it('should accept valid log text', () => {
    expect(validateLogText('Made progress today')).toBeNull()
  })

  it('should reject empty log', () => {
    const error = validateLogText('')
    expect(error).not.toBeNull()
    expect(error!.field).toBe('log')
  })

  it('should reject log exceeding max length', () => {
    const error = validateLogText('A'.repeat(2001))
    expect(error).not.toBeNull()
    expect(error!.message).toContain(String(LIMITS.logText.max))
  })
})

describe('validateOutcomeTitle', () => {
  it('should accept valid outcome titles', () => {
    expect(validateOutcomeTitle('My Outcome')).toBeNull()
  })

  it('should reject empty outcome title', () => {
    const error = validateOutcomeTitle('')
    expect(error).not.toBeNull()
  })

  it('should reject outcome title exceeding max length', () => {
    const error = validateOutcomeTitle('A'.repeat(121))
    expect(error).not.toBeNull()
    expect(error!.message).toContain(String(LIMITS.outcomeTitle.max))
  })
})

describe('validateOutcomeValue', () => {
  it('should accept http links', () => {
    expect(validateOutcomeValue('link', 'http://example.com')).toBeNull()
  })

  it('should accept https links', () => {
    expect(validateOutcomeValue('link', 'https://example.com')).toBeNull()
  })

  it('should reject javascript protocol links', () => {
    const error = validateOutcomeValue('link', 'javascript:alert(1)')
    expect(error).not.toBeNull()
    expect(error!.message).toContain('javascript')
  })

  it('should reject data protocol links', () => {
    const error = validateOutcomeValue('link', 'data:text/html,<script>alert(1)</script>')
    expect(error).not.toBeNull()
  })

  it('should reject invalid URLs for link type', () => {
    const error = validateOutcomeValue('link', 'not-a-url')
    expect(error).not.toBeNull()
    expect(error!.message).toContain('http/https')
  })

  it('should accept text within limit', () => {
    expect(validateOutcomeValue('text', 'Some text')).toBeNull()
    expect(validateOutcomeValue('text', 'A'.repeat(5000))).toBeNull()
  })

  it('should reject text exceeding max length', () => {
    const error = validateOutcomeValue('text', 'A'.repeat(5001))
    expect(error).not.toBeNull()
  })

  it('should accept file path placeholders', () => {
    expect(validateOutcomeValue('file', 'C:\\projects\\my-file.txt')).toBeNull()
  })

  it('should accept image URLs', () => {
    expect(validateOutcomeValue('image', 'https://example.com/photo.png')).toBeNull()
  })

  it('should reject empty values', () => {
    const error = validateOutcomeValue('text', '')
    expect(error).not.toBeNull()
  })
})

describe('validateZoneId', () => {
  it('should accept valid zone keys', () => {
    expect(validateZoneId('flower')).toBe(true)
    expect(validateZoneId('water')).toBe(true)
    expect(validateZoneId('exhibition')).toBe(true)
    expect(validateZoneId('woodland')).toBe(true)
    expect(validateZoneId('experiment')).toBe(true)
  })

  it('should reject invalid zone keys', () => {
    expect(validateZoneId('invalid')).toBe(false)
    expect(validateZoneId('')).toBe(false)
    expect(validateZoneId('garden')).toBe(false)
  })
})

describe('validateCreateProject', () => {
  it('should pass with valid input', () => {
    const result = validateCreateProject({
      title: 'My Project',
      description: 'A test project',
      zoneId: 'flower',
      plantVariant: 'plant-01',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail with empty title', () => {
    const result = validateCreateProject({
      title: '',
      description: '',
      zoneId: 'flower',
      plantVariant: 'plant-01',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'title')).toBe(true)
  })

  it('should fail with missing plant variant', () => {
    const result = validateCreateProject({
      title: 'Test',
      description: '',
      zoneId: 'water',
      plantVariant: undefined,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'plantVariant')).toBe(true)
  })

  it('should fail with invalid zone', () => {
    const result = validateCreateProject({
      title: 'Test',
      description: '',
      zoneId: 'mars',
      plantVariant: 'plant-01',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'zoneId')).toBe(true)
  })

  it('should collect multiple errors', () => {
    const result = validateCreateProject({
      title: '',
      description: '',
      zoneId: 'invalid',
      plantVariant: undefined,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('validateAddOutcome', () => {
  it('should pass with valid link outcome', () => {
    const result = validateAddOutcome({
      title: 'My Link',
      type: 'link',
      value: 'https://example.com',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should fail with empty title', () => {
    const result = validateAddOutcome({
      title: '',
      type: 'text',
      value: 'Some content',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'outcomeTitle')).toBe(true)
  })

  it('should fail with bad URL', () => {
    const result = validateAddOutcome({
      title: 'Bad Link',
      type: 'link',
      value: 'javascript:void(0)',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'outcomeValue')).toBe(true)
  })
})
