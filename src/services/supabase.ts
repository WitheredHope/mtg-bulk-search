import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase';

// Create a single instance of the Supabase client
const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);

export { supabase }; 