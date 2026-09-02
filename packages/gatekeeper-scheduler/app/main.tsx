import { createRoot } from "react-dom/client";
import { RpcTarget, newMessagePortRpcSession, type RpcStub } from "capnweb";
import type {
  GatekeeperAppTheme,
  GatekeeperAppThemeReceiver,
} from "@gadgets/workshop-shared/theme";
import SchedulerPage, { type ScheduleManagementClient } from "./SchedulerPage";
import ErrorBoundary from "./ErrorBoundary";
import { installErrorReporting, reportIssue } from "./error-reporting";
import { applyAppTheme } from "./theme";
import {
  applySchedulerLocale,
  normalizeSchedulerLocale,
  type SchedulerLocale,
} from "./locale";
import "./styles.css";

installErrorReporting();

type LocaleReceiver = RpcTarget & { setLocale(locale: string): void };

class AppIframe extends RpcTarget implements GatekeeperAppThemeReceiver {
  readonly #render: (locale: SchedulerLocale) => void;

  constructor(render: (locale: SchedulerLocale) => void) {
    super();
    this.#render = render;
  }

  setTheme(theme: GatekeeperAppTheme): void {
    applyAppTheme(theme);
  }

  setLocale(value: string): void {
    const locale = normalizeSchedulerLocale(value);
    applySchedulerLocale(locale);
    this.#render(locale);
  }
}

interface HostCapability extends RpcTarget {
  readonly ui: RpcStub<ScheduleManagementClient>;
  subscribeTheme(receiver: GatekeeperAppThemeReceiver): Promise<GatekeeperAppTheme>;
  subscribeLocale(receiver: LocaleReceiver): Promise<string>;
  openWorkspace(workspaceId: string, gadgetId?: number): Promise<void>;
  resolveWorkspaceTitles(ids: string[]): Promise<(string | null)[]>;
  openPrompt(prompt: string): Promise<void>;
}

function main() {
  const element = document.getElementById("root");
  if (!element) throw new Error("Missing Scheduler app root.");

  const { port1, port2 } = new MessageChannel();
  window.parent.postMessage({ type: "handshake" }, "*", [port2]);
  const root = createRoot(element, {
    onUncaughtError: (error) =>
      reportIssue("scheduler.react-root", error, {
        handled: false,
        severity: "fatal",
        captureMechanism: "react",
      }),
  });
  const render = (locale: SchedulerLocale) => root.render(
    <ErrorBoundary key={locale} locale={locale}>
      <SchedulerPage
        api={host.ui}
        locale={locale}
        openWorkspace={(workspaceId, gadgetId) => host.openWorkspace(workspaceId, gadgetId)}
        resolveWorkspaceTitles={(ids) => host.resolveWorkspaceTitles(ids)}
        openPrompt={(prompt) => host.openPrompt(prompt)}
      />
    </ErrorBoundary>,
  );
  const iframe = new AppIframe(render);
  const host = newMessagePortRpcSession<HostCapability>(port1, iframe);
  render("pt-BR");
  host
    .subscribeTheme(iframe)
    .then(applyAppTheme)
    .catch(() => {});
  host
    .subscribeLocale(iframe)
    .then((locale) => iframe.setLocale(locale))
    .catch(() => iframe.setLocale("en"));
}

main();
