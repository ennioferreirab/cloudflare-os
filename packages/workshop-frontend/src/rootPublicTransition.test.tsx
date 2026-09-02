// @vitest-environment jsdom
/* eslint-disable react/react-in-jsx-scope */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  createMemoryHistory,
  createRouter,
  lazyRouteComponent,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as RootRouteImport } from "./routes/__root";
import { HomePageContent, Route as HomeRouteImport } from "./routes/index";
import { Route as SignupRouteImport } from "./routes/signup";

vi.mock("./RpcContext", () => ({
  useRpcStub: () => ({}),
  useConnectionLost: () => false,
}));

vi.mock("./useAuth", () => ({
  CF_ACCESS_MODE: false,
  useAuth: () => ({
    isAuthenticated: false,
    authenticatedApi: null,
    isLoading: false,
    error: null,
    logout: vi.fn<() => void>(),
    login: vi.fn<(token: string) => void>(),
  }),
}));

vi.mock("@cloudflare/kumo", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Toasty: ({ children }: { children: React.ReactNode }) => children,
  useKumoToastManager: () => ({ add: vi.fn<(toast: unknown) => void>() }),
}));

vi.mock("./components/Header", () => ({ default: () => null }));
vi.mock("./components/AppShell/AppShell", () => ({ default: () => null }));
vi.mock("./LoginPage", () => ({ default: () => null }));
vi.mock("./OnboardingWizard", () => ({ default: () => null }));
vi.mock("./components/billing/AccountSelectionModal", () => ({ default: () => null }));
vi.mock("./SignupPage", () => ({ default: () => null }));
vi.mock("./ChatInterface", () => ({ ChatInput: () => null }));
vi.mock("./components/MeshBackground", () => ({ default: () => null }));
vi.mock("./components/AppShell/HomeTaskSuggestions", () => ({ default: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};

function noop() {}

function makeRouter() {
  const rootRoute = RootRouteImport;
  const homeComponent = lazyRouteComponent(async () => ({
    default: () => <HomePageContent />,
  }));
  const homeRoute = HomeRouteImport.update({
    id: "/",
    path: "/",
    getParentRoute: () => rootRoute,
    component: homeComponent,
  } as never);
  let resolveSignup = noop;
  let markSignupStarted = noop;
  const signupStarted = new Promise<void>((resolve) => {
    markSignupStarted = resolve;
  });
  const signupComponent = lazyRouteComponent(
    () => {
      markSignupStarted();
      return new Promise<{ default: () => null }>((resolve) => {
        resolveSignup = () => resolve({ default: () => null });
      });
    },
  );
  const signupRoute = SignupRouteImport.update({
    id: "/signup",
    path: "/signup",
    getParentRoute: () => rootRoute,
    component: signupComponent,
  } as never);
  const history = createMemoryHistory({ initialEntries: ["/"] });
  return {
    resolveSignup: () => resolveSignup(),
    signupStarted,
    router: createRouter({
      history,
      routeTree: rootRoute.addChildren([homeRoute, signupRoute]),
    }),
  };
}

describe("public route transitions", () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    vi.restoreAllMocks();
  });

  it("does not render the authenticated home route while opening signup", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { resolveSignup, signupStarted, router } = makeRouter();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root!.render(<RouterProvider router={router} />));
    let navigation: Promise<void>;
    act(() => {
      navigation = router.navigate({ to: "/signup" });
    });
    await signupStarted;
    await new Promise((resolve) => setTimeout(resolve));

    expect(router.state.location.pathname).toBe("/signup");
    expect(consoleError.mock.calls.flat().join("\n")).not.toContain(
      "useAuthenticatedApi must be used within an AuthProvider",
    );

    await act(async () => {
      resolveSignup();
      await navigation!;
    });
  });
});
