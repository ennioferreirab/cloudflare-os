// ScaleOS pins the Workshop root to the light palette and canonical signal color. The existing
// theme-mode and accent APIs remain in place for compatibility, but their stored inputs do not
// change this fork's root appearance. Kumo still resolves its semantic tokens from styles.css.

import { applyAccentColor as applyAccentColorToStyle } from '@gadgets/workshop-shared/theme'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedThemeMode = 'light' | 'dark'

const THEME_MODE_STORAGE_KEY = 'gadgets:theme-mode'

/** ScaleOS currently defines a light product surface only; dark support stays dormant. */
export const SCALEOS_LIGHT_ONLY = true

/** Canonical ScaleOS signal colour. Deployment accent overrides are disabled in this fork. */
export const SCALEOS_SIGNAL_COLOR = '#2351ff'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function getSystemThemeMode(): ResolvedThemeMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function readThemeMode(): ThemeMode {
  if (SCALEOS_LIGHT_ONLY) return 'light'
  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function writeThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)
  } catch {
    // Ignore storage failures; the selected mode still applies for this session.
  }
}

export function resolveThemeMode(mode: ThemeMode): ResolvedThemeMode {
  if (SCALEOS_LIGHT_ONLY) return 'light'
  return mode === 'system' ? getSystemThemeMode() : mode
}

export function applyThemeMode(mode: ThemeMode): ResolvedThemeMode {
  const resolved = resolveThemeMode(mode)
  const root = document.documentElement

  root.setAttribute('data-mode', resolved)
  root.style.colorScheme = resolved

  return resolved
}

export function applyStoredThemeMode(): ResolvedThemeMode {
  return applyThemeMode(readThemeMode())
}

/** Apply the fixed ScaleOS signal color; the argument remains for upstream caller compatibility. */
export function applyAccentColor(color: string | null | undefined): void {
  applyAccentColorToStyle(
    document.documentElement.style,
    SCALEOS_LIGHT_ONLY ? SCALEOS_SIGNAL_COLOR : color,
  )
}

/** The canonical ScaleOS accent exposed to callers that need the root theme default. */
export const DEFAULT_ACCENT_COLOR = SCALEOS_SIGNAL_COLOR
