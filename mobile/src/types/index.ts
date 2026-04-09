export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export interface Customer {
  id: string;
  storeName: string;
  contactName: string;
  phone: string;
  address: string;
  creditLimit: number;
  outstandingDebt: number;
  pricingTier: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: Category;
  costPrice: number;
  sellingPrice: number;
  sellingPriceRural?: number;
  unit: string;
  unitsPerBox?: number;
  stockAvailable: number;
  reorderLevel: number;
  imageUrl?: string;
  supplierId?: string;
  categoryId?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  status: 'PENDING' | 'APPROVED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLATION_REQUESTED' | 'CANCELLED';
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  deliveredAt?: string;
  cancellationRequestedAt?: string;
  cancellationRequestNote?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitMode: 'BOX' | 'PIECE';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============= Admin Types =============

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  openingBalance?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerCategory {
  id: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface Expense {
  id: string;
  expenseNumber: number;
  categoryId: string;
  category?: ExpenseCategory;
  amount: number | string;
  description: string;
  date: string;
  paymentMethod?: string;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customer?: Customer;
  orderId?: string;
  amount: number | string;
  method: string;
  status: string;
  externalRef?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: number;
  orderId: string;
  order?: Order & { customer?: Customer };
  issuedAt: string;
  dueDate?: string;
  subtotal: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  notes?: string;
}

export interface InventoryCount {
  id: string;
  countNumber: number;
  countDate: string;
  status: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
  notes?: string;
  finalizedAt?: string;
  items?: Array<{ productId: string; product?: Product; systemQty: number; countedQty?: number; difference: number }>;
}

export interface PurchaseReceipt {
  id: string;
  receiptNumber: number;
  supplierId: string;
  supplier?: Supplier;
  totalAmount: number | string;
  notes?: string;
  receivedAt: string;
  items?: Array<{ productId: string; product?: Product; quantity: number; unitPrice: number | string; lineTotal: number | string }>;
}

export interface CashClosing {
  id: string;
  closingDate: string;
  openingBalance: number | string;
  totalCashIn: number | string;
  totalCashOut: number | string;
  totalBankIn: number | string;
  closingBalance: number | string;
  notes?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  type: 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
  amount: number | string;
  method?: string;
  description?: string;
  referenceNo?: string;
  date: string;
}

export interface LedgerEntry {
  id: string;
  amount: number | string;
  balanceAfter: number | string;
  description: string;
  createdAt: string;
}

export interface ReceivableAging {
  customerId: string;
  storeName: string;
  phone?: string;
  creditLimit: number;
  current: number;
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isActive: boolean;
}

export interface SmsSettings {
  id?: string;
  apiUrl: string;
  username: string;
  password: string;
  isActive: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  reason: string;
  notes?: string;
  createdAt: string;
}

export interface DailySales {
  date: string;
  revenue: number;
  orderCount: number;
  itemsSold: number;
  cost: number;
  profit: number;
}

export interface ProductProfit {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}
