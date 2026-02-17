import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Debugging (visível no console do navegador)
console.log("Supabase URL encontrada:", supabaseUrl ? "SIM (começa com " + supabaseUrl.substring(0, 10) + ")" : "NÃO");
console.log("Supabase Key encontrada:", supabaseKey ? "SIM" : "NÃO");

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO CRÍTICO: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas!");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key'
);
