import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lazy initialization to avoid throwing at module load time when Supabase is not configured
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (_supabase) return _supabase;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not configured. Supabase features will be disabled.');
    return null;
  }
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      // Return a no-op function for any method access
      if (typeof prop === 'string' && prop.startsWith('from')) {
        return () => ({
          select: () => ({ data: null, error: new Error('Supabase not configured'), count: 0 }),
          insert: () => ({ data: null, error: new Error('Supabase not configured') }),
          update: () => ({ data: null, error: new Error('Supabase not configured') }),
          delete: () => ({ data: null, error: new Error('Supabase not configured') }),
          upsert: () => ({ data: null, error: new Error('Supabase not configured') }),
        });
      }
      return () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop];
  },
});

export const isSupabaseConfigured = (): boolean => !!supabaseUrl && !!supabaseAnonKey;

export const SUPABASE_URL = supabaseUrl;

export const KNOWN_TABLES = ['profiles', 'tenants', 'representatives', 'clients', 'products', 'orders', 'negotiations'];

export interface SupabaseHealthStatus {
  connected: boolean;
  latencyMs: number;
  tables: Record<string, { exists: boolean; count?: number; error?: string }>;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const startTime = Date.now();
  const tables: Record<string, { exists: boolean; count?: number; error?: string }> = {};
  
  try {
    for (const table of KNOWN_TABLES) {
      try {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        tables[table] = {
          exists: !error,
          count: count ?? 0,
          error: error?.message,
        };
      } catch (e) {
        tables[table] = {
          exists: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    }
    
    const latencyMs = Date.now() - startTime;
    const connected = Object.values(tables).some(t => t.exists);
    
    return { connected, latencyMs, tables };
  } catch (e) {
    return {
      connected: false,
      latencyMs: Date.now() - startTime,
      tables: {},
    };
  }
}
