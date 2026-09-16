import { describe, it, expect, vi } from "vitest";
import { getUsers, updateUser, deleteUser, subscribeUsers } from "../lib/user-store";

describe("user-store", () => {
  it("should return users array", () => {
    const users = getUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });

  it("should update an existing user", () => {
    const users = getUsers();
    const first = { ...users[0], nome: "Updated Name" };
    
    updateUser(first);
    
    const updated = getUsers().find(u => u.id === first.id);
    expect(updated?.nome).toBe("Updated Name");
  });

  it("should add a new user when ID doesn't exist", () => {
    const before = getUsers().length;
    
    updateUser({
      id: "test_new_user",
      nome: "New Test User",
      email: "new@test.com",
      role: "consultor",
      ativo: true,
      criadoEm: "2026-01-01",
    });
    
    expect(getUsers().length).toBe(before + 1);
    expect(getUsers().find(u => u.id === "test_new_user")).toBeDefined();
    
    // Cleanup
    deleteUser("test_new_user");
  });

  it("should not update user without required fields", () => {
    const before = getUsers().length;
    updateUser({ id: "", nome: "", email: "", role: "admin", ativo: true, criadoEm: "" });
    expect(getUsers().length).toBe(before);
  });

  it("should delete a user by id", () => {
    updateUser({
      id: "to_delete",
      nome: "Delete Me",
      email: "delete@test.com",
      role: "consultor",
      ativo: true,
      criadoEm: "2026-01-01",
    });
    
    const before = getUsers().length;
    deleteUser("to_delete");
    expect(getUsers().length).toBe(before - 1);
  });

  it("should notify subscribers on changes", () => {
    const fn = vi.fn();
    const unsub = subscribeUsers(fn);
    
    updateUser({
      id: "sub_test",
      nome: "Sub Test",
      email: "sub@test.com",
      role: "consultor",
      ativo: true,
      criadoEm: "2026-01-01",
    });
    
    expect(fn).toHaveBeenCalled();
    unsub();
    
    // Cleanup
    deleteUser("sub_test");
  });
});
