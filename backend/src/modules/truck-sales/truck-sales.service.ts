import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTruckSaleDto } from './dto/create-truck-sale.dto';
import { UpdateTruckSaleDto } from './dto/update-truck-sale.dto';
import { Prisma, StockMovementReason } from '@prisma/client';

@Injectable()
export class TruckSalesService {
  constructor(private prisma: PrismaService) {}

  /**
   * ПОС-ын төлбөрийн хэлбэр бүрийг хүлээн авах дансны зураглал.
   *
   * Данс бүр дээр `posMethods` тохируулагдсан байдаг (жишээ нь бэлэн мөнгө
   * нэг данс, шилжүүлэг өөр данс). Борлуулалт бүртгэгдэх үедээ төлбөр нь
   * тухайн дансанд шууд суух тул гараар нөхөж бүртгэх шаардлагагүй.
   */
  private async posAccountMap(): Promise<Map<string, string>> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { isActive: true, NOT: { posMethods: { isEmpty: true } } },
      select: { id: true, posMethods: true },
    });
    const map = new Map<string, string>();
    for (const a of accounts) {
      for (const m of a.posMethods) if (!map.has(m)) map.set(m, a.id);
    }
    return map;
  }

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

    // Validate quantities against truck inventory.
    // Алдааны мэдэгдэлд барааны нэрийг харуулна — ID харуулбал жолоочид ойлгомжгүй.
    const validationNames = new Map(
      (
        await this.prisma.product.findMany({
          where: { id: { in: dto.items.map((i) => i.productId) } },
          select: { id: true, name: true },
        })
      ).map((p) => [p.id, p.name]),
    );
    const nameOf = (id: string) => validationNames.get(id) ?? id;

    for (const saleItem of dto.items) {
      const loadItem = truckLoad.items.find(
        (i) => i.productId === saleItem.productId,
      );
      if (!loadItem) {
        throw new BadRequestException(
          `"${nameOf(saleItem.productId)}" бараа машинд байхгүй.`,
        );
      }
      const availableOnTruck =
        loadItem.loadedQty -
        loadItem.soldQty -
        loadItem.returnedQty -
        loadItem.damagedQty;
      if (saleItem.quantity > availableOnTruck) {
        throw new BadRequestException(
          `"${nameOf(saleItem.productId)}" бараа хүрэлцэхгүй. Машинд: ${availableOnTruck}, Хүссэн: ${saleItem.quantity}`,
        );
      }
    }

    // Auto-resolve unit prices from product based on load locationType (URBAN vs RURAL)
    // This ignores client-provided unitPrice to enforce correct pricing per load location.
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
        sellingPriceRural: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const itemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(`Бараа ${item.productId} олдсонгүй.`);
      }
      const serverPrice = Number(
        isRural ? (product as any).sellingPriceRural : product.sellingPrice,
      );
      if (serverPrice <= 0) {
        throw new BadRequestException(
          `Бараа "${product.name}"-ын ${isRural ? 'орон нутгийн' : 'Мөрөн'} үнэ тохируулаагүй байна.`,
        );
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
          .filter((p) => p.method === 'CREDIT')
          .reduce((s, p) => s + p.amount, 0);
      }

      if (creditLimit > 0 && currentDebt + creditAmount > creditLimit) {
        throw new BadRequestException(
          `Зээлийн хязгаар хэтэрсэн. Хязгаар: ₮${creditLimit.toLocaleString()}, Одоогийн өр: ₮${currentDebt.toLocaleString()}, Нэмэгдэх: ₮${creditAmount.toLocaleString()}`,
        );
      }
    }

    // Validate combined payments if COMBINED
    if (dto.paymentMethod === 'COMBINED') {
      if (!dto.combinedPayments || dto.combinedPayments.length < 2) {
        throw new BadRequestException(
          'Хосолсон төлбөрт 2-оос дээш төлбөрийн хэлбэр шаардлагатай.',
        );
      }
      const combinedTotal = dto.combinedPayments.reduce(
        (s, p) => s + p.amount,
        0,
      );
      if (Math.abs(combinedTotal - totalAmount) > 1) {
        throw new BadRequestException(
          `Хосолсон төлбөрийн нийт дүн (${combinedTotal}) нийт дүнтэй (${totalAmount}) тохирохгүй байна.`,
        );
      }
    }

    // Build notes with combined payment details
    let saleNotes = dto.notes || '';
    if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
      const detail = dto.combinedPayments
        .map((p) => `${p.method}:${p.amount}`)
        .join(',');
      saleNotes = saleNotes
        ? `${saleNotes} | COMBINED:${detail}`
        : `COMBINED:${detail}`;
    }

    // Төлсөн мөнгө шууд тохирох данс дээр суух ёстой — эс бөгөөс дансны
    // үлдэгдэл бодит байдлаас хоцорч, дараа нь гараар бүртгэхэд
    // харилцагчийн дэвтэрт төлбөр давхар орно.
    const posAccounts = await this.posAccountMap();

    // Нөхөж бүртгэх огноо. Заагаагүй бол одоо. Ирээдүйн огноо зөвшөөрөхгүй.
    const saleAt = dto.saleDate ? new Date(dto.saleDate) : new Date();
    if (Number.isNaN(saleAt.getTime())) {
      throw new BadRequestException('Борлуулалтын огноо буруу байна.');
    }
    if (saleAt.getTime() > Date.now() + 60_000) {
      throw new BadRequestException(
        'Ирээдүйн огноогоор борлуулалт бүртгэх боломжгүй.',
      );
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
          createdAt: saleAt,
          items: {
            create: itemsData.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcodes: { select: { code: true } },
                  unit: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              storeName: true,
              contactName: true,
              phone: true,
              address: true,
            },
          },
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
            createdAt: saleAt,
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
            createdAt: saleAt,
          },
        });
      } else if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
        // Combined: handle credit portion as debt, rest as payment
        const creditPortion = dto.combinedPayments
          .filter((p) => p.method === 'CREDIT')
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
            createdAt: saleAt,
          },
        });

        if (paidPortion > 0) {
          // Хэсэг бүрийг өөрийнх нь хэлбэрээр тусад нь бүртгэнэ — ингэснээр
          // бэлэн хэсэг бэлэн мөнгөний данс руу, шилжүүлгийн хэсэг
          // шилжүүлгийн данс руу тус тусдаа очно.
          const byMethod = new Map<string, number>();
          for (const p of dto.combinedPayments) {
            if (p.method === 'CREDIT') continue;
            byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
          }

          let runningDebt = afterSaleDebt;
          for (const [method, amount] of byMethod) {
            if (amount <= 0) continue;
            const accId = posAccounts.get(method) ?? null;

            const payment = await tx.payment.create({
              data: {
                customerId: dto.customerId,
                amount,
                method: method as any,
                status: 'COMPLETED',
                paidAt: saleAt,
                createdAt: saleAt,
                notes: `Түгээлтийн хосолсон төлбөр #${sale.saleNumber} (${method})`,
                ...(accId ? { bankAccountId: accId } : {}),
              },
            });

            if (accId) {
              await tx.bankAccount.update({
                where: { id: accId },
                data: { currentBalance: { increment: amount } },
              });
            }

            runningDebt -= amount;
            await tx.customerLedgerEntry.create({
              data: {
                customerId: dto.customerId,
                amount: -amount,
                balanceAfter: runningDebt,
                description: `Түгээлтийн төлбөр #${sale.saleNumber} (хосолсон)`,
                paymentId: payment.id,
                createdAt: saleAt,
              },
            });
          }

          await tx.customer.update({
            where: { id: dto.customerId },
            data: { outstandingDebt: runningDebt },
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
        const posAccountId = posAccounts.get(String(dto.paymentMethod)) ?? null;

        const payment = await tx.payment.create({
          data: {
            customerId: dto.customerId,
            amount: totalAmount,
            method: dto.paymentMethod,
            status: 'COMPLETED',
            paidAt: saleAt,
            createdAt: saleAt,
            notes: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
            ...(posAccountId ? { bankAccountId: posAccountId } : {}),
          },
        });

        if (posAccountId) {
          await tx.bankAccount.update({
            where: { id: posAccountId },
            data: { currentBalance: { increment: totalAmount } },
          });
        }

        const afterSaleDebt = currentDebt + totalAmount;
        await tx.customerLedgerEntry.create({
          data: {
            customerId: dto.customerId,
            amount: totalAmount,
            balanceAfter: afterSaleDebt,
            description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
            createdAt: saleAt,
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
            createdAt: saleAt,
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcodes: { select: { code: true } },
                unit: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            storeName: true,
            contactName: true,
            phone: true,
            address: true,
          },
        },
        truckLoad: {
          select: {
            loadNumber: true,
            driver: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcodes: { select: { code: true } },
                unit: true,
                sellingPrice: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            storeName: true,
            contactName: true,
            phone: true,
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Төлбөрийн хэлбэрээр дүнг "зээл" ба "төлсөн" хоёрт хуваана.
   * Борлуулалтын цэвэр нөлөө: харилцагчийн өр += зээлийн хэсэг.
   */
  private static splitMoney(
    method: string,
    total: number,
    combined?: { method: string; amount: number }[] | null,
    notes?: string | null,
  ): { credit: number; paid: number } {
    if (method === 'CREDIT') return { credit: total, paid: 0 };

    if (method === 'COMBINED') {
      let credit = 0;
      if (combined && combined.length) {
        credit = combined
          .filter((p) => p.method === 'CREDIT')
          .reduce((sum, p) => sum + Number(p.amount), 0);
      } else {
        // Хуучин борлуулалтын задаргаа notes дотор хадгалагдсан байдаг.
        const m = (notes || '').match(/COMBINED:(.+?)($|\s*\|)/);
        if (m) {
          for (const part of m[1].split(',')) {
            const [pm, amt] = part.split(':');
            if (pm === 'CREDIT') credit += parseFloat(amt) || 0;
          }
        } else {
          credit = total; // задаргаа алдагдсан бол voidSale-тай адил бүгдийг зээл гэж үзнэ
        }
      }
      return { credit, paid: total - credit };
    }

    return { credit: 0, paid: total };
  }

  /**
   * Төлбөрийн төлсөн (зээл биш) хэсгийг хэлбэр тус бүрээр нь задална.
   * Данс бүрт зөв дүн буцаах/нэмэхэд ашиглана.
   */
  private static paidLines(
    method: string,
    total: number,
    combined?: { method: string; amount: number }[] | null,
    notes?: string | null,
  ): { method: string; amount: number }[] {
    if (method === 'CREDIT') return [];

    if (method === 'COMBINED') {
      const src =
        combined && combined.length
          ? combined.map((p) => ({
              method: p.method,
              amount: Number(p.amount),
            }))
          : (() => {
              // Хуучин борлуулалтын задаргаа notes дотор хадгалагддаг.
              const m = (notes || '').match(/COMBINED:(.+?)($|\s*\|)/);
              if (!m) return [];
              return m[1].split(',').map((part) => {
                const [pm, amt] = part.split(':');
                return { method: pm, amount: parseFloat(amt) || 0 };
              });
            })();

      const byMethod = new Map<string, number>();
      for (const p of src) {
        if (p.method === 'CREDIT') continue;
        byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
      }
      return [...byMethod].map(([m, amount]) => ({ method: m, amount }));
    }

    return [{ method, amount: total }];
  }

  /**
   * Борлуулалт засах (зөвхөн админ).
   *
   * `items` нь эцсийн байдлыг илэрхийлнэ — зөрүү биш. Тоо буурвал үлдэгдэл
   * машин руу буцна. Ачилт хаагдсан бол машинд буцаах газаргүй тул агуулах
   * руу буцаах бөгөөд үүнийг хэрэглэгч зөвшөөрсөн (allowWarehouseReturn)
   * үед л гүйцэтгэнэ.
   */
  async updateSale(id: string, dto: UpdateTruckSaleDto, userId: string) {
    const sale = await this.prisma.truckSale.findUnique({
      where: { id },
      include: {
        items: true,
        truckLoad: { include: { items: true } },
        customer: { select: { id: true, storeName: true } },
      },
    });
    if (!sale) throw new NotFoundException('Борлуулалт олдсонгүй.');

    const loadOpen = sale.truckLoad.status === 'DISPATCHED';
    const wantsItemChange = Array.isArray(dto.items);

    // Ачилт хаагдсан үед барааны тоо өөрчлөх нь агуулахын нөөцөд шууд нөлөөлнө.
    if (wantsItemChange && !loadOpen && !dto.allowWarehouseReturn) {
      throw new BadRequestException({
        code: 'WAREHOUSE_RETURN_CONFIRM',
        message:
          `Ачилт #${sale.truckLoad.loadNumber} хаагдсан байна. ` +
          'Үлдэгдлийг шууд агуулах руу буцаах уу?',
      });
    }

    const isRural = (sale.truckLoad as any).locationType === 'RURAL';
    const oldItems = sale.items;
    const oldTotal = Number(sale.totalAmount);

    // Жолооч буруу харилцагч сонгосон бол бүх мөнгөн үр дагаврыг нь
    // хуучин харилцагчаас нь бүрэн буцааж, шинэ дээр нь дахин бичнэ.
    const newCustomerId = dto.customerId ?? sale.customerId;
    const customerChanged = newCustomerId !== sale.customerId;
    if (customerChanged) {
      const target = await this.prisma.customer.findFirst({
        where: { id: newCustomerId, isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Шинэ харилцагч олдсонгүй.');
    }

    // Хуучин мөрийн үнийг хэвээр үлдээнэ (борлуулсан үеийн үнэ), зөвхөн шинээр
    // нэмсэн бараанд одоогийн үнийг авна.
    let newItems = oldItems.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    }));

    if (wantsItemChange) {
      const oldPrice = new Map(
        oldItems.map((i) => [i.productId, Number(i.unitPrice)]),
      );
      const products = await this.prisma.product.findMany({
        where: { id: { in: dto.items!.map((i) => i.productId) } },
        select: {
          id: true,
          name: true,
          sellingPrice: true,
          sellingPriceRural: true,
        },
      });
      const pMap = new Map(products.map((p) => [p.id, p]));

      newItems = dto.items!.map((i) => {
        const prev = oldPrice.get(i.productId);
        if (prev !== undefined) return { ...i, unitPrice: prev };
        const p = pMap.get(i.productId);
        if (!p)
          throw new BadRequestException(`Бараа ${i.productId} олдсонгүй.`);
        const price = Number(
          isRural ? (p as any).sellingPriceRural : p.sellingPrice,
        );
        if (price <= 0) {
          throw new BadRequestException(
            `Бараа "${p.name}"-ын ${isRural ? 'орон нутгийн' : 'Мөрөн'} үнэ тохируулаагүй байна.`,
          );
        }
        return { ...i, unitPrice: price };
      });
    }

    const newTotal = newItems.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const newMethod = dto.paymentMethod ?? sale.paymentMethod;

    if (newMethod === 'COMBINED') {
      const cp = dto.combinedPayments;
      if (!cp || cp.length < 2) {
        throw new BadRequestException(
          'Хосолсон төлбөрт 2-оос дээш төлбөрийн хэлбэр шаардлагатай.',
        );
      }
      const sum = cp.reduce((s, p) => s + Number(p.amount), 0);
      if (Math.abs(sum - newTotal) > 1) {
        throw new BadRequestException(
          `Хосолсон төлбөрийн нийт дүн (${sum}) нийт дүнтэй (${newTotal}) тохирохгүй байна.`,
        );
      }
    }

    // Барааны тоо хэмжээний зөрүү (эерэг = илүү зарлаа, сөрөг = буцаалаа)
    const delta = new Map<string, number>();
    for (const i of oldItems) delta.set(i.productId, -i.quantity);
    for (const i of newItems)
      delta.set(i.productId, (delta.get(i.productId) ?? 0) + i.quantity);

    const info = new Map(
      (
        await this.prisma.product.findMany({
          where: { id: { in: [...delta.keys()] } },
          select: { id: true, name: true, stockAvailable: true },
        })
      ).map((p) => [p.id, p]),
    );
    const nameOf = (pid: string) => info.get(pid)?.name ?? pid;

    for (const [productId, d] of delta) {
      if (d <= 0) continue;
      if (loadOpen) {
        const li = sale.truckLoad.items.find((x) => x.productId === productId);
        if (!li)
          throw new BadRequestException(
            `"${nameOf(productId)}" бараа машинд байхгүй.`,
          );
        const available =
          li.loadedQty - li.soldQty - li.returnedQty - li.damagedQty;
        if (d > available) {
          throw new BadRequestException(
            `"${nameOf(productId)}" бараа хүрэлцэхгүй. Машинд: ${available}, Нэмэх: ${d}`,
          );
        }
      } else {
        // Хаагдсан ачилтад нэмэх нь агуулахаас гаргаж байна гэсэн үг.
        const stock = info.get(productId)?.stockAvailable ?? 0;
        if (d > stock) {
          throw new BadRequestException(
            `"${nameOf(productId)}" бараа агуулахад хүрэлцэхгүй. Байгаа: ${stock}, Нэмэх: ${d}`,
          );
        }
      }
    }

    const oldSplit = TruckSalesService.splitMoney(
      String(sale.paymentMethod),
      oldTotal,
      null,
      sale.notes,
    );
    const newSplit = TruckSalesService.splitMoney(
      String(newMethod),
      newTotal,
      dto.combinedPayments,
      null,
    );
    const totalDelta = newTotal - oldTotal;
    const paidDelta = newSplit.paid - oldSplit.paid;

    // Буцаалт нь анхны сувгаараа буцна, нэмэлт төлбөр нь шинэ сувгаар орно.
    const channel = (m: string) =>
      m === 'COMBINED' || m === 'CREDIT' ? 'CASH' : m;
    const payChannel = channel(
      String(paidDelta > 0 ? newMethod : sale.paymentMethod),
    );

    // Хосолсон задаргааг notes-д шинэчилнэ.
    let newNotes =
      dto.notes !== undefined
        ? dto.notes
        : (sale.notes || '').replace(/\s*\|?\s*COMBINED:.+$/, '');
    if (newMethod === 'COMBINED' && dto.combinedPayments) {
      const detail = dto.combinedPayments
        .map((p) => `${p.method}:${p.amount}`)
        .join(',');
      newNotes = newNotes
        ? `${newNotes} | COMBINED:${detail}`
        : `COMBINED:${detail}`;
    }

    // Засварыг борлуулалтын анхны огноогоор бүртгэнэ — эс бөгөөс тухайн
    // өдрийн борлуулалтын дүн ба харилцагчийн дэвтэр зөрнө.
    const at = sale.createdAt;

    const posAccounts = await this.posAccountMap();

    return this.prisma.$transaction(async (tx) => {
      for (const [productId, d] of delta) {
        if (d === 0) continue;

        await tx.truckLoadItem.updateMany({
          where: { truckLoadId: sale.truckLoadId, productId },
          data: { soldQty: { increment: d } },
        });

        if (!loadOpen) {
          // Ачилт аль хэдийн хаагдсан тул зөрүүг агуулахаар дамжуулж тэнцүүлнэ:
          // ачилтын loadedQty = sold + returned хэвээр үлдэнэ.
          await tx.truckLoadItem.updateMany({
            where: { truckLoadId: sale.truckLoadId, productId },
            data: { returnedQty: { increment: -d } },
          });
          await tx.product.update({
            where: { id: productId },
            data: {
              stockAvailable: { increment: -d },
              version: { increment: 1 },
            },
          });
          await tx.stockMovement.create({
            data: {
              productId,
              quantity: -d,
              reason:
                d > 0
                  ? StockMovementReason.TRANSFER_OUT
                  : StockMovementReason.TRANSFER_IN,
              createdById: userId,
              locationCode: `TRUCK-${sale.truckLoad.loadNumber}`,
              notes: `Борлуулалт #${sale.saleNumber} засвар - агуулахын тооцоо`,
              createdAt: at,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId,
            quantity: -d,
            reason: StockMovementReason.SALE_DISPATCH,
            createdById: userId,
            locationCode: `TRUCK-${sale.truckLoad.loadNumber}`,
            notes: `Борлуулалт #${sale.saleNumber} засвар - ${sale.customer.storeName}`,
            createdAt: at,
          },
        });
      }

      if (wantsItemChange) {
        await tx.truckSaleItem.deleteMany({ where: { truckSaleId: id } });
        for (const i of newItems) {
          await tx.truckSaleItem.create({
            data: {
              truckSaleId: id,
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              lineTotal: i.quantity * i.unitPrice,
            },
          });
        }
      }

      // Мөнгөн дүн. Харилцагч солигдоогүй бол зөвхөн зөрүүг бичнэ; солигдсон
      // бол хуучин харилцагчаас бүрэн буцаагаад шинэ дээр нь бүрэн бичнэ.
      if (customerChanged) {
        // Бичилтүүд борлуулалттай ижил хормыг давхарлахгүй байх нь чухал —
        // дэвтэр дээр ижил хугацаатай мөрүүд дурын дарааллаар эрэмбэлэгдэж,
        // гүйлгээний үлдэгдэл холилдож харагдана.
        let seq = 0;
        const stamp = () => new Date(at.getTime() + ++seq);

        const oldLines = TruckSalesService.paidLines(
          String(sale.paymentMethod),
          oldTotal,
          null,
          sale.notes,
        );
        const newLines = TruckSalesService.paidLines(
          String(newMethod),
          newTotal,
          dto.combinedPayments,
          null,
        );

        // --- Хуучин харилцагчаас бүрэн буцаана ---
        const fromCust = await tx.customer.findUniqueOrThrow({
          where: { id: sale.customerId },
          select: { outstandingDebt: true },
        });
        let fromDebt = Number(fromCust.outstandingDebt) - oldTotal;
        await tx.customerLedgerEntry.create({
          data: {
            customerId: sale.customerId,
            amount: -oldTotal,
            balanceAfter: fromDebt,
            description: `Борлуулалт #${sale.saleNumber} өөр харилцагч руу шилжсэн`,
            createdAt: stamp(),
          },
        });

        for (const line of oldLines) {
          if (line.amount <= 0) continue;
          const bankId = posAccounts.get(line.method) ?? null;
          const payment = await tx.payment.create({
            data: {
              customerId: sale.customerId,
              amount: -line.amount,
              method: line.method as any,
              status: 'COMPLETED',
              paidAt: at,
              createdAt: stamp(),
              notes: `Борлуулалт #${sale.saleNumber} шилжсэн - төлбөр буцаав (${line.method})`,
              ...(bankId ? { bankAccountId: bankId } : {}),
            },
          });
          if (bankId) {
            await tx.bankAccount.update({
              where: { id: bankId },
              data: { currentBalance: { decrement: line.amount } },
            });
          }
          fromDebt += line.amount;
          await tx.customerLedgerEntry.create({
            data: {
              customerId: sale.customerId,
              amount: line.amount,
              balanceAfter: fromDebt,
              description: `Борлуулалт #${sale.saleNumber} шилжсэн - төлбөр буцаав`,
              paymentId: payment.id,
              createdAt: stamp(),
            },
          });
        }
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingDebt: fromDebt },
        });

        // --- Шинэ харилцагч дээр бүрэн бичнэ ---
        const toCust = await tx.customer.findUniqueOrThrow({
          where: { id: newCustomerId },
          select: { outstandingDebt: true },
        });
        let toDebt = Number(toCust.outstandingDebt) + newTotal;
        await tx.customerLedgerEntry.create({
          data: {
            customerId: newCustomerId,
            amount: newTotal,
            balanceAfter: toDebt,
            description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
            createdAt: stamp(),
          },
        });

        for (const line of newLines) {
          if (line.amount <= 0) continue;
          const bankId = posAccounts.get(line.method) ?? null;
          const payment = await tx.payment.create({
            data: {
              customerId: newCustomerId,
              amount: line.amount,
              method: line.method as any,
              status: 'COMPLETED',
              paidAt: at,
              createdAt: stamp(),
              notes: `Түгээлтийн борлуулалт #${sale.saleNumber} (${line.method})`,
              ...(bankId ? { bankAccountId: bankId } : {}),
            },
          });
          if (bankId) {
            await tx.bankAccount.update({
              where: { id: bankId },
              data: { currentBalance: { increment: line.amount } },
            });
          }
          toDebt -= line.amount;
          await tx.customerLedgerEntry.create({
            data: {
              customerId: newCustomerId,
              amount: -line.amount,
              balanceAfter: toDebt,
              description: `Түгээлтийн төлбөр #${sale.saleNumber}`,
              paymentId: payment.id,
              createdAt: stamp(),
            },
          });
        }
        await tx.customer.update({
          where: { id: newCustomerId },
          data: { outstandingDebt: toDebt },
        });
      } else {
        // createSale-тай ижил бүтэц — эхлээд борлуулалтын зөрүү өр болж
        // бичигдээд, дараа нь төлсөн хэсэг нь хасагдана.
        const fresh = await tx.customer.findUniqueOrThrow({
          where: { id: sale.customerId },
          select: { outstandingDebt: true },
        });
        const startDebt = Number(fresh.outstandingDebt);
        let debt = startDebt;

        if (totalDelta !== 0) {
          debt += totalDelta;
          await tx.customerLedgerEntry.create({
            data: {
              customerId: sale.customerId,
              amount: totalDelta,
              balanceAfter: debt,
              description: `Борлуулалт #${sale.saleNumber} засвар (дүнгийн зөрүү)`,
              createdAt: at,
            },
          });
        }

        if (paidDelta !== 0) {
          // Тухайн сувгийг хүлээн авдаг данс байвал зөрүү нь тэнд тусна.
          const bankId = posAccounts.get(String(payChannel)) ?? null;

          const payment = await tx.payment.create({
            data: {
              customerId: sale.customerId,
              amount: paidDelta,
              method: payChannel as any,
              status: 'COMPLETED',
              paidAt: at,
              createdAt: at,
              notes:
                paidDelta > 0
                  ? `Борлуулалт #${sale.saleNumber} засвар - нэмэлт төлбөр`
                  : `Борлуулалт #${sale.saleNumber} засвар - буцаалт`,
              ...(bankId ? { bankAccountId: bankId } : {}),
            },
          });

          if (bankId) {
            await tx.bankAccount.update({
              where: { id: bankId },
              data: { currentBalance: { increment: paidDelta } },
            });
          }
          debt -= paidDelta;
          await tx.customerLedgerEntry.create({
            data: {
              customerId: sale.customerId,
              amount: -paidDelta,
              balanceAfter: debt,
              description: `Борлуулалт #${sale.saleNumber} засвар - төлбөр`,
              paymentId: payment.id,
              createdAt: at,
            },
          });
        }

        if (debt !== startDebt) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { outstandingDebt: debt },
          });
        }
      }

      return tx.truckSale.update({
        where: { id },
        data: {
          customerId: newCustomerId,
          paymentMethod: newMethod,
          subtotal: newTotal,
          totalAmount: newTotal,
          notes: newNotes || null,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcodes: { select: { code: true } },
                  unit: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              storeName: true,
              contactName: true,
              phone: true,
              address: true,
            },
          },
        },
      });
    });
  }

  // VOID/CANCEL a truck sale
  async voidSale(id: string, userId: string) {
    const sale = await this.prisma.truckSale.findUnique({
      where: { id },
      include: {
        items: true,
        truckLoad: { include: { items: true } },
        customer: {
          select: { id: true, storeName: true, outstandingDebt: true },
        },
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

    const posAccounts = await this.posAccountMap();

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
        /** Төлсөн хэсгийн хэлбэр бүрийн дүн — данс тус бүрээр буцаана. */
        const paidByMethod = new Map<string, number>();
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
              paidByMethod.set(
                method,
                (paidByMethod.get(method) ?? 0) + amount,
              );
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

        // Төлсөн хэсгийг хэлбэр тус бүрээр нь буцаана — ингэснээр бэлэн,
        // шилжүүлгийн данс хоёулаа зөв хэмжээгээр буурна.
        for (const [method, amount] of paidByMethod) {
          if (amount <= 0) continue;
          const bankId = posAccounts.get(method) ?? null;

          await tx.payment.create({
            data: {
              customerId: sale.customerId,
              amount: -amount,
              method: method as any,
              status: 'COMPLETED',
              paidAt: new Date(),
              notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - Буцаалт (${method})`,
              ...(bankId ? { bankAccountId: bankId } : {}),
            },
          });

          if (bankId) {
            await tx.bankAccount.update({
              where: { id: bankId },
              data: { currentBalance: { decrement: amount } },
            });
          }
        }
      } else {
        // Cash/Bank/Card - reverse the payment
        // Тухайн хэлбэрийг хүлээн авдаг данс байвал үлдэгдлийг ч буцаана.
        const bankId = posAccounts.get(String(sale.paymentMethod)) ?? null;

        await tx.payment.create({
          data: {
            customerId: sale.customerId,
            amount: -totalAmount,
            method: sale.paymentMethod,
            status: 'COMPLETED',
            paidAt: new Date(),
            notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - Буцаалт`,
            ...(bankId ? { bankAccountId: bankId } : {}),
          },
        });

        if (bankId) {
          await tx.bankAccount.update({
            where: { id: bankId },
            data: { currentBalance: { decrement: totalAmount } },
          });
        }
      }

      // 3. Delete the sale (cascade deletes sale items)
      await tx.truckSale.delete({
        where: { id },
      });

      return {
        message: `Борлуулалт #${sale.saleNumber} амжилттай цуцлагдлаа.`,
      };
    });
  }
}
