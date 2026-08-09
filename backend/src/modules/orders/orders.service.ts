import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, OrderStatus, StockMovementReason, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // CREATE ORDER (status = PENDING, no stock changes)
  // ---------------------------------------------------------------------------
  async createOrder(dto: CreateOrderDto, userId: string, customerId: string) {
    // Verify customer exists and check credit limit
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, isActive: true, creditLimit: true, outstandingDebt: true, deletedAt: true, pricingTier: true },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException('Customer not found.');
    }
    if (!customer.isActive) {
      throw new BadRequestException('Customer account is deactivated.');
    }

    const productIds = dto.items.map((i) => i.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
    });

    if (products.length !== productIds.length) {
      const found = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Products not found or inactive: ${missing.join(', ')}`,
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Stock validation
    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      if (item.quantity > product.stockAvailable) {
        throw new BadRequestException(
          `Бараа "${product.name}" нөөц хүрэлцэхгүй. Боломжит: ${product.stockAvailable}`,
        );
      }
    }

    // Fetch customer-specific prices for all products in the order
    const customerPrices = await this.prisma.customerPrice.findMany({
      where: { customerId, productId: { in: productIds } },
    });
    const customerPriceMap = new Map(customerPrices.map((cp) => [cp.productId, cp.price]));

    // Fetch tier-based prices for the customer's pricing tier
    const tierPrices = await this.prisma.tierPrice.findMany({
      where: { productId: { in: productIds }, tier: customer.pricingTier },
    });
    const tierPriceMap = new Map(tierPrices.map((tp) => [tp.productId, tp.price]));

    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;

      // Price resolution: CustomerPrice > TierPrice > Product.sellingPrice
      const unitPrice =
        customerPriceMap.get(item.productId) ??
        tierPriceMap.get(item.productId) ??
        product.sellingPrice;

      const lineTotal = new Prisma.Decimal(unitPrice.toString()).mul(
        item.quantity,
      );

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        productVersion: product.version,
      };
    });

    const subtotal = itemsData.reduce(
      (sum, i) => sum.add(i.lineTotal),
      new Prisma.Decimal(0),
    );
    const taxAmount = new Prisma.Decimal(0); // tax logic can be added later
    const totalAmount = subtotal.add(taxAmount);

    // Credit limit enforcement and order creation inside a transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // Re-read customer debt inside transaction to prevent race conditions
      const freshCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: customerId },
        select: { creditLimit: true, outstandingDebt: true },
      });

      const creditLimit = Number(freshCustomer.creditLimit);
      if (creditLimit > 0) {
        const currentDebt = Number(freshCustomer.outstandingDebt);
        const projectedDebt = currentDebt + Number(totalAmount);
        if (projectedDebt > creditLimit) {
          throw new BadRequestException(
            `Зээлийн хязгаар хэтэрнэ. Одоогийн өр: ₮${currentDebt.toLocaleString()}, ` +
            `Захиалгын дүн: ₮${Number(totalAmount).toLocaleString()}, ` +
            `Зээлийн хязгаар: ₮${creditLimit.toLocaleString()}.`,
          );
        }
      }

      return tx.order.create({
        data: {
          customerId,
          createdById: userId,
          status: OrderStatus.PENDING,
          subtotal,
          taxAmount,
          totalAmount,
          notes: dto.notes,
          paymentMethod: dto.paymentMethod,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // APPROVE ORDER - reserve stock with optimistic locking
  // ---------------------------------------------------------------------------
  async approveOrder(orderId: string, approverUserId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve order with status ${order.status}. Order must be PENDING.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Reserve stock for each item using optimistic locking
      for (const item of order.items) {
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: item.productVersion,
            stockAvailable: { gte: item.quantity },
          },
          data: {
            stockAvailable: { decrement: item.quantity },
            stockReserved: { increment: item.quantity },
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          // Fetch current state for a useful error message
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stockAvailable: true, version: true },
          });

          throw new ConflictException(
            `Stock reservation failed for product "${product?.name ?? item.productId}". ` +
              `Either insufficient stock (available: ${product?.stockAvailable ?? 'unknown'}, ` +
              `requested: ${item.quantity}) or the product was modified concurrently ` +
              `(expected version ${item.productVersion}, current: ${product?.version ?? 'unknown'}).`,
          );
        }

        // Create stock movement audit record
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity, // negative = stock going out of available
            reason: StockMovementReason.RESERVATION,
            orderId: order.id,
            createdById: approverUserId,
            notes: `Reserved ${item.quantity} units for order #${order.orderNumber}`,
          },
        });
      }

      // Update order status
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.APPROVED,
          approvedById: approverUserId,
          approvedAt: new Date(),
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // UPDATE TO SHIPPING - assign driver, TruckLoad integration
  // ---------------------------------------------------------------------------
  async updateToShipping(orderId: string, driverId: string, deliveryNotes?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot ship order with status ${order.status}. Order must be APPROVED.`,
      );
    }

    // Verify driver exists and has DRIVER role
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
    });
    if (!driver || driver.role !== 'DRIVER') {
      throw new BadRequestException('Invalid driver. User must have DRIVER role.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Verify driver has active TruckLoad
      const truckLoad = await tx.truckLoad.findFirst({
        where: { driverId, status: 'DISPATCHED' },
        include: { items: true },
      });
      if (!truckLoad) {
        throw new BadRequestException('Жолоочид идэвхтэй ачилт (DISPATCHED) байхгүй.');
      }

      // Fetch order items with product info
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
        include: { product: true },
      });

      for (const item of orderItems) {
        // Decrement stockReserved with version check
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            stockReserved: { gte: item.quantity },
          },
          data: {
            stockReserved: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new ConflictException(
            `Failed to release reserved stock for product "${item.product.name}". Concurrent modification detected.`,
          );
        }

        // Create StockMovement with reason TRANSFER_OUT
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            reason: StockMovementReason.TRANSFER_OUT,
            orderId: order.id,
            createdById: driverId,
            notes: `Transferred ${item.quantity} units to truck for order #${order.orderNumber}`,
          },
        });

        // Upsert TruckLoadItem
        const existingTruckItem = truckLoad.items.find(
          (ti) => ti.productId === item.productId,
        );

        if (existingTruckItem) {
          await tx.truckLoadItem.update({
            where: { id: existingTruckItem.id },
            data: { loadedQty: { increment: item.quantity } },
          });
        } else {
          await tx.truckLoadItem.create({
            data: {
              truckLoadId: truckLoad.id,
              productId: item.productId,
              loadedQty: item.quantity,
            },
          });
        }
      }

      // Create delivery route assignment
      await tx.deliveryRoute.create({
        data: {
          driverId,
          orderId,
          scheduledDate: new Date(),
          stopSequence: 1,
          deliveryNotes,
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.SHIPPING,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          deliveryRoute: true,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // DELIVER ORDER - release reserved stock, update customer debt
  // ---------------------------------------------------------------------------
  async deliverOrder(orderId: string, userId: string, paymentMethod?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        `Cannot deliver order with status ${order.status}. Order must be SHIPPING.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Stock was already transferred to TruckLoad at SHIPPING stage (updateToShipping).
      // Here we only update delivery qty and handle debt/payment.
      for (const item of order.items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { deliveredQty: item.quantity },
        });
      }

      // Update customer outstanding debt atomically using DB-level read
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: order.customerId },
        select: { outstandingDebt: true },
      });
      const newDebt = new Prisma.Decimal(
        customer.outstandingDebt.toString(),
      ).add(order.totalAmount);

      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          outstandingDebt: newDebt,
        },
      });

      // Create ledger entry (positive = customer owes more)
      await tx.customerLedgerEntry.create({
        data: {
          customerId: order.customerId,
          amount: order.totalAmount,
          balanceAfter: newDebt,
          description: `Order #${order.orderNumber} delivered`,
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
          paymentMethod: paymentMethod ? (paymentMethod as PaymentMethod) : undefined,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          deliveryRoute: true,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // MARK RECEIPT PRINTED
  // ---------------------------------------------------------------------------
  async markReceiptPrinted(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Захиалга олдсонгүй.');
    return this.prisma.order.update({
      where: { id },
      data: { receiptPrintedAt: new Date() },
      include: {
        items: { include: { product: true } },
        customer: true,
        deliveryRoute: { include: { driver: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // CANCEL ORDER - release reserved stock if applicable
  // ---------------------------------------------------------------------------
  async cancelOrder(orderId: string, userId: string, cancellationNote?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${order.status}.`,
      );
    }

    const needsStockRelease =
      order.status === OrderStatus.APPROVED ||
      order.status === OrderStatus.SHIPPING;

    return this.prisma.$transaction(async (tx) => {
      // Re-check order status inside transaction to prevent race
      const freshOrder = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
      });
      if (
        freshOrder.status === OrderStatus.DELIVERED ||
        freshOrder.status === OrderStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Cannot cancel order with status ${freshOrder.status}.`,
        );
      }

      const needsStockReleaseInTx =
        freshOrder.status === OrderStatus.APPROVED ||
        freshOrder.status === OrderStatus.SHIPPING;

      if (needsStockReleaseInTx) {
        for (const item of order.items) {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              stockReserved: { gte: item.quantity },
            },
            data: {
              stockAvailable: { increment: item.quantity },
              stockReserved: { decrement: item.quantity },
              version: { increment: 1 },
            },
          });

          if (result.count === 0) {
            throw new ConflictException(
              `Failed to release stock for product ${item.productId}. Concurrent modification detected.`,
            );
          }

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity, // positive = stock returning to available
              reason: StockMovementReason.RESERVATION_RELEASE,
              orderId: order.id,
              createdById: userId,
              notes: `Released reservation of ${item.quantity} units for cancelled order #${order.orderNumber}`,
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationNote,
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // REQUEST CANCELLATION (Customer requests, awaits manager approval)
  // ---------------------------------------------------------------------------
  async requestCancellation(orderId: string, userId: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.CANCELLATION_REQUESTED
    ) {
      throw new BadRequestException(
        `Cannot request cancellation for order with status ${order.status}.`,
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLATION_REQUESTED,
        cancellationRequestedAt: new Date(),
        cancellationRequestNote: note || 'Харилцагчаас цуцлах хүсэлт ирсэн',
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // APPROVE CANCELLATION (Manager approves after calling customer)
  // ---------------------------------------------------------------------------
  async approveCancellation(orderId: string, userId: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CANCELLATION_REQUESTED) {
      throw new BadRequestException(
        'Only orders with CANCELLATION_REQUESTED status can be approved for cancellation.',
      );
    }

    // Use the existing cancelOrder logic which handles stock release
    return this.cancelOrder(orderId, userId, note || 'Менежер цуцлах хүсэлтийг баталгаажуулсан');
  }

  // ---------------------------------------------------------------------------
  // REJECT CANCELLATION (Manager rejects, restore to previous status)
  // ---------------------------------------------------------------------------
  async rejectCancellation(orderId: string, userId: string, note?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.CANCELLATION_REQUESTED) {
      throw new BadRequestException(
        'Only orders with CANCELLATION_REQUESTED status can be rejected.',
      );
    }

    // Determine the previous status based on available data
    let previousStatus: OrderStatus = OrderStatus.PENDING;
    if (order.approvedAt) {
      // Check if a delivery route exists — if so, the order was SHIPPING before cancellation was requested
      const deliveryRoute = await this.prisma.deliveryRoute.findFirst({
        where: { orderId },
      });
      previousStatus = deliveryRoute ? OrderStatus.SHIPPING : OrderStatus.APPROVED;
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: previousStatus,
        cancellationNote: note || 'Менежер цуцлах хүсэлтийг татгалзсан',
        cancellationRequestedAt: null,
        cancellationRequestNote: null,
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // VERIFY DRIVER ASSIGNMENT
  // ---------------------------------------------------------------------------
  async verifyDriverAssignment(orderId: string, driverUserId: string) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { orderId, driverId: driverUserId },
    });
    if (!route) {
      throw new BadRequestException(
        'This order is not assigned to you. Only the assigned driver can mark it as delivered.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // FIND ALL (paginated, filtered)
  // ---------------------------------------------------------------------------
  async findAll(
    pagination: PaginationDto,
    filters?: {
      status?: OrderStatus;
      statuses?: string;
      customerId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      receiptPrinted?: string;
    },
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (filters?.statuses) {
      where.status = { in: filters.statuses.split(',') as OrderStatus[] };
    } else if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }
    if (filters?.receiptPrinted === 'true') {
      where.receiptPrintedAt = { not: null };
    } else if (filters?.receiptPrinted === 'false') {
      where.receiptPrintedAt = null;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true, barcodes: { select: { code: true } } } } } },
          customer: { select: { id: true, storeName: true, contactName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          deliveryRoute: { include: { driver: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
        },
        orderBy: { createdAt: order },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // FIND ONE
  // ---------------------------------------------------------------------------
  async findOne(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcodes: { select: { code: true } },
                unit: true,
                imageUrl: true,
              },
            },
          },
        },
        customer: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        deliveryRoute: {
          include: {
            driver: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
        stockMovements: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            quantity: true,
            reason: true,
            createdAt: true,
            notes: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ---------------------------------------------------------------------------
  // STOCK WARNINGS - check if PENDING/APPROVED demand exceeds available stock
  // ---------------------------------------------------------------------------
  async getStockWarnings(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');

    const warnings: Array<{
      productId: string;
      productName: string;
      thisOrderQty: number;
      otherPendingQty: number;
      totalDemand: number;
      available: number;
      shortfall: number;
    }> = [];

    for (const item of order.items) {
      // Sum quantities from all PENDING + APPROVED orders for this product (excluding current order)
      const aggregation = await this.prisma.orderItem.aggregate({
        where: {
          productId: item.productId,
          order: {
            id: { not: orderId },
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
        _sum: { quantity: true },
      });

      const otherPendingQty = aggregation._sum.quantity || 0;
      const totalDemand = otherPendingQty + item.quantity;
      const available = Number(item.product.stockAvailable);

      if (totalDemand > available) {
        warnings.push({
          productId: item.productId,
          productName: item.product.name,
          thisOrderQty: item.quantity,
          otherPendingQty,
          totalDemand,
          available,
          shortfall: totalDemand - available,
        });
      }
    }

    return warnings;
  }
}
