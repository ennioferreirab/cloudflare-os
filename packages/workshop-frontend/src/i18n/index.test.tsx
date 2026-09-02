// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import LanguageSelector from '../components/LanguageSelector'
import {
  changeLocale,
  DEFAULT_LOCALE,
  formatDate,
  formatNumber,
  formatRelativeTime,
  i18n,
  LOCALE_STORAGE_KEY,
  resolveLocale,
  useLocale,
} from '.'

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function LocaleProbe() {
  const { t } = useLocale()
  return <p>{t('auth.signIn.title')}</p>
}

describe('i18n', () => {
  let container: HTMLDivElement | undefined
  let root: Root | undefined

  afterEach(async () => {
    await act(async () => root?.unmount())
    container?.remove()
    root = undefined
    container = undefined
    await changeLocale(DEFAULT_LOCALE)
    localStorage.clear()
  })

  it('prefers a valid saved locale, then browser languages, then the default', () => {
    expect(resolveLocale('en', ['pt-BR'])).toBe('en')
    expect(resolveLocale('unsupported', ['en-US', 'pt-BR'])).toBe('en')
    expect(resolveLocale(null, ['pt-PT', 'en-US'])).toBe('pt-BR')
    expect(resolveLocale(null, ['fr-CA'])).toBe(DEFAULT_LOCALE)
  })

  it('formats values with the supplied locale', () => {
    const date = new Date(Date.UTC(2026, 8, 1, 12, 0, 0))
    const dateOptions = { dateStyle: 'long', timeZone: 'UTC' } as const
    const numberOptions = { minimumFractionDigits: 1 } as const
    const relativeOptions = { numeric: 'auto' } as const

    expect(formatDate(date, dateOptions, 'en')).toBe(new Intl.DateTimeFormat('en', dateOptions).format(date))
    expect(formatNumber(1234.5, numberOptions, 'pt-BR')).toBe(
      new Intl.NumberFormat('pt-BR', numberOptions).format(1234.5),
    )
    expect(formatRelativeTime(-1, 'day', relativeOptions, 'pt-BR')).toBe(
      new Intl.RelativeTimeFormat('pt-BR', relativeOptions).format(-1, 'day'),
    )
  })

  it('updates rendered text, storage, and the document language without suspense', async () => {
    await act(async () => { await changeLocale('pt-BR') })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root!.render(
        <>
          <LanguageSelector />
          <LocaleProbe />
        </>,
      )
    })

    const selector = container.querySelector('select')
    expect(selector?.getAttribute('aria-label')).toBe('Idioma')
    expect([...selector!.options].map((option) => option.text)).toEqual(['English', 'Português (Brasil)'])
    expect(container.textContent).toContain('Entrar')

    await act(async () => {
      selector!.value = 'en'
      selector!.dispatchEvent(new Event('change', { bubbles: true }))
      await Promise.resolve()
    })

    expect(i18n.language).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(selector?.getAttribute('aria-label')).toBe('Language')
    expect(container.textContent).toContain('Sign in')
  })
})
