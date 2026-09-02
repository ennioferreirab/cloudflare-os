import { createFileRoute } from '@tanstack/react-router'
import { BookOpen, Sparkle, type Icon as PhosphorIcon } from '@phosphor-icons/react'
import { useDocumentTitle } from '../useDocumentTitle'
import ComingSoonPreview from '../components/ComingSoonPreview'
import { useSiteName } from '../ServerConfigContext'
import { useLocale } from '../i18n'

/**
 * Context & Skills. The knowledge/skills surface isn't built into the rail yet — agents read
 * curated collections of documents (context) and reusable skills. Until then this page shows a
 * frosted design mock so the nav entry has a stable, on-language target.
 */
export const Route = createFileRoute('/context')({
  component: ContextPage,
})

type Kind = 'collection' | 'skill'

interface ContextItem {
  id: string
  nameKey: 'companyHandbook' | 'brandVoice' | 'apiReference' | 'summarizeMeeting' | 'salesPlaybook' | 'customerEmail'
  kind: Kind
}

const TYPE_META: Record<Kind, { Icon: PhosphorIcon }> = {
  collection: { Icon: BookOpen },
  skill: { Icon: Sparkle },
}

const MOCK_ITEMS: ContextItem[] = [
  { id: '1', nameKey: 'companyHandbook', kind: 'collection' },
  { id: '2', nameKey: 'brandVoice', kind: 'collection' },
  { id: '3', nameKey: 'apiReference', kind: 'collection' },
  { id: '4', nameKey: 'summarizeMeeting', kind: 'skill' },
  { id: '5', nameKey: 'salesPlaybook', kind: 'collection' },
  { id: '6', nameKey: 'customerEmail', kind: 'skill' },
]

function ContextRow({ item }: { item: ContextItem }) {
  const { t } = useLocale()
  const { Icon } = TYPE_META[item.kind]
  const itemCopy = t(`library.context.items.${item.nameKey}`, { returnObjects: true }) as { name: string; detail: string; updated: string }
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kumo-fill text-kumo-subtle">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-[-0.25px] text-kumo-default">{itemCopy.name}</p>
        <p className="mt-0.5 truncate text-[12px] leading-4 tracking-[-0.2px] text-kumo-subtle">
          {t(`library.context.types.${item.kind}`)} · {itemCopy.detail}
        </p>
      </div>
      <span className="hidden shrink-0 text-xs tracking-[-0.1px] text-kumo-inactive lg:block">
        {itemCopy.updated}
      </span>
    </div>
  )
}

function ContextPage() {
  const { t } = useLocale()
  useDocumentTitle(t('library.context.title'))
  const siteName = useSiteName()
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-3 sm:px-10">
      <header className="px-3 pb-4 pt-6 sm:pt-10">
        <h1 className="text-2xl font-semibold tracking-tight text-kumo-default">{t('library.context.title')}</h1>
        <p className="mt-1 text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle">
          {t('library.context.description')}
        </p>
      </header>

      <ComingSoonPreview
        icon={BookOpen}
        title={t('library.context.comingTitle', { siteName })}
        description={t('library.context.comingDescription')}
      >
        <div className="chat-panel min-h-0 flex-1 overflow-y-auto pb-8 pt-1">
          <div className="flex flex-col gap-0.5">
            {MOCK_ITEMS.map((item) => (
              <ContextRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </ComingSoonPreview>
    </div>
  )
}
