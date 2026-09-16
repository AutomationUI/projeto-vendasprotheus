import { type AppUser, MOCK_USERS } from "./types-roles";

const STORAGE_KEY = "vendasprotheus_users";

function loadUsers(): AppUser[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return MOCK_USERS;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return MOCK_USERS;
    return parsed;
  } catch {
    return MOCK_USERS;
  }
}

let users: AppUser[] = loadUsers();
const listeners = new Set<() => void>();

export function getUsers(): readonly AppUser[] {
  return users;
}

export function saveUsers(newUsers: AppUser[]) {
  users = newUsers;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  listeners.forEach((fn) => fn());
}

export function updateUser(user: AppUser) {
  if (!user.id || !user.email || !user.nome) return;
  const exists = users.find(u => u.id === user.id);
  if (exists) {
    saveUsers(users.map(u => u.id === user.id ? user : u));
  } else {
    saveUsers([...users, user]);
  }
}

export function deleteUser(id: string) {
  if (!id) return;
  saveUsers(users.filter(u => u.id !== id));
}

export function subscribeUsers(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
