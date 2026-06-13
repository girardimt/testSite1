import { beforeEach, describe, expect, it } from 'vitest'
import {
  BACKEND_ENTITY_MAP,
  DEFAULT_APP_SETTINGS,
  blockerBadgeStatus,
  buildLinkUrl,
  computeNextValidation,
  createPersistentStorageAdapterStub,
  daysRemaining,
  deriveLinkDisplayName,
  loadDb,
  loadSettings,
  normalizeLinkNumber,
  parseLocalDate,
  resetStorageAdapter,
  releaseTypeColor,
  saveSettings,
  setStorageAdapter,
  validateLinkNumber,
  validateLinkUniqueness,
  type WorktrackDb,
  type WorktrackStorageAdapter,
} from './worktrack'

const createMemoryAdapter = (db?: WorktrackDb): WorktrackStorageAdapter => {
  let currentDb = db ?? null
  let lastChanged: Record<string, string> = {}

  return {
    id: 'memory-test-adapter',
    loadDb: () => currentDb,
    saveDb: (nextDb) => {
      currentDb = nextDb
    },
    loadLastChangedMap: () => lastChanged,
    saveLastChangedMap: (nextMap) => {
      lastChanged = nextMap
    },
  }
}

describe('worktrack helpers', () => {
  beforeEach(() => {
    resetStorageAdapter()
  })

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

  it('validateLinkUniqueness returns empty string when no duplicates exist', () => {
    const links = [
      { linkId: 'lnk-1', linkType: 'INC' as const, number: 'INC100', name: 'INC100', workItemId: 'wi-1' },
    ]
    expect(validateLinkUniqueness('INC', 'INC200', links)).toBe('')
    expect(validateLinkUniqueness('RITM', 'RITM100', links)).toBe('')
  })

  it('validateLinkUniqueness detects duplicate linkType + number', () => {
    const links = [
      { linkId: 'lnk-1', linkType: 'INC' as const, number: 'INC100', name: 'INC100', workItemId: 'wi-1' },
    ]
    const error = validateLinkUniqueness('INC', 'INC100', links)
    expect(error).not.toBe('')
    expect(error).toContain('INC100')
  })

  it('validateLinkUniqueness excludes the current link when editing', () => {
    const links = [
      { linkId: 'lnk-1', linkType: 'INC' as const, number: 'INC100', name: 'INC100', workItemId: 'wi-1' },
    ]
    expect(validateLinkUniqueness('INC', 'INC100', links, 'lnk-1')).toBe('')
  })

  it('validateLinkUniqueness only flags matching type, not same number of different type', () => {
    const links = [
      { linkId: 'lnk-1', linkType: 'INC' as const, number: 'INC100', name: 'INC100', workItemId: 'wi-1' },
    ]
    expect(validateLinkUniqueness('RITM', 'INC100', links)).toBe('')
  })

  it('validateLinkUniqueness returns empty string when normalizedNumber is empty', () => {
    const links = [
      { linkId: 'lnk-1', linkType: 'INC' as const, number: 'INC100', name: 'INC100', workItemId: 'wi-1' },
    ]
    expect(validateLinkUniqueness('INC', '', links)).toBe('')
  })

  it('defines backend entity mapping for all persisted collections', () => {
    expect(BACKEND_ENTITY_MAP.map((entry) => entry.entity)).toEqual([
      'workItems',
      'blockers',
      'links',
      'comments',
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
      expect(db.comments.length).toBeGreaterThan(0)
      expect(db.appSettings).toEqual(DEFAULT_APP_SETTINGS)
    } finally {
      resetStorageAdapter()
    }
  })

  it('loads default settings when older stored data has no appSettings entry', () => {
    const seeded = loadDb()
    const legacyDb = JSON.parse(JSON.stringify(seeded)) as WorktrackDb
    delete (legacyDb as Partial<WorktrackDb>).appSettings
    setStorageAdapter(createMemoryAdapter(legacyDb as WorktrackDb))
    try {
      expect(loadSettings()).toEqual(DEFAULT_APP_SETTINGS)
    } finally {
      resetStorageAdapter()
    }
  })

  it('saves settings and ensures the configured fallback person exists', () => {
    setStorageAdapter(createMemoryAdapter(loadDb()))
    try {
      const savedSettings = saveSettings({
        fallbackPersonEmail: 'fallback.owner@example.com',
        emailDomain: 'example.com',
        allowedEmailDomains: ['example.org'],
        defaultPageSize: 50,
      })

      expect(savedSettings).toEqual({
        fallbackPersonEmail: 'fallback.owner@example.com',
        emailDomain: 'example.com',
        allowedEmailDomains: ['example.com', 'example.org'],
        defaultPageSize: 50,
      })

      const db = loadDb()
      expect(db.appSettings).toEqual(savedSettings)
      expect(db.persons.some((person) => person.email === 'fallback.owner@example.com')).toBe(true)
    } finally {
      resetStorageAdapter()
    }
  })
})
