import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    console.log('Creating Supabase client with config:', supabaseConfig);
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabaseClient;
};

export const supabase = getSupabaseClient(); 