import { DropdownMenu } from '@cloudflare/kumo'
import { isLocale, type Locale, useLocale } from '../i18n'
import { MENU_CONTENT, MENU_ITEM, MENU_POSITIONER_STYLE } from './menuStyles'

type LanguageSelectorProps = {
  /** Uses the compact menu treatment intended for the persistent app chrome. */
  variant?: 'field' | 'menu'
  className?: string
}

function languageName(locale: Locale, t: ReturnType<typeof useLocale>['t']) {
  return locale === 'en' ? t('language.english') : t('language.portugueseBrazil')
}

/** Lets a person switch between the built-in Workshop languages without a page reload. */
export default function LanguageSelector({
  variant = 'field',
  className,
}: LanguageSelectorProps) {
  const { locale, setLocale, t } = useLocale()
  const currentLanguage = languageName(locale, t)

  if (variant === 'menu') {
    return (
      <DropdownMenu>
        <DropdownMenu.Trigger
          render={(
            <button
              type="button"
              title={t('language.change')}
              aria-label={t('language.current', { language: currentLanguage })}
              className={[
                'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[10px] font-semibold text-kumo-inactive transition-colors hover:bg-kumo-tint hover:text-kumo-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-ring focus-visible:ring-offset-2 focus-visible:ring-offset-kumo-elevated',
                className ?? '',
              ].join(' ')}
            >
              <span aria-hidden>{locale === 'en' ? 'EN' : 'PT'}</span>
            </button>
          )}
        />
        <DropdownMenu.Content className={MENU_CONTENT} style={MENU_POSITIONER_STYLE}>
          {(['en', 'pt-BR'] as const).map((candidate) => (
            <DropdownMenu.Item
              key={candidate}
              onClick={() => void setLocale(candidate)}
              className={`${MENU_ITEM} flex items-center justify-between gap-6 ${locale === candidate ? 'font-medium' : ''}`}
            >
              {languageName(candidate, t)}
              {locale === candidate && <span aria-hidden>✓</span>}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
    )
  }

  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-[12px] font-medium tracking-[-0.1px] text-kumo-subtle">
        {t('language.label')}
      </span>
      <select
        aria-label={t('language.label')}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) void setLocale(event.target.value)
        }}
        className="h-9 cursor-pointer rounded-lg border border-kumo-line bg-kumo-base px-3 text-[14px] text-kumo-default outline-none transition-[border-color,box-shadow] focus:border-kumo-ring focus:ring-[3px] focus:ring-kumo-ring/15"
      >
        <option value="en">{t('language.english')}</option>
        <option value="pt-BR">{t('language.portugueseBrazil')}</option>
      </select>
    </label>
  )
}
