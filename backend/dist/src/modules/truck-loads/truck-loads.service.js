"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TruckLoadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TruckLoadsService = class TruckLoadsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, createdById) {
        const driver = await this.prisma.user.findUnique({ where: { id: dto.driverId } });
        if (!driver || driver.role !== 'DRIVER') {
            throw new common_1.BadRequestException('Жолооч олдсонгүй эсвэл буруу role.');
        }
        const activeLoad = await this.prisma.truckLoad.findFirst({
            where: {
                driverId: dto.driverId,
                status: { in: ['LOADING', 'DISPATCHED'] },
            },
            select: { id: true, loadNumber: true, status: true },
        });
        if (activeLoad) {
            throw new common_1.BadRequestException(`Жолоочид идэвхтэй ачилт байна (№${activeLoad.loadNumber}, ${activeLoad.status === 'LOADING' ? 'Ачиж байна' : 'Илгээсэн'}). Нэмэлт бараа авахын тулд "Нэмэлт ачилт" ашиглана уу.`);
        }
        const productIds = dto.items.map((i) => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true, deletedAt: null },
        });
        if (products.length !== productIds.length) {
            throw new common_1.NotFoundException('Зарим бүтээгдэхүүн олдсонгүй.');
        }
        return this.prisma.truckLoad.create({
            data: {
                driverId: dto.driverId,
                loadDate: new Date(dto.loadDate),
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
                            select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true },
                        },
                    },
                },
                driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
        });
    }
    async update(id, dto) {
        const truckLoad = await this.prisma.truckLoad.findUnique({ where: { id } });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'LOADING') {
            throw new common_1.BadRequestException('Зөвхөн LOADING статустай ачилтыг засах боломжтой.');
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.notes !== undefined) {
                await tx.truckLoad.update({ where: { id }, data: { notes: dto.notes } });
            }
            if (dto.items) {
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
                                select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true },
                            },
                        },
                    },
                    driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                },
            });
        });
    }
    async dispatch(id, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'LOADING') {
            throw new common_1.BadRequestException('Зөвхөн LOADING статустай ачилтыг илгээх боломжтой.');
        }
        if (truckLoad.items.length === 0) {
            throw new common_1.BadRequestException('Ачилтад бараа нэмэгдээгүй байна.');
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of truckLoad.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true, version: true, stockAvailable: true },
                });
                const updated = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        version: product.version,
                        stockAvailable: { gte: item.loadedQty },
                    },
                    data: {
                        stockAvailable: { decrement: item.loadedQty },
                        version: { increment: 1 },
                    },
                });
                if (updated.count === 0) {
                    throw new common_1.ConflictException(`Бараа "${product.name}" нөөц хүрэлцэхгүй эсвэл зөрчил үүссэн.`);
                }
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.loadedQty,
                        reason: client_1.StockMovementReason.TRANSFER_OUT,
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
                                select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true },
                            },
                        },
                    },
                    driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                },
            });
        });
    }
    async submitReturn(id, dto, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: { items: { include: { product: { select: { name: true } } } } },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Зөвхөн DISPATCHED статустай ачилтыг буцаах боломжтой.');
        }
        return this.prisma.$transaction(async (tx) => {
            const returnedProductIds = new Set();
            for (const returnItem of dto.items) {
                const loadItem = truckLoad.items.find((i) => i.productId === returnItem.productId);
                if (!loadItem)
                    continue;
                returnedProductIds.add(returnItem.productId);
                const damaged = returnItem.damagedQty || 0;
                const returned = returnItem.returnedQty;
                const totalBack = returned + damaged;
                const remaining = loadItem.loadedQty - loadItem.soldQty;
                if (totalBack !== remaining) {
                    throw new common_1.BadRequestException(`Буцаалт таарахгүй: ${loadItem.product.name}, Үлдсэн: ${remaining}, Буцааж байгаа: ${totalBack}. returnedQty + damagedQty нь loadedQty - soldQty-тай тэнцүү байх ёстой`);
                }
                await tx.truckLoadItem.update({
                    where: { id: loadItem.id },
                    data: {
                        returnedQty: returned,
                        damagedQty: damaged,
                    },
                });
            }
            const missingItems = truckLoad.items.filter((item) => item.loadedQty - item.soldQty > 0 && !returnedProductIds.has(item.productId));
            if (missingItems.length > 0) {
                const missingNames = missingItems.map((item) => item.product.name).join(', ');
                throw new common_1.BadRequestException(`Дараах барааны буцаалт дутуу: ${missingNames}`);
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
                                select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true },
                            },
                        },
                    },
                    driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                },
            });
        });
    }
    async verifyReturn(id, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Зөвхөн DISPATCHED статустай ачилтыг баталгаажуулах боломжтой.');
        }
        for (const item of truckLoad.items) {
            if (item.returnedQty + item.damagedQty !== item.loadedQty - item.soldQty) {
                throw new common_1.BadRequestException('Буцаалтын тоо таарахгүй байна. Дахин буцаалт бүртгэнэ үү');
            }
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of truckLoad.items) {
                const returnQty = item.returnedQty;
                if (returnQty > 0) {
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
                            reason: client_1.StockMovementReason.TRANSFER_IN,
                            createdById: userId,
                            locationCode: `TRUCK-${truckLoad.loadNumber}`,
                            notes: `Машины ачилт #${truckLoad.loadNumber} - Буцаалт (сайн бараа)`,
                        },
                    });
                }
                if (item.damagedQty > 0) {
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            quantity: item.damagedQty,
                            reason: client_1.StockMovementReason.ADJUSTMENT_LOSS,
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
                                select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true },
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
    async requestCompletion(id, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({ where: { id } });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Зөвхөн идэвхтэй ачилтыг дуусгах хүсэлт илгээх боломжтой.');
        }
        return this.prisma.truckLoad.update({
            where: { id },
            data: { status: 'COMPLETION_REQUESTED' },
            include: {
                items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, sellingPrice: true } } } },
                driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
            },
        });
    }
    async approveCompletion(id, dto, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: { items: { include: { product: { select: { name: true } } } } },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'COMPLETION_REQUESTED' && truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Зөвхөн хүлээгдэж буй ачилтыг батлах боломжтой.');
        }
        return this.prisma.$transaction(async (tx) => {
            const returnedProductIds = new Set();
            for (const returnItem of dto.items) {
                const loadItem = truckLoad.items.find((i) => i.productId === returnItem.productId);
                if (!loadItem)
                    continue;
                returnedProductIds.add(returnItem.productId);
                const damaged = returnItem.damagedQty || 0;
                const returned = returnItem.returnedQty;
                const totalBack = returned + damaged;
                const remaining = loadItem.loadedQty - loadItem.soldQty;
                if (totalBack !== remaining) {
                    throw new common_1.BadRequestException(`Буцаалт таарахгүй: ${loadItem.product.name}, Үлдсэн: ${remaining}, Буцааж байгаа: ${totalBack}`);
                }
                await tx.truckLoadItem.update({
                    where: { id: loadItem.id },
                    data: { returnedQty: returned, damagedQty: damaged },
                });
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
                            reason: client_1.StockMovementReason.TRANSFER_IN,
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
                            reason: client_1.StockMovementReason.ADJUSTMENT_LOSS,
                            createdById: userId,
                            locationCode: `TRUCK-${truckLoad.loadNumber}`,
                            notes: `Машины ачилт #${truckLoad.loadNumber} - Гэмтсэн бараа`,
                        },
                    });
                }
            }
            const missingItems = truckLoad.items.filter((item) => item.loadedQty - item.soldQty > 0 && !returnedProductIds.has(item.productId));
            if (missingItems.length > 0) {
                const missingNames = missingItems.map((i) => i.product.name).join(', ');
                throw new common_1.BadRequestException(`Дараах барааны буцаалт дутуу: ${missingNames}`);
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
                            product: { select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true } },
                        },
                    },
                    driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                    returnVerifiedBy: { select: { id: true, firstName: true, lastName: true } },
                },
            });
        });
    }
    async addItems(id, items, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Зөвхөн DISPATCHED статустай ачилтад бараа нэмэх боломжтой.');
        }
        const productIds = items.map((i) => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true, deletedAt: null },
        });
        if (products.length !== productIds.length) {
            throw new common_1.NotFoundException('Зарим бүтээгдэхүүн олдсонгүй.');
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { name: true, version: true, stockAvailable: true },
                });
                const updated = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        version: product.version,
                        stockAvailable: { gte: item.loadedQty },
                    },
                    data: {
                        stockAvailable: { decrement: item.loadedQty },
                        version: { increment: 1 },
                    },
                });
                if (updated.count === 0) {
                    throw new common_1.ConflictException(`Бараа "${product.name}" нөөц хүрэлцэхгүй эсвэл зөрчил үүссэн.`);
                }
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.loadedQty,
                        reason: client_1.StockMovementReason.TRANSFER_OUT,
                        createdById: userId,
                        locationCode: `TRUCK-${truckLoad.loadNumber}`,
                        notes: `Машины ачилт #${truckLoad.loadNumber} - Нэмэлт ачилт`,
                    },
                });
                const existingItem = truckLoad.items.find((i) => i.productId === item.productId);
                if (existingItem) {
                    await tx.truckLoadItem.update({
                        where: { id: existingItem.id },
                        data: { loadedQty: { increment: item.loadedQty } },
                    });
                }
                else {
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
                                select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true, unitsPerBox: true },
                            },
                        },
                    },
                    driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                },
            });
        });
    }
    async findAll(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.driverId)
            where.driverId = query.driverId;
        if (query.dateFrom || query.dateTo) {
            where.loadDate = {};
            if (query.dateFrom)
                where.loadDate.gte = new Date(query.dateFrom);
            if (query.dateTo)
                where.loadDate.lte = new Date(query.dateTo + 'T23:59:59.999Z');
        }
        const [data, total] = await Promise.all([
            this.prisma.truckLoad.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, sellingPrice: true } },
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
    async findOne(id) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true, imageUrl: true, unitsPerBox: true },
                        },
                    },
                },
                driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                returnVerifiedBy: { select: { id: true, firstName: true, lastName: true } },
                sales: {
                    include: {
                        customer: { select: { id: true, storeName: true, contactName: true } },
                        items: { include: { product: { select: { id: true, name: true, sku: true, unitsPerBox: true, sellingPrice: true } } } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        return truckLoad;
    }
    async getAnyActiveLoad() {
        const load = await this.prisma.truckLoad.findFirst({
            where: { status: { in: ['DISPATCHED', 'COMPLETION_REQUESTED'] } },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true, imageUrl: true, unitsPerBox: true },
                        },
                    },
                },
                driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                sales: {
                    include: {
                        customer: { select: { id: true, storeName: true, contactName: true } },
                        items: { include: { product: { select: { id: true, name: true, sku: true, unitsPerBox: true, sellingPrice: true } } } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return load;
    }
    async getDriverActiveLoad(driverId) {
        const load = await this.prisma.truckLoad.findFirst({
            where: {
                driverId,
                status: { in: ['DISPATCHED', 'COMPLETION_REQUESTED'] },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true, imageUrl: true, unitsPerBox: true },
                        },
                    },
                },
                driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                sales: {
                    include: {
                        customer: { select: { id: true, storeName: true, contactName: true } },
                        items: { include: { product: { select: { id: true, name: true, sku: true, unitsPerBox: true, sellingPrice: true } } } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return load;
    }
    async cancel(id, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id },
            include: { items: true },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status === 'COMPLETED' || truckLoad.status === 'CANCELLED') {
            throw new common_1.BadRequestException('Энэ ачилтыг цуцлах боломжгүй.');
        }
        return this.prisma.$transaction(async (tx) => {
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
                                reason: client_1.StockMovementReason.TRANSFER_IN,
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
                            product: { select: { id: true, name: true, sku: true, unit: true, unitsPerBox: true, sellingPrice: true } },
                        },
                    },
                    driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
                },
            });
        });
    }
};
exports.TruckLoadsService = TruckLoadsService;
exports.TruckLoadsService = TruckLoadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TruckLoadsService);
//# sourceMappingURL=truck-loads.service.js.map