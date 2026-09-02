import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Switch, useKumoToastManager } from '@cloudflare/kumo'
import { CaretRight, Check, Eye, Lightning, ShieldCheck } from '@phosphor-icons/react'
import { RpcStub } from 'capnweb'
import { ActionLogEntry, Overseer, actionChangeTime } from '@gadgets/workshop-shared/api'
import { ActionKind } from '@gadgets/workshop-shared/gatekeeper'
import { GatekeeperIcon } from './components/GatekeeperIcon'
import { HookToggle } from './components/HookToggle'
import { AlwaysApproveButton, ResolveButton } from './components/ResolveButton'
import { WorkshopButton } from './components/WorkshopControls'
import { useActions } from './useActions'
import { useActionHistory } from './useActionHistory'
import type { HistoryViewFilter } from './useActionHistory'
import { useAutoApproval, autoApprovalKey, type AutoApprovalEntry } from './useAutoApproval'
import { useAlwaysApproveTag } from './useAlwaysApproveTag'
import { useAuthenticatedApi } from './AuthContext'
import { useAvatar } from './useAvatar'
import { useVendorBranding } from './useVendorBranding'
import { useResolveAction } from './useResolveAction'
import { safeExternalUrl } from './utils/safeExternalUrl'
import AutoApproveConfirmDialog from './components/AutoApproveConfirmDialog'
import { formatDate, formatRelativeTime as formatLocalizedRelativeTime, useLocale } from './i18n'

export type ActivityView = 'review' | 'history' | 'auto'
type Translate = ReturnType<typeof useLocale>['t']

const PANE_BAR = 'flex h-9 flex-shrink-0 items-center border-b border-kumo-line'

interface ActivityProps {
  overseer: RpcStub<Overseer>
  view: ActivityView
  onViewChange: (view: ActivityView) => void
  onAutoApproveChange?: () => void
  // Bumped when a rule is enabled from somewhere else (a pending row in chat), so the rule list
  // reflects it without being reopened.
  autoApproveReloadTrigger?: number
}

function historyFilters(t: Translate): { value: HistoryViewFilter; label: string }[] {
  return [
    { value: 'all', label: t('activityArea.common.all') },
    { value: 'action', label: t('activityArea.activity.filterActions') },
    { value: 'observation', label: t('activityArea.activity.filterObservations') },
    { value: 'bindHook', label: t('activityArea.activity.filterHooks') },
  ]
}

function formatClockTime(date: Date): string {
  return formatDate(new Date(date), { hour: 'numeric', minute: '2-digit' })
}

