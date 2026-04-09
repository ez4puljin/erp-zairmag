import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTruckSaleDto } from './dto/create-truck-sale.dto';
import { Prisma, StockMovementReason } from '@prisma/client';

@Injectable()
export class TruckSalesService {
  constructor(private prisma: PrismaService) {}

  async createSale(dto: CreateTruckSaleDto, userId: string) {
    // Verify truck load exists and is DISPATCHED
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id: dto.truckLoadId },
      include: { items: true },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException('Ачилт идэвхтэй биш байна.');
    }

    // Determine which price to use based on truck load location type
    const isRural = (truckLoad as any).locationType === 'RURAL';

    // Verify customer exists (include creditLimit and outstandingDebt for credit check)
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, isActive: true, deletedAt: null },
      select: {
        id: true,
        storeName: true,
        contactName: true,
        phone: true,
        address: true,
        creditLimit: true,
        outstandingDebt: true,
      },
    });
    if (!customer) throw new NotFoundException('Харилцагч олдсонгүй.');

    // Validate quantities against truck inventory
    for (const saleItem of dto.items) {
      const loadItem = truckLoad.items.find(i => i.productId === saleItem.productId);
      if (!loadItem) {
        throw new BadRequestException(`Бараа ${saleItem.productId} машинд байхгүй.`);
      }
      const availableOnTruck = loadItem.loadedQty - loadItem.soldQty - loadItem.returnedQty - loadItem.damagedQty;
      if (saleItem.quantity > availableOnTruck) {
        throw new BadRequestException(
          `"${saleItem.productId}" бараа хүрэлцэхгүй. Машинд: ${availableOnTruck}, Хүссэн: ${saleItem.quantity}`
        );
      }
    }

    // Auto-resolve unit prices from product based on load locationType (URBAN vs RURAL)
    // This ignores client-provided unitPrice to enforce correct pricing per load location.
    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sellingPrice: true, sellingPriceRural: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    const itemsData = dto.items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Бараа ${item.productId} олдсонгүй.`);
      }
      const serverPrice = Number(isRural ? (product as any).sellingPriceRural : product.sellingPrice);
      if (serverPrice <= 0) {
        throw new BadRequestException(`Бараа "${product.name}"-ын ${isRural ? 'орон нутгийн' : 'Мөрөн'} үнэ тохируулаагүй байна.`);
      }
      const lineTotal = item.quantity * serverPrice;
      return { ...item, unitPrice: serverPrice, lineTotal };
    });
    const subtotal = itemsData.reduce((sum, i) => sum + i.lineTotal, 0);
    const totalAmount = subtotal;

    // Check credit limit for credit-based payments
    if (dto.paymentMethod === 'CREDIT' || dto.paymentMethod === 'COMBINED') {
      const creditLimit = Number(customer.creditLimit ?? 0);
      const currentDebt = Number(customer.outstandingDebt ?? 0);

      // Calculate credit portion
      let creditAmount = totalAmount; // For CREDIT, full amount
      if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
        creditAmount = dto.combinedPayments
          .filter(p => p.method === 'CREDIT')
          .reduce((s, p) => s + p.amount, 0);
      }

      if (creditLimit > 0 && (currentDebt + creditAmount) > creditLimit) {
        throw new BadRequestException(
          `Зээлийн хязгаар хэтэрсэн. Хязгаар: ₮${creditLimit.toLocaleString()}, Одоогийн өр: ₮${currentDebt.toLocaleString()}, Нэмэгдэх: ₮${creditAmount.toLocaleString()}`
        );
      }
    }

    // Validate combined payments if COMBINED
    if (dto.paymentMethod === 'COMBINED') {
      if (!dto.combinedPayments || dto.combinedPayments.length < 2) {
        throw new BadRequestException('Хосолсон төлбөрт 2-оос дээш төлбөрийн хэлбэр шаардлагатай.');
      }
      const combinedTotal = dto.combinedPayments.reduce((s, p) => s + p.amount, 0);
      if (Math.abs(combinedTotal - totalAmount) > 1) {
        throw new BadRequestException(`Хосолсон төлбөрийн нийт дүн (${combinedTotal}) нийт дүнтэй (${totalAmount}) тохирохгүй байна.`);
      }
    }

    // Build notes with combined payment details
    let saleNotes = dto.notes || '';
    if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
      const detail = dto.combinedPayments.map(p => `${p.method}:${p.amount}`).join(',');
      saleNotes = saleNotes ? `${saleNotes} | COMBINED:${detail}` : `COMBINED:${detail}`;
    }

    return this.prisma.$transaction(async (tx) => {
      // Create the sale
      const sale = await tx.truckSale.create({
        data: {
          truckLoadId: dto.truckLoadId,
          customerId: dto.customerId,
          paymentMethod: dto.paymentMethod,
          subtotal,
          totalAmount,
          notes: saleNotes || null,
          items: {
            create: itemsData.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
          customer: { select: { id: true, storeName: true, contactName: true, phone: true, address: true } },
        },
      });

      // Update truck load items soldQty
      for (const saleItem of dto.items) {
        await tx.truckLoadItem.updateMany({
          where: {
            truckLoadId: dto.truckLoadId,
            productId: saleItem.productId,
          },
          data: {
            soldQty: { increment: saleItem.quantity },
          },
        });
      }

      // Create stock movement for sale dispatch
      for (const saleItem of dto.items) {
        await tx.stockMovement.create({
          data: {
            productId: saleItem.productId,
            quantity: -saleItem.quantity,
            reason: StockMovementReason.SALE_DISPATCH,
            createdById: userId,
            locationCode: `TRUCK-${truckLoad.loadNumber}`,
            notes: `Түгээлтийн борлуулалт #${sale.saleNumber} - ${customer.storeName}`,
          },
        });
      }

      // Update customer outstanding debt based on payment method
      const freshCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: dto.customerId },
        select: { outstandingDebt: true },
      });
      const currentDebt = Number(freshCustomer.outstandingDebt);

      if (dto.paymentMethod === 'CREDIT') {
        // Full credit - increase customer debt
        const newDebt = currentDebt + totalAmount;
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { outstandingDebt: newDebt },
        });
        await tx.customerLedgerEntry.create({
          data: {
            customerId: dto.customerId,
            amount: totalAmount,
            balanceAfter: newDebt,
            description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
          },
        });
      } else if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
        // Combined: handle credit portion as debt, rest as payment
        const creditPortion = dto.combinedPayments
          .filter(p => p.method === 'CREDIT')
          .reduce((s, p) => s + p.amount, 0);
        const paidPortion = totalAmount - creditPortion;

        // Record sale as debt first
        const afterSaleDebt = currentDebt + totalAmount;
        await tx.customerLedgerEntry.create({
          data: {
            customerId: dto.customerId,
            amount: totalAmount,
            balanceAfter: afterSaleDebt,
            description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
          },
        });

        if (paidPortion > 0) {
          // Record immediate payment for non-credit portion
          const payment = await tx.payment.create({
            data: {
              customerId: dto.customerId,
              amount: paidPortion,
              method: 'CASH', // primary method for combined
              status: 'COMPLETED',
              paidAt: new Date(),
              notes: `Түгээлтийн хосолсон төлбөр #${sale.saleNumber}`,
            },
          });

          const afterPaymentDebt = afterSaleDebt - paidPortion;
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { outstandingDebt: afterPaymentDebt },
          });
          await tx.customerLedgerEntry.create({
            data: {
              customerId: dto.customerId,
              amount: -paidPortion,
              balanceAfter: afterPaymentDebt,
              description: `Түгээлтийн төлбөр #${sale.saleNumber} (хосолсон)`,
              paymentId: payment.id,
            },
          });
        } else {
          // All credit
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { outstandingDebt: afterSaleDebt },
          });
        }
      } else {
        // Cash/Bank/Card/etc - immediate payment
        const payment = await tx.payment.create({
          data: {
            customerId: dto.customerId,
            amount: totalAmount,
            method: dto.paymentMethod,
            status: 'COMPLETED',
            paidAt: new Date(),
            notes: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
          },
        });

        const afterSaleDebt = currentDebt + totalAmount;
        await tx.customerLedgerEntry.create({
          data: {
            customerId: dto.customerId,
            amount: totalAmount,
            balanceAfter: afterSaleDebt,
            description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
          },
        });

        const afterPaymentDebt = afterSaleDebt - totalAmount;
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { outstandingDebt: afterPaymentDebt },
        });
        await tx.customerLedgerEntry.create({
          data: {
            customerId: dto.customerId,
            amount: -totalAmount,
            balanceAfter: afterPaymentDebt,
            description: `Түгээлтийн төлбөр #${sale.saleNumber} (${dto.paymentMethod})`,
            paymentId: payment.id,
          },
        });
      }

      return sale;
    });
  }

  // Get sale by ID (for receipt)
  async findOne(id: string) {
    const sale = await this.prisma.truckSale.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        customer: { select: { id: true, storeName: true, contactName: true, phone: true, address: true } },
        truckLoad: {
          select: { loadNumber: true, driver: { select: { firstName: true, lastName: true, phone: true } } },
        },
      },
    });
    if (!sale) throw new NotFoundException('Борлуулалт олдсонгүй.');
    return sale;
  }

  // Get sales for a truck load
  async findByTruckLoad(truckLoadId: string) {
    return this.prisma.truckSale.findMany({
      where: { truckLoadId },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, sellingPrice: true } } } },
        customer: { select: { id: true, storeName: true, contactName: true, phone: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // VOID/CANCEL a truck sale
  async voidSale(id: string, userId: string) {
    const sale = await this.prisma.truckSale.findUnique({
      where: { id },
      include: {
        items: true,
        truckLoad: { include: { items: true } },
        customer: { select: { id: true, storeName: true, outstandingDebt: true } },
      },
    });
    if (!sale) throw new NotFoundException('Борлуулалт олдсонгүй.');

    // Verify the truck load is still DISPATCHED
    if (sale.truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException(
        'Зөвхөн DISPATCHED статустай ачилтын борлуулалтыг цуцлах боломжтой.',
      );
    }

    const totalAmount = Number(sale.totalAmount);

    return this.prisma.$transaction(async (tx) => {
      // 1. Decrement soldQty on each TruckLoadItem
      for (const saleItem of sale.items) {
        await tx.truckLoadItem.updateMany({
          where: {
            truckLoadId: sale.truckLoadId,
            productId: saleItem.productId,
          },
          data: {
            soldQty: { decrement: saleItem.quantity },
          },
        });

        // Create reverse stock movement (SALE_DISPATCH reversal)
        await tx.stockMovement.create({
          data: {
            productId: saleItem.productId,
            quantity: saleItem.quantity,
            reason: StockMovementReason.SALE_DISPATCH,
            createdById: userId,
            locationCode: `TRUCK-${sale.truckLoad.loadNumber}`,
            notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - ${sale.customer.storeName}`,
          },
        });
      }

      // 2. Reverse customer debt changes based on payment method
      const freshCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: sale.customerId },
        select: { outstandingDebt: true },
      });
      const currentDebt = Number(freshCustomer.outstandingDebt);

      if (sale.paymentMethod === 'CREDIT') {
        // Full credit sale - reverse the full debt increase
        const newDebt = currentDebt - totalAmount;
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingDebt: newDebt },
        });
        await tx.customerLedgerEntry.create({
          data: {
            customerId: sale.customerId,
            amount: -totalAmount,
            balanceAfter: newDebt,
            description: `Борлуулалт #${sale.saleNumber} цуцлагдсан`,
          },
        });
      } else if (sale.paymentMethod === 'COMBINED') {
        // Parse combined payment info from notes
        let creditPortion = 0;
        let paidPortion = 0;
        const notesStr = sale.notes || '';
        const combinedMatch = notesStr.match(/COMBINED:(.+?)($|\s*\|)/);
        if (combinedMatch) {
          const parts = combinedMatch[1].split(',');
          for (const part of parts) {
            const [method, amountStr] = part.split(':');
            const amount = parseFloat(amountStr);
            if (method === 'CREDIT') {
              creditPortion += amount;
            } else {
              paidPortion += amount;
            }
          }
        } else {
          // Fallback: treat full amount as credit
          creditPortion = totalAmount;
        }

        // Reverse the credit portion from customer debt
        if (creditPortion > 0) {
          const afterCreditReverse = currentDebt - creditPortion;
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { outstandingDebt: afterCreditReverse },
          });
          await tx.customerLedgerEntry.create({
            data: {
              customerId: sale.customerId,
              amount: -creditPortion,
              balanceAfter: afterCreditReverse,
              description: `Борлуулалт #${sale.saleNumber} цуцлагдсан (зээлийн хэсэг)`,
            },
          });
        }

        // Reverse payment records for paid portion
        if (paidPortion > 0) {
          // Create a refund payment record
          await tx.payment.create({
            data: {
              customerId: sale.customerId,
              amount: -paidPortion,
              method: 'CASH',
              status: 'COMPLETED',
              paidAt: new Date(),
              notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - Буцаалт`,
            },
          });
        }
      } else {
        // Cash/Bank/Card - reverse the payment
        await tx.payment.create({
          data: {
            customerId: sale.customerId,
            amount: -totalAmount,
            method: sale.paymentMethod,
            status: 'COMPLETED',
            paidAt: new Date(),
            notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - Буцаалт`,
          },
        });
      }

      // 3. Delete the sale (cascade deletes sale items)
      await tx.truckSale.delete({
        where: { id },
      });

      return { message: `Борлуулалт #${sale.saleNumber} амжилттай цуцлагдлаа.` };
    });
  }
}
