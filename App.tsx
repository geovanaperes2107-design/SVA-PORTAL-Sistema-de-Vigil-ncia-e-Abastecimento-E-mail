import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import DashboardSelector from './pages/DashboardSelector';
import ProcurementManagement from './pages/ProcurementManagement';
import TrackingManagement from './pages/TrackingManagement';
import SettingsPage from './pages/Settings';
import { Product, PurchaseOrder, User, AccessProfile } from './types';
import { supabase } from './supabase';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // MODO ESCURO
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('sva_theme') === 'dark';
  });

  // BUSCAR DADOS DO SUPABASE
  const fetchData = async () => {
    try {
      // Buscar Produtos
      const { data: prods } = await supabase
        .from('products')
        .select('*, price_history(*)');

      if (prods) {
        const mappedProds: Product[] = prods.map(p => ({
          id: p.id,
          codeMVSupplier: p.code_mv_supplier,
          codeMVSES: p.code_mv_ses,
          name: p.name,
          unit: p.unit,
          unitPrice: p.unit_price,
          productClass: p.product_class as any,
          monthlyConsumption: p.monthly_consumption,
          currentStock: p.current_stock,
          notes: p.notes,
          priceHistory: p.price_history
        }));
        setProducts(mappedProds);
      }

      // Buscar Pedidos com itens e produtos
      const { data: ords } = await supabase
        .from('purchase_orders')
        .select('*, order_items(*, product:products(*))');

      if (ords) {
        const mappedOrds: PurchaseOrder[] = ords.map(o => ({
          id: o.id,
          date: new Date(o.order_date).toLocaleDateString('pt-BR'),
          referenceMonth: o.reference_month,
          type: o.order_type as any,
          status: o.status as any,
          totalValue: o.total_value,
          totalValueInvoiced: o.total_value_invoiced,
          budgetedValue: o.budgeted_value,
          supplierName: o.supplier_name,
          orderNumber: o.order_number,
          quotationNumber: o.quotation_number,
          mvSolicitationNumber: o.mv_solicitation_number,
          productClass: o.product_class as any,
          createdAt: new Date(o.created_at).getTime(),
          leadTime: o.lead_time,
          realLeadTime: o.real_lead_time,
          coverageDays: o.coverage_days,
          reliabilityIndex: o.reliability_index,
          items: o.order_items.map((i: any) => ({
            productId: i.product_id,
            product: i.product ? {
              id: i.product.id,
              name: i.product.name,
              unit: i.product.unit,
              unitPrice: i.product.unit_price,
              productClass: i.product.product_class
            } : undefined,
            cmm: i.cmm,
            cmd: i.cmd,
            stock: i.stock_at_time,
            daysOfStock: i.days_of_stock,
            suggestion: i.suggestion,
            orderQuantity: i.order_quantity,
            quantityReceived: i.quantity_received,
            totalValueOC: i.total_value_oc,
            totalValueReceived: i.total_value_received,
            receivedDate: i.received_date ? new Date(i.received_date).toLocaleDateString('pt-BR') : undefined
          }))
        }));
        setOrders(mappedOrds);
      }

      // Buscar Usuários (Profiles)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      if (profiles) {
        const mappedUsers: User[] = profiles.map(p => ({
          id: p.id,
          name: p.full_name,
          email: p.email || '',
          cpf: p.cpf,
          sector: p.sector || 'GERAL',
          profile: p.role as AccessProfile
        }));
        setUsers(mappedUsers);
      }

      // Buscar Configurações do Sistema
      const { data: config } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (config) {
        (window as any).sva_unit_name = config.unit_name;
        (window as any).sva_report_email = config.report_email;
      }
    } catch (error) {
      console.error("Erro ao carregar dados do Supabase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Timeout de segurança: se carregar por mais de 5s, para o loading
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    fetchData();

    // Listen for changes
    const productsSub = supabase.channel('products_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchData).subscribe();
    const ordersSub = supabase.channel('orders_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_orders' }, fetchData).subscribe();
    const itemsSub = supabase.channel('items_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchData).subscribe();
    const profilesSub = supabase.channel('profiles_changes').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchData).subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const mappedUser: User = {
              id: session.user.id,
              name: profile.full_name || session.user.email?.split('@')[0] || 'Unknown',
              email: session.user.email || '',
              cpf: profile.cpf || '',
              sector: profile.sector || 'ADMINISTRAÇÃO',
              profile: (profile.role as AccessProfile) || AccessProfile.Visualizador
            };
            setCurrentUser(mappedUser);
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.error("Erro ao buscar perfil:", err);
        }
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(productsSub);
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(itemsSub);
      supabase.removeChannel(profilesSub);
      clearTimeout(safetyTimeout);
    };
  }, []);

  // PERSISTÊNCIA DO TEMA
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sva_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sva_theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f7f6] dark:bg-[#0a1a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-success border-t-transparent"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />}
        />

        <Route
          path="/"
          element={isAuthenticated ? <DashboardSelector onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />}
        />

        <Route
          path="/management/*"
          element={
            isAuthenticated ? (
              <ProcurementManagement
                products={products}
                setProducts={setProducts}
                orders={orders}
                setOrders={setOrders}
                onLogout={handleLogout}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/tracking/*"
          element={
            isAuthenticated ? (
              <TrackingManagement
                orders={orders}
                setOrders={setOrders}
                onLogout={handleLogout}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
            ) : <Navigate to="/login" />
          }
        />

        <Route
          path="/settings"
          element={isAuthenticated ? <SettingsPage currentUser={currentUser} users={users} setUsers={setUsers} darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />}
        />
      </Routes>
    </HashRouter>
  );
};

export default App;
