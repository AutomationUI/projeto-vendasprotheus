import { type Permission, type UserRole, ROLE_PERMISSIONS, type CustomProfile } from "./types-roles";
import { safeString } from "./utils";

interface PermissionState {
  builtInOverrides: Record<string, Permission[]>;
  customProfiles: CustomProfile[];
}

const STORAGE_KEY = "vendasprotheus_permissions";

const DEFAULT_STATE: PermissionState = {
  builtInOverrides: {},
  customProfiles: [
    {
      id: "profile_financeiro",
      nome: "Financeiro",
      descricao: "Controle de pagamentos, faturamento e contas",
      permissions: [
        { module: "pedidos", actions: ["view"] },
        { module: "relatorios", actions: ["view"] },
        { module: "aprovacoes", actions: ["view", "approve"] },
      ],
      cor: "emerald",
      icone: "wallet",
    },
    {
      id: "profile_comercial",
      nome: "Comercial / Vendas",
      descricao: "Gestão de pedidos, orçamentos e clientes",
      permissions: [
        { module: "pedidos", actions: ["view", "create", "edit"] },
        { module: "orcamentos", actions: ["view", "create", "edit"] },
        { module: "clientes", actions: ["view", "create", "edit"] },
        { module: "produtos", actions: ["view"] },
      ],
      cor: "blue",
      icone: "bar-chart",
    },
    {
      id: "profile_supervisor",
      nome: "Supervisor",
      descricao: "Supervisão de equipes e aprovações",
      permissions: [
        { module: "pedidos", actions: ["view", "approve"] },
        { module: "orcamentos", actions: ["view", "approve"] },
        { module: "aprovacoes", actions: ["view", "approve"] },
        { module: "relatorios", actions: ["view"] },
        { module: "usuarios", actions: ["view"] },
      ],
      cor: "amber",
      icone: "star",
    },
    {
      id: "profile_logistica",
      nome: "Logística / Expedição",
      descricao: "Controle de entregas e estoque",
      permissions: [
        { module: "pedidos", actions: ["view"] },
        { module: "producao", actions: ["view", "edit"] },
        { module: "produtos", actions: ["view"] },
      ],
      cor: "orange",
      icone: "truck",
    },
  ],
};

function loadPermissionState(): PermissionState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return DEFAULT_STATE;
    return {
      builtInOverrides: parsed.builtInOverrides ?? DEFAULT_STATE.builtInOverrides,
      customProfiles: Array.isArray(parsed.customProfiles) ? parsed.customProfiles : DEFAULT_STATE.customProfiles,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

let state: PermissionState = loadPermissionState();
const listeners = new Set<() => void>();

export function getBuiltInOverrides() {
  return state.builtInOverrides;
}

export function getCustomProfiles() {
  return state.customProfiles;
}

export function updatePermissions(patch: Partial<PermissionState>) {
  state = { ...state, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn());
}

export function subscribePermissions(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function getEffectivePermissionsForUser(user: { role: UserRole; customProfileId?: string; customPermissions?: Permission[] } | null | undefined): Permission[] {
  if (!user || typeof user !== "object") return [];
  if (Array.isArray(user.customPermissions)) return user.customPermissions;
  
  if (user.customProfileId && typeof user.customProfileId === "string") {
    const profile = state.customProfiles?.find((p) => p.id === user.customProfileId);
    if (profile && Array.isArray(profile.permissions)) return profile.permissions;
  }
  
  const roleRaw = safeString(user.role, "admin");
  const roleKey = (roleRaw in ROLE_PERMISSIONS ? roleRaw : "admin") as UserRole;
  const overrides = state.builtInOverrides ? state.builtInOverrides[roleKey] : undefined;
  const defaults = ROLE_PERMISSIONS[roleKey];
  return overrides ?? defaults ?? [];
}
