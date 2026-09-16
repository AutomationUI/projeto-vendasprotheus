import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { addAuditLog } from "@/lib/audit-store";
import { getSettings, subscribeSettings } from "@/lib/settings-store";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Shield,
  Search,
  UserPlus,
  Eye,
  Pencil,
  Mail,
  Phone,
  Calendar,
  Save,
  Plus,
  Trash2,
  Copy,
  Briefcase,
  Users,
  Settings,
  Star,
  Zap,
  Heart,
  Lock,
  Globe,
  BookOpen,
  Headphones,
  Truck,
  BarChart3,
  Wallet,
  Key,
  type LucideIcon,
} from "lucide-react";
import {
  ROLE_LABELS,
  getRoleLabel,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type AppUser,
  type UserRole,
  type Permission,
  type ActionType,
  type CustomProfile,
} from "@/lib/types-roles";
import { 
  getBuiltInOverrides, 
  getCustomProfiles, 
  updatePermissions, 
  subscribePermissions, 
  getEffectivePermissionsForUser 
} from "@/lib/permissions-store";
import { getUsers, updateUser, subscribeUsers } from "@/lib/user-store";
import PermissionsTable, { MODULE_LABELS } from "@/components/PermissionsTable";

const ALL_BUILT_IN_ROLES: UserRole[] = ["admin", "representante", "cliente", "consultor"];

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/30",
  representante: "bg-blue-500/10 text-blue-700 border-blue-300/40",
  cliente: "bg-emerald-500/10 text-emerald-700 border-emerald-300/40",
  consultor: "bg-amber-500/10 text-amber-700 border-amber-300/40",
};

const PROFILE_COLORS = [
  { value: "violet", label: "Violeta", classes: "bg-violet-500/20 text-violet-600 border-violet-400/50", dot: "bg-violet-500" },
  { value: "rose", label: "Rosa", classes: "bg-rose-500/20 text-rose-600 border-rose-400/50", dot: "bg-rose-500" },
  { value: "cyan", label: "Ciano", classes: "bg-cyan-500/20 text-cyan-600 border-cyan-400/50", dot: "bg-cyan-500" },
  { value: "orange", label: "Laranja", classes: "bg-orange-500/20 text-orange-600 border-orange-400/50", dot: "bg-orange-500" },
  { value: "teal", label: "Teal", classes: "bg-teal-500/20 text-teal-600 border-teal-400/50", dot: "bg-teal-500" },
  { value: "indigo", label: "Índigo", classes: "bg-indigo-500/20 text-indigo-600 border-indigo-400/50", dot: "bg-indigo-500" },
  { value: "fuchsia", label: "Fúcsia", classes: "bg-fuchsia-500/20 text-fuchsia-600 border-fuchsia-400/50", dot: "bg-fuchsia-500" },
  { value: "lime", label: "Lima", classes: "bg-lime-500/20 text-lime-700 border-lime-400/50", dot: "bg-lime-500" },
  { value: "sky", label: "Celeste", classes: "bg-sky-500/20 text-sky-600 border-sky-400/50", dot: "bg-sky-500" },
  { value: "red", label: "Vermelho", classes: "bg-red-500/20 text-red-600 border-red-400/50", dot: "bg-red-500" },
  { value: "yellow", label: "Amarelo", classes: "bg-yellow-500/20 text-yellow-600 border-yellow-400/50", dot: "bg-yellow-500" },
  { value: "emerald", label: "Esmeralda", classes: "bg-emerald-500/20 text-emerald-600 border-emerald-400/50", dot: "bg-emerald-500" },
  { value: "blue", label: "Azul Royal", classes: "bg-blue-600/20 text-blue-600 border-blue-500/50", dot: "bg-blue-600" },
  { value: "amber", label: "Âmbar", classes: "bg-amber-500/20 text-amber-600 border-amber-400/50", dot: "bg-amber-500" },
  { value: "pink", label: "Pink", classes: "bg-pink-500/20 text-pink-600 border-pink-400/50", dot: "bg-pink-500" },
];

