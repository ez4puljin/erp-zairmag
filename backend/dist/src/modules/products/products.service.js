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
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ProductsService = class ProductsService {
    static { ProductsService_1 = this; }
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.product.findUnique({
            where: { sku: dto.sku },
        });
        if (existing) {
            throw new common_1.ConflictException(`Product with SKU "${dto.sku}" already exists`);
        }
        return this.prisma.product.create({
            data: {
                name: dto.name,
                sku: dto.sku,
                description: dto.description,
                categoryId: dto.categoryId,
                unit: dto.unit,
                costPrice: dto.costPrice,
                sellingPrice: dto.sellingPrice,
                reorderLevel: dto.reorderLevel,
                imageUrl: dto.imageUrl,
                supplierId: dto.supplierId,
            },
            include: { category: true, supplier: true },
        });
    }
    static VALID_SORT_FIELDS = [
        'name',
        'sku',
        'createdAt',
        'updatedAt',
        'sellingPrice',
        'costPrice',
        'stockAvailable',
    ];
    async findAll(query) {
        const { page = 1, limit = 20, search, order = 'desc', categoryId, inStock, sortBy: rawSortBy = 'createdAt' } = query;
        const sortBy = ProductsService_1.VALID_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'name';
        const skip = (page - 1) * limit;
        const where = {
            deletedAt: null,
        };
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (inStock === true) {
            where.stockAvailable = { gt: 0 };
        }
        else if (inStock === false) {
            where.stockAvailable = { lte: 0 };
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const orderBy = {};
        orderBy[sortBy] = order;
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: { category: true, tierPrices: true, supplier: true },
            }),
            this.prisma.product.count({ where }),
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
    async findOne(id) {
        const product = await this.prisma.product.findFirst({
            where: { id, deletedAt: null },
            include: {
                category: true,
                tierPrices: true,
                supplier: true,
                batches: {
                    where: { quantityRemaining: { gt: 0 } },
                    orderBy: { expiryDate: 'asc' },
                },
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with ID "${id}" not found`);
        }
        return product;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.sku) {
            const existing = await this.prisma.product.findFirst({
                where: { sku: dto.sku, id: { not: id }, deletedAt: null },
            });
            if (existing) {
                throw new common_1.ConflictException(`Product with SKU "${dto.sku}" already exists`);
            }
        }
        return this.prisma.product.update({
            where: { id },
            data: {
                ...dto,
                version: { increment: 1 },
            },
            include: { category: true, supplier: true },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.product.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
    }
    async getPrice(productId, customerId) {
        const product = await this.findOne(productId);
        if (customerId) {
            const customerPrice = await this.prisma.customerPrice.findUnique({
                where: {
                    productId_customerId: { productId, customerId },
                },
            });
            if (customerPrice) {
                return { price: customerPrice.price, source: 'customer' };
            }
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId },
                select: { pricingTier: true },
            });
            if (customer) {
                const tierPrice = await this.prisma.tierPrice.findUnique({
                    where: {
                        productId_tier: { productId, tier: customer.pricingTier },
                    },
                });
                if (tierPrice) {
                    return { price: tierPrice.price, source: 'tier' };
                }
            }
        }
        return { price: product.sellingPrice, source: 'product' };
    }
    async bulkImport(buffer) {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        const results = { created: 0, updated: 0, errors: [] };
        const categories = await this.prisma.category.findMany();
        const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;
            try {
                const name = String(row['name'] || row['Нэр'] || '').trim();
                const sku = String(row['sku'] || row['Баркод'] || '').trim();
                const categoryName = String(row['category'] || row['Ангилал'] || '').trim();
                const unit = String(row['unit'] || row['Нэгж'] || 'PIECE').toUpperCase();
                const costPrice = Number(row['costPrice'] || row['Өртөг'] || 0);
                const sellingPrice = Number(row['sellingPrice'] || row['Зарах үнэ'] || 0);
                const reorderLevel = Number(row['reorderLevel'] || row['Доод хэмжээ'] || 0);
                const unitsPerBox = Number(row['unitsPerBox'] || row['Хайрцагт'] || 1);
                if (!name || !sku) {
                    results.errors.push({ row: rowNum, message: 'Нэр болон баркод заавал шаардлагатай' });
                    continue;
                }
                const categoryId = categoryMap.get(categoryName.toLowerCase());
                if (!categoryId && categoryName) {
                    results.errors.push({ row: rowNum, message: `"${categoryName}" ангилал олдсонгүй` });
                    continue;
                }
                const existing = await this.prisma.product.findUnique({ where: { sku } });
                if (existing) {
                    await this.prisma.product.update({
                        where: { sku },
                        data: { name, unit: unit, costPrice, sellingPrice, reorderLevel, unitsPerBox, ...(categoryId ? { categoryId } : {}) },
                    });
                    results.updated++;
                }
                else {
                    if (!categoryId) {
                        results.errors.push({ row: rowNum, message: 'Шинэ бараанд ангилал заавал шаардлагатай' });
                        continue;
                    }
                    await this.prisma.product.create({
                        data: { name, sku, unit: unit, costPrice, sellingPrice, reorderLevel, unitsPerBox, categoryId },
                    });
                    results.created++;
                }
            }
            catch (err) {
                results.errors.push({ row: rowNum, message: err.message || 'Алдаа гарлаа' });
            }
        }
        return results;
    }
    generateImportTemplate() {
        const XLSX = require('xlsx');
        const data = [
            { 'Нэр': 'Жишээ бараа', 'Баркод': 'IC-001', 'Ангилал': 'Зайрмаг', 'Нэгж': 'PIECE', 'Өртөг': 10000, 'Зарах үнэ': 15000, 'Доод хэмжээ': 10, 'Хайрцагт': 24 },
        ];
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map