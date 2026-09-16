import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ljvklaorekcdkosxozyd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdmtsYW9yZWtjZGtvc3hvenlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDc3NDYsImV4cCI6MjEwMzc4Mzc0Nn0.BCRZ1v1ajsVMrP-P2FV-TCZYdRFQCtIWSm9RtKHlPsg';

// Read from environment variables if provided, or use working default
const envUrl =
  (import.meta.env?.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_URL;
const envKey =
  (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_ANON_KEY;

// Verify URL is valid
const isValidSupabaseUrl = (url: string) =>
  Boolean(url && url.startsWith('http') && !url.includes('example.supabase.co'));

export const isSupabaseConfigured = Boolean(
  envUrl &&
  envKey &&
  isValidSupabaseUrl(envUrl)
);

export const SUPABASE_URL = isSupabaseConfigured
  ? envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : '';

export const SUPABASE_ANON_KEY = isSupabaseConfigured ? envKey : '';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Checks the live connection to Supabase by pinging the database
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tables?: {
    reservations: number;
    expenses: number;
    checklists: number;
    settings: boolean;
  };
}> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      connected: false,
      message: 'Credenciais do Supabase não configuradas.',
    };
  }

  try {
    const [resReservations, resExpenses, resChecklists, resDetails] =
      await Promise.all([
        supabase.from('reservations').select('id', { count: 'exact', head: true }),
        supabase.from('expenses').select('id', { count: 'exact', head: true }),
        supabase.from('checklists').select('id', { count: 'exact', head: true }),
        supabase.from('chacara_details').select('id').limit(1),
      ]);

    const hasError =
      resReservations.error ||
      resExpenses.error ||
      resChecklists.error ||
      resDetails.error;

    if (hasError) {
      const err =
        resReservations.error ||
        resExpenses.error ||
        resChecklists.error ||
        resDetails.error;
      return {
        connected: false,
        message: `Erro na consulta: ${err?.message || 'Falha desconhecida'}`,
      };
    }

    return {
      connected: true,
      message: 'Conexão com Supabase PostgreSQL estabelecida com sucesso!',
      tables: {
        reservations: resReservations.count ?? 0,
        expenses: resExpenses.count ?? 0,
        checklists: resChecklists.count ?? 0,
        settings: Boolean(resDetails.data && resDetails.data.length > 0),
      },
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Falha na conexão: ${err?.message || err}`,
    };
  }
}

