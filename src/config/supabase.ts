import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://muclweyqcdwefwhihpbj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11Y2x3ZXlxY2R3ZWZ3aGlocGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMjA5NDUsImV4cCI6MjA1OTY5Njk0NX0.y0hDu0a-xoTVvCwEUuYqr8f_vG3Z3QyhKHgeshfmjJA' // Replace with your actual anon key


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
}; 