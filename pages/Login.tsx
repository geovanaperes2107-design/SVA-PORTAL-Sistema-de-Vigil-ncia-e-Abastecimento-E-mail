import React, { useState } from 'react';
import { supabase } from '../supabase';

const LoginPage: React.FC = () => {
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [credentials, setCredentials] = useState({ identifier: '', password: '' });
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanIdentifier = credentials.identifier.trim();
    const cleanPassword = credentials.password.trim();

    try {
      let loginEmail = cleanIdentifier;

      // Se não for e-mail (não tem @), tenta tratar como CPF
      if (!cleanIdentifier.includes('@')) {
        const cpfOnlyNumbers = cleanIdentifier.replace(/\D/g, '');

        // Busca o perfil pelo CPF para encontrar o e-mail associado
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email') // Assumindo que a coluna email existe ou será adicionada
          .eq('cpf', cpfOnlyNumbers)
          .single();

        if (profileError) {
          console.error("Erro ao buscar perfil por CPF:", profileError);
          throw new Error(`Erro ao localizar CPF: ${profileError.message}`);
        }

        if (!profileData?.email) {
          throw new Error("CPF encontrado, mas não possui e-mail associado.");
        }
        loginEmail = profileData.email;
      }

      if (isFirstAccess) {
        if (passwords.new !== passwords.confirm) {
          throw new Error("As senhas não coincidem.");
        }
        if (passwords.new.length < 6) {
          throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: passwords.new
        });

        if (updateError) throw updateError;

        // Update profile to mark first access as completed
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ is_first_access: false }).eq('id', user.id);
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: cleanPassword,
        });

        if (loginError) throw loginError;

        // Check if it's first access from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_first_access')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_first_access || cleanPassword === '8754') {
          setIsFirstAccess(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f3d3d] dark:bg-[#051414] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-success/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-lg bg-white dark:bg-[#0f2626] rounded-[4rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10 border border-transparent dark:border-slate-800">
        <div className="p-14 text-center bg-[#009e6a] dark:bg-[#007a52] text-white">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm animate-pulse">
              <span className="material-symbols-outlined text-6xl font-black italic">shield_with_house</span>
            </div>
          </div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">SVA PORTAL</h1>
          <p className="text-white/80 mt-3 font-bold uppercase text-[12px] tracking-[0.4em]">Sistema de Vigilância e Abastecimento</p>
        </div>

        <form onSubmit={handleSubmit} className="p-14 space-y-10">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 p-6 rounded-2xl text-[12px] font-black uppercase text-center border border-red-100 dark:border-red-900/30 flex items-center gap-4 justify-center">
              <span className="material-symbols-outlined text-lg">warning</span>
              {error}
            </div>
          )}

          {!isFirstAccess ? (
            <>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">E-Mail ou CPF</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-2xl">person</span>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl pl-16 pr-8 py-6 text-base font-bold text-slate-700 dark:text-emerald-50 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-success/20 outline-none transition-all disabled:opacity-50"
                    placeholder="ex@email.com ou 000.000.000-00"
                    value={credentials.identifier}
                    onChange={e => setCredentials({ ...credentials, identifier: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Senha</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 text-2xl">lock</span>
                  <input
                    type="password"
                    required
                    disabled={loading}
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl pl-16 pr-8 py-6 text-base font-bold text-slate-700 dark:text-emerald-50 placeholder:text-slate-300 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-success/20 outline-none transition-all disabled:opacity-50"
                    placeholder="••••••••"
                    value={credentials.password}
                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[3rem] flex items-start gap-6 border border-emerald-100 dark:border-emerald-900/30">
                <span className="material-symbols-outlined text-success font-black text-3xl">lock_reset</span>
                <p className="text-[13px] font-black text-emerald-800 dark:text-emerald-400 uppercase leading-relaxed">Primeiro acesso detectado. Por segurança, crie uma nova senha pessoal para continuar.</p>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Nova Senha</label>
                <input
                  type="password"
                  required
                  disabled={loading}
                  className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-10 py-6 text-base font-bold text-slate-700 dark:text-emerald-50 focus:ring-4 focus:ring-success/20 outline-none transition-all disabled:opacity-50"
                  placeholder="Mínimo 6 caracteres"
                  value={passwords.new}
                  onChange={e => setPasswords({ ...passwords, new: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  disabled={loading}
                  className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-10 py-6 text-base font-bold text-slate-700 dark:text-emerald-50 focus:ring-4 focus:ring-success/20 outline-none transition-all disabled:opacity-50"
                  placeholder="Repita a senha"
                  value={passwords.confirm}
                  onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#009e6a] hover:bg-[#007a52] text-white font-black py-8 px-4 rounded-3xl transition-all shadow-2xl shadow-success/30 hover:shadow-success/40 active:scale-95 uppercase text-sm tracking-[0.3em] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              isFirstAccess ? 'Salvar e Entrar' : 'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="px-14 pb-10 text-[10px] text-slate-400 font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity text-center">
          Configuração: {(window as any).supabase_connected ? '✅ Ativa' : '❌ Pendente'} |
          URL: {(window as any).supabase_url_preview}...
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
