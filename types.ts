
export enum ProductClass {
  Medicamentos = 'Medicamentos',
  MaterialHospitalar = 'Material Hospitalar',
  EPI = 'EPI',
  Grafica = 'Gráfica',
  Papelaria = 'Papelaria',
  Dieta = 'Dieta',
  QuimicosDescartaveis = 'Químicos / Descartáveis',
  Utensilios = 'Utensílios',
  EquipamentosMedicos = 'Equipamentos Médicos'
}

export enum PurchaseType {
  Emergencial = 'Rito Emergencial',
  Mensal = 'Rito Mensal'
}

export enum OrderStatus {
  Triagem = 'Triagem',
  AguardandoEntrega = 'Aguardando Entrega',
  EntregaParcial = 'Entrega Parcial',
  EntregaTotal = 'Entrega Total',
  Declinado = 'Declinado',
  Finalizado = 'Finalizado'
}

export enum AccessProfile {
  Administrador = 'ADMINISTRADOR',
  Comprador = 'COMPRADOR',
  Farmaceutico = 'FARMACÊUTICO',
  Almoxarife = 'ALMOXARIFE',
  Visualizador = 'VISUALIZADOR'
}

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  sector: string;
  profile: AccessProfile;
  isCurrentUser?: boolean;
  password?: string;
}

export interface HospitalSettings {
  unitName: string;
  reportEmail: string;
  bgPanelUrl?: string;
  loginPageUrl?: string;
}

export interface PriceHistory {
  month: string;
  price: number;
}

export interface Product {
  id: string;
  codeMVSupplier: string; // MV FUNEV
  codeMVSES: string;      // MV SES
  name: string;
  unit: string;
  unitPrice: number;
  productClass: ProductClass;
  monthlyConsumption: number;
  currentStock: number;
  notes?: string;
  priceHistory?: PriceHistory[];
}

export interface PurchaseRequestItem {
  productId: string;
  product: Product;
  cmm: number;
  cmd: number;
  stock: number;
  daysOfStock: number;
  suggestion: number;
  orderQuantity: number;
  quantityReceived: number;
  totalValueOC: number;
  totalValueReceived: number;
  receivedDate?: string;
  isDeclined?: boolean;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  dateClosed?: string;
  expectedDeliveryDate?: string;
  referenceMonth: string;
  type: PurchaseType;
  items: PurchaseRequestItem[];
  totalValue: number;
  totalValueInvoiced?: number;
  status: OrderStatus;
  mvSolicitationNumber?: string;
  quotationNumber?: string;
  supplierName?: string;
  orderNumber?: string;
  productClass: ProductClass;
  createdAt: number;
  leadTime: number;
  realLeadTime?: number;
  coverageDays: number;
  budgetedValue?: number;
  reliabilityIndex?: number;
  quotationTitle?: string;
  responsibleBuyer?: string;
  cnpj?: string;
}
