// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  changeLocale,
  detectLocale,
  formatDate,
  formatList,
  formatNumber,
  formatRelativeTime,
  resolveLocale,
} from './index'

describe('locale resolution', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    localStorage.clear()
    await changeLocale(DEFAULT_LOCALE)
    localStorage.clear()
  })

  it('prefers a saved locale, then a supported browser locale, then pt-BR', () => {
    expect(resolveLocale('en', ['pt-BR'])).toBe('en')
    expect(resolveLocale(null, ['pt-PT'])).toBe('pt-BR')
    expect(resolveLocale(null, ['en-US'])).toBe('en')
    expect(resolveLocale(null, ['es-ES'])).toBe('pt-BR')
  })

  it('survives restricted storage while detecting the browser locale', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(detectLocale()).toMatch(/^(en|pt-BR)$/)
  })

  it('changes locale live, persists it, and updates the document language', async () => {
    await changeLocale('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')

    await changeLocale('pt-BR')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
  })
})

describe('explicit locale formatters', () => {
  it('formats numbers, dates, relative time, and lists with pt-BR', () => {
    expect(formatNumber(1234.5, undefined, 'pt-BR')).toContain('1.234,5')
    expect(formatDate(Date.UTC(2026, 8, 1), { timeZone: 'UTC', dateStyle: 'short' }, 'pt-BR'))
      .toContain('01/09/2026')
    expect(formatRelativeTime(-1, 'day', { numeric: 'auto' }, 'pt-BR')).toBe('ontem')
    expect(formatList(['Gmail', 'Drive'], undefined, 'pt-BR')).toBe('Gmail e Drive')
  })
})
