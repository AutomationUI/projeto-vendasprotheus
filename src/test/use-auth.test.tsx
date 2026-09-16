import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { AuthProvider, useAuth } from "../hooks/use-auth";
import { MOCK_USERS } from "../lib/types-roles";
import type { LoginResult } from "../hooks/use-auth";

// ── Helper wrapper ──
function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.removeItem("vendasprotheus_passwords");
});

const MOCK_PASSWORD = "admin123";

// ── Tests ──

describe("useAuth — login", () => {
  it("should start with no user (requires login)", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // No auto-login; session is empty in test environment
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("should return success and set user for valid email + password", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const validEmail = MOCK_USERS.find((u) => u.role === "admin")!.email;

    await act(async () => {
      const res = await result.current.login(validEmail, MOCK_PASSWORD);
      expect(res.success).toBe(true);
    });

    expect(result.current.user?.email).toBe(validEmail);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should return false for invalid email", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const res = await result.current.login("naoexiste@teste.com", MOCK_PASSWORD);
      expect(res.success).toBe(false);
    });
  });

  it("should return success for valid user (mock accepts any password)", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const validEmail = MOCK_USERS[0].email;

    await act(async () => {
      const res = await result.current.login(validEmail, "");
      expect(res.success).toBe(true);
    });
  });
});

describe("useAuth — logout", () => {
  it("should clear user on logout", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const validEmail = MOCK_USERS[0].email;

    await act(async () => { await result.current.login(validEmail, MOCK_PASSWORD); });
    expect(result.current.isAuthenticated).toBe(true);

    act(() => { result.current.logout(); });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe("useAuth — hasPermission", () => {
  it("admin should have view on all modules", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const adminEmail = MOCK_USERS.find(u => u.role === "admin")!.email;

    await act(async () => { await result.current.login(adminEmail, MOCK_PASSWORD); });

    expect(result.current.hasPermission("dashboard", "view")).toBe(true);
    expect(result.current.hasPermission("pedidos", "view")).toBe(true);
    expect(result.current.hasPermission("usuarios", "view")).toBe(true);
  });

  it("representante should not have permission for usuarios manage", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const repEmail = MOCK_USERS.find((u) => u.role === "representante")!.email;

    await act(async () => { await result.current.login(repEmail, MOCK_PASSWORD); });

    expect(result.current.hasPermission("usuarios", "edit")).toBe(false);
  });

  it("should return false for unauthenticated user", () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.hasPermission("dashboard", "view")).toBe(false);
  });
});

describe("useAuth — hasRole", () => {
  it("should correctly identify admin role", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const adminEmail = MOCK_USERS.find(u => u.role === "admin")!.email;

    await act(async () => { await result.current.login(adminEmail, MOCK_PASSWORD); });

    expect(result.current.hasRole("admin")).toBe(true);
    expect(result.current.hasRole("representante")).toBe(false);
  });
});

describe("useAuth — rate limiting", () => {
  it("should lock after 5 failed attempts", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await result.current.login("wrong@email.com", "wrongpass");
      });
    }

    let res: LoginResult = { success: false };
    await act(async () => {
      res = await result.current.login("wrong@email.com", "wrongpass");
    });

    expect(res.success).toBe(false);
    expect(res.locked).toBe(true);
    expect(res.remainingSeconds).toBeGreaterThan(0);
  });

  it("should clear attempts after successful login", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const adminEmail = MOCK_USERS.find(u => u.role === "admin")!.email;

    // Make a few failed attempts
    for (let i = 0; i < 3; i++) {
      await act(async () => { await result.current.login("wrong@email.com", "wrongpass"); });
    }

    // Successful login should clear attempts
    await act(async () => {
      const res = await result.current.login(adminEmail, MOCK_PASSWORD);
      expect(res.success).toBe(true);
    });

    // Logout and fail again — should start fresh, not be locked
    act(() => { result.current.logout(); });
    
    let res: LoginResult = { success: false };
    await act(async () => {
      res = await result.current.login("wrong@email.com", "wrongpass");
    });
    expect(res.locked).toBeUndefined();
  });
});
