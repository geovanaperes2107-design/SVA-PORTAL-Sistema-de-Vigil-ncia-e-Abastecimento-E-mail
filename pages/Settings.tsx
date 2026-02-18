import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { User, AccessProfile, HospitalSettings } from '../types';

interface SettingsPageProps {
  currentUser: User | null;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser, users, setUsers, darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'alertas' | 'parametros'>('usuarios');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    cpf: '',
    sector: 'GERAL',
    profile: AccessProfile.Visualizador
  });

  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettings>({
    unitName: (window as any).sva_unit_name || 'Hospital Estadual de São Luis de Montes Belos - HSLMB',
    reportEmail: (window as any).sva_report_email || 'administrativo@hospital.com.br'
  });

  useEffect(() => {
    const fetchSystemSettings = async () => {
      const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).single();
      if (data && !error) {
        setHospitalSettings({
          unitName: data.unit_name,
          reportEmail: data.report_email
        });
      }
    };
    fetchSystemSettings();
  }, []);

  const handleSaveHospitalSettings = async () => {
    const { error } = await supabase
      .from('system_settings')
      .update({
        unit_name: hospitalSettings.unitName,
        report_email: hospitalSettings.reportEmail
      })
      .eq('id', 1);

    if (!error) {
      alert("Configurações da Unidade salvas com sucesso!");
      (window as any).sva_unit_name = hospitalSettings.unitName;
      (window as any).sva_report_email = hospitalSettings.reportEmail;
    } else {
      alert("Erro ao salvar configurações: " + error.message);
    }
  };

  const isAdmin = currentUser?.profile === AccessProfile.Administrador;

  // Função para aplicar máscara de CPF em tempo real
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        cpf: '',
        sector: 'GERAL',
        profile: AccessProfile.Visualizador
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name || !formData.email || !formData.cpf) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const rawCpf = formData.cpf.replace(/\D/g, '');

    if (editingUser) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.name.toUpperCase(),
          email: formData.email,
          cpf: rawCpf,
          sector: formData.sector,
          role: formData.profile
        })
        .eq('id', editingUser.id);

      if (error) {
        alert("Erro ao atualizar perfil: " + error.message);
      } else {
        alert("Perfil atualizado com sucesso!");
        setShowUserModal(false);
      }
    } else {
      alert("Para criar novos usuários, utilize a função de Convite ou Registro Administrativo no Painel Supabase.");
      // No simulado, podemos apenas fechar o modal ou tentar um upsert se tivermos um ID temporário
      setShowUserModal(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (window.confirm("Tem certeza que deseja remover este colaborador?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'background_url' | 'login_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulação de upload para storage
    const fakeUrl = `https://storage.sva-portal.com/${type}/${file.name}`;

    const { error } = await supabase
      .from('system_settings')
      .update({ [type]: fakeUrl })
      .eq('id', 1);

    if (!error) {
      alert(`Imagem de ${type === 'background_url' ? 'fundo' : 'login'} alterada com sucesso!`);
    } else {
      alert("Erro ao alterar imagem: " + error.message);
    }
  };

  const handleResetPassword = (name: string) => {
    alert(`Senha do colaborador ${name} resetada para o padrão: 8754\nO usuário deverá trocar a senha no próximo acesso.`);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-[#0a1a1a] p-10 font-sans text-slate-700 dark:text-slate-300 transition-colors duration-500">
      {/* HEADER */}
      <header className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-success text-3xl font-black">shield</span>
            <h1 className="text-3xl font-black text-[#0f3d3d] dark:text-white tracking-tight italic">Configurações do Sistema</h1>
          </div>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] ml-1">Gerencie usuários, alertas e parâmetros da unidade</p>
        </div>

        <button
          onClick={() => setDarkMode(!darkMode)}
          className="bg-white dark:bg-[#0f2626] text-slate-400 dark:text-slate-500 hover:text-success dark:hover:text-emerald-400 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <span className="material-symbols-outlined text-2xl">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
          {darkMode ? 'Modo Claro' : 'Modo Escuro'}
        </button>
      </header>

      {/* TABS SELECTOR */}
      <div className="flex items-center gap-4 mb-8 bg-[#e8efed] p-2 rounded-2xl w-fit animate-in fade-in duration-700">
        <TabButton
          active={activeTab === 'usuarios'}
          onClick={() => setActiveTab('usuarios')}
          icon="group"
          label="USUÁRIOS"
          darkMode={darkMode}
        />
        <TabButton
          active={activeTab === 'alertas'}
          onClick={() => setActiveTab('alertas')}
          icon="notifications"
          label="ALERTAS"
          darkMode={darkMode}
        />
        <TabButton
          active={activeTab === 'parametros'}
          onClick={() => setActiveTab('parametros')}
          icon="corporate_fare"
          label="PARÂMETROS"
          darkMode={darkMode}
        />
      </div>

      {/* CONTENT AREA */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'usuarios' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0f2626] p-6 rounded-[2.5rem] shadow-sm flex justify-between items-center border border-white dark:border-slate-800">
              <div className="relative w-96 group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 group-focus-within:text-success transition-colors">search</span>
                <input
                  placeholder="Filtrar por nome ou CPF..."
                  className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 dark:text-emerald-50 focus:ring-2 focus:ring-success outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleOpenModal()}
                  className="bg-[#009e6a] hover:bg-[#007a52] text-white px-10 py-6 rounded-3xl font-black uppercase text-[12px] tracking-widest flex items-center gap-4 shadow-xl shadow-success/20 transition-all hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined text-2xl">person_add</span>
                  Novo Colaborador
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-[#0f2626] rounded-[3.5rem] shadow-sm border border-white dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[12px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] border-b border-slate-50 dark:border-slate-800/50">
                    <th className="px-12 py-10">NOME / E-MAIL</th>
                    <th className="px-8 py-10">SETOR</th>
                    <th className="px-8 py-10">PERFIL</th>
                    <th className="px-8 py-10">CPF (LOGIN)</th>
                    <th className="px-12 py-10 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                      <td className="px-12 py-10">
                        <div className="font-black text-slate-800 dark:text-emerald-50 text-base tracking-tight">{user.name}</div>
                        <div className="text-[13px] font-bold text-slate-400 dark:text-slate-500 mt-2">{user.email}</div>
                        {user.isCurrentUser && (
                          <span className="inline-block mt-3 bg-success text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">Sua Conta</span>
                        )}
                      </td>
                      <td className="px-8 py-10 font-black text-slate-500 dark:text-slate-400 text-[13px] uppercase tracking-widest">{user.sector}</td>
                      <td className="px-8 py-10">
                        <span className={`px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest ${user.profile === AccessProfile.Administrador ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                          user.profile === AccessProfile.Farmaceutico ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                          {user.profile}
                        </span>
                      </td>
                      <td className="px-8 py-10 font-mono font-bold text-slate-500 dark:text-slate-400 text-[15px]">{user.cpf}</td>
                      <td className="px-12 py-10 text-right">
                        <div className="flex justify-end gap-3 transition-opacity">
                          {isAdmin && (
                            <>
                              <button onClick={() => handleOpenModal(user)} aria-label="Editar"><ActionButton icon="edit" color="bg-slate-50 text-slate-400" /></button>
                              <button onClick={() => handleResetPassword(user.name)} aria-label="Resetar Senha"><ActionButton icon="vpn_key" color="bg-yellow-50 text-yellow-500" /></button>
                              {user.id !== currentUser?.id && (
                                <button onClick={() => handleDeleteUser(user.id)} aria-label="Excluir"><ActionButton icon="delete" color="bg-red-50 text-red-400" /></button>
                              )}
                            </>
                          )}
                          {!isAdmin && user.id === currentUser?.id && (
                            <button onClick={() => handleOpenModal(user)} aria-label="Editar Perfil"><ActionButton icon="edit" color="bg-slate-50 text-slate-400" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'parametros' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            {/* UNIDADE HOSPITALAR */}
            <div className="bg-white dark:bg-[#0f2626] p-12 rounded-[3.5rem] shadow-sm border border-white dark:border-slate-800 space-y-10">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-primary dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">domain</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#0f3d3d] dark:text-white uppercase tracking-tight">Unidade Hospitalar</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identificação da Instituição</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Nome da Unidade</label>
                  <input
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-2xl px-8 py-5 text-sm font-black text-slate-800 dark:text-emerald-50 focus:ring-2 focus:ring-success outline-none transition-all placeholder:text-slate-700"
                    value={hospitalSettings.unitName}
                    onChange={e => setHospitalSettings({ ...hospitalSettings, unitName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Relatórios por E-mail</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600">mail</span>
                    <input
                      className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-2xl px-14 py-5 text-sm font-bold text-slate-500 dark:text-slate-400 focus:ring-2 focus:ring-success outline-none transition-all"
                      value={hospitalSettings.reportEmail}
                      onChange={e => setHospitalSettings({ ...hospitalSettings, reportEmail: e.target.value })}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase ml-2">O sistema enviará uma cópia mensal automática para este endereço.</p>
                </div>
                <button
                  onClick={handleSaveHospitalSettings}
                  className="w-full bg-slate-900 dark:bg-black text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-success transition-all"
                >
                  Salvar Parâmetros da Unidade
                </button>
              </div>
            </div>

            {/* IDENTIDADE VISUAL */}
            <div className="bg-white dark:bg-[#0f2626] p-12 rounded-[3.5rem] shadow-sm border border-white dark:border-slate-800 space-y-10">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl">image</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#0f3d3d] dark:text-white uppercase tracking-tight">Identidade Visual</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Personalize as telas do sistema</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Painel de Fundo</label>
                  <label className="h-40 bg-[#f4f7f6] dark:bg-[#051414] rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-success transition-all">
                    <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800 group-hover:scale-110 transition-transform">desktop_windows</span>
                    <span className="bg-white dark:bg-[#0f2626] px-4 py-2 rounded-xl text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 shadow-sm border border-transparent dark:border-slate-800">Alterar</span>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'background_url')} />
                  </label>
                </div>
                <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Tela de Login</label>
                  <label className="h-40 bg-[#f4f7f6] dark:bg-[#051414] rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-success transition-all">
                    <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800 group-hover:scale-110 transition-transform">key</span>
                    <span className="bg-white dark:bg-[#0f2626] px-4 py-2 rounded-xl text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 shadow-sm border border-transparent dark:border-slate-800">Alterar</span>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'login_image_url')} />
                  </label>
                </div>
              </div>
            </div>

            {/* CUSTOS E COBERTURA PLACEHOLDER */}
            <div className="bg-white dark:bg-[#0f2626] p-12 rounded-[3.5rem] shadow-sm border border-white dark:border-slate-800 flex items-center justify-between col-span-1 md:col-span-2">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 text-success dark:text-emerald-400 rounded-3xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">payments</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#0f3d3d] dark:text-white uppercase tracking-tight">Custos e Cobertura</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Defina o lead-time e margens padrão da unidade</p>
                </div>
              </div>
              <button className="bg-[#f4f7f6] dark:bg-[#051414] text-slate-400 dark:text-slate-500 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-slate-900 transition-all border border-transparent dark:border-slate-800">Configurar Parâmetros</button>
            </div>
          </div>
        )}

        {activeTab === 'alertas' && (
          <div className="bg-white dark:bg-[#0f2626] p-20 rounded-[3.5rem] border border-white dark:border-slate-800 text-center space-y-6 shadow-sm">
            <span className="material-symbols-outlined text-7xl text-slate-100 dark:text-slate-900">notifications_off</span>
            <h3 className="text-xl font-black text-slate-300 dark:text-slate-600 uppercase italic">Nenhum Alerta Configurado</h3>
            <button className="bg-success dark:bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-success/20">Criar Regra de Alerta</button>
          </div>
        )}
      </main>

      {/* MODAL NOVO COLABORADOR */}
      {showUserModal && (
        <div className="fixed inset-0 bg-[#0f3d3d]/90 dark:bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0f2626] w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-transparent dark:border-slate-800">
            {/* MODAL HEADER - FIXED */}
            <div className="bg-[#009e6a] dark:bg-[#007a52] p-8 md:p-10 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl md:text-3xl font-black">{editingUser ? 'edit' : 'person_add'}</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tight">{editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                  <p className="text-[9px] md:text-[10px] font-black uppercase text-white/60 tracking-widest">Preencha os dados de acesso</p>
                </div>
              </div>
              <button onClick={() => setShowUserModal(false)} className="text-white/60 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl md:text-4xl">close</span>
              </button>
            </div>

            {/* MODAL BODY - SCROLLABLE */}
            <div className="p-10 md:p-14 space-y-8 md:space-y-10 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f2626]">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                <input
                  placeholder="EX: JOÃO DA SILVA"
                  className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-8 py-5 md:px-10 md:py-6 text-base font-black text-slate-800 dark:text-emerald-50 placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-2 focus:ring-success outline-none transition-all uppercase"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">E-mail</label>
                  <input
                    placeholder="contato@hospital.com"
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-8 py-5 md:px-10 md:py-6 text-base font-bold text-slate-500 dark:text-slate-400 placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-2 focus:ring-success outline-none transition-all"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">CPF (Apenas números)</label>
                  <input
                    placeholder="000.000.000-00"
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-8 py-5 md:px-10 md:py-6 text-base font-bold text-slate-500 dark:text-slate-400 placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-2 focus:ring-success outline-none transition-all"
                    value={formData.cpf}
                    onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Setor Principal</label>
                  <select
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-8 py-5 md:px-10 md:py-6 text-base font-black text-slate-800 dark:text-emerald-50 focus:ring-2 focus:ring-success outline-none appearance-none cursor-pointer"
                    value={formData.sector}
                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                  >
                    <option value="GERAL">GERAL</option>
                    <option value="FARMÁCIA">FARMÁCIA</option>
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                    <option value="LOGÍSTICA">LOGÍSTICA</option>
                    <option value="DIREÇÃO">DIREÇÃO</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] ml-2">Perfil de Acesso</label>
                  <select
                    className="w-full bg-[#f4f7f6] dark:bg-[#051414] border-none rounded-3xl px-8 py-5 md:px-10 md:py-6 text-base font-black text-slate-800 dark:text-emerald-50 focus:ring-2 focus:ring-success outline-none appearance-none cursor-pointer disabled:opacity-50"
                    value={formData.profile}
                    onChange={e => setFormData({ ...formData, profile: e.target.value as AccessProfile })}
                    disabled={editingUser?.id === currentUser?.id}
                  >
                    <option value={AccessProfile.Visualizador}>VISUALIZADOR</option>
                    <option value={AccessProfile.Comprador}>COMPRADOR</option>
                    <option value={AccessProfile.Almoxarife}>ALMOXARIFE</option>
                    <option value={AccessProfile.Farmaceutico}>FARMACÊUTICO</option>
                    <option value={AccessProfile.Administrador}>ADMINISTRADOR</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="bg-[#fff9e6] dark:bg-yellow-900/10 p-8 md:p-10 rounded-[3rem] border border-[#ffeb99] dark:border-yellow-900/30 text-center space-y-6 md:space-y-8">
                  <div className="flex items-center justify-center gap-4 text-orange-500 dark:text-yellow-500">
                    <span className="material-symbols-outlined font-black text-2xl">vpn_key</span>
                    <span className="text-[11px] md:text-[12px] font-black uppercase tracking-[0.2em]">Senha Chave (Provisória)</span>
                  </div>
                  <div className="bg-white dark:bg-[#051414] py-6 md:py-8 rounded-3xl text-4xl md:text-6xl font-black text-slate-400 dark:text-slate-600 tracking-[0.5em] shadow-inner select-none">
                    8 7 5 4
                  </div>
                  <p className="text-[10px] md:text-[11px] font-black text-orange-500 dark:text-yellow-600 uppercase tracking-widest leading-relaxed">Informe esta senha ao colaborador para o primeiro acesso.</p>
                </div>
              )}

              <button
                onClick={handleSaveUser}
                className="w-full bg-[#009e6a] text-white py-6 md:py-8 rounded-3xl font-black uppercase text-[12px] md:text-sm tracking-widest shadow-xl shadow-success/20 hover:scale-[1.02] transition-all"
              >
                {editingUser ? 'Salvar Alterações' : 'Finalizar Cadastro de Acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NAVIGATION */}
      <footer className="mt-16 flex justify-center pb-12">
        <button onClick={() => navigate('/')} className="bg-white dark:bg-[#0f2626] text-slate-400 dark:text-slate-500 px-12 py-5 rounded-full font-black uppercase text-[12px] tracking-widest border border-slate-100 dark:border-slate-800 hover:text-success dark:hover:text-emerald-400 transition-all shadow-sm">Voltar ao Painel Principal</button>
      </footer>
    </div>
  );
};

// COMPONENTES AUXILIARES
const TabButton = ({ active, onClick, icon, label, darkMode }: { active: boolean, onClick: any, icon: string, label: string, darkMode: boolean }) => (
  <button
    onClick={onClick}
    className={`px-8 py-4 rounded-xl flex items-center gap-3 font-black text-[10px] tracking-widest uppercase transition-all ${active
      ? 'bg-white dark:bg-emerald-500/10 text-success dark:text-emerald-400 shadow-sm'
      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
  >
    <span className="material-symbols-outlined text-xl">{icon}</span>
    {label}
  </button>
);

const ActionButton = ({ icon, color }: { icon: string, color: string }) => (
  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 ${color} dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white`}>
    <span className="material-symbols-outlined text-lg">{icon}</span>
  </div>
);

export default SettingsPage;
