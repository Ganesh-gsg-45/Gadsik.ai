import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://cwqhxfbkekxswznrepyf.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cWh4ZmJrZWt4c3d6bnJlcHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDE1NjgsImV4cCI6MjEwMDIxNzU2OH0.4W97AXmygL6DZYmoZ1ZX4kILS4Jl128WAwP3XXsVfac';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
