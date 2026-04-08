import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductLedgerQueryDto } from './dto/product-ledger-query.dto';

@Injectable()
export class ProductLedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Бараа материалын тайлан - Product Ledger Report
   * Returns opening balance, income, expense, closing balance per product
   * with detailed transaction history
   */
  async getLedger(query: ProductLedgerQueryDto) {
    const dateFrom = new Date(query.dateFrom);
    const dateTo = new Date(query.dateTo + 'T23:59:59.999Z');

    // Build product filter
    const productWhere: any = { isActive: true, deletedAt: null };
    if (query.productId) productWhere.id = query.productId;
    if (query.categoryId) productWhere.categoryId = query.categoryId;

    // Get all matching products
    const products = await this.prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        costPrice: true,
        sellingPrice: true,
      },
      orderBy: { name: 'asc' },
    });

    const productIds = products.map(p => p.id);
    if (productIds.length === 0) return { products: [], totals: null };

    // Get ALL stock movements before dateFrom for opening balance calculation
    const movementsBefore = await this.prisma.stockMovement.findMany({
      where: {
        productId: { in: productIds },
        createdAt: { lt: dateFrom },
      },
      select: { productId: true, quantity: true, reason: true },
    });

    // Get ALL stock movements in date range for transactions
    const movementsInRange = await this.prisma.stockMovement.findMany({
      where: {
        productId: { in: productIds },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true,
        productId: true,
        quantity: true,
        reason: true,
        notes: true,
        orderId: true,
        createdAt: true,
        createdBy: { select: { firstName: true, lastName: true } },
        order: {
          select: {
            orderNumber: true,
            customer: { select: { storeName: true, contactName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get purchase receipt items in date range for cost/price info
    const purchaseItems = await this.prisma.purchaseReceiptItem.findMany({
      where: {
        productId: { in: productIds },
        purchaseReceipt: {
          receivedAt: { gte: dateFrom, lte: dateTo },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        purchaseReceipt: {
          select: {
            receiptNumber: true,
            receivedAt: true,
            supplier: { select: { name: true } },
          },
        },
      },
    });

    // Get order items in range for selling price info
    const orderItemsInRange = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: productIds },
        order: {
          status: { in: ['DELIVERED', 'SHIPPING', 'APPROVED'] },
          updatedAt: { gte: dateFrom, lte: dateTo },
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        order: {
          select: {
            orderNumber: true,
            customer: { select: { storeName: true } },
          },
        },
      },
    });

    // Normalize quantity: some reasons store positive qty but mean stock-out
    // ADJUSTMENT_LOSS, EXPIRY_WRITEOFF store positive but are expenses
    // SALE_DISPATCH stores negative (already correct)
    function normalizeQty(quantity: number, reason: string): number {
      const ALWAYS_NEGATIVE_REASONS = ['ADJUSTMENT_LOSS', 'RETURN_TO_SUPPLIER', 'EXPIRY_WRITEOFF', 'TRANSFER_OUT'];
      if (ALWAYS_NEGATIVE_REASONS.includes(reason) && quantity > 0) {
        return -quantity;
      }
      return quantity;
    }

    // Build opening balance map (qty before dateFrom)
    const openingQtyMap = new Map<string, number>();
    for (const m of movementsBefore) {
      const normQty = normalizeQty(m.quantity, m.reason);
      openingQtyMap.set(m.productId, (openingQtyMap.get(m.productId) || 0) + normQty);
    }

    // Build purchase cost map (for unit cost calc in range)
    const purchaseCostMap = new Map<string, { qty: number; total: number }>();
    for (const pi of purchaseItems) {
      const existing = purchaseCostMap.get(pi.productId) || { qty: 0, total: 0 };
      existing.qty += pi.quantity;
      existing.total += Number(pi.lineTotal);
      purchaseCostMap.set(pi.productId, existing);
    }

    // Build order revenue map
    const orderRevenueMap = new Map<string, { qty: number; total: number }>();
    for (const oi of orderItemsInRange) {
      const existing = orderRevenueMap.get(oi.productId) || { qty: 0, total: 0 };
      existing.qty += oi.quantity;
      existing.total += Number(oi.lineTotal);
      orderRevenueMap.set(oi.productId, existing);
    }

    // Build per-product ledger
    // RESERVATION and RESERVATION_RELEASE are temporary holds (internal transfers between
    // available and reserved stock) and should not be counted as income or expense.
    // Only SALE_DISPATCH represents the actual stock leaving the warehouse.
    const INCOME_REASONS = ['PURCHASE_RECEIPT', 'RETURN_FROM_CUSTOMER', 'ADJUSTMENT_GAIN', 'TRANSFER_IN'];
    const EXPENSE_REASONS = ['SALE_DISPATCH', 'RETURN_TO_SUPPLIER', 'ADJUSTMENT_LOSS', 'TRANSFER_OUT', 'EXPIRY_WRITEOFF'];
    const NEUTRAL_REASONS = ['RESERVATION', 'RESERVATION_RELEASE'];

    let grandOpeningQty = 0, grandOpeningAmount = 0;
    let grandIncomeQty = 0, grandIncomeAmount = 0;
    let grandExpenseQty = 0, grandExpenseAmount = 0;
    let grandClosingQty = 0, grandClosingAmount = 0;

    const productLedgers = products.map(product => {
      const costPrice = Number(product.costPrice);
      const sellingPrice = Number(product.sellingPrice);

      // Opening balance
      const openingQty = openingQtyMap.get(product.id) || 0;
      const openingAmount = openingQty * costPrice;

      // Movements in range
      const productMovements = movementsInRange.filter(m => m.productId === product.id);

      let incomeQty = 0;
      let incomeAmount = 0;
      let expenseQty = 0;
      let expenseAmount = 0;

      // Build detailed transactions
      let runningQty = openingQty;
      const transactions = productMovements.map(m => {
        const normQty = normalizeQty(m.quantity, m.reason);
        const absQty = Math.abs(normQty);
        const isNeutral = NEUTRAL_REASONS.includes(m.reason);
        const isIncome = !isNeutral && normQty > 0;
        const isExpense = !isNeutral && normQty < 0;

        if (isIncome) {
          incomeQty += absQty;
          incomeAmount += absQty * costPrice;
        } else if (isExpense) {
          expenseQty += absQty;
          expenseAmount += absQty * costPrice;
        }

        runningQty += normQty;

        // Build description
        let description = '';
        const reasonLabels: Record<string, string> = {
          PURCHASE_RECEIPT: 'Орлого',
          SALE_DISPATCH: 'Борлуулалт',
          RETURN_FROM_CUSTOMER: 'Буцаалт (Харилцагч)',
          RETURN_TO_SUPPLIER: 'Буцаалт (Нийлүүлэгч)',
          ADJUSTMENT_GAIN: 'Тооллого илүүдэл',
          ADJUSTMENT_LOSS: 'Тооллого дутагдал',
          TRANSFER_IN: 'Шилжүүлэг орлого',
          TRANSFER_OUT: 'Шилжүүлэг зарлага',
          EXPIRY_WRITEOFF: 'Хугацаа дууссан',
          RESERVATION: 'Захиалгын нөөц',
          RESERVATION_RELEASE: 'Нөөц чөлөөлсөн',
        };
        description = reasonLabels[m.reason] || m.reason;

        if (m.order) {
          description += ` - ${m.order.customer?.storeName || ''} - #${m.order.orderNumber}`;
        }
        if (m.notes && !m.order) {
          description += ` - ${m.notes}`;
        }

        return {
          id: m.id,
          date: m.createdAt,
          description,
          reason: m.reason,
          incomeQty: isIncome ? absQty : 0,
          incomeAmount: isIncome ? absQty * costPrice : 0,
          expenseQty: isExpense ? absQty : 0,
          expenseAmount: isExpense ? absQty * costPrice : 0,
          runningQty,
          runningAmount: runningQty * costPrice,
        };
      });

      const closingQty = openingQty + incomeQty - expenseQty;
      const closingAmount = closingQty * costPrice;

      grandOpeningQty += openingQty;
      grandOpeningAmount += openingAmount;
      grandIncomeQty += incomeQty;
      grandIncomeAmount += incomeAmount;
      grandExpenseQty += expenseQty;
      grandExpenseAmount += expenseAmount;
      grandClosingQty += closingQty;
      grandClosingAmount += closingAmount;

      return {
        product: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          costPrice,
          sellingPrice,
        },
        openingQty,
        openingAmount,
        incomeQty,
        incomeAmount,
        expenseQty,
        expenseAmount,
        closingQty,
        closingAmount,
        unitCost: costPrice,
        transactions,
      };
    });

    return {
      products: productLedgers,
      totals: {
        openingQty: grandOpeningQty,
        openingAmount: grandOpeningAmount,
        incomeQty: grandIncomeQty,
        incomeAmount: grandIncomeAmount,
        expenseQty: grandExpenseQty,
        expenseAmount: grandExpenseAmount,
        closingQty: grandClosingQty,
        closingAmount: grandClosingAmount,
      },
    };
  }
}
