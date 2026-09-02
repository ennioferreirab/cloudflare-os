import { Component, type ReactNode } from "react";
import { reportIssue } from "./error-reporting";
import { schedulerCopy, type SchedulerLocale } from "./locale";

export default class ErrorBoundary extends Component<
  { children: ReactNode; locale: SchedulerLocale },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: Error) {
    reportIssue("scheduler.react-render", error, {
      handled: false,
      severity: "fatal",
      captureMechanism: "react",
    });
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    const copy = schedulerCopy(this.props.locale);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">{copy.errorTitle}</h1>
        <button className="rounded-md border px-3 py-2" onClick={() => location.reload()}>
          {copy.reload}
        </button>
      </main>
    );
  }
}
