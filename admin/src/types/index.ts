export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'WAREHOUSE_MANAGER' | 'DRIVER' | 'CUSTOMER';
  customerId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Customer {
  id: string;
  storeName: string;
  contactName: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  creditLimit: number;
  outstandingDebt: number;
  pricingTier: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  /** Нэг бараа олон баркодтой байж болно. Код өөр бараатай давхардаж болно. */
  barcodes?: { id?: string; code: string }[];
  description?: string;
  category: { id: string; name: string };
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stockAvailable: number;
  stockReserved: number;
  reorderLevel: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  children?: Category[];
}

export interface OrderItem {
  id: string;
  productId: string;
  product: { name: string; barcodes?: { code: string }[]; unit: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  deliveredQty?: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  customer: Customer;
  status: 'PENDING' | 'APPROVED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  subtotal: number;
  totalAmount: number;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customer?: { storeName: string };
  orderId?: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHECK' | 'CREDIT';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  externalRef?: string;
  notes?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface DailySalesReport {
  summary: { totalRevenue: number; totalOrders: number; totalItemsSold: number; averageOrderValue: number };
  daily: { date: string; revenue: number; orderCount: number; itemsSold: number; cost: number; profit: number }[];
}

export interface ProfitReport {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
  byProduct: { productId: string; productName: string; revenue: number; cost: number; profit: number; unitsSold: number }[];
}
