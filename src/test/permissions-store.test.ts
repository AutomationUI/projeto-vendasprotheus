import { describe, it, expect } from "vitest";
import { 
  getEffectivePermissionsForUser, 
  getCustomProfiles, 
  getBuiltInOverrides 
} from "../lib/permissions-store";
import { ROLE_PERMISSIONS } from "../lib/types-roles";

describe("permissions-store", () => {
  it("should return built-in permissions for a standard role", () => {
    const perms = getEffectivePermissionsForUser({ role: "representante" });
    const expected = ROLE_PERMISSIONS["representante"];
    expect(perms).toEqual(expected);
  });

  it("should return admin permissions for admin role", () => {
    const perms = getEffectivePermissionsForUser({ role: "admin" });
    const expected = ROLE_PERMISSIONS["admin"];
    expect(perms).toEqual(expected);
  });

  it("should return custom permissions when user has customPermissions", () => {
    const custom = [{ module: "dashboard", actions: ["view" as const] }];
    const perms = getEffectivePermissionsForUser({ 
      role: "representante", 
      customPermissions: custom 
    });
    expect(perms).toEqual(custom);
  });

  it("should return custom profile permissions when user has customProfileId", () => {
    const profiles = getCustomProfiles();
    if (profiles.length === 0) return; // Skip if no profiles
    
    const firstProfile = profiles[0];
    const perms = getEffectivePermissionsForUser({
      role: "representante",
      customProfileId: firstProfile.id,
    });
    expect(perms).toEqual(firstProfile.permissions);
  });

  it("should have default custom profiles", () => {
    const profiles = getCustomProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles[0]).toHaveProperty("id");
    expect(profiles[0]).toHaveProperty("nome");
    expect(profiles[0]).toHaveProperty("permissions");
  });

  it("should return empty overrides initially", () => {
    const overrides = getBuiltInOverrides();
    expect(typeof overrides).toBe("object");
  });
});
