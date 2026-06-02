import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "@/i18n";

beforeEach(async () => {
  await i18n.changeLanguage("es");
});

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
}));

const rpcMock = vi.fn();
const fromMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: any[]) => rpcMock(...a),
    from: (...a: any[]) => fromMock(...a),
  },
}));

vi.mock("@/components/TopBar", () => ({
  default: () => <div data-testid="topbar" />,
}));

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

afterEach(() => vi.clearAllMocks());

describe("Invite deep-link flow (/l/:joinCode)", () => {
  it("signed-out user: saves pendingJoinUrl and navigates to /auth on join click", async () => {
    rpcMock.mockResolvedValueOnce({ data: [LEAGUE], error: null });

    renderAt("/l/AB12");

    expect(await screen.findByText(LEAGUE.name)).toBeInTheDocument();
    expect(screen.getByText(/Inicia sesión para unirte/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Unirse a la quiniela/i }),
    );

    expect(sessionStorage.getItem("pendingJoinUrl")).toBe("/l/AB12");
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
  });

  it("signed-in non-member: inserts league_member then navigates to /league/:id", async () => {
    authState.user = { id: "user-1" };
    authState.profile = { display_name: "Ana", avatar_emoji: "🦊" };

    rpcMock.mockResolvedValueOnce({ data: [LEAGUE], error: null });

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

    await userEvent.click(
      await screen.findByRole("button", { name: /Unirse a la quiniela/i }),
    );

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

  it("signed-in existing member: auto-redirects to /league/:id, no join button shown", async () => {
    authState.user = { id: "user-1" };

    rpcMock.mockResolvedValueOnce({ data: [LEAGUE], error: null });
    fromMock.mockImplementation((table: string) => {
      if (table !== "league_members") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: "mem-1" }, error: null }),
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

  it("brand-new user lands on invalid code: shows not-found card", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    renderAt("/l/ZZZZ");

    expect(await screen.findByText(/Enlace no válido/i)).toBeInTheDocument();
    expect(screen.getByText(/Código: ZZZZ/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Unirse a la quiniela/i }),
    ).not.toBeInTheDocument();
  });
});
