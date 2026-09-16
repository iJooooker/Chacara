import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from environment variables if provided
const envUrl = (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const envKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

// Verify URL is valid and not a placeholder/unresolvable test domain
const isDeadOrPlaceholder = (url: string) =>
  !url ||
  url.includes('ljvklaorekcdkosxozyd') ||
  url.includes('example.supabase.co') ||
  !url.startsWith('http');

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  !isDeadOrPlaceholder(envUrl)
);

export const SUPABASE_URL = isSupabaseConfigured
  ? envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : '';

export const SUPABASE_ANON_KEY = isSupabaseConfigured ? envKey : '';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

