import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (import.meta as any).env?.SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.SUPABASE_ANON_KEY || '';

// Debugging (visível no console do navegador)
console.log("--- DIAGNÓSTICO SUPABASE ---");
console.log("URL:", supabaseUrl ? "Encontrada (inicia com " + supabaseUrl.substring(0, 15) + "...)" : "MUITO IMPORTANTE: URL NÃO ENCONTRADA!");
console.log("KEY:", supabaseKey ? "Encontrada" : "MUITO IMPORTANTE: KEY NÃO ENCONTRADA!");
console.log("----------------------------");

if (!supabaseUrl || !supabaseKey) {
    console.error("ERRO CRÍTICO: Variáveis de ambiente não configuradas no Vercel!");
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key'
);

(window as any).supabase_connected = !!(supabaseUrl && !supabaseUrl.includes('placeholder'));
(window as any).supabase_url_preview = supabaseUrl ? supabaseUrl.substring(0, 20) : 'vazio';