const PROFILE_ICONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: "briefcase", label: "Pasta", Icon: Briefcase },
  { value: "users", label: "Equipe", Icon: Users },
  { value: "settings", label: "Config", Icon: Settings },
  { value: "star", label: "Estrela", Icon: Star },
  { value: "zap", label: "Raio", Icon: Zap },
  { value: "heart", label: "Coração", Icon: Heart },
  { value: "shield", label: "Escudo", Icon: Shield },
  { value: "lock", label: "Cadeado", Icon: Lock },
  { value: "globe", label: "Globo", Icon: Globe },
  { value: "book-open", label: "Livro", Icon: BookOpen },
  { value: "headphones", label: "Suporte", Icon: Headphones },
  { value: "truck", label: "Logística", Icon: Truck },
  { value: "bar-chart", label: "Gráfico", Icon: BarChart3 },
  { value: "wallet", label: "Carteira", Icon: Wallet },
];

function getProfileIcon(icone?: string): LucideIcon {
  return PROFILE_ICONS.find((i) => i.value === icone)?.Icon ?? Shield;
}

function getColorClasses(cor: string) {
  return PROFILE_COLORS.find((c) => c.value === cor)?.classes ?? PROFILE_COLORS[0].classes;
}

function togglePermAction(permissions: Permission[], mod: string, action: ActionType): Permission[] {
  const existing = permissions.find((p) => p.module === mod);
  if (existing) {
    const has = existing.actions.includes(action);
    return permissions.map((p) =>
      p.module === mod
        ? { ...p, actions: has ? p.actions.filter((a) => a !== action) : [...p.actions, action] }
        : p
    );
  }
  return [...permissions, { module: mod, actions: [action] }];
}

function getProfileLabel(role: UserRole, profileId: string | undefined, profiles: CustomProfile[]): string {
  if (profileId) {
    return profiles.find((p) => p.id === profileId)?.nome ?? getRoleLabel(role);
  }
  return getRoleLabel(role);
}

function getProfileBadgeClasses(role: UserRole, profileId: string | undefined, profiles: CustomProfile[]): string {
  if (profileId) {
    const profile = profiles.find((p) => p.id === profileId);
    return profile ? getColorClasses(profile.cor) : ROLE_BADGE_COLORS[role] ?? "";
  }
  return ROLE_BADGE_COLORS[role] ?? "";
}

// Helper to get effective permissions (wrapper for the store function)
function getEffectivePermissions(user: AppUser): Permission[] {
  return getEffectivePermissionsForUser(user);
}

