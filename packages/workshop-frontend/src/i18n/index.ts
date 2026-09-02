import { useCallback } from 'react'
import { createInstance } from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import { resources } from './resources'

const i18n = createInstance()

/** Locales currently available in the Workshop UI. */
export const LOCALES = ['en', 'pt-BR'] as const

/** A locale supported by the Workshop UI. */
export type Locale = typeof LOCALES[number]

/** Locale used when neither saved nor browser preferences are supported. */
export const DEFAULT_LOCALE: Locale = 'pt-BR'

/** Browser storage key for an explicitly selected locale. */
export const LOCALE_STORAGE_KEY = 'scaleos:locale'

/** Returns whether a value is one of the supported locales. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale)
}

/** Chooses a locale from a saved value, then browser preferences, then the default. */
export function resolveLocale(
  storedLocale: unknown,
  browserLanguages: readonly string[] | undefined,
): Locale {
  if (isLocale(storedLocale)) return storedLocale

  for (const language of browserLanguages ?? []) {
    const normalized = language.toLowerCase()
    if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
    if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR'
  }

  return DEFAULT_LOCALE
}

function getStoredLocale(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function getBrowserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return []
  return navigator.languages?.length ? navigator.languages : [navigator.language]
}

/** Resolves the locale for the first render without waiting for async detection. */
export function detectLocale(): Locale {
  return resolveLocale(getStoredLocale(), getBrowserLanguages())
}

function currentLocale(): Locale {
  return isLocale(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : isLocale(i18n.language)
      ? i18n.language
      : DEFAULT_LOCALE
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()

function dateTimeFormatterKey(locale: Locale, options: Intl.DateTimeFormatOptions | undefined): string {
  const entries = Object.entries(options ?? {})
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => [key, typeof value, value])
  return `${locale}:${JSON.stringify(entries)}`
}

function getDateTimeFormatter(locale: Locale, options: Intl.DateTimeFormatOptions | undefined): Intl.DateTimeFormat {
  const key = dateTimeFormatterKey(locale, options)
  let formatter = dateTimeFormatters.get(key)
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale, options)
    dateTimeFormatters.set(key, formatter)
  }
  return formatter
}

/** Applies a locale to the document for assistive technology and browser behavior. */
export function applyDocumentLocale(locale: Locale) {
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

const initialLocale = detectLocale()

i18n.on('languageChanged', (locale) => {
  if (isLocale(locale)) applyDocumentLocale(locale)
})

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLocale,
    fallbackLng: 'en',
    supportedLngs: LOCALES,
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    initAsync: false,
    returnNull: false,
  })

applyDocumentLocale(initialLocale)

/** The initialized i18next instance used by the local React facade. */
export { i18n }

/** Changes the active locale immediately and saves the user's explicit preference. */
export function changeLocale(locale: Locale): Promise<void> {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Locale changes still work in privacy-restricted storage contexts.
  }
  return i18n.changeLanguage(locale).then(() => undefined)
}

/** Formats a date using the active locale unless an explicit locale is supplied. */
export function formatDate(
  value: Date | number,
  options?: Intl.DateTimeFormatOptions,
  locale: Locale = currentLocale(),
): string {
  return getDateTimeFormatter(locale, options).format(value)
}

/** Formats a number using the active locale unless an explicit locale is supplied. */
export function formatNumber(
  value: number | bigint,
  options?: Intl.NumberFormatOptions,
  locale: Locale = currentLocale(),
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

/** Formats a relative duration using the active locale unless an explicit locale is supplied. */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  options?: Intl.RelativeTimeFormatOptions,
  locale: Locale = currentLocale(),
): string {
  return new Intl.RelativeTimeFormat(locale, options).format(value, unit)
}

/** Formats a list using the active locale unless an explicit locale is supplied. */
export function formatList(
  values: readonly string[],
  options?: Intl.ListFormatOptions,
  locale: Locale = currentLocale(),
): string {
  return new Intl.ListFormat(locale, options).format(values)
}

/** React facade for localized messages, state, and locale-aware formatters. */
export function useLocale() {
  const { i18n: instance, t } = useTranslation()
  const locale = isLocale(instance.resolvedLanguage)
    ? instance.resolvedLanguage
    : isLocale(instance.language)
      ? instance.language
      : DEFAULT_LOCALE

  const setLocale = useCallback((nextLocale: Locale) => changeLocale(nextLocale), [])
  const localizedDate = useCallback(
    (value: Date | number, options?: Intl.DateTimeFormatOptions) => formatDate(value, options, locale),
    [locale],
  )
  const localizedNumber = useCallback(
    (value: number | bigint, options?: Intl.NumberFormatOptions) => formatNumber(value, options, locale),
    [locale],
  )
  const localizedRelativeTime = useCallback(
    (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) =>
      formatRelativeTime(value, unit, options, locale),
    [locale],
  )
  const localizedList = useCallback(
    (values: readonly string[], options?: Intl.ListFormatOptions) => formatList(values, options, locale),
    [locale],
  )

  return {
    locale,
    setLocale,
    t,
    formatDate: localizedDate,
    formatNumber: localizedNumber,
    formatRelativeTime: localizedRelativeTime,
    formatList: localizedList,
  }
}
