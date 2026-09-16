import { describe, it, expect } from "vitest";
import { addAuditLog, getAuditLogs, subscribeAuditLogs } from "../lib/audit-store";

describe("audit-store", () => {
  it("should return initial audit logs", () => {
    const logs = getAuditLogs();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toHaveProperty("id");
    expect(logs[0]).toHaveProperty("usuario");
    expect(logs[0]).toHaveProperty("evento");
  });

  it("should add a new audit log entry", () => {
    const before = getAuditLogs().length;
    addAuditLog({
      usuario: "Test User",
      evento: "login",
      descricao: "Test login event",
      modulo: "Test",
    });
    const after = getAuditLogs();
    expect(after.length).toBe(before + 1);
    expect(after[0].usuario).toBe("Test User");
    expect(after[0].evento).toBe("login");
    expect(after[0].descricao).toBe("Test login event");
  });

  it("should notify subscribers on new log", () => {
    let called = false;
    const unsub = subscribeAuditLogs(() => { called = true; });
    
    addAuditLog({
      usuario: "Test",
      evento: "criacao",
      descricao: "Subscriber test",
      modulo: "Test",
    });
    
    expect(called).toBe(true);
    unsub();
  });

  it("should unsubscribe correctly", () => {
    let callCount = 0;
    const unsub = subscribeAuditLogs(() => { callCount++; });
    
    addAuditLog({ usuario: "A", evento: "login", descricao: "1", modulo: "T" });
    expect(callCount).toBe(1);
    
    unsub();
    addAuditLog({ usuario: "B", evento: "login", descricao: "2", modulo: "T" });
    expect(callCount).toBe(1); // Should not increment
  });
});