export default function UsuariosPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [, setAppSettings] = useState(getSettings());
  useEffect(() => {
    const unsub = subscribeSettings(() => setAppSettings(getSettings()));
    return () => { unsub(); };
  }, []);

  const [, setPermTrigger] = useState(0);
  useEffect(() => {
    const unsub = subscribePermissions(() => setPermTrigger((t) => t + 1));
    return () => { unsub(); };
  }, []);

  const customProfiles = getCustomProfiles();
  const builtInOverrides = getBuiltInOverrides();

  // Ensure "cliente" is always available in roles to avoid bugs if a user has it
  const BUILT_IN_ROLES = ALL_BUILT_IN_ROLES;

  const [users, setUsers] = useState<AppUser[]>([...getUsers()]);
  useEffect(() => {
    return subscribeUsers(() => setUsers([...getUsers()]));
  }, []);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("usuarios");

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Permission[]>([]);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (location.pathname.includes("/perfis") || tab === "perfis" || tab === "rbac") {
      setActiveTab("perfis");
    } else if (location.pathname.includes("/new")) {
      setActiveTab("usuarios");
      setCreatingUser(true);
    } else if (tab === "usuarios") {
      setActiveTab("usuarios");
    }
  }, [location.pathname, searchParams]);
  const [newUser, setNewUser] = useState<Omit<AppUser, "id" | "criadoEm">>({
    nome: "", email: "", role: "consultor", telefone: "", ativo: true,
  });

  // Password reset dialog state
  const [resettingPasswordFor, setResettingPasswordFor] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile dialog
  const [profileDialog, setProfileDialog] = useState<"create" | "edit" | null>(null);
  const [editingProfile, setEditingProfile] = useState<CustomProfile>({
    id: "", nome: "", descricao: "", permissions: [], cor: "violet", icone: "briefcase",
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole || u.customProfileId === filterRole;
    return matchSearch && matchRole;
  });

  const roleCount = (role: UserRole) => users.filter((u) => u.role === role && !u.customProfileId).length;
  const profileCount = (id: string) => users.filter((u) => u.customProfileId === id).length;

  // ─── User handlers ───

  const startEditing = (u: AppUser) => {
    setEditingUser({ ...u });
    const hasCustom = !!u.customPermissions;
    setUseCustomPermissions(hasCustom);
    setEditingPermissions(
      hasCustom
        ? u.customPermissions!.map((p) => ({ ...p, actions: [...p.actions] }))
        : getEffectivePermissions(u).map((p) => ({ ...p, actions: [...p.actions] }))
    );
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    if (!editingUser.nome.trim() || !editingUser.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }
    const updated: AppUser = {
      ...editingUser,
      customPermissions: useCustomPermissions ? editingPermissions : undefined,
    };
    updateUser(updated);
    toast.success("Usuário atualizado com sucesso!");
    setEditingUser(null);
  };

  const handleCreateUser = () => {
    if (!newUser.nome.trim() || !newUser.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }
    const created: AppUser = {
      ...newUser,
      id: `u${Date.now()}`,
      criadoEm: new Date().toISOString(),
    };
    updateUser(created);
    toast.success("Usuário criado com sucesso!");
    setCreatingUser(false);
    setNewUser({ nome: "", email: "", role: "consultor", telefone: "", ativo: true });
  };

  const handleResetPassword = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    
    // In a real app, send request to backend
    addAuditLog({ 
      usuario: "Admin Sistema", 
      evento: "edicao", 
      descricao: `Redefiniu a senha do usuário ${resettingPasswordFor?.nome}`, 
      modulo: "Usuários" 
    });
    
    toast.success(`Senha de ${resettingPasswordFor?.nome} redefinida com sucesso!`);
    setResettingPasswordFor(null);
    setNewPassword("");
    setConfirmPassword("");
  };

  // ─── Profile handlers ───

  const getBuiltInPermissions = (role: UserRole) =>
    builtInOverrides[role] ?? ROLE_PERMISSIONS[role];

  const openCreateProfile = () => {
    setEditingProfile({ id: "", nome: "", descricao: "", permissions: [], cor: "violet", icone: "briefcase" });
    setProfileDialog("create");
  };

  const openEditProfile = (p: CustomProfile) => {
    setEditingProfile({ ...p, permissions: p.permissions.map((pm) => ({ ...pm, actions: [...pm.actions] })) });
    setProfileDialog("edit");
  };

  const openEditBuiltIn = (role: UserRole) => {
    const perms = getBuiltInPermissions(role);
    setEditingProfile({
      id: `builtin_${role}`,
      nome: ROLE_LABELS[role],
      descricao: ROLE_DESCRIPTIONS[role],
      permissions: perms.map((pm) => ({ ...pm, actions: [...pm.actions] })),
      cor: "",
    });
    setProfileDialog("edit");
  };

  const duplicateProfile = (p: CustomProfile) => {
    setEditingProfile({
      ...p,
      id: "",
      nome: `${p.nome} (cópia)`,
      permissions: p.permissions.map((pm) => ({ ...pm, actions: [...pm.actions] })),
    });
    setProfileDialog("create");
  };

  const copyPermissionsFrom = (sourceId: string) => {
    let perms: Permission[];
    if (ALL_BUILT_IN_ROLES.includes(sourceId as UserRole)) {
      perms = getBuiltInPermissions(sourceId as UserRole);
    } else {
      const profile = customProfiles.find((p) => p.id === sourceId);
      perms = profile?.permissions ?? [];
    }
    setEditingProfile((prev) => ({
      ...prev,
      permissions: perms.map((p) => ({ ...p, actions: [...p.actions] })),
    }));
    toast.success("Permissões copiadas!");
  };

  const handleSaveProfile = () => {
    if (!editingProfile.nome.trim()) {
      toast.error("Nome do perfil é obrigatório.");
      return;
    }
    // Check if editing a built-in profile
    const builtInMatch = ALL_BUILT_IN_ROLES.find((r) => editingProfile.id === `builtin_${r}`);
    if (builtInMatch) {
      updatePermissions({
        builtInOverrides: {
          ...builtInOverrides,
          [builtInMatch]: editingProfile.permissions.map((p) => ({ ...p, actions: [...p.actions] })),
        }
      });
      addAuditLog({
        usuario: "Admin Sistema",
        evento: "edicao",
        descricao: `Alterou permissões do perfil padrão "${ROLE_LABELS[builtInMatch]}"`,
        modulo: "Usuários",
      });
      toast.success(`Permissões do perfil "${ROLE_LABELS[builtInMatch]}" atualizadas!`);
      setProfileDialog(null);
      return;
    }
    if (profileDialog === "create") {
      const newProfile: CustomProfile = { ...editingProfile, id: `profile_${Date.now()}` };
      updatePermissions({ customProfiles: [...getCustomProfiles(), newProfile] });
      addAuditLog({ usuario: "Admin Sistema", evento: "criacao", descricao: `Criou perfil personalizado "${editingProfile.nome}"`, modulo: "Usuários" });
      toast.success("Perfil criado com sucesso!");
    } else {
      updatePermissions({ customProfiles: getCustomProfiles().map((p) => (p.id === editingProfile.id ? editingProfile : p)) });
      addAuditLog({ usuario: "Admin Sistema", evento: "edicao", descricao: `Editou perfil personalizado "${editingProfile.nome}"`, modulo: "Usuários" });
      toast.success("Perfil atualizado com sucesso!");
    }
    setProfileDialog(null);
  };

  const handleDeleteProfile = (id: string) => {
    const usersWithProfile = users.filter((u) => u.customProfileId === id);
    if (usersWithProfile.length > 0) {
      toast.error(`Este perfil está atribuído a ${usersWithProfile.length} usuário(s). Remova a atribuição antes de excluir.`);
      return;
    }
    const profileName = getCustomProfiles().find((p) => p.id === id)?.nome ?? id;
    updatePermissions({ customProfiles: getCustomProfiles().filter((p) => p.id !== id) });
    addAuditLog({ usuario: "Admin Sistema", evento: "exclusao", descricao: `Excluiu perfil personalizado "${profileName}"`, modulo: "Usuários" });
    toast.success("Perfil excluído.");
  };

  // ─── Profile assignment helper for user create/edit selectors ───

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleProfileAssignment = (value: string, setter: (u: any) => void, current: any) => {
    const isCustom = customProfiles.some((p) => p.id === value);
    if (isCustom) {
      // Intelligently assign a base role for custom profiles
      // Most custom profiles should behave like "representante" (sales focus)
      // unless they are specifically administrative or restricted.
      let baseRole: UserRole = "representante";
      
      const profile = customProfiles.find(p => p.id === value);
      if (profile?.id.includes("financeiro") || profile?.id.includes("logistica")) {
        baseRole = "consultor";
      }

      setter({ ...current, role: baseRole, customProfileId: value });
    } else {
      setter({ ...current, role: value as UserRole, customProfileId: undefined });
    }
  };

  const getAssignmentValue = (user: { role: UserRole; customProfileId?: string }) =>
    user.customProfileId ?? user.role;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Perfis & Usuários
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de acessos e permissões por perfil
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "perfis" && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreateProfile}>
              <Plus className="h-4 w-4" /> Novo Perfil
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setCreatingUser(true)}>
            <UserPlus className="h-4 w-4" /> Novo Usuário
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: USUÁRIOS ═══ */}
        <TabsContent value="usuarios" className="space-y-5 mt-4">
          {/* Role summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BUILT_IN_ROLES.filter((role) => roleCount(role) > 0).map((role) => (
              <motion.div key={role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    filterRole === role ? "ring-2 ring-primary/30" : ""
                  }`}
                  onClick={() => setFilterRole(filterRole === role ? "all" : role)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={`text-[10px] ${ROLE_BADGE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </Badge>
                      <span className="text-xl font-bold">{roleCount(role)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {customProfiles.filter((profile) => profileCount(profile.id) > 0).map((profile) => (
              <motion.div key={profile.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-md ${
                    filterRole === profile.id ? "ring-2 ring-primary/30" : ""
                  }`}
                  onClick={() => setFilterRole(filterRole === profile.id ? "all" : profile.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {(() => { const ProfileIcon = getProfileIcon(profile.icone); return <ProfileIcon className="h-3.5 w-3.5" />; })()}
                        <Badge variant="outline" className={`text-[10px] ${getColorClasses(profile.cor)}`}>
                          {profile.nome}
                        </Badge>
                      </div>
                      <span className="text-xl font-bold">{profileCount(profile.id)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {profile.descricao || "Perfil personalizado"}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os perfis</SelectItem>
                {BUILT_IN_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
                {customProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterRole !== "all" && (
              <button onClick={() => setFilterRole("all")} className="text-xs text-primary hover:underline">
                Limpar filtro
              </button>
            )}
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {u.nome.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{u.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getProfileBadgeClasses(u.role, u.customProfileId, customProfiles)}`}>
                          {getProfileLabel(u.role, u.customProfileId, customProfiles)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{u.telefone}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {new Date(u.criadoEm).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={u.ativo
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-300/40 text-[10px]"
                            : "bg-muted text-muted-foreground text-[10px]"
                          }
                        >
                          {u.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEditing(u)} className="text-xs gap-1">
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setResettingPasswordFor(u);
                              setNewPassword("");
                              setConfirmPassword("");
                            }} 
                            className="text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <Key className="h-3.5 w-3.5" /> Senha
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUser(u)} className="text-xs gap-1">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ TAB: PERFIS ═══ */}
        <TabsContent value="perfis" className="space-y-5 mt-4">
          {/* Built-in profiles */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground">Perfis padrão</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BUILT_IN_ROLES.map((role) => (
                <Card key={role}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${ROLE_BADGE_COLORS[role]}`}>
                          {ROLE_LABELS[role]}
                        </Badge>
                        {builtInOverrides[role] && (
                          <Badge variant="secondary" className="text-[9px]">Editado</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{roleCount(role)} usuário(s)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getBuiltInPermissions(role).map((p) => (
                        <Badge key={p.module} variant="secondary" className="text-[10px]">
                          {MODULE_LABELS[p.module] ?? p.module}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1 mt-3">
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => openEditBuiltIn(role)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar permissões
                      </Button>
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
                        setEditingProfile({
                          id: "", nome: `${ROLE_LABELS[role]} (cópia)`, descricao: ROLE_DESCRIPTIONS[role],
                          permissions: getBuiltInPermissions(role).map((p) => ({ ...p, actions: [...p.actions] })),
                          cor: "violet", icone: "briefcase",
                        });
                        setProfileDialog("create");
                      }}>
                        <Copy className="h-3.5 w-3.5" /> Duplicar
                      </Button>
                      {builtInOverrides[role] && (
                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => {
                          const next = { ...builtInOverrides };
                          delete next[role];
                          updatePermissions({ builtInOverrides: next });
                          addAuditLog({ usuario: "Admin Sistema", evento: "edicao", descricao: `Restaurou permissões padrão do perfil "${ROLE_LABELS[role]}"`, modulo: "Usuários" });
                          toast.success(`Permissões de "${ROLE_LABELS[role]}" restauradas ao padrão.`);
                        }}>
                          Restaurar padrão
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>



          {/* Custom profiles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Perfis personalizados</h2>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreateProfile}>
                <Plus className="h-4 w-4" /> Novo Perfil
              </Button>
            </div>

            {customProfiles.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Shield className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum perfil personalizado cadastrado.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crie perfis com permissões específicas para diferentes tipos de acesso.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customProfiles.map((profile) => (
                  <Card key={profile.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          {(() => { const ProfileIcon = getProfileIcon(profile.icone); return <ProfileIcon className="h-3.5 w-3.5" />; })()}
                          <Badge variant="outline" className={`text-[10px] ${getColorClasses(profile.cor)}`}>
                            {profile.nome}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{profileCount(profile.id)} usuário(s)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">{profile.descricao || "Sem descrição"}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {profile.permissions.filter((p) => p.actions.length > 0).map((p) => (
                          <Badge key={p.module} variant="secondary" className="text-[10px]">
                            {MODULE_LABELS[p.module] ?? p.module}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => openEditProfile(profile)}>
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => duplicateProfile(profile)}>
                          <Copy className="h-3.5 w-3.5" /> Duplicar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleDeleteProfile(profile.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══ DIALOGS ═══ */}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          {editingUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" />
                  Editar Usuário
                </DialogTitle>
                <DialogDescription>
                  Altere os dados do perfil e clique em Salvar.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-nome" className="text-xs">Nome</Label>
                  <Input
                    id="edit-nome"
                    value={editingUser.nome}
                    onChange={(e) => setEditingUser({ ...editingUser, nome: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-email" className="text-xs">E-mail</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="edit-telefone" className="text-xs">Telefone</Label>
                    <Input
                      id="edit-telefone"
                      value={editingUser.telefone ?? ""}
                      onChange={(e) => setEditingUser({ ...editingUser, telefone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Perfil</Label>
                    <Select
                      value={getAssignmentValue(editingUser)}
                      onValueChange={(v) => handleProfileAssignment(v, setEditingUser, editingUser)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUILT_IN_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                        {customProfiles.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Personalizados</div>
                            {customProfiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Status</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch
                        checked={editingUser.ativo}
                        onCheckedChange={(v) => setEditingUser({ ...editingUser, ativo: v })}
                      />
                      <span className="text-sm">{editingUser.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                </div>

                {/* Permissões editáveis */}
                <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      Permissões {useCustomPermissions ? "personalizadas (override)" : `do perfil atribuído`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground">Override individual</Label>
                      <Switch
                        checked={useCustomPermissions}
                        onCheckedChange={(v) => {
                          setUseCustomPermissions(v);
                          if (v) {
                            setEditingPermissions(
                              getEffectivePermissions(editingUser).map((p) => ({ ...p, actions: [...p.actions] }))
                            );
                          }
                        }}
                      />
                    </div>
                  </div>

                  {!useCustomPermissions && (
                    <p className="text-[11px] text-muted-foreground">
                      Usando permissões do perfil. Ative "Override individual" para ajustar apenas este usuário.
                    </p>
                  )}

                  <PermissionsTable
                    permissions={useCustomPermissions ? editingPermissions : getEffectivePermissions(editingUser)}
                    disabled={!useCustomPermissions}
                    onToggle={(mod, action) => setEditingPermissions((prev) => togglePermAction(prev, mod, action))}
                  />
                </div>
              </div>

              {/* Footer Edit User */}
              <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-10 shrink-0 mt-auto">
                <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                  Cancelar
                </Button>
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white" onClick={handleSaveEdit}>
                  <Save className="h-3.5 w-3.5" /> Salvar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resettingPasswordFor} onOpenChange={() => setResettingPasswordFor(null)}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden sm:max-w-md sm:h-auto sm:rounded-lg">
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b flex items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-600" />
                <DialogTitle className="text-lg font-bold">Redefinir Senha</DialogTitle>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <DialogDescription>
                Criar uma nova senha para o usuário <strong className="text-foreground">{resettingPasswordFor?.nome}</strong>.
              </DialogDescription>
              <div className="grid gap-2 mt-4">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo de 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2 mt-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-10 shrink-0 mt-auto">
              <Button variant="outline" onClick={() => setResettingPasswordFor(null)}>Cancelar</Button>
              <Button onClick={handleResetPassword} className="bg-amber-600 hover:bg-amber-700">
                Redefinir Senha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          {selectedUser && (
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
              <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b sticky top-0 z-10">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {selectedUser.nome.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser.nome}
                  <Badge variant="outline" className={`text-[10px] ml-1 bg-white ${getProfileBadgeClasses(selectedUser.role, selectedUser.customProfileId, customProfiles)}`}>
                    {getProfileLabel(selectedUser.role, selectedUser.customProfileId, customProfiles)}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="flex flex-wrap gap-3 text-xs mt-2">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedUser.email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedUser.telefone}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Desde {new Date(selectedUser.criadoEm).toLocaleDateString("pt-BR")}</span>
                </DialogDescription>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Permissões efetivas
                  {selectedUser.customPermissions && (
                    <Badge variant="outline" className="text-[10px]">Override</Badge>
                  )}
                </h3>

                <PermissionsTable
                  permissions={getEffectivePermissions(selectedUser)}
                  disabled
                />

                <p className="text-[11px] text-muted-foreground">
                  {selectedUser.customPermissions
                    ? "Este usuário possui permissões individuais (override). Para alterar, clique em \"Editar\"."
                    : "As permissões vêm do perfil atribuído. Para personalizar, clique em \"Editar\" e ative \"Override individual\"."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={creatingUser} onOpenChange={(open) => { if (!open) { setCreatingUser(false); setNewUser({ nome: "", email: "", role: "consultor", telefone: "", ativo: true }); } }}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">Novo Usuário</DialogTitle>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            {/* Header Create User */}
            <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b flex items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Novo Usuário
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 max-w-3xl mx-auto">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-nome" className="text-xs">Nome</Label>
                  <Input
                    id="new-nome"
                    placeholder="Nome completo"
                    value={newUser.nome}
                    onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="new-email" className="text-xs">E-mail</Label>
                    <Input
                      id="new-email"
                      type="email"
                      placeholder="usuario@email.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="new-telefone" className="text-xs">Telefone</Label>
                    <Input
                      id="new-telefone"
                      placeholder="(00) 00000-0000"
                      value={newUser.telefone ?? ""}
                      onChange={(e) => setNewUser({ ...newUser, telefone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Perfil</Label>
                    <Select
                      value={getAssignmentValue(newUser as AppUser)}
                      onValueChange={(v) => handleProfileAssignment(v, setNewUser, newUser)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUILT_IN_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                        {customProfiles.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Personalizados</div>
                            {customProfiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Status</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch
                        checked={newUser.ativo}
                        onCheckedChange={(v) => setNewUser({ ...newUser, ativo: v })}
                      />
                      <span className="text-sm">{newUser.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-muted/30">
                  <p className="text-xs font-semibold mb-1">
                    Permissões do perfil: {getProfileLabel((newUser as AppUser).role, (newUser as unknown as { customProfileId?: string }).customProfileId, customProfiles)}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getEffectivePermissions(newUser as AppUser)
                      .filter((p) => p.actions.length > 0)
                      .map((p) => (
                        <Badge key={p.module} variant="secondary" className="text-[10px]">
                          {MODULE_LABELS[p.module] ?? p.module}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-10 shrink-0 mt-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { setCreatingUser(false); setNewUser({ nome: "", email: "", role: "consultor", telefone: "", ativo: true }); }}>
                Cancelar
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleCreateUser}>
                <Save className="h-3.5 w-3.5" /> Criar Usuário
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Profile Dialog */}
      <Dialog open={!!profileDialog} onOpenChange={() => setProfileDialog(null)}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">
            {profileDialog === "create" ? "Novo Perfil" : "Editar Perfil"}
          </DialogTitle>
          <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            {/* Header Create/Edit Profile */}
            <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b flex items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {profileDialog === "create" ? "Novo Perfil" : "Editar Perfil"}
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6 max-w-4xl mx-auto">

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Nome do perfil</Label>
                <Input
                  placeholder="Ex: Supervisor, Financeiro..."
                  value={editingProfile.nome}
                  onChange={(e) => setEditingProfile({ ...editingProfile, nome: e.target.value })}
                  className="h-9"
                  maxLength={50}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Cor</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-6 h-6 rounded-full border-2 border-border shrink-0 ${PROFILE_COLORS.find(c => c.value === editingProfile.cor)?.dot ?? "bg-muted"}`} />
                  <Select
                    value={editingProfile.cor}
                    onValueChange={(v) => setEditingProfile({ ...editingProfile, cor: v })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFILE_COLORS.filter((c) => !customProfiles.some(
                        (p) => p.cor === c.value && p.id !== editingProfile.id
                      )).map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block w-3 h-3 rounded-full ${c.dot}`} />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Icon selector */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Ícone</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROFILE_ICONS.map((ic) => {
                  const IconComp = ic.Icon;
                  const isSelected = editingProfile.icone === ic.value;
                  return (
                    <button
                      key={ic.value}
                      type="button"
                      title={ic.label}
                      onClick={() => setEditingProfile({ ...editingProfile, icone: ic.value })}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border text-sm transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <IconComp className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                placeholder="Breve descrição das responsabilidades deste perfil..."
                value={editingProfile.descricao}
                onChange={(e) => setEditingProfile({ ...editingProfile, descricao: e.target.value })}
                className="min-h-[60px] text-sm"
                maxLength={200}
              />
            </div>

            {/* Copy from existing profile */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Copiar permissões de</Label>
              <Select onValueChange={copyPermissionsFrom}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione um perfil para copiar..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Perfis padrão</div>
                  {BUILT_IN_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                  {customProfiles.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Personalizados</div>
                      {customProfiles.filter((p) => p.id !== editingProfile.id).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Permissões</Label>
              <PermissionsTable
                permissions={editingProfile.permissions}
                onToggle={(mod, action) =>
                  setEditingProfile((prev) => ({
                    ...prev,
                    permissions: togglePermAction(prev.permissions, mod, action),
                  }))
                }
              />
            </div>
          </div>
              </div>
            </div>

            {/* Footer Profile Dialog */}
            <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-10 shrink-0 mt-auto">
              <Button variant="outline" size="sm" onClick={() => setProfileDialog(null)}>
                Cancelar
              </Button>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white" onClick={handleSaveProfile}>
                <Save className="h-3.5 w-3.5" /> {profileDialog === "create" ? "Criar Perfil" : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
