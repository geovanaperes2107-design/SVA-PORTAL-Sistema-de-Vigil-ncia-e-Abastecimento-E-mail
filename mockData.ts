
import { Product, ProductClass, PurchaseOrder, OrderStatus, PurchaseType, User, AccessProfile } from './types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'GEOVANA CORREA PERES',
    email: 'geovana.peres@heslmb.org.br',
    cpf: '06004489166',
    sector: 'GERAL',
    profile: AccessProfile.Administrador,
    isCurrentUser: true,
    password: '123456'
  },
  {
    id: '2',
    name: 'WANDERSON MOURÃO MORAIS',
    email: 'wands18m@gmail.com',
    cpf: '042.501.691-97',
    sector: 'FARMÁCIA',
    profile: AccessProfile.Farmaceutico,
    password: '8754'
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    codeMVSupplier: 'SUP-001',
    codeMVSES: 'SES-100',
    name: 'Dipirona 500mg/ml',
    unit: 'Ampola',
    unitPrice: 1.25,
    productClass: ProductClass.Medicamentos,
    monthlyConsumption: 1500,
    currentStock: 400,
    priceHistory: [
      { month: 'Jan', price: 3.29 },
      { month: 'Fev', price: 3.45 },
      { month: 'Mar', price: 3.10 }
    ]
  },
  {
    id: '2',
    codeMVSupplier: 'SUP-002',
    codeMVSES: 'SES-101',
    name: 'Seringa 5ml c/ Agulha',
    unit: 'Unidade',
    unitPrice: 0.85,
    productClass: ProductClass.MaterialHospitalar,
    monthlyConsumption: 5000,
    currentStock: 1200
  }
];

export const MOCK_ORDERS: PurchaseOrder[] = [
  {
    id: 'SOL-MED-001',
    date: '15/05/2024',
    referenceMonth: 'Maio',
    type: PurchaseType.Mensal,
    status: OrderStatus.EntregaTotal,
    totalValue: 125000.00,
    totalValueInvoiced: 125000.00,
    budgetedValue: 130000.00,
    items: [
      {
        productId: '1',
        product: MOCK_PRODUCTS[0],
        cmm: 1500,
        cmd: 50,
        stock: 400,
        daysOfStock: 8,
        suggestion: 100000,
        orderQuantity: 100000,
        quantityReceived: 100000,
        totalValueOC: 125000.00,
        totalValueReceived: 125000.00,
        receivedDate: '20/05/2024'
      }
    ],
    supplierName: 'Distribuidora Brasil',
    orderNumber: 'OC-23453',
    quotationNumber: 'COT-99',
    mvSolicitationNumber: 'SOL-100',
    productClass: ProductClass.Medicamentos,
    createdAt: Date.now() - (10 * 24 * 60 * 60 * 1000),
    leadTime: 5,
    realLeadTime: 5,
    coverageDays: 45,
    reliabilityIndex: 92
  },
  {
    id: 'SOL-MAT-002',
    date: '16/05/2024',
    referenceMonth: 'Maio',
    type: PurchaseType.Mensal,
    status: OrderStatus.AguardandoEntrega,
    totalValue: 8500.00,
    budgetedValue: 10000.00,
    items: [
      {
        productId: '2',
        product: MOCK_PRODUCTS[1],
        cmm: 5000,
        cmd: 166,
        stock: 1200,
        daysOfStock: 7,
        suggestion: 10000,
        orderQuantity: 10000,
        quantityReceived: 0,
        totalValueOC: 8500.00,
        totalValueReceived: 0,
      }
    ],
    supplierName: 'Ativa',
    orderNumber: 'OC-23455',
    quotationNumber: 'COT-2024-X1',
    mvSolicitationNumber: 'SOL-88229',
    productClass: ProductClass.MaterialHospitalar,
    createdAt: Date.now(),
    leadTime: 1,
    realLeadTime: 2,
    coverageDays: 30,
    reliabilityIndex: 98
  },
  {
    id: 'SOL-TRI-003',
    date: '16/02/2026',
    referenceMonth: 'Fevereiro',
    type: PurchaseType.Emergencial,
    status: OrderStatus.Triagem,
    totalValue: 551.49,
    quotationNumber: 'COT-6697',
    mvSolicitationNumber: 'SOL-1437918',
    productClass: ProductClass.Medicamentos,
    createdAt: Date.now(),
    leadTime: 2,
    coverageDays: 10,
    items: [
      {
        productId: '1',
        product: MOCK_PRODUCTS[0],
        cmm: 1500,
        cmd: 50,
        stock: 400,
        daysOfStock: 8,
        suggestion: 1000,
        orderQuantity: 1000,
        quantityReceived: 0,
        totalValueOC: 1250.00,
        totalValueReceived: 0,
      }
    ]
  }
];
