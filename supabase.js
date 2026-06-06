import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing! Check your .env file in the root directory.'
  );
}

// Custom storage key to avoid conflicts with default Supabase keys
const AUTH_STORAGE_KEY = 'bb-auth-token';

// Remove any stale token from the old default key format
const oldKey = `sb-xwiabkndupzifsrdguvh-auth-token`;
try { window.localStorage.removeItem(oldKey); } catch (_) {}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: AUTH_STORAGE_KEY,
    storage: window.localStorage,
    lock: async (name, acquireTimeout, fn) => {
      // Custom no-op lock to bypass the default navigator.locks implementation
      // which can freeze the client during page refreshes and hot reloads
      return await fn();
    }
  }
});

export { AUTH_STORAGE_KEY };
