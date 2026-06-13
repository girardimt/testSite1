import { describe, expect, it } from 'vitest'
import {
  BACKEND_ENTITY_MAP,
  blockerBadgeStatus,
  buildLinkUrl,
  computeNextValidation,
  createPersistentStorageAdapterStub,
  daysRemaining,
  deriveLinkDisplayName,
  loadDb,
  normalizeLinkNumber,
  parseLocalDate,
  resetStorageAdapter,
  releaseTypeColor,
  setStorageAdapter,
  validateLinkNumber,
} from './worktrack'

describe('worktrack helpers', () => {
  it('normalizes ServiceNow style link numbers', () => {
    expect(normalizeLinkNumber('INC', 'inc-123 45')).toBe('INC12345')
    expect(normalizeLinkNumber('RITM', 'ritm 89-0')).toBe('RITM890')
    expect(normalizeLinkNumber('AskMe', 'ID 98')).toBe('98')
  })

  it('validates normalized link numbers and display names', () => {
    expect(validateLinkNumber('INC', 'INC123')).toBe('')
    expect(validateLinkNumber('AskMe', '')).toBe('A value is required.')
    expect(deriveLinkDisplayName('AskMe', '44')).toBe('AskMe 44')
  })

  it('builds known link URLs', () => {
    expect(buildLinkUrl('ADO', '1234')).toContain('/1234')
    expect(buildLinkUrl('CRF', '77')).toContain('/77')
  })

  it('handles date helpers in local time', () => {
    expect(parseLocalDate('2026-06-12').getFullYear()).toBe(2026)
    expect(computeNextValidation('2026-06-12', 2)).toBe('2026-06-14')
    expect(daysRemaining('2099-01-01')).toBeGreaterThan(0)
  })

  it('maps blocker and release helpers', () => {
    expect(blockerBadgeStatus(false, '2026-06-12')).toBe('cleared')
    expect(releaseTypeColor('PGT')).toContain('badge-plum')
  })

  it('defines backend entity mapping for all persisted collections', () => {
    expect(BACKEND_ENTITY_MAP.map((entry) => entry.entity)).toEqual([
      'workItems',
      'blockers',
      'links',
      'categories',
      'blockerTypes',
      'persons',
      'releases',
    ])
  })

  it('supports a persistent adapter stub seam without changing seeded behavior', () => {
    setStorageAdapter(createPersistentStorageAdapterStub())
    try {
      const db = loadDb()
      expect(db.workItems.length).toBeGreaterThan(0)
    } finally {
      resetStorageAdapter()
    }
  })
})
