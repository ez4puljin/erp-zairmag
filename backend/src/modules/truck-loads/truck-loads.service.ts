import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTruckLoadDto } from './dto/create-truck-load.dto';
import { UpdateTruckLoadDto } from './dto/update-truck-load.dto';
import { SubmitReturnDto } from './dto/submit-return.dto';
import { Prisma, StockMovementReason } from '@prisma/client';

@Injectable()
export class TruckLoadsService {
  constructor(private prisma: PrismaService) {}

  // CREATE - Creates a new truck load in LOADING status
  async create(dto: CreateTruckLoadDto, createdById: string) {
    // Verify driver exists and has DRIVER role
    const driver = await this.prisma.user.findUnique({ where: { id: dto.driverId } });
    if (!driver || driver.role !== 'DRIVER') {
      throw new BadRequestException('Жолооч олдсонгүй эсвэл буруу role.');
    }

    // Check if driver already has an active (LOADING or DISPATCHED) load
    const activeLoad = await this.prisma.truckLoad.findFirst({
      where: {
        driverId: dto.driverId,
        status: { in: ['LOADING', 'DISPATCHED'] },
      },
      select: { id: true, loadNumber: true, status: true },
    });
    if (activeLoad) {
      throw new BadRequestException(
        `Жолоочид идэвхтэй ачилт байна (№${activeLoad.loadNumber}, ${activeLoad.status === 'LOADING' ? 'Ачиж байна' : 'Илгээсэн'}). Нэмэлт бараа авахын тулд "Нэмэлт ачилт" ашиглана уу.`,
      );
    }

    // Verify products exist
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Зарим бүтээгдэхүүн олдсонгүй.');
    }

