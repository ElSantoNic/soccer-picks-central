import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "@/i18n";

// ---- Mocks ---------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

const authState: { user: { id: string } | null; profile: any; loading: boolean } = {
  user: null,
  profile: null,
  loading: false,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// supabase mock
const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    from: (...args: any[]) => fromMock(...args),
  },
}));

// TopBar uses lots of stuff; stub it out
vi.mock("@/components/TopBar", () => ({
  default: () => <div data-testid="topbar" />,
}));

// Lazy import after mocks
import JoinLeaguePage from "@/pages/JoinLeaguePage";

const LEAGUE = { id: "league-uuid-1", name: "Quiniela de Amigos", join_code: "AB12" };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/l/:joinCode" element={<JoinLeaguePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockReset();
  rpcMock.mockReset();
  fromMock.mockReset();
  sessionStorage.clear();
  authState.user = null;
  authState.profile = null;
  authState.loading = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---- Tests ---------------------------------------------------------------

describe("Invite deep-link flow (/l/:joinCode)", () => {
  it("signed-out user: sees league + sign-in prompt, click saves pendingJoinUrl and navigates to /auth", async () => {
    rpcMock.mockResolvedValueOnce({ data: [LEAGUE], error: null });

    renderAt("/l/AB12");

    await waitFor(() =>
      expect(screen.getByText(LEAGUE.name)).toBeInTheDocument(),
    );
    expect(screen.getByText(/Inicia sesión para unirte/i)).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /Unirse a la quiniela/i });
    await userEvent.click(btn);

    expect(sessionStorage.getItem("pendingJoinUrl")).toBe("/l/AB12");
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it("signed-in non-member: clicking join inserts league_member and navigates to /league/:id", async () => {
    authState.user = { id: "user-1" };
    authState.profile = { display_name: "Ana", avatar_emoji: "🦊" };

    rpcMock.mockResolvedValueOnce({ data: [LEAGUE], error: null });

    // membership lookup -> not a member
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    fromMock.mockImplementation((table: string) => {
      if (table !== "league_members") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
        insert: insertMock,
      };
    });

    renderAt("/l/AB12");

    const btn = await screen.findByRole("button", { name: /Unirse a la quiniela/i });
    await userEvent.click(btn);

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    expect(insertMock).toHaveBeenCalledWith({
      league_id: LEAGUE.id,
      user_id: "user-1",
      display_name: "Ana",
      avatar_emoji: "🦊",
    });
    expect(mockNavigate).toHaveBeenCalledWith(`/league/${LEAGUE.id}`, { replace: true });
    expect(sessionStorage.getItem("pendingJoinUrl")).toBeNull();
  });

  it("signed-in existing member: auto-redirects to /league/:id without showing join button", async () => {
    authState.user = { id: "user-1" };

    rpcMock.mockResolvedValueOnce({ data: [LEAGUE], error: null });
    fromMock.mockImplementation((table: string) => {
      if (table !== "league_members") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: "mem-1" }, error: null }),
            }),
          }),
        }),
      };
    });

    renderAt("/l/AB12");

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(`/league/${LEAGUE.id}`, { replace: true }),
    );
    expect(
      screen.queryByRole("button", { name: /Unirse a la quiniela/i }),
    ).not.toBeInTheDocument();
  });

  it("brand-new user (signed-out, invalid code): shows not-found card", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    renderAt("/l/ZZZZ");

    expect(await screen.findByText(/Enlace no válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Código: ZZZZ/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Unirse a la quiniela/i }),
    ).not.toBeInTheDocument();
  });
});

// ---- AuthContext post-sign-in handoff -----------------------------------

describe("AuthContext post-sign-in handoff", () => {
  it("on SIGNED_IN, navigates to pendingJoinUrl and clears it", async () => {
    vi.resetModules();

    // Capture the auth state-change listener
    let listener: any;
    const unsubscribe = vi.fn();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        auth: {
          onAuthStateChange: (cb: any) => {
            listener = cb;
            return { data: { subscription: { unsubscribe } } };
          },
          getSession: () => Promise.resolve({ data: { session: null } }),
          signOut: vi.fn(),
        },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
      },
    }));

    const { AuthProvider } = await import("@/contexts/AuthContext");

    const replaceMock = vi.fn();
    const originalLocation = window.location;
    // jsdom: redefine location with a writable replace
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/auth", replace: replaceMock },
    });

    sessionStorage.setItem("pendingJoinUrl", "/l/AB12");

    render(
      <MemoryRouter>
        <AuthProvider>
          <div>app</div>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => {
      await listener("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(sessionStorage.getItem("pendingJoinUrl")).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/l/AB12");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("ignores tampered pendingJoinUrl that does not start with /l/", async () => {
    vi.resetModules();

    let listener: any;
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        auth: {
          onAuthStateChange: (cb: any) => {
            listener = cb;
            return { data: { subscription: { unsubscribe: vi.fn() } } };
          },
          getSession: () => Promise.resolve({ data: { session: null } }),
          signOut: vi.fn(),
        },
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
      },
    }));

    const { AuthProvider } = await import("@/contexts/AuthContext");

    const replaceMock = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/auth", replace: replaceMock },
    });

    sessionStorage.setItem("pendingJoinUrl", "https://evil.example.com/phish");

    render(
      <MemoryRouter>
        <AuthProvider>
          <div>app</div>
        </AuthProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(listener).toBeDefined());
    await act(async () => {
      await listener("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(replaceMock).not.toHaveBeenCalled();
    // Per current impl, non-/l/ values are left untouched (not cleared).
    expect(sessionStorage.getItem("pendingJoinUrl")).toBe("https://evil.example.com/phish");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });
});
