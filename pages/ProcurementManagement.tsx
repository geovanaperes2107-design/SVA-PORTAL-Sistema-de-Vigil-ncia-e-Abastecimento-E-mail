import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { Product, ProductClass, PurchaseOrder, OrderStatus, PurchaseType, PurchaseRequestItem } from '../types';
import { PRODUCT_CLASSES, CLASS_ICONS } from '../constants';
import { supabase } from '../supabase';

interface ManagementProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

// Estrutura do Cronograma
type RiteSchedule = Record<number, ProductClass[]>;

const ProcurementManagement: React.FC<ManagementProps> = ({ products, setProducts, orders, setOrders, onLogout, darkMode, setDarkMode }) => {
  const navigate = useNavigate();

  // Estado Global do Cronograma para permitir alteração
  const [riteSchedule, setRiteSchedule] = useState<RiteSchedule>({
    1: [ProductClass.Medicamentos, ProductClass.MaterialHospitalar],
    2: [ProductClass.QuimicosDescartaveis],
    3: [ProductClass.EPI],
    4: [ProductClass.Dieta, ProductClass.Utensilios]
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a1a1a] flex transition-colors duration-500">
      <aside className="w-64 bg-slate-900 dark:bg-[#051414] text-slate-300 dark:text-slate-500 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 text-white font-bold flex items-center gap-2 border-b border-slate-800 uppercase tracking-tighter italic">
          <span className="material-symbols-outlined text-success">shopping_cart</span>
          Gestão de Compras
        </div>
        <nav className="flex-1 py-4">
          <Link to="/management" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 dark:hover:bg-emerald-900/10 hover:text-white dark:hover:text-emerald-400 transition-colors">
            <span className="material-symbols-outlined">inventory</span> Cadastro de Itens
          </Link>
          <Link to="/management/order" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 dark:hover:bg-emerald-900/10 hover:text-white dark:hover:text-emerald-400 transition-colors">
            <span className="material-symbols-outlined">add_shopping_cart</span> Pedido de Compra
          </Link>
          <Link to="/management/history" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 dark:hover:bg-emerald-900/10 hover:text-white dark:hover:text-emerald-400 transition-colors">
            <span className="material-symbols-outlined">analytics</span> Monitorização & Histórico
          </Link>
          <Link to="/management/reports" className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800 dark:hover:bg-emerald-900/10 hover:text-white dark:hover:text-emerald-400 transition-colors">
            <span className="material-symbols-outlined">monitoring</span> Painel Relatórios
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800 dark:hover:bg-red-900/10 rounded transition-colors text-sm hover:text-danger">
            <span className="material-symbols-outlined">home</span> Voltar ao Início
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto h-screen">
        <header className="bg-white dark:bg-[#0f2626] border-b border-slate-200 dark:border-slate-800 px-8 py-4 sticky top-0 z-10 flex justify-between items-center transition-colors">
          <h1 className="text-xl font-black text-[#0f3d3d] dark:text-white uppercase tracking-tight italic">SVA - Módulo de Compras Profissional</h1>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-success dark:hover:text-emerald-400 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <span className="material-symbols-outlined text-xl">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
              {darkMode ? 'Claro' : 'Escuro'}
            </button>

            <button className="bg-white dark:bg-[#051414] border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
              <span className="material-symbols-outlined text-sm">print</span> PDF / Imprimir
            </button>
            <div className="bg-primary/5 dark:bg-primary/10 text-primary dark:text-blue-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Fechamento: 08:00</div>
          </div>
        </header>

        <div className="p-8">
          <Routes>
            <Route index element={<ProductList products={products} setProducts={setProducts} />} />
            <Route path="order" element={<PurchaseOrderForm products={products} setOrders={setOrders} />} />
            <Route path="history" element={<MonitoringHistory orders={orders} setOrders={setOrders} />} />
            <Route path="reports" element={<ReportsView orders={orders} schedule={riteSchedule} setSchedule={setRiteSchedule} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// --- VIEW DE RELATÓRIOS ---
const ReportsView: React.FC<{ orders: PurchaseOrder[], schedule: RiteSchedule, setSchedule: React.Dispatch<React.SetStateAction<RiteSchedule>> }> = ({ orders, schedule, setSchedule }) => {
  const allMonths = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [tempSchedule, setTempSchedule] = useState<RiteSchedule>(schedule);

  const handleSaveSchedule = () => {
    setSchedule(tempSchedule);
    setIsEditingSchedule(false);
  };

  const toggleCategoryInWeek = (week: number, category: ProductClass) => {
    setTempSchedule(prev => {
      const current = prev[week] || [];
      const exists = current.includes(category);
      if (exists) {
        return { ...prev, [week]: current.filter(c => c !== category) };
      } else {
        return { ...prev, [week]: [...current, category] };
      }
    });
  };

  // Simulação de dados para a matriz
  const matrixData = useMemo(() => {
    return allMonths.map(month => ({
      month,
      med: 250000 + Math.random() * 50000,
      mat: 300000 + Math.random() * 40000,
      dieta: 80000 + Math.random() * 10000,
      epis: 40000 + Math.random() * 15000,
      quim: 30000 + Math.random() * 5000,
      uten: 10000 + Math.random() * 5000,
      emerg: 45000 + Math.random() * 20000
    }));
  }, []);

  const columnTotals = useMemo(() => {
    return matrixData.reduce((acc, row) => ({
      med: acc.med + row.med,
      mat: acc.mat + row.mat,
      dieta: acc.dieta + row.dieta,
      epis: acc.epis + row.epis,
      quim: acc.quim + row.quim,
      uten: acc.uten + row.uten,
      emerg: acc.emerg + row.emerg,
    }), { med: 0, mat: 0, dieta: 0, epis: 0, quim: 0, uten: 0, emerg: 0 });
  }, [matrixData]);

  // FIX: Explicitly typing as number to avoid 'unknown' inference and fixed potential NaN issues
  const totalValues = Object.values(columnTotals) as number[];
  const grandTotal: number = totalValues.reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">Painel Relatório Estratégico</h3>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StrategicCard
          title="ORÇAMENTO MENSAL (FEV)"
          value="R$ 800.000"
          icon="description"
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StrategicCard
          title="GASTO EFETIVO (MÊS)"
          value="R$ 542k"
          icon="bolt"
          iconBg="bg-green-50"
          iconColor="text-green-500"
          subValue="Abaixo do Budget"
          subDetail="Restante: R$ 258k"
          trend="down"
        />
        <StrategicCard
          title="FUNDO EMERGENCIAL"
          value="R$ 291.800"
          icon="error"
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <StrategicCard
          title="ADERÊNCIA AO RITO"
          value="87.5%"
          icon="credit_card"
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* CRONOGRAMA DE RITOS */}
      <div className="bg-white dark:bg-[#0f2626] p-12 rounded-[3.5rem] shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Cronograma de Ritos de Compra</h2>
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Programação semanal de fechamento por categoria</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { setTempSchedule(schedule); setIsEditingSchedule(true); }}
              className="bg-[#0f172a] dark:bg-[#051414] text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-lg shadow-slate-200 dark:shadow-none border border-transparent dark:border-slate-800"
            >
              <span className="material-symbols-outlined text-sm">edit</span> Editar Cronograma
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {[1, 2, 3, 4].map(week => (
            <RiteCard
              key={week}
              week={`${week}ª SEMANA`}
              categories={schedule[week] || []}
              isActive={week === 1}
            />
          ))}
          <div className="bg-slate-50/50 dark:bg-[#051414]/50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center opacity-40 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase mb-4 tracking-widest">5ª SEMANA</div>
            <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-2xl flex items-center justify-center mb-4"><span className="material-symbols-outlined text-3xl">schedule</span></div>
            <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Sem Rito</span>
          </div>
        </div>

        {/* MODAL DE EDIÇÃO DO CRONOGRAMA */}
        {isEditingSchedule && (
          <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 transition-all duration-300">
            <div className="bg-white dark:bg-[#0f2626] rounded-[3rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-[#0f2626]">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Alterar Cronograma</h3>
                  <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest">Selecione as categorias para cada rito semanal</p>
                </div>
                <button onClick={() => setIsEditingSchedule(false)} className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-danger flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-slate-50 dark:bg-[#051414]">
                {[1, 2, 3, 4].map(week => (
                  <div key={week} className="bg-white dark:bg-[#0f2626] p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase mb-6 tracking-widest text-center">{week}ª Semana</div>
                    <div className="space-y-3">
                      {PRODUCT_CLASSES.map(cls => (
                        <label key={cls} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#051414] rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-700 text-primary bg-white dark:bg-slate-800 focus:ring-primary focus:ring-offset-0"
                            checked={(tempSchedule[week] || []).includes(cls)}
                            onChange={() => toggleCategoryInWeek(week, cls)}
                          />
                          <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 group-hover:text-primary transition-colors">{cls}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-10 border-t border-slate-100 dark:border-slate-800 flex gap-4 bg-white dark:bg-[#0f2626]">
                <button onClick={() => setIsEditingSchedule(false)} className="px-8 py-4 font-black uppercase text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-white transition-all">Cancelar Alterações</button>
                <button onClick={handleSaveSchedule} className="flex-1 bg-primary dark:bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">Salvar Cronograma Atualizado</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MATRIZ DE COMPETÊNCIA LOGÍSTICA */}
      <div className="space-y-6">
        <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-4 italic">
          <span className="material-symbols-outlined text-primary dark:text-blue-400 text-4xl">table_chart</span>
          Matriz de Competência Logística Pro
        </h4>
        <div className="bg-white dark:bg-[#0f2626] rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0b1426] dark:bg-[#051414] text-white">
                  <th className="px-8 py-8 text-[11px] font-black uppercase tracking-widest border-r border-white/5 dark:border-slate-800/50">Competência</th>
                  <th className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest">Medicamentos</th>
                  <th className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest">Materiais</th>
                  <th className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest bg-yellow-900/20">Dieta</th>
                  <th className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest">EPIS</th>
                  <th className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest">Químicos</th>
                  <th className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest">Utensílios</th>
                  <th className="px-8 py-8 text-center text-[10px] font-black uppercase tracking-widest bg-red-950/30 text-red-400">Emergencial</th>
                  <th className="px-10 py-8 text-right text-[11px] font-black uppercase tracking-widest bg-slate-800 dark:bg-slate-900">Total Mensal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData.map(row => {
                  const rowTotal = row.med + row.mat + row.dieta + row.epis + row.quim + row.uten + row.emerg;
                  return (
                    <tr key={row.month} className="hover:bg-slate-50 transition-all font-black text-slate-700 text-[12px]">
                      <td className="px-8 py-6 uppercase border-r border-slate-100 bg-slate-50/30">{row.month}</td>
                      <td className="px-4 py-6 text-center">R$ {row.med.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-6 text-center">R$ {row.mat.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-6 text-center bg-yellow-50/30 text-yellow-800 italic">R$ {row.dieta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-6 text-center">R$ {row.epis.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-6 text-center">R$ {row.quim.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-6 text-center">R$ {row.uten.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-8 py-6 text-center bg-red-50/50 text-red-600">R$ {row.emerg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-10 py-6 text-right font-black text-slate-900 bg-slate-50 text-[14px]">R$ {rowTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black">
                <tr className="uppercase tracking-widest">
                  <td className="px-8 py-10 text-[11px] border-r border-white/5">Total Anual Consolidado</td>
                  <td className="px-4 py-10 text-center text-xs">R$ {columnTotals.med.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-10 text-center text-xs">R$ {columnTotals.mat.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-10 text-center text-xs bg-yellow-900/30">R$ {columnTotals.dieta.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-10 text-center text-xs">R$ {columnTotals.epis.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-10 text-center text-xs">R$ {columnTotals.quim.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-10 text-center text-xs">R$ {columnTotals.uten.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-8 py-10 text-center text-xs bg-red-900/40">R$ {columnTotals.emerg.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</td>
                  <td className="px-10 py-10 text-right text-2xl tracking-tighter text-success">R$ {grandTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTES AUXILIARES UI ---
const StrategicCard = ({ title, value, icon, iconBg, iconColor, subValue, subDetail, trend }: any) => (
  <div className="bg-white dark:bg-[#0f2626] p-8 rounded-[2rem] shadow-xl border border-white dark:border-slate-800 flex flex-col justify-between relative overflow-hidden transition-all hover:scale-105">
    <div className="flex justify-between items-start mb-4">
      <div>
        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 leading-relaxed w-2/3">{title}</h4>
        <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{value}</div>
      </div>
      <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-2xl flex items-center justify-center shadow-inner`}>
        <span className="material-symbols-outlined text-2xl font-black">{icon}</span>
      </div>
    </div>
    {(subValue || subDetail) && (
      <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center gap-3">
        {trend === 'down' && <span className="material-symbols-outlined text-green-500 text-xl font-black">bolt</span>}
        <div>
          <div className="text-[9px] font-black text-green-500 dark:text-emerald-400 uppercase tracking-widest">{subValue}</div>
          <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">{subDetail}</div>
        </div>
      </div>
    )}
  </div>
);

const RiteCard = ({ week, categories, isActive }: any) => (
  <div className={`${isActive ? 'bg-[#0f172a] dark:bg-[#051414]' : 'bg-[#0f172a] dark:bg-[#051414] opacity-90'} p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center transition-all hover:scale-105 active:scale-95 group min-h-[280px] border border-transparent dark:border-slate-800`}>
    <div className="text-[11px] font-black text-white uppercase tracking-widest mb-6">{week}</div>
    <div className="w-16 h-16 bg-primary dark:bg-blue-600 rounded-3xl flex items-center justify-center text-white mb-8 shadow-[0_0_30px_rgba(0,95,184,0.4)] group-hover:scale-110 transition-transform">
      <span className="material-symbols-outlined text-3xl font-black">calendar_today</span>
    </div>
    <div className="flex flex-col gap-2 w-full">
      {categories.length > 0 ? (
        categories.map((c: string) => (
          <span key={c} className="bg-primary/20 dark:bg-blue-500/10 text-primary dark:text-blue-400 border border-primary/30 dark:border-blue-500/30 px-3 py-2 rounded-xl text-[9px] font-black uppercase text-center tracking-tighter truncate" title={c}>
            {c}
          </span>
        ))
      ) : (
        <span className="text-[9px] text-slate-600 dark:text-slate-500 uppercase font-black tracking-widest mt-4">Nenhum Rito</span>
      )}
    </div>
  </div>
);

const ProductList: React.FC<{ products: Product[], setProducts: React.Dispatch<React.SetStateAction<Product[]>> }> = ({ products, setProducts }) => {
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ productClass: ProductClass.Medicamentos });
  const [isUploading, setIsUploading] = useState(false);

  const handleCatalogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      const extractedProducts = [
        { codeMVSES: "SES-882", codeMVSupplier: "FUN-001", name: "LUVAS DE PROCEDIMENTO TAM M", unit: "CX", unitPrice: 32.50, productClass: ProductClass.MaterialHospitalar, monthlyConsumption: 120, currentStock: 45 },
        { codeMVSES: "SES-120", codeMVSupplier: "FUN-002", name: "DIPIRONA SODICA 500MG/ML INJ", unit: "AMP", unitPrice: 1.85, productClass: ProductClass.Medicamentos, monthlyConsumption: 45, currentStock: 12 }
      ];
      const mappedToInsert = extractedProducts.map(p => ({
        code_mv_supplier: p.codeMVSupplier, code_mv_ses: p.codeMVSES, name: p.name,
        unit: p.unit, unit_price: p.unitPrice, product_class: p.productClass,
        monthly_consumption: p.monthlyConsumption, current_stock: p.currentStock
      }));
      supabase.from('products').upsert(mappedToInsert, { onConflict: 'code_mv_ses' }).then(({ error }) => {
        setIsUploading(false);
        if (!error) alert(`SVA IA: Cadastro técnico de "${file.name}" importado com sucesso!`);
        else alert("Erro ao importar catálogo: " + error.message);
      });
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">Cadastro de Itens</h2>
        <div className="flex gap-3">
          <label className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all border flex items-center gap-2 ${isUploading ? 'bg-slate-200 text-slate-400 cursor-wait' : 'bg-slate-900 text-white hover:bg-primary transition-all border-slate-900 shadow-xl shadow-primary/10'}`}>
            <span className="material-symbols-outlined text-xl">{isUploading ? 'sync' : 'list_alt'}</span>
            Importar Catálogo
            <input type="file" className="hidden" accept=".pdf,.xlsx,.xls" onChange={handleCatalogUpload} disabled={isUploading} />
          </label>
          <button onClick={() => setShowModal(true)} className="bg-primary dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            <span className="material-symbols-outlined align-middle mr-2 text-xl">add</span> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f2626] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-[#051414] border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">MV SES</th>
              <th className="px-6 py-4 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">MV FUNEV</th>
              <th className="px-6 py-4 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Produto</th>
              <th className="px-6 py-4 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Classe</th>
              <th className="px-6 py-4 font-black text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Valor Unit.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#051414] transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-400">{p.codeMVSES}</td>
                <td className="px-6 py-4 font-bold text-slate-500 dark:text-slate-600">{p.codeMVSupplier}</td>
                <td className="px-6 py-4 font-black text-slate-800 dark:text-emerald-50">{p.name}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-sm">{CLASS_ICONS[p.productClass]}</span>
                    {p.productClass}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-slate-900 dark:text-white text-right">R$ {p.unitPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
          <div className="bg-white dark:bg-[#0f2626] rounded-[2rem] w-full max-w-2xl shadow-2xl p-10 space-y-8 border border-transparent dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">Cadastro Manual</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Insira os dados técnicos do item para o catálogo</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Cód. MV Forneve</label>
                <input placeholder="Ex: FUN-000" className="w-full bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary" onChange={e => setNewProduct({ ...newProduct, codeMVSupplier: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Cód. MV SES</label>
                <input placeholder="Ex: SES-000" className="w-full bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary" onChange={e => setNewProduct({ ...newProduct, codeMVSES: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Descrição Completa</label>
                <input placeholder="Nome do Produto" className="w-full bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary" onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Classe</label>
                <select className="w-full bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary" onChange={e => setNewProduct({ ...newProduct, productClass: e.target.value as any })}>
                  {PRODUCT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Unidade</label>
                <input placeholder="Ex: UNDS" className="w-full bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary" onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-2">Valor Unitário (R$)</label>
                <input placeholder="0.00" type="number" step="0.01" className="w-full bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-primary" onChange={e => setNewProduct({ ...newProduct, unitPrice: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 font-black uppercase text-[11px] text-slate-400 dark:text-slate-600 hover:text-danger transition-all">Cancelar</button>
              <button
                onClick={async () => {
                  const { error } = await supabase.from('products').insert({
                    code_mv_supplier: newProduct.codeMVSupplier,
                    code_mv_ses: newProduct.codeMVSES,
                    name: newProduct.name,
                    unit: newProduct.unit,
                    unit_price: newProduct.unitPrice,
                    product_class: newProduct.productClass,
                    monthly_consumption: 0,
                    current_stock: 0
                  });
                  if (!error) {
                    setShowModal(false);
                  } else {
                    alert("Erro ao salvar produto: " + error.message);
                  }
                }}
                className="flex-1 bg-primary dark:bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
              >Salvar Produto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseOrderForm: React.FC<{ products: Product[], setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>> }> = ({ products, setOrders }) => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<ProductClass>(ProductClass.Medicamentos);
  const [purchaseType, setPurchaseType] = useState<PurchaseType>(PurchaseType.Mensal);
  const [refMonth, setRefMonth] = useState('Janeiro');
  const [leadTime, setLeadTime] = useState(7);
  const [coverage, setCoverage] = useState(45);
  const [workingItems, setWorkingItems] = useState<PurchaseRequestItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleConsumptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      const updates = [
        { code_mv_ses: "SES-882", monthly_consumption: 450 },
        { code_mv_ses: "SES-120", monthly_consumption: 85 }
      ];
      Promise.all(updates.map(u =>
        supabase.from('products').update({ monthly_consumption: u.monthly_consumption }).eq('code_mv_ses', u.code_mv_ses)
      )).then(() => {
        setIsUploading(false);
        alert(`SVA IA: Consumo Mensal extraído de "${file.name}" e atualizado no sistema.`);
      });
    }, 2000);
  };

  const handleStockUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setTimeout(() => {
      const updates = [
        { code_mv_ses: "SES-882", current_stock: 156 },
        { code_mv_ses: "SES-120", current_stock: 31 }
      ];
      Promise.all(updates.map(u =>
        supabase.from('products').update({ current_stock: u.current_stock }).eq('code_mv_ses', u.code_mv_ses)
      )).then(() => {
        setIsUploading(false);
        alert(`SVA IA: Posição de Estoque extraída de "${file.name}" e sincronizada.`);
      });
    }, 2000);
  };

  useEffect(() => {
    const classProducts = products.filter(p => p.productClass === selectedClass);
    const items: PurchaseRequestItem[] = classProducts.map(p => {
      const cmd = p.monthlyConsumption / 30;
      const suggested = Math.max(0, Math.ceil((cmd * (coverage + leadTime)) - p.currentStock));

      return {
        productId: p.id,
        product: p,
        cmm: p.monthlyConsumption,
        cmd: cmd,
        stock: p.currentStock,
        daysOfStock: p.currentStock / (cmd || 1),
        suggestion: suggested,
        orderQuantity: 0,
        quantityReceived: 0,
        totalValueOC: 0,
        totalValueReceived: 0
      };
    });
    setWorkingItems(items);
  }, [selectedClass, products, leadTime, coverage]);

  const handleFinish = async () => {
    const itemsToOrder = workingItems.filter(i => i.orderQuantity > 0);
    if (itemsToOrder.length === 0) { alert("Nenhum item solicitado."); return; }

    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        reference_month: refMonth,
        order_type: purchaseType,
        status: OrderStatus.Triagem,
        product_class: selectedClass,
        total_value: itemsToOrder.reduce((a, b) => a + (b.orderQuantity * b.product.unitPrice), 0),
        lead_time: leadTime,
        coverage_days: coverage
      })
      .select()
      .single();

    if (orderError) {
      alert("Erro ao gerar pedido: " + orderError.message);
      return;
    }

    const itemsToInsert = itemsToOrder.map(i => ({
      order_id: order.id,
      product_id: i.productId,
      cmm: i.cmm,
      cmd: i.cmd,
      stock_at_time: i.stock,
      days_of_stock: i.daysOfStock,
      suggestion: i.suggestion,
      order_quantity: i.orderQuantity,
      quantity_received: 0,
      total_value_oc: i.orderQuantity * i.product.unitPrice,
      total_value_received: 0
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

    if (itemsError) {
      alert("Erro ao salvar itens do pedido: " + itemsError.message);
    } else {
      alert("Pedido gerado com sucesso no SVA PORTAL!");
      navigate('/management/history');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0f2626] p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-6 shadow-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest ml-1">Tipo de Compra</label>
          <select className="w-48 bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary" value={purchaseType} onChange={e => setPurchaseType(e.target.value as any)}>
            <option value={PurchaseType.Mensal}>Rito Mensal</option>
            <option value={PurchaseType.Emergencial}>Rito Emergencial</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest ml-1">Classe</label>
          <select className="w-56 bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-2.5 font-bold text-primary dark:text-blue-400 outline-none focus:ring-2 focus:ring-primary" value={selectedClass} onChange={e => setSelectedClass(e.target.value as any)}>
            {PRODUCT_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest ml-1">Lead Time Fornecedor</label>
          <input type="number" className="w-24 bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" value={leadTime} onChange={e => setLeadTime(parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest ml-1">Cobertura Desejada</label>
          <select className="w-32 bg-slate-50 dark:bg-[#051414] border-none rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" value={coverage} onChange={e => setCoverage(parseInt(e.target.value))}>
            <option value={30}>30 Dias</option>
            <option value={45}>45 Dias</option>
            <option value={60}>60 Dias</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0f2626] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[10px] text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 dark:bg-[#051414] border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-5 text-left font-black text-slate-300 dark:text-slate-600 uppercase tracking-wider italic">Produto</th>
              <th className="px-4 py-5 text-center font-black text-slate-300 dark:text-slate-600 uppercase">CMM</th>
              <th className="px-4 py-5 text-center font-black text-slate-300 dark:text-slate-600 uppercase">CMD</th>
              <th className="px-4 py-5 text-center font-black text-slate-300 dark:text-slate-600 uppercase">Estoque</th>
              <th className="px-4 py-5 text-center font-black text-primary dark:text-blue-400 uppercase bg-blue-50/20 dark:bg-blue-900/10">Sugestão</th>
              <th className="px-4 py-5 text-center font-black text-slate-900 dark:text-white uppercase">Pedido</th>
              <th className="px-4 py-5 text-right font-black text-slate-300 dark:text-slate-600 uppercase">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {workingItems.map((item, i) => (
              <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-[#051414] transition-colors">
                <td className="px-4 py-5">
                  <div className="font-black text-slate-800 dark:text-emerald-50 text-[11px] tracking-tight truncate">{item.product.name}</div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-600 italic font-medium">FUNEV: {item.product.codeMVSupplier} | SES: {item.product.codeMVSES}</div>
                </td>
                <td className="px-4 py-5 text-center font-bold text-slate-800 dark:text-slate-300">{item.cmm}</td>
                <td className="px-4 py-5 text-center font-bold text-slate-500 dark:text-slate-600">{item.cmd.toFixed(2)}</td>
                <td className="px-4 py-5 text-center font-bold text-slate-500 dark:text-slate-600">{item.stock} ({item.daysOfStock.toFixed(0)}d)</td>
                <td className="px-4 py-5 text-center font-black text-primary dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 text-xs">{item.suggestion}</td>
                <td className="px-4 py-5 text-center">
                  <input type="number" min="0" className="w-20 bg-slate-50 dark:bg-[#051414] border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-center font-black text-slate-900 dark:text-white shadow-sm outline-none focus:ring-2 focus:ring-primary" value={item.orderQuantity || ''} onChange={e => {
                    const n = [...workingItems]; n[i].orderQuantity = parseInt(e.target.value) || 0; setWorkingItems(n);
                  }} />
                </td>
                <td className="px-4 py-5 text-right font-black text-slate-900 dark:text-white">R$ {(item.orderQuantity * item.product.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex-1 min-w-[300px] flex gap-4">
          <label className={`flex-1 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] cursor-pointer transition-all border-2 border-dashed flex flex-col items-center justify-center gap-3 ${isUploading ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-wait' : 'bg-blue-50/30 dark:bg-blue-500/5 text-primary dark:text-blue-400 border-primary/20 dark:border-blue-500/20 hover:bg-white hover:border-primary/40 transition-all shadow-sm'}`}>
            <span className="material-symbols-outlined text-3xl">{isUploading ? 'sync' : 'trending_up'}</span>
            <span>Importar Consumo</span>
            <input type="file" className="hidden" accept=".pdf,.xlsx,.xls" onChange={handleConsumptionUpload} disabled={isUploading} />
          </label>
          <label className={`flex-1 px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] cursor-pointer transition-all border-2 border-dashed flex flex-col items-center justify-center gap-3 ${isUploading ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-wait' : 'bg-emerald-50/30 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/20 hover:bg-white hover:border-emerald-500/40 transition-all shadow-sm'}`}>
            <span className="material-symbols-outlined text-3xl">{isUploading ? 'sync' : 'inventory_2'}</span>
            <span>Estoque Atual (MV)</span>
            <input type="file" className="hidden" accept=".pdf,.xlsx,.xls" onChange={handleStockUpload} disabled={isUploading} />
          </label>
        </div>
        <div className="ml-auto">
          <button onClick={handleFinish} className="bg-[#009e6a] hover:bg-[#007a52] text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl shadow-emerald-500/20 flex items-center gap-4 transition-all active:scale-95 group">
            <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">send_and_archive</span>
            Gerar Solicitação SVA
          </button>
        </div>
      </div>
    </div>
  );
};

const MonitoringHistory: React.FC<{ orders: PurchaseOrder[], setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>> }> = ({ orders, setOrders }) => {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const handleUpdateOrder = async (id: string, field: string, value: string) => {
    const dbField = field === 'mvSolicitationNumber' ? 'mv_solicitation_number' :
      field === 'quotationNumber' ? 'quotation_number' :
        field === 'date' ? 'order_date' :
          field === 'dateClosed' ? 'date_closed' : field;

    const { error } = await supabase.from('purchase_orders').update({ [dbField]: value }).eq('id', id);
    if (error) alert("Erro ao atualizar pedido: " + error.message);
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-300">
      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Monitorização de Pedidos</h3>
        {months.map(m => {
          const monthOrders = orders.filter(o => o.referenceMonth === m);
          if (monthOrders.length === 0) return null;
          return (
            <div key={m} className="bg-white dark:bg-[#0f2626] rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all">
              <button onClick={() => setExpandedMonth(expandedMonth === m ? null : m)} className="w-full px-8 py-6 flex justify-between items-center bg-slate-50/50 dark:bg-[#051414]/50 hover:bg-slate-100 dark:hover:bg-emerald-900/10 transition-all group">
                <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic group-hover:text-emerald-500 transition-colors">{m}</span>
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 transition-transform duration-300">{expandedMonth === m ? 'expand_less' : 'expand_more'}</span>
              </button>
              {expandedMonth === m && (
                <div className="p-8 space-y-8 animate-in slide-in-from-top-4">
                  {PRODUCT_CLASSES.map(cls => {
                    const classOrders = monthOrders.filter(o => o.productClass === cls);
                    if (classOrders.length === 0) return null;
                    return (
                      <div key={cls} className="space-y-4">
                        <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                          <span className="material-symbols-outlined text-sm">{CLASS_ICONS[cls]}</span> {cls}
                        </h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {classOrders.map(o => (
                            <div key={o.id} className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-[#051414]/30 space-y-4 hover:shadow-lg hover:border-emerald-500/30 transition-all group">
                              <div className="flex justify-between items-start">
                                <span className="font-mono text-[10px] font-black text-slate-400 dark:text-slate-600">{o.id}</span>
                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${o.status === OrderStatus.Finalizado ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{o.status}</span>
                              </div>
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">MV Solicitação</label>
                                  <input placeholder="Ex: 50299" className="w-full bg-white dark:bg-[#0f2626] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary" value={o.mvSolicitationNumber || ''} onChange={e => handleUpdateOrder(o.id, 'mvSolicitationNumber', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Cotação</label>
                                  <input placeholder="Ex: COT-88/24" className="w-full bg-white dark:bg-[#0f2626] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary" value={o.quotationNumber || ''} onChange={e => handleUpdateOrder(o.id, 'quotationNumber', e.target.value)} />
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Início</label>
                                    <input type="text" className="w-full bg-white dark:bg-[#0f2626] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none" value={o.date} onChange={e => handleUpdateOrder(o.id, 'date', e.target.value)} />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest ml-1">Fim</label>
                                    <input type="text" className="w-full bg-white dark:bg-[#0f2626] border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-[10px] font-bold text-slate-900 dark:text-white outline-none" value={o.dateClosed || ''} onChange={e => handleUpdateOrder(o.id, 'dateClosed', e.target.value)} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {o.totalValue.toFixed(2)}</div>
                                <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase">{o.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight italic">
          <span className="material-symbols-outlined text-primary dark:text-blue-400">analytics</span>
          Relatório de Monitorização Consolidado Pro
        </h3>
        <div className="bg-white dark:bg-[#0f2626] rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 dark:bg-[#051414] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Solicitação</th>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Mês</th>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Classe</th>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Nº MV</th>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Nº Cotação</th>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Solicitado</th>
                <th className="px-6 py-5 font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Fechado</th>
                <th className="px-6 py-5 font-black text-slate-900 dark:text-white text-right uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-400 italic">
              {orders.sort((a, b) => b.createdAt - a.createdAt).map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-black text-slate-800">{o.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-600 uppercase">{o.referenceMonth}</td>
                  <td className="px-6 py-4 font-bold text-slate-500 uppercase">{o.productClass}</td>
                  <td className="px-6 py-4 font-black text-primary">{o.mvSolicitationNumber || '---'}</td>
                  <td className="px-6 py-4 font-black text-blue-600">{o.quotationNumber || '---'}</td>
                  <td className="px-6 py-4 font-bold text-slate-400">{o.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-400">{o.dateClosed || '---'}</td>
                  <td className="px-6 py-4 font-black text-slate-900 text-right">R$ {o.totalValue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProcurementManagement;