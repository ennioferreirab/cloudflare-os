import { Component, type ReactNode } from 'react'
import { reportIssue } from './errorReporting'
import { useLocale } from './i18n'

type Props = { children: ReactNode; t: ReturnType<typeof useLocale>['t'] }
type State = { crashed: boolean }

/** Last-resort Workshop shell fallback for unexpected React render crashes. */
class FrontendErrorBoundaryInner extends Component<Props, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  componentDidCatch(error: Error) {
    reportIssue('workshop.react-render', error, {
      handled: false,
      severity: 'fatal',
      captureMechanism: 'react',
    })
  }

  render() {
    if (!this.state.crashed) return this.props.children
    const { t } = this.props
    return (
      <main className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">{t('workspace.errorBoundary.title')}</h1>
        <p className="text-sm text-kumo-subtle">{t('workspace.errorBoundary.description')}</p>
        <button className="rounded-md bg-kumo-brand px-4 py-2 text-sm" onClick={() => location.reload()}>
          {t('workspace.errorBoundary.reload')}
        </button>
      </main>
    )
  }
}

/** Last-resort Workshop shell fallback, with the current UI locale. */
export default function FrontendErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  return <FrontendErrorBoundaryInner t={t}>{children}</FrontendErrorBoundaryInner>
}
