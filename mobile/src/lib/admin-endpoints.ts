// Central registry of admin API endpoints
export const ADMIN_ENDPOINTS = {
  customers: '/api/customers',
  suppliers: '/api/suppliers',
  products: '/api/products',
  categories: '/api/categories',
  customerCategories: '/api/customer-categories',
  inventory: '/api/inventory',
  inventoryCounts: '/api/inventory-counts',
  purchaseReceipts: '/api/purchase-receipts',
  payments: '/api/payments',
  expenses: '/api/expenses',
  expenseCategories: '/api/expense-categories',
  receivables: '/api/receivables',
  supplierPayables: '/api/supplier-payables',
  cashClosings: '/api/cash-closings',
  invoices: '/api/invoices',
  reports: '/api/reports',
  productLedger: '/api/product-ledger',
  drivers: '/api/drivers',
  smsSettings: '/api/sms/settings',
  orders: '/api/orders',
  truckLoads: '/api/truck-loads',
} as const;

export type AdminEndpointKey = keyof typeof ADMIN_ENDPOINTS;