    return this.prisma.truckLoad.create({
      data: {
        driverId: dto.driverId,
        loadDate: new Date(dto.loadDate),
        locationType: dto.locationType ?? 'URBAN',
        notes: dto.notes,
        vehicleInfo: dto.vehicleInfo,
        createdById,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            loadedQty: item.loadedQty,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true, sellingPriceRural: true, costPrice: true },
            },
          },
        },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  // UPDATE - Update truck load items while still LOADING
  async update(id: string, dto: UpdateTruckLoadDto) {
    const truckLoad = await this.prisma.truckLoad.findUnique({ where: { id } });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'LOADING') {
      throw new BadRequestException('Зөвхөн LOADING статустай ачилтыг засах боломжтой.');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.notes !== undefined) {
        await tx.truckLoad.update({ where: { id }, data: { notes: dto.notes } });
      }

      if (dto.items) {
        // Delete existing items and recreate
        await tx.truckLoadItem.deleteMany({ where: { truckLoadId: id } });
        for (const item of dto.items) {
          await tx.truckLoadItem.create({
            data: {
              truckLoadId: id,
              productId: item.productId,
              loadedQty: item.loadedQty,
            },
          });
        }
      }

      return tx.truckLoad.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true, sellingPriceRural: true, costPrice: true },
              },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }

  // DISPATCH - Transfer stock from warehouse to truck
  async dispatch(id: string, userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'LOADING') {
      throw new BadRequestException('Зөвхөн LOADING статустай ачилтыг илгээх боломжтой.');
    }
    if (truckLoad.items.length === 0) {
      throw new BadRequestException('Ачилтад бараа нэмэгдээгүй байна.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Reserve/transfer stock out from warehouse for each item
      for (const item of truckLoad.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, version: true, stockAvailable: true },
        });

        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: product!.version,
            stockAvailable: { gte: item.loadedQty },
          },
          data: {
            stockAvailable: { decrement: item.loadedQty },
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          throw new ConflictException(`Бараа "${product!.name}" нөөц хүрэлцэхгүй эсвэл зөрчил үүссэн.`);
        }

        // Create TRANSFER_OUT stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.loadedQty,
            reason: StockMovementReason.TRANSFER_OUT,
            createdById: userId,
            locationCode: `TRUCK-${truckLoad.loadNumber}`,
            notes: `Машины ачилт #${truckLoad.loadNumber} - Жолоочид хүлээлгэж өгсөн`,
          },
        });
      }

      return tx.truckLoad.update({
        where: { id },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true, sellingPriceRural: true, costPrice: true },
              },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }

  // SUBMIT RETURN - Driver submits remaining goods
  async submitReturn(id: string, dto: SubmitReturnDto, userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException('Зөвхөн DISPATCHED статустай ачилтыг буцаах боломжтой.');
    }

    return this.prisma.$transaction(async (tx) => {
      const returnedProductIds = new Set<string>();

      for (const returnItem of dto.items) {
        const loadItem = truckLoad.items.find((i) => i.productId === returnItem.productId);
        if (!loadItem) continue;

        returnedProductIds.add(returnItem.productId);

        const damaged = returnItem.damagedQty || 0;
        const returned = returnItem.returnedQty;
        const totalBack = returned + damaged;
        const remaining = loadItem.loadedQty - loadItem.soldQty;

        if (totalBack !== remaining) {
          throw new BadRequestException(
            `Буцаалт таарахгүй: ${loadItem.product.name}, Үлдсэн: ${remaining}, Буцааж байгаа: ${totalBack}. returnedQty + damagedQty нь loadedQty - soldQty-тай тэнцүү байх ёстой`,
          );
        }

        await tx.truckLoadItem.update({
          where: { id: loadItem.id },
          data: {
            returnedQty: returned,
            damagedQty: damaged,
          },
        });
      }

      // Check for missing items that have remaining quantity but were not included in the return
      const missingItems = truckLoad.items.filter(
        (item) => item.loadedQty - item.soldQty > 0 && !returnedProductIds.has(item.productId),
      );
      if (missingItems.length > 0) {
        const missingNames = missingItems.map((item) => item.product.name).join(', ');
        throw new BadRequestException(`Дараах барааны буцаалт дутуу: ${missingNames}`);
      }

      return tx.truckLoad.update({
        where: { id },
        data: {
          returnNotes: dto.notes,
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true, sellingPriceRural: true, costPrice: true },
              },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }

  // VERIFY RETURN - Manager verifies and returns stock to warehouse
  async verifyReturn(id: string, userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException('Зөвхөн DISPATCHED статустай ачилтыг баталгаажуулах боломжтой.');
    }

    // Pre-verification: ensure all items have correct return quantities
    for (const item of truckLoad.items) {
      if (item.returnedQty + item.damagedQty !== item.loadedQty - item.soldQty) {
        throw new BadRequestException('Буцаалтын тоо таарахгүй байна. Дахин буцаалт бүртгэнэ үү');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of truckLoad.items) {
        const returnQty = item.returnedQty;
        if (returnQty > 0) {
          // Return good stock to warehouse
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockAvailable: { increment: returnQty },
              version: { increment: 1 },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: returnQty,
              reason: StockMovementReason.TRANSFER_IN,
              createdById: userId,
              locationCode: `TRUCK-${truckLoad.loadNumber}`,
              notes: `Машины ачилт #${truckLoad.loadNumber} - Буцаалт (сайн бараа)`,
            },
          });
        }

        // Handle damaged qty as ADJUSTMENT_LOSS
        if (item.damagedQty > 0) {
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.damagedQty,
              reason: StockMovementReason.ADJUSTMENT_LOSS,
              createdById: userId,
              locationCode: `TRUCK-${truckLoad.loadNumber}`,
              notes: `Машины ачилт #${truckLoad.loadNumber} - Гэмтсэн бараа`,
            },
          });
        }
      }

      return tx.truckLoad.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          returnVerifiedById: userId,
          returnVerifiedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true, sellingPriceRural: true, costPrice: true },
              },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          returnVerifiedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  // REQUEST COMPLETION - Driver requests admin to verify and complete the load
  async requestCompletion(id: string, userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({ where: { id } });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException('Зөвхөн идэвхтэй ачилтыг дуусгах хүсэлт илгээх боломжтой.');
    }
    return this.prisma.truckLoad.update({
      where: { id },
      data: { status: 'COMPLETION_REQUESTED' as any },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true } } } },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  // APPROVE COMPLETION - Admin enters return quantities and finalizes
  // Returns stock to warehouse, sets status to COMPLETED
  async approveCompletion(id: string, dto: SubmitReturnDto, userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: { items: { include: { product: { select: { name: true } } } } },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'COMPLETION_REQUESTED' && truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException('Зөвхөн хүлээгдэж буй ачилтыг батлах боломжтой.');
    }

    return this.prisma.$transaction(async (tx) => {
      const returnedProductIds = new Set<string>();

      for (const returnItem of dto.items) {
        const loadItem = truckLoad.items.find((i) => i.productId === returnItem.productId);
        if (!loadItem) continue;

        returnedProductIds.add(returnItem.productId);

        const damaged = returnItem.damagedQty || 0;
        const returned = returnItem.returnedQty;
        const totalBack = returned + damaged;
        // Account for any previously returned/damaged quantities
        const remaining = loadItem.loadedQty - loadItem.soldQty - loadItem.returnedQty - loadItem.damagedQty;

        if (remaining <= 0) continue; // Already fully accounted for

        if (totalBack !== remaining) {
          throw new BadRequestException(
            `Буцаалт таарахгүй: ${loadItem.product.name}, Үлдсэн: ${remaining}, Буцааж байгаа: ${totalBack}`,
          );
        }

        // Update item return quantities (add to existing)
        await tx.truckLoadItem.update({
          where: { id: loadItem.id },
          data: {
            returnedQty: loadItem.returnedQty + returned,
            damagedQty: loadItem.damagedQty + damaged,
          },
        });

        // Return good stock to warehouse
        if (returned > 0) {
          await tx.product.update({
            where: { id: loadItem.productId },
            data: {
              stockAvailable: { increment: returned },
              version: { increment: 1 },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: loadItem.productId,
              quantity: returned,
              reason: StockMovementReason.TRANSFER_IN,
              createdById: userId,
              locationCode: `TRUCK-${truckLoad.loadNumber}`,
              notes: `Машины ачилт #${truckLoad.loadNumber} - Буцаалт (сайн бараа)`,
            },
          });
        }

        if (damaged > 0) {
          await tx.stockMovement.create({
            data: {
              productId: loadItem.productId,
              quantity: damaged,
              reason: StockMovementReason.ADJUSTMENT_LOSS,
              createdById: userId,
              locationCode: `TRUCK-${truckLoad.loadNumber}`,
              notes: `Машины ачилт #${truckLoad.loadNumber} - Гэмтсэн бараа`,
            },
          });
        }
      }

      // Verify all items with un-accounted remaining quantity were included
      const missingItems = truckLoad.items.filter(
        (item) => {
          const unaccounted = item.loadedQty - item.soldQty - item.returnedQty - item.damagedQty;
          return unaccounted > 0 && !returnedProductIds.has(item.productId);
        },
      );
      if (missingItems.length > 0) {
        const missingNames = missingItems.map((i) => i.product.name).join(', ');
        throw new BadRequestException(`Дараах барааны буцаалт дутуу: ${missingNames}`);
      }

      return tx.truckLoad.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          returnVerifiedById: userId,
          returnVerifiedAt: new Date(),
          returnNotes: dto.notes,
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, weightGrams: true, sellingPrice: true, sellingPriceRural: true, costPrice: true } },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          returnVerifiedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  // ADD ITEMS - Add additional items to a DISPATCHED truck load (mid-day restock)
  async addItems(id: string, items: { productId: string; loadedQty: number }[], userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    if (truckLoad.status !== 'DISPATCHED') {
      throw new BadRequestException('Зөвхөн DISPATCHED статустай ачилтад бараа нэмэх боломжтой.');
    }

    // Verify products exist
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('Зарим бүтээгдэхүүн олдсонгүй.');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        // Fetch product with version for optimistic locking
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { name: true, version: true, stockAvailable: true },
        });

        // Decrement warehouse stock with version-based optimistic locking
        const updated = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: product!.version,
            stockAvailable: { gte: item.loadedQty },
          },
          data: {
            stockAvailable: { decrement: item.loadedQty },
            version: { increment: 1 },
          },
        });
        if (updated.count === 0) {
          throw new ConflictException(`Бараа "${product!.name}" нөөц хүрэлцэхгүй эсвэл зөрчил үүссэн.`);
        }

        // Create TRANSFER_OUT stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.loadedQty,
            reason: StockMovementReason.TRANSFER_OUT,
            createdById: userId,
            locationCode: `TRUCK-${truckLoad.loadNumber}`,
            notes: `Машины ачилт #${truckLoad.loadNumber} - Нэмэлт ачилт`,
          },
        });

        // Check if product already exists in truck load
        const existingItem = truckLoad.items.find((i) => i.productId === item.productId);
        if (existingItem) {
          // Increment existing item's loadedQty
          await tx.truckLoadItem.update({
            where: { id: existingItem.id },
            data: { loadedQty: { increment: item.loadedQty } },
          });
        } else {
          // Create new item
          await tx.truckLoadItem.create({
            data: {
              truckLoadId: id,
              productId: item.productId,
              loadedQty: item.loadedQty,
            },
          });
        }
      }

      return tx.truckLoad.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, sellingPriceRural: true, costPrice: true, unitsPerBox: true },
              },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }

  // FIND ALL
  async findAll(query: {
    status?: string;
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TruckLoadWhereInput = {};
    if (query.status) where.status = query.status as any;
    if (query.driverId) where.driverId = query.driverId;
    if (query.dateFrom || query.dateTo) {
      where.loadDate = {};
      if (query.dateFrom) where.loadDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.loadDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
    }

    const [data, total] = await Promise.all([
      this.prisma.truckLoad.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, sellingPrice: true, sellingPriceRural: true } },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
          sales: { select: { id: true, saleNumber: true, totalAmount: true, customerId: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.truckLoad.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // FIND ONE
  async findOne(id: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, sellingPriceRural: true, costPrice: true, imageUrl: true, unitsPerBox: true },
            },
          },
        },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        returnVerifiedBy: { select: { id: true, firstName: true, lastName: true } },
        sales: {
          include: {
            customer: { select: { id: true, storeName: true, contactName: true } },
            items: { include: { product: { select: { id: true, name: true, sku: true, unitsPerBox: true, sellingPrice: true, sellingPriceRural: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');
    return truckLoad;
  }

  // GET ANY ACTIVE DISPATCHED LOAD (for Admin/Manager POS)
  async getAnyActiveLoad() {
    const load = await this.prisma.truckLoad.findFirst({
      where: { status: { in: ['DISPATCHED', 'COMPLETION_REQUESTED'] as any } },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, sellingPriceRural: true, costPrice: true, imageUrl: true, unitsPerBox: true },
            },
          },
        },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        sales: {
          include: {
            customer: { select: { id: true, storeName: true, contactName: true } },
            items: { include: { product: { select: { id: true, name: true, sku: true, unitsPerBox: true, sellingPrice: true, sellingPriceRural: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return load;
  }

  // GET DRIVER'S ACTIVE LOAD
  async getDriverActiveLoad(driverId: string) {
    const load = await this.prisma.truckLoad.findFirst({
      where: {
        driverId,
        status: { in: ['DISPATCHED', 'COMPLETION_REQUESTED'] as any },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, sellingPriceRural: true, costPrice: true, imageUrl: true, unitsPerBox: true },
            },
          },
        },
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        sales: {
          include: {
            customer: { select: { id: true, storeName: true, contactName: true } },
            items: { include: { product: { select: { id: true, name: true, sku: true, unitsPerBox: true, sellingPrice: true, sellingPriceRural: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return load;
  }

  // CANCEL
  async cancel(id: string, userId: string) {
    const truckLoad = await this.prisma.truckLoad.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!truckLoad) throw new NotFoundException('Ачилт олдсонгүй.');

    if (truckLoad.status === 'COMPLETED' || truckLoad.status === 'CANCELLED') {
      throw new BadRequestException('Энэ ачилтыг цуцлах боломжгүй.');
    }

    return this.prisma.$transaction(async (tx) => {
      // If already dispatched, return all loaded stock to warehouse
      if (truckLoad.status === 'DISPATCHED') {
        for (const item of truckLoad.items) {
          const unaccountedQty = item.loadedQty - item.soldQty;
          if (unaccountedQty > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockAvailable: { increment: unaccountedQty },
                version: { increment: 1 },
              },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                quantity: unaccountedQty,
                reason: StockMovementReason.TRANSFER_IN,
                createdById: userId,
                locationCode: `TRUCK-${truckLoad.loadNumber}`,
                notes: `Машины ачилт #${truckLoad.loadNumber} цуцлагдсан - Бараа буцаагдсан`,
              },
            });
          }
        }
      }

      return tx.truckLoad.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, sellingPrice: true, sellingPriceRural: true } },
            },
          },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }
}
