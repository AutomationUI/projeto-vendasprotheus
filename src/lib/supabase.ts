import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
