import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Captured by the mocked supabase client below
let listener: ((event: string, session: any) => void | Promise<void>) | undefined;

vi.mock("@/integrations/supabase/client", () => ({
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
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

import { AuthProvider } from "@/contexts/AuthContext";

const originalLocation = window.location;
let replaceMock: ReturnType<typeof vi.fn>;

function stubLocation(pathname: string) {
  replaceMock = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, pathname, replace: replaceMock },
  });
}

beforeEach(() => {
  listener = undefined;
  sessionStorage.clear();
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

function mount() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <div>app</div>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthContext post-sign-in handoff (pendingJoinUrl)", () => {
  it("navigates to pendingJoinUrl and clears it when SIGNED_IN fires", async () => {
    stubLocation("/auth");
    sessionStorage.setItem("pendingJoinUrl", "/l/AB12");

    mount();
    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => {
      await listener!("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(sessionStorage.getItem("pendingJoinUrl")).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith("/l/AB12");
  });

  it("ignores a tampered pendingJoinUrl that does not start with /l/", async () => {
    stubLocation("/auth");
    sessionStorage.setItem("pendingJoinUrl", "https://evil.example.com/phish");

    mount();
    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => {
      await listener!("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not redirect when already on the pendingJoinUrl path", async () => {
    stubLocation("/l/AB12");
    sessionStorage.setItem("pendingJoinUrl", "/l/AB12");

    mount();
    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => {
      await listener!("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(sessionStorage.getItem("pendingJoinUrl")).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does nothing when no pendingJoinUrl is set", async () => {
    stubLocation("/auth");

    mount();
    await waitFor(() => expect(listener).toBeDefined());

    await act(async () => {
      await listener!("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
