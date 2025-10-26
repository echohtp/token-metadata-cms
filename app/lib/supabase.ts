import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Client for browser-side operations (with RLS)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // We'll handle our own session management with wallet auth
    }
  }
);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database types for type safety
export interface AuthorizedWallet {
  id: number;
  wallet_address: string;
  name?: string;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  created_at: string;
  created_by?: string;
  notes?: string;
}

export interface TokenMetadataOverride {
  id: number;
  mint: string;
  name?: string;
  logo?: string;
  description?: string;
  twitter_url?: string;
  telegram_url?: string;
  website_url?: string;
  discord_url?: string;
  is_active: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface AuditLog {
  id: number;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values?: any;
  new_values?: any;
  wallet_address?: string;
  ip_address?: string;
  timestamp: string;
}