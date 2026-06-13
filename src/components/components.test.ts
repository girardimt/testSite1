import { describe, expect, it } from 'vitest'
import { formatRemainingText } from './DaysRemaining'
import { statusColor, sizeColor } from '../lib/worktrack'

describe('formatRemainingText', () => {
  it('returns "No goal date" when goalDate is empty', () => {
    expect(formatRemainingText('')).toBe('No goal date')
  })

  it('returns overdue text for past dates', () => {
    const text = formatRemainingText('2000-01-01')
    expect(text).toMatch(/d overdue$/)
  })

  it('returns days-left text for future dates', () => {
    const text = formatRemainingText('2099-12-31')
    expect(text).toMatch(/d left$/)
  })
})

describe('StatusBadge class helper', () => {
  it('produces the expected CSS class for each status', () => {
    expect(statusColor('Complete')).toBe('badge badge-status-complete')
    expect(statusColor('Blocked')).toBe('badge badge-status-blocked')
    expect(statusColor('Await Deploy')).toBe('badge badge-status-await-deploy')
    expect(statusColor('In-Progress' as never)).toBe('badge badge-status-in-progress')
  })
})

describe('SizeChip class helper', () => {
  it('produces the expected CSS class for each size', () => {
    expect(sizeColor('XS')).toBe('badge badge-size-xs')
    expect(sizeColor('XXL')).toBe('badge badge-size-xxl')
    expect(sizeColor('M')).toBe('badge badge-size-m')
  })
})
