import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js?v=202611031707';

// Guardado antes do Supabase ler o endereço (link de "esqueci minha senha")
export const recoveryFromUrl = location.hash.includes('type=recovery');

export const configured =
  typeof SUPABASE_URL === 'string' && SUPABASE_URL.trim().startsWith('https://') &&
  typeof SUPABASE_KEY === 'string' && SUPABASE_KEY.trim().length > 20 && !SUPABASE_KEY.startsWith('COLE');

export const sb = configured ? createClient(SUPABASE_URL.trim(), SUPABASE_KEY.trim()) : null;
