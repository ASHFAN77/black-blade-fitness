import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing! Check your .env file in the root directory.'
  );
}

const AUTH_STORAGE_KEY = 'bb-auth-token';
let supabase = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase environment variables are missing! Check your .env file or Netlify environment settings.'
  );
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export { supabase, AUTH_STORAGE_KEY };
