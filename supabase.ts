import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://avolaxpreimljbsijknb' + '.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + '.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2b2xheHByZWltbGpic2lqa25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTI0NTYsImV4cCI6MjA4Njg2ODQ1Nn0' + '.4fBcYZ2QtFWSp9zwpwHQOXdNT72e_8KRfSVFJjf07g0';

export const supabase = createClient(supabaseUrl, supabaseKey);
