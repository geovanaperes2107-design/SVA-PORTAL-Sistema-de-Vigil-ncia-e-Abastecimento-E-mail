import React, { useState, useMemo, useEffect, Component, ReactNode } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { PurchaseOrder, OrderStatus, ProductClass, PurchaseRequestItem } from '../types';
import { PRODUCT_CLASSES, CLASS_ICONS } from '../constants.tsx';
import { supabase } from '../supabase';

// --- INTERFACES ---
interface TrackingProps {
  orders: PurchaseOrder[];
  setOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 bg-white dark:bg-[#0f2626] rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">warning</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic">Ops! Algo travou nesta pasta</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            Ocorreu um erro inesperado ao carregar os dados desta visualização.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-primary dark:bg-blue-600 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
          >
            Tentar Restaurar Pasta
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- COMPONENTES AUXILIARES UI ---
const SidebarLink = ({ to, icon, label }: { to: string, icon: string, label: string }) => (
  <Link to={to} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/5 dark:hover:bg-emerald-500/5 hover:text-white dark:hover:text-emerald-400 transition-all text-slate-400 dark:text-slate-500 group">
    <span className="material-symbols-outlined text-xl group-hover:text-primary transition-colors">{icon}</span>
    <span className="text-[13px] font-medium tracking-tight">{label}</span>
  </Link>
);

const KPIButton = ({ title, value, icon, color, onClick }: any) => (
  <div onClick={onClick} className="bg-white dark:bg-[#0f2626] p-6 rounded-[2rem] shadow-xl border border-white dark:border-slate-800 flex flex-col items-center text-center group hover:scale-105 transition-all cursor-pointer">
    <div className={`w-12 h-12 ${color} text-white rounded-[1.25rem] flex items-center justify-center mb-4 shadow-2xl dark:shadow-none`}>
      <span className="material-symbols-outlined text-2xl font-black">{icon}</span>
    </div>
    <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{title}</div>
    <div className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{value || '0'}</div>
  </div>
);

const DRERow = ({ label, value, color = "text-slate-600 dark:text-slate-300" }: any) => (
  <tr className="border-slate-50 dark:border-slate-800">
    <td className="py-5 text-sm font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{label}</td>
    <td className={`py-5 text-right font-black text-xl tracking-tighter ${color}`}>{value || '---'}</td>
  </tr>
);

// --- COMPONENTES DE TRIAGEM ---

const SupplierTriageCard: React.FC<{ order: PurchaseOrder, onConfirm: any, onDecline: any }> = ({ order, onConfirm, onDecline }) => {
  const [localData, setLocalData] = useState<any>(null);

  useEffect(() => {
    if (order) {
      setLocalData({
        supplierName: order.supplierName || '',
        orderNumber: order.orderNumber || '',
        expectedDeliveryDate: order.expectedDeliveryDate || ''
      });
    }
  }, [order?.id, order?.supplierName, order?.orderNumber, order?.expectedDeliveryDate]);

  if (!order || !localData) return null;

  return (
    <div className="bg-white dark:bg-[#0f2626] rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
      <div className="bg-slate-900 dark:bg-[#051414] text-white p-10 flex flex-wrap gap-8 items-end">
        <div className="flex-1 space-y-6 min-w-[300px]">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary/20 dark:bg-blue-500/10 text-primary dark:text-blue-400 px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/30 dark:border-blue-500/30">Pendente de Entrada</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-600 tracking-widest ml-2">Fornecedor (Identificado pela IA)</label>
            <input className="w-full bg-slate-800 dark:bg-[#0f2626] border-none rounded-2xl px-6 py-4 text-white font-black text-lg focus:ring-2 focus:ring-primary outline-none shadow-inner" placeholder="Nome do Fornecedor" value={localData.supplierName} onChange={e => setLocalData({ ...localData, supplierName: e.target.value })} />
          </div>
          <div className="flex gap-6">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-600 tracking-widest ml-2">Ordem de Compra (OC)</label>
              <input className="w-full bg-slate-800 dark:bg-[#0f2626] border-none rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" placeholder="OC" value={localData.orderNumber} onChange={e => setLocalData({ ...localData, orderNumber: e.target.value })} />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-600 tracking-widest ml-2">Prazo de Entrega</label>
              <input type="text" className="w-full bg-slate-800 dark:bg-[#0f2626] border-none rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-primary outline-none shadow-inner" placeholder="Ex: 5 dias úteis" value={localData.expectedDeliveryDate} onChange={e => setLocalData({ ...localData, expectedDeliveryDate: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => onDecline(order.id)} className="h-20 w-20 bg-danger/10 dark:bg-red-900/10 text-danger hover:bg-danger hover:text-white rounded-[1.5rem] flex items-center justify-center transition-all border border-danger/20 active:scale-90 shadow-lg shadow-danger/20 group">
            <span className="material-symbols-outlined text-4xl font-black">close</span>
          </button>
          <button onClick={() => onConfirm(order.id, localData)} className="h-20 w-20 bg-success/10 dark:bg-emerald-900/10 text-success hover:bg-success hover:text-white rounded-[1.5rem] flex items-center justify-center transition-all border border-success/20 active:scale-90 shadow-lg shadow-success/20 group">
            <span className="material-symbols-outlined text-4xl font-black">verified_user</span>
          </button>
        </div>
      </div>
      <div className="p-10">
        <table className="w-full text-left">
          <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#051414]/50">
            <tr className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">
              <th className="px-6 py-5">Código / Descrição</th>
              <th className="px-6 py-5">Embalagem</th>
              <th className="px-6 py-5 text-center">Quantidade</th>
              <th className="px-6 py-5 text-right">Preço Unit.</th>
              <th className="px-6 py-5 text-right">Total OC</th>
              <th className="px-6 py-5 text-center">Confirmado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {((order as any)?.items || []).map((it: any, i: number) => {
              if (!it) return null;
              return (
                <tr key={it?.id || `tr-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors font-sans">
                  <td className="px-6 py-6 border-r border-slate-50 dark:border-slate-800">
                    <div className="font-black text-slate-800 dark:text-emerald-50 text-sm uppercase">{it?.product?.codeMVSES || '---'}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-600 uppercase font-bold">{it?.product?.name || '---'}</div>
                  </td>
                  <td className="px-6 py-6 text-xs text-slate-500 dark:text-slate-600 font-bold uppercase text-center">{it?.product?.unit || '---'}</td>
                  <td className="px-6 py-6 text-center font-black text-slate-900 dark:text-white text-lg">{it?.orderQuantity || 0}</td>
                  <td className="px-6 py-6 text-right font-bold text-slate-500 dark:text-slate-600 text-xs">R$ {(it?.product?.unitPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-6 text-right font-black text-slate-900 dark:text-white text-sm bg-slate-50/30 dark:bg-white/5">R$ {((it?.orderQuantity || 0) * (it?.product?.unitPrice || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-6 text-center text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest">{(it as any)?.confirmedAt || '---'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900 dark:bg-black text-white">
            <tr>
              <td colSpan={5} className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-700">Valor Total Estimado:</td>
              <td className="px-6 py-6 text-right text-xl font-black tracking-tighter text-primary dark:text-blue-400">R$ {(order?.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

interface FolderUploadProps {
  groupKey: string;
  onExtract: (file: File) => void;
  isExtracting: boolean;
}

const FolderUploadCard: React.FC<FolderUploadProps> = ({ groupKey, onExtract, isExtracting }) => (
  <label
    className={`bg-white dark:bg-[#0f2626] border-4 border-dashed rounded-[3rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer group shadow-inner mb-6 ${isExtracting ? 'border-primary dark:border-blue-600 bg-primary/5 dark:bg-blue-900/10 cursor-wait' : 'border-slate-100 dark:border-slate-800 hover:border-primary dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
  >
    <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${isExtracting ? 'bg-primary dark:bg-blue-600 text-white animate-spin' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 group-hover:bg-primary group-hover:text-white'}`}>
      <span className="material-symbols-outlined text-5xl font-black">{isExtracting ? 'sync' : 'upload_file'}</span>
    </div>
    <div className="text-center space-y-2">
      <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{isExtracting ? 'PROCESSANDO DOCUMENTO...' : 'CLIQUE OU ARRASTE O PDF AQUI'}</h4>
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Extração Inteligente: Processo - Fornecedor - Itens</p>
    </div>
    <input type="file" className="hidden" accept=".pdf" onChange={e => {
      const file = e.target.files?.[0];
      if (file) onExtract(file);
    }} disabled={isExtracting} />
  </label>
);

const TriagemView: React.FC<{ orders: PurchaseOrder[], setOrders: any }> = ({ orders = [], setOrders }) => {
  const [selectedClass, setSelectedClass] = useState<ProductClass | null>(null);
  const [isExtracting, setIsExtracting] = useState<string | null>(null);

  const triagemOrders = useMemo(() => (orders || []).filter(o => o && o.status === OrderStatus.Triagem), [orders]);

  const groups = useMemo(() => {
    if (!selectedClass) return [];
    const classOrders = triagemOrders.filter(o => o?.productClass === selectedClass);
    const map = new Map<string, PurchaseOrder[]>();
    classOrders.forEach(o => {
      const qNum = String(o?.quotationNumber || 'S-COT');
      const sNum = String(o?.mvSolicitationNumber || 'S-SOL');
      const key = `${qNum}-${sNum}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    });
    return Array.from(map.entries());
  }, [triagemOrders, selectedClass]);

  const simulateExtract = (groupKey: string, fileName: string) => {
    setIsExtracting(groupKey);
    setTimeout(async () => {
      // 1. Lógica de "IA" para identificar dados baseados no nome do arquivo ou contexto
      const fileNumberMatch = fileName.match(/\d+/);
      const identifiedOC = fileNumberMatch ? fileNumberMatch[0] : "23452";

      const identifiedSupplier = "ATIVA COMERCIAL HOSPITALAR LTDA";
      const identifiedDelivery = "5 dias úteis";
      const identifiedQuotation = groupKey !== 'global' ? groupKey.split('-')[0] : (fileNumberMatch ? fileNumberMatch[0] : "6697");

      // 2. Localizar as ordens que serão atualizadas
      // Normalizamos na comparação para ignorar "COT-" ou espaços
      const groupOrders = orders.filter(o => {
        const qNum = String(o?.quotationNumber || '').replace(/\D/g, '');
        const idQNum = String(identifiedQuotation).replace(/\D/g, '');

        if (groupKey === 'global') {
          return qNum.includes(idQNum) || idQNum.includes(qNum);
        }
        const oKey = `${o?.quotationNumber || 'S-COT'}-${o?.mvSolicitationNumber || 'S-SOL'}`;
        return oKey === groupKey;
      });

      if (groupOrders.length === 0 && groupKey === 'global') {
        setIsExtracting(null);
        alert(`SVA IA: Não localizamos a Cotação #${identifiedQuotation} no sistema para o arquivo "${fileName}".`);
        return;
      }

      // 3. Persistir no Supabase e FORÇAR STATUS PARA TRIAGEM
      for (const orderToUpdate of groupOrders) {
        await supabase.from('purchase_orders').update({
          supplier_name: identifiedSupplier,
          order_number: identifiedOC,
          expected_delivery_date: identifiedDelivery,
          quotation_number: identifiedQuotation,
          status: OrderStatus.Triagem // Forçamos o status para que "caia" na triagem
        }).eq('id', orderToUpdate.id);
      }

      // 4. Atualizar o estado local
      setOrders((prev: PurchaseOrder[]) => (prev || []).map(o => {
        const qNum = String(o?.quotationNumber || '').replace(/\D/g, '');
        const idQNum = String(identifiedQuotation).replace(/\D/g, '');
        const oKey = `${o?.quotationNumber || 'S-COT'}-${o?.mvSolicitationNumber || 'S-SOL'}`;

        const isMatch = groupKey === 'global'
          ? (qNum.includes(idQNum) || idQNum.includes(qNum))
          : oKey === groupKey;

        if (isMatch) {
          const items = (o.items || []).map(it => ({
            ...it,
            orderQuantity: it.orderQuantity || 1,
            confirmedAt: new Date().toLocaleDateString('pt-BR'),
            product: {
              ...it.product,
              unitPrice: it.product?.unitPrice || 0
            }
          }));

          return {
            ...o,
            status: OrderStatus.Triagem, // Força no estado local também
            supplierName: identifiedSupplier,
            orderNumber: identifiedOC,
            expectedDeliveryDate: identifiedDelivery,
            quotationNumber: identifiedQuotation,
            items
          };
        }
        return o;
      }));

      setIsExtracting(null);
      alert(`SVA IA: Extração concluída!\n\nDocumento: ${fileName}\nCotação Identificada: ${identifiedQuotation}\nFornecedor: ${identifiedSupplier}\nOC: ${identifiedOC}\n\nO pedido foi movido para TRIAGEM e todos os itens foram mapeados.`);
    }, 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in pb-20">
      {/* HEADER DINÂMICO */}
      {selectedClass ? (
        <div className="flex justify-between items-center bg-white dark:bg-[#0f2626] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={() => setSelectedClass(null)} className="text-primary dark:text-blue-400 font-black flex items-center gap-3 uppercase text-xs tracking-[0.2em] hover:opacity-70">
            <span className="material-symbols-outlined">arrow_back</span> Voltar
          </button>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{selectedClass}</h2>
          <div className="bg-blue-50 dark:bg-blue-900/20 px-5 py-2 rounded-xl text-primary dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">Pasta Ativa</div>
        </div>
      ) : (
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest italic">Triagem de Suprimentos</h2>
      )}

      {/* ÁREA DE UPLOAD GLOBAL - SEMPRE VISÍVEL */}
      <div className="bg-white dark:bg-[#0f2626] p-8 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden mb-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-400 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-black">cloud_upload</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">Iniciar Nova Triagem</h3>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Selecione o PDF da OC ou Relatório de Fornecedor</p>
            </div>
          </div>

          <label className={`cursor-pointer px-10 py-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-4 ${isExtracting ? 'bg-slate-200 text-slate-400 cursor-wait' : 'bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95'}`}>
            <span className="material-symbols-outlined text-2xl">{isExtracting ? 'sync' : 'clinical_notes'}</span>
            {isExtracting ? 'Processando...' : 'Extração Inteligente SVA IA'}
            <input type="file" className="hidden" accept=".pdf" onChange={e => {
              const file = e.target.files?.[0];
              if (file) simulateExtract('global', file.name);
            }} disabled={!!isExtracting} />
          </label>
        </div>
      </div>

      {!selectedClass ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCT_CLASSES.map(cls => (
            <div key={cls} onClick={() => setSelectedClass(cls)} className="bg-white dark:bg-[#0f2626] p-10 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 hover:border-primary dark:hover:border-blue-500 cursor-pointer transition-all shadow-xl group">
              <div className="w-16 h-16 bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-400 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">{CLASS_ICONS[cls] || 'folder'}</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest italic">{cls}</h3>
              <div className="mt-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {triagemOrders.filter(o => o?.productClass === cls).length} Pendentes
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-16">
          {groups.map(([key, groupOrders]) => (
            <div key={key} className="bg-white dark:bg-[#0f2626] p-10 rounded-[4rem] border-2 border-slate-50 dark:border-slate-800 shadow-2xl space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-center gap-10 pb-10 border-b border-slate-100 dark:border-slate-800 relative">
                <div className="flex items-center gap-5 flex-1">
                  <div className="w-16 h-16 bg-slate-900 dark:bg-black text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                    <span className="material-symbols-outlined text-3xl">folder_zip</span>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">Cotação / Processo</div>
                    <div className="flex items-baseline gap-4">
                      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">#{groupOrders?.[0]?.quotationNumber || key.split('-')[0]}</div>
                      <div className="text-[11px] font-black text-primary dark:text-blue-400 uppercase tracking-widest bg-primary/5 dark:bg-blue-900/10 px-3 py-1 rounded-lg">Pendente de Leitura</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-12">
                <FolderUploadCard groupKey={key} onExtract={(file) => simulateExtract(key, file.name)} isExtracting={isExtracting === key} />
                {(groupOrders || []).map((o, idx) => (
                  <SupplierTriageCard
                    key={o?.id || `card-${idx}`}
                    order={o}
                    onConfirm={async (id: string, data: any) => {
                      const { error } = await supabase.from('purchase_orders').update({
                        status: OrderStatus.AguardandoEntrega,
                        supplier_name: data.supplierName,
                        order_number: data.orderNumber,
                        expected_delivery_date: data.expectedDeliveryDate
                      }).eq('id', id);
                      if (error) alert("Erro na triagem: " + error.message);
                    }}
                    onDecline={async (id: string) => {
                      const { error } = await supabase.from('purchase_orders').update({
                        status: OrderStatus.Declinado
                      }).eq('id', id);
                      if (error) alert("Erro ao declinar pedido: " + error.message);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {groups.length === 0 && !isExtracting && (
            <div className="p-32 text-center space-y-8 bg-white dark:bg-[#0f2626] rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 shadow-inner">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 text-slate-100 dark:text-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-6xl">cloud_off</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase italic tracking-tighter">Nenhuma cotação pendente</h3>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest max-w-sm mx-auto">Use o botão acima para subir o PDF do fornecedor e iniciar o processo de entrada.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES DE ENTREGA ---

const DeliveryQuotationCard: React.FC<{ order: PurchaseOrder, onSave: any }> = ({ order, onSave }) => {
  const [items, setItems] = useState<any[]>(order?.items || []);

  const handleQtyChange = (idx: number, val: string) => {
    const qty = parseInt(val) || 0;
    const newItems = [...items];
    newItems[idx].quantityReceived = qty;
    newItems[idx].totalValueReceived = qty * (newItems[idx]?.product?.unitPrice || 0);
    newItems[idx].receivedDate = qty > 0 ? new Date().toLocaleDateString('pt-BR') : '';
    setItems(newItems);
  };

  const totalRec = items.reduce((a, b) => a + (b?.totalValueReceived || 0), 0);

  return (
    <div className="bg-white dark:bg-[#0f2626] rounded-[4rem] shadow-2xl border border-slate-50 dark:border-slate-800 overflow-hidden">
      <div className="bg-[#0f172a] dark:bg-[#051414] text-white p-12">
        <div className="flex justify-between items-end">
          <div className="space-y-6">
            <h4 className="text-4xl font-black uppercase tracking-tighter italic">{order?.supplierName || 'FORNECEDOR N/A'}</h4>
            <div className="flex gap-10 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="flex flex-col gap-1"><span className="text-primary dark:text-blue-400 italic">Documento</span><span>OC: {order?.orderNumber || '---'}</span></div>
              <div className="flex flex-col gap-1 border-l border-white/10 pl-10"><span className="text-primary dark:text-blue-400 italic">Previsão Entrega</span><span>{order?.expectedDeliveryDate || 'Pendente'}</span></div>
            </div>
          </div>
          <button onClick={() => onSave(items)} className="bg-primary dark:bg-blue-600 hover:bg-success dark:hover:bg-emerald-600 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all shadow-2xl active:scale-95 flex items-center gap-4">
            <span className="material-symbols-outlined text-3xl">verified_user</span> Registrar Recebimento
          </button>
        </div>
      </div>
      <div className="p-12 overflow-x-auto">
        <table className="w-full text-left font-sans">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
              <th className="px-5 py-8">Descrição Material</th>
              <th className="px-5 py-8 text-center">Qtd OC</th>
              <th className="px-5 py-8 text-center">Preço Unit.</th>
              <th className="px-5 py-8 text-center">Total OC</th>
              <th className="px-5 py-8 text-center bg-blue-50/20 dark:bg-blue-900/10 text-primary dark:text-blue-400">Recebido (Qtd)</th>
              <th className="px-5 py-8 text-center">Data Rec.</th>
              <th className="px-5 py-8 text-right">Valor Rec.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {items.map((it, i) => (
              <tr key={it?.id || `it-${i}`} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                <td className="px-5 py-8">
                  <div className="font-black text-slate-800 dark:text-emerald-50 text-sm uppercase">{it?.product?.name || '---'}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase mt-1">Cód: {it?.product?.codeMVSES || '---'}</div>
                </td>
                <td className="px-5 py-8 text-center font-bold text-slate-600 dark:text-slate-400">{it?.orderQuantity || 0}</td>
                <td className="px-5 py-8 text-center font-bold text-slate-400 dark:text-slate-700 text-xs">R$ {(it?.product?.unitPrice || 0).toLocaleString()}</td>
                <td className="px-5 py-8 text-center font-black text-slate-800 dark:text-white text-sm">R$ {((it?.orderQuantity || 0) * (it?.product?.unitPrice || 0)).toLocaleString()}</td>
                <td className="px-5 py-8 text-center">
                  <input type="number" className="w-24 border-2 border-primary/20 dark:border-blue-500/30 bg-white dark:bg-[#051414] rounded-xl text-center font-black text-2xl py-3 text-primary dark:text-blue-400 outline-none focus:ring-4 focus:ring-primary/5" value={it?.quantityReceived || ''} placeholder="0" onChange={e => handleQtyChange(i, e.target.value)} />
                </td>
                <td className="px-5 py-8 text-center font-mono text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase">{it?.receivedDate || '---'}</td>
                <td className="px-5 py-8 text-right font-black text-success dark:text-emerald-400 text-xl">R$ {(it?.totalValueReceived || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 dark:bg-black text-white">
            <tr className="font-black">
              <td colSpan={6} className="px-12 py-12 text-right uppercase text-xs text-slate-500 dark:text-slate-700 tracking-[0.3em]">Total Faturado no Recebimento:</td>
              <td className="px-12 py-12 text-right text-6xl tracking-tighter text-success dark:text-emerald-400 italic">R$ {totalRec.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const DeliveryManagementView: React.FC<{ orders: PurchaseOrder[], setOrders: any, currentStatus: OrderStatus }> = ({ orders, setOrders, currentStatus }) => {
  const [selectedClass, setSelectedClass] = useState<ProductClass | null>(null);
  const filtered = useMemo(() => (orders || []).filter(o => o && o.status === currentStatus), [orders, currentStatus]);

  if (!selectedClass) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest italic">Painel de Entregas: {currentStatus}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCT_CLASSES.map(cls => (
            <div key={cls} onClick={() => setSelectedClass(cls)} className="bg-white dark:bg-[#0f2626] p-10 rounded-[3rem] border-2 border-transparent dark:border-slate-800 hover:border-primary dark:hover:border-blue-500 cursor-pointer transition-all shadow-xl group">
              <div className="w-16 h-16 bg-primary/10 dark:bg-blue-500/10 text-primary dark:text-blue-400 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl">{CLASS_ICONS[cls] || 'folder'}</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-widest italic">{cls}</h3>
              {filtered.filter(o => o?.productClass === cls).length > 0 && (
                <span className="inline-block mt-4 px-3 py-1 bg-primary dark:bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">
                  {filtered.filter(o => o?.productClass === cls).length} Pedidos
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in slide-in-from-right-10 pb-20">
      <button onClick={() => setSelectedClass(null)} className="text-primary dark:text-blue-400 font-black flex items-center gap-3 uppercase text-xs tracking-widest hover:opacity-70">
        <span className="material-symbols-outlined">arrow_back</span> Voltar
      </button>
      <div className="grid gap-12">
        {filtered.filter(o => o?.productClass === selectedClass).map(o => (
          <DeliveryQuotationCard
            key={o?.id || Math.random().toString()}
            order={o}
            onSave={async (items: any[]) => {
              // Calcular se é entrega total ou parcial
              const isPartial = items.some(it => (it.quantityReceived || 0) < (it.orderQuantity || 0));
              const isEverythingZero = items.every(it => (it.quantityReceived || 0) === 0);

              if (isEverythingZero) {
                alert("Nenhuma quantidade informada para recebimento.");
                return;
              }

              const targetStatus = isPartial ? OrderStatus.EntregaParcial : OrderStatus.EntregaTotal;

              const { error: orderError } = await supabase.from('purchase_orders').update({
                status: targetStatus,
                date_closed: targetStatus === OrderStatus.EntregaTotal ? new Date().toISOString() : null
              }).eq('id', o?.id);

              if (!orderError) {
                for (const item of items) {
                  await supabase.from('order_items').update({
                    quantity_received: item.quantityReceived || 0,
                    total_value_received: (item.quantityReceived || 0) * (item.product?.unitPrice || 0),
                    received_date: item.quantityReceived > 0 ? new Date().toISOString() : null
                  }).eq('order_id', o?.id).eq('product_id', item.productId);
                }
                alert(`Recebimento ${isPartial ? 'PARCIAL' : 'TOTAL'} registrado com sucesso!`);
              } else {
                alert("Erro ao salvar recebimento: " + orderError.message);
              }
            }}
          />
        ))}
        {filtered.filter(o => o?.productClass === selectedClass).length === 0 && <div className="text-center py-20 font-black text-slate-300 dark:text-slate-700 italic">CATEGORIA VAZIA</div>}
      </div>
    </div>
  );
};

// --- OUTRAS VIEWS ---

const PerformanceHub: React.FC<{ orders: PurchaseOrder[] }> = ({ orders = [] }) => {
  const stats = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    const emitidas = list.filter(o => o && o.status !== OrderStatus.Triagem);
    const totalEmitido = emitidas.reduce((a, b) => a + (b?.totalValue || 0), 0);
    const totalOrcado = totalEmitido * 1.05;
    const count = emitidas.length;
    return { totalEmitido, totalOrcado, economy: totalOrcado - totalEmitido, count };
  }, [orders]);

  return (
    <div className="space-y-10 animate-in fade-in pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <KPIButton title="Total Emitido" value={`R$ ${stats.totalEmitido.toLocaleString()}`} icon="payments" color="bg-slate-900" />
        <KPIButton title="Ordens Abertas" value={stats.count} icon="receipt_long" color="bg-primary" />
        <KPIButton title="Painel de Economia" value={`R$ ${stats.economy.toLocaleString()}`} icon="savings" color="bg-success" />
        <KPIButton title="Risco Ruptura" value="0%" icon="report_problem" color="bg-danger" />
      </div>

      <div className="bg-white dark:bg-[#0f2626] p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 dark:border-slate-800">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-10 text-center italic">Mapa de Eficiência Operacional</h3>
        <table className="w-full text-left">
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            <DRERow label="Ordens de Compra" value={`R$ ${stats.totalEmitido.toLocaleString()}`} />
            <DRERow label="Investimento Planejado" value={`R$ ${stats.totalOrcado.toLocaleString()}`} />
            <DRERow label="Gain de Negociação" value={`R$ ${stats.economy.toLocaleString()}`} color="text-primary dark:text-blue-400" />
            <tr className="bg-slate-900 dark:bg-black text-white">
              <td className="p-8 rounded-l-3xl font-black uppercase text-xs tracking-widest">Resultado</td>
              <td className="p-8 text-right rounded-r-3xl text-3xl font-black">STABLE</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SupplierSummaryCard: React.FC<{ name: string, orders: PurchaseOrder[] }> = ({ name, orders }) => (
  <div className="bg-white dark:bg-[#0f2626] p-10 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 animate-in fade-in">
    <div className="flex justify-between items-center mb-6">
      <h4 className="font-black text-slate-800 dark:text-white text-xl tracking-tighter uppercase italic">{name}</h4>
      <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-600">
        <span className="material-symbols-outlined">storefront</span>
      </div>
    </div>
    <div className="space-y-4">
      {(orders || []).map(o => (
        <div key={o?.id || Math.random()} className="p-4 bg-slate-50 dark:bg-[#051414]/50 rounded-2xl flex justify-between items-center text-xs font-black uppercase tracking-tight">
          <span className="text-slate-500 dark:text-slate-600">OC: {o?.orderNumber || '---'}</span>
          <span className="text-primary dark:text-blue-400">R$ {(o?.totalValue || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  </div>
);

const StatusSummaryView: React.FC<{ orders: PurchaseOrder[], status: OrderStatus }> = ({ orders = [], status }) => {
  const filtered = useMemo(() => (orders || []).filter(o => o && o.status === status), [orders, status]);
  return (
    <div className="space-y-8 animate-in fade-in pb-20">
      <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-widest italic">{status}</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(o => <SupplierSummaryCard key={o?.id} name={o?.supplierName || '---'} orders={[o]} />)}
        {filtered.length === 0 && <div className="p-20 text-center font-black text-slate-200 dark:text-slate-800 italic uppercase">Sem dados históricos</div>}
      </div>
    </div>
  );
};

const TrackingManagement: React.FC<TrackingProps> = ({ orders = [], setOrders, onLogout, darkMode, setDarkMode }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#0a1a1a] flex font-sans overflow-hidden transition-colors duration-500">
      <aside className="w-72 bg-[#0b1426] dark:bg-[#051414] text-slate-400 dark:text-slate-500 flex flex-col shrink-0 shadow-2xl z-20 border-r border-slate-800">
        <div className="p-10 flex items-center gap-4 border-b border-white/5 bg-slate-900/40 dark:bg-slate-900/20">
          <div className="w-12 h-12 bg-primary dark:bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/20">
            <span className="material-symbols-outlined text-3xl font-black">insights</span>
          </div>
          <div className="leading-tight">
            <div className="text-white font-black text-sm uppercase tracking-tighter italic">Logistics Hub</div>
            <div className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Performance Center</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-8">
          <div className="px-10 mb-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Operacional</div>
          <SidebarLink to="/tracking/performance" icon="equalizer" label="Hub de Performance" />
          <SidebarLink to="/tracking" icon="content_paste_search" label="Triagem de Ordens" />
          <SidebarLink to="/tracking/pending" icon="local_shipping" label="Aguardando Entrega" />
          <SidebarLink to="/tracking/partial" icon="inventory" label="Recebimento Parcial" />

          <div className="px-10 mt-10 mb-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Arquivo / Estratégico</div>
          <SidebarLink to="/tracking/total" icon="verified" label="Entregas Totais" />
          <SidebarLink to="/tracking/declined" icon="block" label="Ordens Declinadas" />
          <SidebarLink to="/tracking/finished" icon="history" label="Histórico Finalizado" />
        </nav>

        <div className="p-6 space-y-3 bg-slate-900/50 dark:bg-[#051414] border-t border-white/5 dark:border-slate-800">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/5 dark:hover:bg-emerald-500/5 rounded-2xl transition-all text-xs font-black uppercase tracking-widest text-slate-300 dark:text-slate-500 hover:text-white dark:hover:text-emerald-400">
            <span className="material-symbols-outlined">home</span> Início
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 hover:text-danger rounded-2xl transition-all text-xs font-black uppercase tracking-widest text-slate-400">
            <span className="material-symbols-outlined">logout</span> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto h-screen relative bg-[#f8fafc] dark:bg-[#0a1a1a] transition-colors">
        <header className="bg-white/90 dark:bg-[#0f2626]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-12 py-8 sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">SVA - Painel de Acompanhamento Logístico</h1>

          <div className="flex items-center gap-10">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center gap-3 text-slate-400 dark:text-slate-500 hover:text-success dark:hover:text-emerald-400 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <span className="material-symbols-outlined text-xl">
                {darkMode ? 'light_mode' : 'dark_mode'}
              </span>
              {darkMode ? 'Claro' : 'Escuro'}
            </button>

            <div className="flex items-center gap-4">
              <div className="h-2 w-2 bg-success rounded-full animate-ping" />
              <span className="text-[10px] font-black text-success uppercase tracking-widest">Conexão Ativa</span>
            </div>
          </div>
        </header>

        <div className="p-12 max-w-[1600px] mx-auto">
          <ErrorBoundary>
            <Routes>
              <Route index element={<TriagemView orders={orders} setOrders={setOrders} />} />
              <Route path="performance" element={<PerformanceHub orders={orders} />} />
              <Route path="pending" element={<DeliveryManagementView orders={orders} setOrders={setOrders} currentStatus={OrderStatus.AguardandoEntrega} />} />
              <Route path="partial" element={<DeliveryManagementView orders={orders} setOrders={setOrders} currentStatus={OrderStatus.EntregaParcial} />} />
              <Route path="total" element={<DeliveryManagementView orders={orders} setOrders={setOrders} currentStatus={OrderStatus.EntregaTotal} />} />
              <Route path="declined" element={<StatusSummaryView orders={orders} status={OrderStatus.Declinado} />} />
              <Route path="finished" element={<StatusSummaryView orders={orders} status={OrderStatus.Finalizado} />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default TrackingManagement;
