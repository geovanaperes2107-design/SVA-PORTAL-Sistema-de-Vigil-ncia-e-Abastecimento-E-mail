
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { OrderStatus } from '../types';

interface DashboardSelectorProps {
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const DashboardSelector: React.FC<DashboardSelectorProps> = ({ onLogout, darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, activeOrders: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: oCount } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true })
        .not('status', 'in', `(${OrderStatus.Finalizado},${OrderStatus.Declinado})`);

      setStats({
        products: pCount || 0,
        activeOrders: oCount || 0
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-[#0a1a1a] flex flex-col font-sans transition-colors duration-500">
      <header className="bg-white dark:bg-[#0f2626] border-b border-slate-100 dark:border-slate-800 px-10 py-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3 text-[#0f3d3d] dark:text-emerald-400 font-black text-2xl tracking-tighter italic">
          <span className="material-symbols-outlined text-success text-3xl">shield_with_house</span>
          SVA PORTAL
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-success dark:hover:text-emerald-400 font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <span className="material-symbols-outlined text-xl">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-success dark:hover:text-emerald-400 font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            Configurações
          </button>
          <button
            onClick={onLogout}
            className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:text-danger px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-100 dark:border-slate-700"
          >
            Sair do Portal
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-10">
        <div className="grid md:grid-cols-3 gap-10 w-full max-w-6xl animate-in zoom-in-95 duration-500">
          <DashboardCard
            onClick={() => navigate('/management')}
            icon="shopping_cart"
            title="Painel de Gestão de Compras"
            description="Cadastre produtos, crie solicitações, analise consumo e sugestões inteligentes de estoque."
            color="bg-emerald-50 dark:bg-emerald-900/10 text-success"
            stats={`${stats.products} Itens no Catálogo`}
          />

          <DashboardCard
            onClick={() => navigate('/tracking')}
            icon="monitoring"
            title="Painel de Acompanhamento"
            description="Acompanhe OCs, entregas parciais, performance de fornecedores e controle de custos."
            color="bg-blue-50 dark:bg-blue-900/10 text-primary dark:text-blue-400"
            stats={`${stats.activeOrders} Ordens Ativas`}
          />

          <DashboardCard
            onClick={() => navigate('/settings')}
            icon="shield"
            title="Configurações do Sistema"
            description="Gerencie usuários, perfis de acesso, alertas e parâmetros visuais da unidade."
            color="bg-purple-50 dark:bg-purple-900/10 text-purple-500"
          />
        </div>
      </main>

      <footer className="p-8 text-center text-slate-300 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">
        SVA HUB v3.0 • HSLMB - Logística Hospitalar
      </footer>
    </div>
  );
};

const DashboardCard = ({ onClick, icon, title, description, color, stats }: any) => (
  <div
    onClick={onClick}
    className="bg-white dark:bg-[#0f2626] p-12 rounded-[3.5rem] shadow-sm border border-white dark:border-slate-800 hover:border-success/20 dark:hover:border-emerald-500/30 cursor-pointer transition-all hover:shadow-2xl dark:hover:shadow-emerald-900/20 hover:-translate-y-2 group relative overflow-hidden"
  >
    <div className={`w-20 h-20 ${color} rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner`}>
      <span className="material-symbols-outlined text-4xl font-black">{icon}</span>
    </div>
    <div className="flex justify-between items-start mb-4">
      <h2 className="text-2xl font-black text-[#0f3d3d] dark:text-white uppercase tracking-tight italic">{title}</h2>
      {stats && (
        <span className="bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800">
          {stats}
        </span>
      )}
    </div>
    <p className="text-slate-400 dark:text-slate-500 leading-relaxed font-bold text-sm">
      {description}
    </p>
    <div className="mt-8 flex items-center gap-2 text-success dark:text-emerald-400 font-black uppercase text-[10px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
      Acessar Painel <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </div>
  </div>
);

export default DashboardSelector;