function formatFullDate(date: Date): string {
  return formatDate(new Date(date), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date): string {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(date).getTime()) / 60_000)
  if (minutes < 1) return formatLocalizedRelativeTime(0, 'second', { numeric: 'auto' })
  if (minutes < 60) return formatLocalizedRelativeTime(-minutes, 'minute', { numeric: 'auto', style: 'narrow' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return formatLocalizedRelativeTime(-hours, 'hour', { numeric: 'auto', style: 'narrow' })
  return formatLocalizedRelativeTime(-Math.floor(hours / 24), 'day', { numeric: 'auto', style: 'narrow' })
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function dayLabel(date: Date, t: Translate): string {
  const value = new Date(date)
  const days = Math.round((startOfDay(new Date()) - startOfDay(value)) / 86_400_000)
  if (days === 0) return t('activityArea.activity.today')
  if (days === 1) return t('activityArea.activity.yesterday')
  return formatDate(value, { month: 'long', day: 'numeric', year: 'numeric' })
}

function activityStatus(
  record: ActionLogEntry,
  t: Translate,
): { label: string; dotClass: string; textClass: string } {
  if (record.type === 'observation') {
    return { label: t('activityArea.activity.observed'), dotClass: 'bg-kumo-inactive', textClass: 'text-kumo-subtle' }
  }
  if (record.type === 'bindHook') {
    if (record.hookId === undefined) {
      return { label: t('activityArea.activity.deleted'), dotClass: 'bg-kumo-inactive', textClass: 'text-kumo-subtle' }
    }
    return record.enabled
      ? { label: t('activityArea.common.enabled'), dotClass: 'bg-kumo-success', textClass: 'text-kumo-subtle' }
      : { label: t('activityArea.common.disabled'), dotClass: 'bg-kumo-inactive', textClass: 'text-kumo-subtle' }
  }
  if (record.state === 'pending') {
    return { label: t('activityArea.common.pending'), dotClass: 'bg-kumo-brand', textClass: 'text-kumo-strong' }
  }
  if (record.state === 'rejected') {
    return { label: t('activityArea.common.denied'), dotClass: 'bg-kumo-danger', textClass: 'text-kumo-danger' }
  }
  return { label: t('activityArea.common.approved'), dotClass: 'bg-kumo-success', textClass: 'text-kumo-subtle' }
}

function TypeIcon({ record, className }: { record: ActionLogEntry; className?: string }) {
  const props = { size: 13, weight: 'bold' as const, className }
  if (record.type === 'observation') return <Eye {...props} />
  if (record.type === 'bindHook') return <Lightning {...props} />
  return <ShieldCheck {...props} />
}

function LoadOlderButton({ history, className, label }: {
  history: { loadMore: () => void; isLoadingMore: boolean }
  className?: string
  label?: string
}) {
  const { t } = useLocale()
  return (
    <WorkshopButton className={className} onClick={history.loadMore}
        disabled={history.isLoadingMore}>
      {history.isLoadingMore ? t('activityArea.common.loading') : (label ?? t('activityArea.activity.loadOlder'))}
    </WorkshopButton>
  )
}

/** Centered full-pane notice: an empty, error, or call-to-action state. */
function ActivityNotice({ icon, title, description, children }: {
  icon?: ReactNode
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {icon && (
        <span className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-kumo-tint text-kumo-subtle">
          {icon}
        </span>
      )}
      <p className="m-0 text-[13px] font-medium leading-[18px] tracking-[-0.25px] text-kumo-default">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-xs text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}

export default function Activity({
  overseer,
  view,
  onViewChange,
  onAutoApproveChange,
  autoApproveReloadTrigger,
}: ActivityProps) {
  const { t } = useLocale()
  const translateRef = useRef(t)
  translateRef.current = t
  const { status: pendingStatus, pending: pendingActions } = useActions(overseer)
  const [historyFilter, setHistoryFilter] = useState<HistoryViewFilter>('all')
  const [processingActions, setProcessingActions] = useState<Set<number>>(new Set())
  const [togglingHooks, setTogglingHooks] = useState<Set<number>>(new Set())
  const [expandedActionId, setExpandedActionId] = useState<number | null>(null)
  const [confirmAutoApprove, setConfirmAutoApprove] = useState<{
    actionId: number
    gatekeeperId: number
    resourceTitle: string
    actionKind: ActionKind
    actionLabel: string
  } | null>(null)
  const toasts = useKumoToastManager()

  const history = useActionHistory(overseer, historyFilter, view === 'history')

  // Grouped by day in id order (newest first). A day label can repeat when resolution order
  // differs from creation order — accepted for a paged, creation-ordered log.
  const historyGroups = useMemo(() => {
    const groups: { label: string; records: ActionLogEntry[] }[] = []
    for (const record of history.entries) {
      const label = dayLabel(actionChangeTime(record), t)
      const last = groups.at(-1)
      if (last?.label === label) last.records.push(record)
      else groups.push({ label, records: [record] })
    }
    return groups
  }, [history.entries, t])

  const resolveAction = useResolveAction(overseer, setProcessingActions)

  const handleToggleHook = async (hookId: number, enabled: boolean) => {
    setTogglingHooks(previous => new Set(previous).add(hookId))
    try {
      if (enabled) await overseer.enableHook(hookId)
      else await overseer.disableHook(hookId)
    } catch (error) {
      console.error('Failed to toggle hook:', error)
      toasts.add({
        title: translateRef.current('activityArea.activity.hookToggleFailed', {
          action: enabled ? translateRef.current('activityArea.common.enable') : translateRef.current('activityArea.common.disable'),
        }),
        variant: 'error',
      })
    } finally {
      setTogglingHooks(previous => {
        const next = new Set(previous)
        next.delete(hookId)
        return next
      })
    }
  }

  const { alwaysApproveTag, isTagAutoApproved } =
    useAlwaysApproveTag(overseer, setProcessingActions, onAutoApproveChange)

  const toggleExpanded = (id: number) => {
    setExpandedActionId(previous => (previous === id ? null : id))
  }

  function renderReviewContent(): ReactNode {
    if (pendingActions.length > 0) {
      return (
        <>
          <div className={`${PANE_BAR} gap-2 px-5`}>
            <span className="text-[12.5px] font-medium leading-[17px] tracking-[-0.15px] text-kumo-default">
              {t('activityArea.activity.requestsWaiting', { count: pendingActions.length, noun: pendingActions.length === 1 ? t('activityArea.activity.request') : t('activityArea.activity.requests') })}
            </span>
            <span className="ml-auto text-[11.5px] leading-[17px] text-kumo-inactive">{t('activityArea.activity.oldestFirst')}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {pendingActions.map(record => {
              const autoApproveTarget =
                record.type === 'action' && record.gatekeeperId !== undefined &&
                record.description.actionKind !== undefined &&
                record.description.autoApprovable === true
                  ? {
                      actionId: record.id,
                      gatekeeperId: record.gatekeeperId,
                      resourceTitle: record.resourceTitle,
                      actionKind: record.description.actionKind,
                      actionLabel: record.description.title,
                    }
                  : undefined
              return (
                <ReviewRequest
                  key={record.id}
                  record={record}
                  expanded={expandedActionId === record.id}
                  processing={processingActions.has(record.id)}
                  onToggle={() => toggleExpanded(record.id)}
                  onApprove={() => void resolveAction(record.id, 'approve')}
                  onReject={() => void resolveAction(record.id, 'deny')}
                  onAlwaysApprove={
                    autoApproveTarget &&
                    !isTagAutoApproved(autoApproveTarget.gatekeeperId, autoApproveTarget.actionKind.tag)
                      ? () => setConfirmAutoApprove(autoApproveTarget)
                      : undefined
                  }
                />
              )
            })}
            {pendingStatus === 'checking' && (
              <p className="m-0 px-5 py-3 text-center text-[12px] leading-4 text-kumo-inactive">
                {t('activityArea.activity.stillChecking')}
              </p>
            )}
            {pendingStatus === 'error' && (
              <p className="m-0 px-5 py-3 text-center text-[12px] leading-4 text-kumo-inactive">
                {t('activityArea.activity.finishCheckingFailed')}
              </p>
            )}
          </div>
        </>
      )
    }

    if (pendingStatus === 'checking') {
      return (
        <div className="flex flex-1 items-center justify-center text-[13px] text-kumo-subtle">
          {t('activityArea.activity.checkingRequests')}
        </div>
      )
    }

    if (pendingStatus === 'error') {
      return (
        <ActivityNotice
          title={t('activityArea.activity.checkRequestsFailed')}
          description={t('activityArea.activity.reloadPage')}
        />
      )
    }

    return (
      <ActivityNotice
        icon={<Check size={17} weight="bold" />}
        title={t('activityArea.activity.nothingToReview')}
        description={t('activityArea.activity.reviewDescription')}
      >
        <WorkshopButton className="mt-4" onClick={() => onViewChange('history')}>
          {t('activityArea.activity.viewHistory')}
        </WorkshopButton>
      </ActivityNotice>
    )
  }

  function renderHistoryBody(): ReactNode {
    if (history.entries.length > 0) {
      return (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid grid-cols-[54px_minmax(0,1fr)_auto_16px] items-center gap-3 border-b border-kumo-line bg-kumo-elevated/50 px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-kumo-inactive">
            <span>{t('activityArea.activity.time')}</span>
            <span>{t('activityArea.activity.event')}</span>
            <span>{t('activityArea.activity.status')}</span>
            <span />
          </div>
          {historyGroups.map(group => (
            // Keyed by the group's oldest record: live inserts land at the front of a group, so
            // keying by the first would remount the section (dropping focus) on every insert.
            // Day labels can repeat (see historyGroups), so the label alone can't be the key.
            <section key={group.records.at(-1)!.id}>
              <h3 className="sticky top-0 m-0 border-b border-kumo-line bg-kumo-base/90 px-5 py-1 text-[11px] font-medium uppercase tracking-[0.06em] text-kumo-inactive backdrop-blur-sm">
                {group.label}
              </h3>
              {group.records.map(record => (
                <HistoryRow
                  key={record.id}
                  record={record}
                  expanded={expandedActionId === record.id}
                  onToggle={() => toggleExpanded(record.id)}
                  togglingHook={record.type === 'bindHook' && record.hookId !== undefined
                    ? togglingHooks.has(record.hookId)
                    : false}
                  onToggleHook={handleToggleHook}
                />
              ))}
            </section>
          ))}
          {history.loadMoreFailed ? (
            <div className="flex items-center justify-center gap-3 py-3">
              <span className="text-[12px] leading-4 text-kumo-inactive">
                {t('activityArea.activity.olderLoadFailed')}
              </span>
              <LoadOlderButton history={history} label={t('activityArea.common.retry')} />
            </div>
          ) : history.hasMore && (
            <div className="flex justify-center py-3">
              <LoadOlderButton history={history} />
            </div>
          )}
        </div>
      )
    }

    if (history.status === 'error') {
      return (
        <ActivityNotice title={t('activityArea.activity.activityLoadFailed')}>
          <LoadOlderButton className="mt-4" history={history} label={t('activityArea.common.retry')} />
        </ActivityNotice>
      )
    }

    if (history.status === 'loading') {
      return (
        <div className="flex flex-1 items-center justify-center text-[13px] text-kumo-subtle">
          {t('activityArea.activity.loadingActivity')}
        </div>
      )
    }

    if (history.hasMore) {
      return (
        <ActivityNotice title={t('activityArea.activity.nothingRecent')}>
          <LoadOlderButton className="mt-4" history={history} />
        </ActivityNotice>
      )
    }

    if (historyFilter === 'all') {
      return (
        <ActivityNotice
          title={t('activityArea.activity.noActivity')}
          description={t('activityArea.activity.noActivityDescription')}
        />
      )
    }

    return (
      <ActivityNotice title={t('activityArea.activity.noMatchingEvents')}>
        <button
          type="button"
          onClick={() => setHistoryFilter('all')}
          className="mt-1.5 cursor-pointer text-[12px] font-medium text-kumo-subtle hover:text-kumo-default"
        >
          {t('activityArea.activity.showAllActivity')}
        </button>
      </ActivityNotice>
    )
  }

  function renderActivityContent(): ReactNode {
    switch (view) {
      case 'review':
        return renderReviewContent()
      case 'history':
        return (
          <>
            <div className={`${PANE_BAR} gap-1 px-3`}>
              {historyFilters(t).map(filter => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setHistoryFilter(filter.value)}
                  className={`flex h-6 cursor-pointer items-center rounded-md px-2 text-[12.5px] font-medium tracking-[-0.15px] transition-colors ${
                    historyFilter === filter.value
                      ? 'bg-kumo-tint text-kumo-default'
                      : 'text-kumo-subtle hover:text-kumo-default'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <span className="ml-auto pr-2 text-[11.5px] leading-[17px] tabular-nums text-kumo-inactive">
                {t('activityArea.activity.loaded', { count: history.entries.length })}
              </span>
            </div>
            {renderHistoryBody()}
          </>
        )
      case 'auto':
        return <AutoApprovalPanel overseer={overseer} reloadTrigger={autoApproveReloadTrigger} />
    }
  }

  return (
    <div className="flex h-full flex-col bg-kumo-base">
      {renderActivityContent()}

      {confirmAutoApprove && (
        <AutoApproveConfirmDialog
          open
          actionLabel={confirmAutoApprove.actionLabel}
          resourceTitle={confirmAutoApprove.resourceTitle}
          isProcessing={processingActions.has(confirmAutoApprove.actionId)}
          onOpenChange={open => { if (!open) setConfirmAutoApprove(null) }}
          onConfirm={async () => {
            const { actionId, gatekeeperId, actionKind } = confirmAutoApprove
            if (await alwaysApproveTag(actionId, gatekeeperId, actionKind)) {
              setConfirmAutoApprove(null)
            }
          }}
        />
      )}
    </div>
  )
}

function AutoApprovalPanel({
  overseer,
  reloadTrigger,
}: {
  overseer: RpcStub<Overseer>
  reloadTrigger?: number
}) {
  const { t } = useLocale()
  const { entries, isLoading, loadError, pending, refresh, setEnabled } = useAutoApproval(overseer)
  const { authenticatedApi } = useAuthenticatedApi()
  const vendorBranding = useVendorBranding(authenticatedApi)

  const previousReloadTrigger = useRef(reloadTrigger)
  useEffect(() => {
    if (reloadTrigger === previousReloadTrigger.current) return
    previousReloadTrigger.current = reloadTrigger
    void refresh()
  }, [reloadTrigger, refresh])

  const groups = useMemo(() => {
    const byConnection = new Map<
      number,
      { gatekeeperId: number; title: string; vendorId?: string; entries: AutoApprovalEntry[] }
    >()
    for (const entry of entries) {
      const group = byConnection.get(entry.gatekeeperId)
      if (group) group.entries.push(entry)
      else {
        byConnection.set(entry.gatekeeperId, {
          gatekeeperId: entry.gatekeeperId,
          title: entry.resourceTitle,
          vendorId: entry.vendorId,
          entries: [entry],
        })
      }
    }
    for (const group of byConnection.values()) {
      group.title ||= t('activityArea.activity.unavailableConnection')
      group.entries = group.entries.toSorted((a, b) =>
        a.actionKind.label.localeCompare(b.actionKind.label))
    }
    return [...byConnection.values()].toSorted((a, b) => a.title.localeCompare(b.title))
  }, [entries, t])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-kumo-subtle">
        {t('activityArea.activity.loadingAutoApproval')}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="m-0 text-[13px] font-medium leading-[18px] tracking-[-0.25px] text-kumo-default">
          {loadError ? t('activityArea.activity.autoApprovalLoadFailed') : t('activityArea.activity.nothingAutomatic')}
        </p>
        <p className="mt-1 max-w-xs text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle">
          {loadError
            ? t('activityArea.activity.autoApprovalIncomplete')
            : t('activityArea.activity.autoApprovalEmpty')}
        </p>
        {loadError && (
          <WorkshopButton className="mt-4" onClick={() => void refresh()}>
            {t('activityArea.common.retry')}
          </WorkshopButton>
        )}
      </div>
    )
  }

  return (
    <>
      <div className={`${PANE_BAR} gap-3 px-5`}>
        <p className="m-0 min-w-0 flex-1 truncate text-[12.5px] leading-[17px] tracking-[-0.2px] text-kumo-subtle">
          {loadError
            ? t('activityArea.activity.autoApprovalSomeFailed')
            : t('activityArea.activity.autoApprovalDescription')}
        </p>
        {loadError && (
          <button
            type="button"
            onClick={() => void refresh()}
            className="cursor-pointer text-[12px] font-medium text-kumo-default hover:text-kumo-default-hover"
          >
            {t('activityArea.common.retry')}
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {groups.map(group => (
          <section key={group.gatekeeperId}>
            <div className="sticky top-0 flex items-center gap-2 border-b border-kumo-line bg-kumo-base/90 px-5 py-1.5 backdrop-blur-sm">
              <GatekeeperIcon
                vendorId={group.vendorId}
                {...(group.vendorId ? vendorBranding.get(group.vendorId) : undefined)}
                fallbackText={group.title}
                size={12}
                className="h-5 w-5 rounded-md [&>img]:p-px"
              />
              <h3 className="m-0 min-w-0 truncate text-[12px] font-medium leading-4 tracking-[-0.2px] text-kumo-subtle">
                {group.title}
              </h3>
            </div>
            {group.entries.map(entry => {
              const key = autoApprovalKey(entry)
              const busy = pending.has(key)
              return (
                <div
                  key={key}
                  className="flex w-full items-center gap-3 border-b border-kumo-line/60 px-5 py-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-[18px] font-medium tracking-[-0.25px] text-kumo-default">
                      {entry.actionKind.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-4 tracking-[-0.2px] text-kumo-inactive">
                      {entry.orphaned
                        ? t('activityArea.activity.orphanedRule')
                        : entry.enabled
                          ? t('activityArea.activity.appliedWithoutAsking')
                          : t('activityArea.activity.waitsForApproval')}
                    </span>
                  </span>
                  <Switch
                    size="sm"
                    checked={entry.enabled}
                    disabled={busy}
                    aria-label={t('activityArea.activity.toggleAutoApproval', {
                      action: entry.enabled ? t('activityArea.common.disable') : t('activityArea.common.enable'),
                      name: entry.actionKind.label,
                    })}
                    onCheckedChange={enabled => void setEnabled(entry, enabled)}
                  />
                </div>
              )
            })}
          </section>
        ))}
      </div>
    </>
  )
}

function ReviewRequest({
  record,
  expanded,
  processing,
  onToggle,
  onApprove,
  onReject,
  onAlwaysApprove,
}: {
  record: ActionLogEntry
  expanded: boolean
  processing: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  onAlwaysApprove?: () => void
}) {
  const resourceUrl = safeExternalUrl(record.resourceUrl)
  return (
    <article className="border-b border-kumo-line px-5 py-3 transition-colors hover:bg-kumo-elevated/50">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-[8rem] flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex max-w-full cursor-pointer items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-ring"
          >
            <h3 className="m-0 truncate text-[13px] font-medium leading-[18px] tracking-[-0.25px] text-kumo-default">
              {record.description.title}
            </h3>
            <CaretRight
              size={12}
              className={`flex-shrink-0 text-kumo-inactive transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
          <p className="mt-0.5 truncate text-[11.5px] leading-4 tracking-[-0.1px] text-kumo-inactive">
            {resourceUrl ? (
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-kumo-default hover:underline"
              >
                {record.resourceTitle}
              </a>
            ) : record.resourceTitle}
            <span className="px-1">·</span>
            {formatRelativeTime(record.createdAt)}
          </p>
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
          {onAlwaysApprove && (
            <AlwaysApproveButton onClick={onAlwaysApprove} disabled={processing} />
          )}
          <ResolveButton tone="deny" onClick={onReject} disabled={processing} />
          <ResolveButton tone="approve" onClick={onApprove} disabled={processing} />
        </div>
      </div>

      {record.description.description && (
        <p className={`mt-1.5 max-w-2xl whitespace-pre-wrap text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle ${expanded ? '' : 'line-clamp-2'}`}>
          {record.description.description}
        </p>
      )}
    </article>
  )
}

function HistoryRow({
  record,
  expanded,
  onToggle,
  togglingHook,
  onToggleHook,
}: {
  record: ActionLogEntry
  expanded: boolean
  onToggle: () => void
  togglingHook: boolean
  onToggleHook: (hookId: number, enabled: boolean) => void
}) {
  const { t } = useLocale()
  const resourceUrl = safeExternalUrl(record.resourceUrl)
  const resolvedBy = record.type === 'action' ? record.resolvedBy : undefined
  const autoApproved = record.type === 'action' && record.autoApproved === true
  const at = actionChangeTime(record)
  const status = activityStatus(record, t)

  return (
    <div className={expanded ? 'bg-kumo-elevated/30' : ''}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="group grid w-full cursor-pointer grid-cols-[54px_minmax(0,1fr)_auto_16px] items-center gap-3 border-b border-kumo-line/70 px-5 py-[7px] text-left transition-colors hover:bg-kumo-elevated/50"
      >
        <time className="text-[11.5px] tabular-nums leading-4 text-kumo-inactive">
          {formatClockTime(at)}
        </time>
        <span className="flex min-w-0 items-center gap-2">
          <TypeIcon record={record} className="flex-shrink-0 text-kumo-inactive" />
          <span className="truncate text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-default">
            {record.description.title}
          </span>
          <span className="hidden flex-shrink-0 truncate text-[12px] leading-4 tracking-[-0.1px] text-kumo-inactive sm:inline">
            {record.resourceTitle}
          </span>
        </span>
        <span className={`flex items-center gap-1.5 text-[11.5px] font-medium ${status.textClass}`}>
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${status.dotClass}`} />
          {status.label}
        </span>
        <CaretRight
          size={12}
          className={`text-kumo-inactive transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-b border-kumo-line/70 px-5 pb-3 pl-[86px] pt-1">
          {record.description.description && (
            <p className="m-0 whitespace-pre-wrap text-[13px] leading-[18px] tracking-[-0.25px] text-kumo-subtle">
              {record.description.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-kumo-inactive">
            <span>{formatFullDate(at)}</span>
            <span className="text-kumo-subtle">{record.resourceTitle}</span>
            {resolvedBy && (
              <ResolverBadge profileId={resolvedBy.id}>
                {autoApproved
                  ? t('activityArea.activity.autoApproved', { name: resolvedBy.name })
                  : t('activityArea.activity.by', { name: resolvedBy.name })}
              </ResolverBadge>
            )}
            {resourceUrl && (
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-kumo-subtle hover:text-kumo-default hover:underline"
              >
                {t('activityArea.activity.openResource')}
              </a>
            )}
            {record.type === 'bindHook' && record.hookId !== undefined && (
              <HookToggle
                enabled={record.enabled}
                disabled={togglingHook}
                onToggle={enabled => onToggleHook(record.hookId!, enabled)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ResolverBadge({ profileId, children }: { profileId: string; children: ReactNode }) {
  const { authenticatedApi } = useAuthenticatedApi()
  const avatarUrl = useAvatar(authenticatedApi, profileId)
  return (
    <span className="flex min-w-0 items-center gap-1 text-kumo-subtle">
      {avatarUrl && (
        <img src={avatarUrl} alt="" className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover" />
      )}
      <span className="truncate">{children}</span>
    </span>
  )
}
