import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { sku: dto.sku },
    });
    if (existing) {
      throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
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

  private static readonly VALID_SORT_FIELDS = [
    'name',
    'sku',
    'createdAt',
    'updatedAt',
    'sellingPrice',
    'costPrice',
    'stockAvailable',
  ];

  async findAll(query: QueryProductDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, order = 'desc', categoryId, inStock, sortBy: rawSortBy = 'createdAt' } = query;
    const sortBy = ProductsService.VALID_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'name';
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (inStock === true) {
      where.stockAvailable = { gt: 0 };
    } else if (inStock === false) {
      where.stockAvailable = { lte: 0 };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
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

  async findOne(id: string) {
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
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: dto.sku, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU "${dto.sku}" already exists`);
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

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Resolve the effective price for a product and customer.
   * Priority: CustomerPrice > TierPrice (based on customer tier) > Product.sellingPrice
   */
  async getPrice(productId: string, customerId?: string): Promise<{ price: Prisma.Decimal; source: string }> {
    const product = await this.findOne(productId);

    // 1. Check for customer-specific price
    if (customerId) {
      const customerPrice = await this.prisma.customerPrice.findUnique({
        where: {
          productId_customerId: { productId, customerId },
        },
      });

      if (customerPrice) {
        return { price: customerPrice.price, source: 'customer' };
      }

      // 2. Check for tier-based price using the customer's pricing tier
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

    // 3. Fall back to product's selling price
    return { price: product.sellingPrice, source: 'product' };
  }

  async bulkImport(buffer: Buffer) {
    const XLSX = require('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const results = { created: 0, updated: 0, errors: [] as { row: number; message: string }[] };

    // Get all categories for name lookup
    const categories = await this.prisma.category.findMany();
    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row (1-indexed + header)

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
            data: { name, unit: unit as any, costPrice, sellingPrice, reorderLevel, unitsPerBox, ...(categoryId ? { categoryId } : {}) },
          });
          results.updated++;
        } else {
          if (!categoryId) {
            results.errors.push({ row: rowNum, message: 'Шинэ бараанд ангилал заавал шаардлагатай' });
            continue;
          }
          await this.prisma.product.create({
            data: { name, sku, unit: unit as any, costPrice, sellingPrice, reorderLevel, unitsPerBox, categoryId },
          });
          results.created++;
        }
      } catch (err: any) {
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
}
