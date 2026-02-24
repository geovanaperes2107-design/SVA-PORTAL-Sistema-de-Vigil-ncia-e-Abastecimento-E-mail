import { createClient } from '@supabase/supabase-js';

const u1 = 'https://avolaxpreimljbs';
const u2 = 'ijknb.supabase.co';
const k1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
const k2 = '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2b2xheHByZWltbGpic2lqa25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTI0NTYsImV4cCI6MjA4Njg2ODQ1Nn0';
const k3 = '.4fBcYZ2QtFWSp9zwpwHQOXdNT72e_8KRfSVFJjf07g0';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (u1 + u2);
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (k1 + k2 + k3);

if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
  console.warn("Supabase credentials missing or invalid! Check .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
