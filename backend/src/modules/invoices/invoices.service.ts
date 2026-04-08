import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // GENERATE INVOICE from a DELIVERED order
  // ---------------------------------------------------------------------------
  async generate(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        customer: true,
        invoice: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Захиалга олдсонгүй.');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Зөвхөн хүргэгдсэн (DELIVERED) захиалгаас нэхэмжлэл үүсгэх боломжтой. Одоогийн төлөв: ${order.status}`,
      );
    }

    if (order.invoice) {
      throw new ConflictException(
        `Энэ захиалгад нэхэмжлэл аль хэдийн үүссэн байна. Нэхэмжлэлийн дугаар: ${order.invoice.invoiceNumber}`,
      );
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        orderId: order.id,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
      },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            customer: true,
          },
        },
      },
    });

    return invoice;
  }

  // ---------------------------------------------------------------------------
  // FIND ALL (paginated)
  // ---------------------------------------------------------------------------
  async findAll(
    pagination: PaginationDto,
    search?: string,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (search) {
      const searchNum = parseInt(search, 10);
      if (!isNaN(searchNum)) {
        where.OR = [
          { invoiceNumber: searchNum },
          { order: { orderNumber: searchNum } },
          {
            order: {
              customer: {
                storeName: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ];
      } else {
        where.order = {
          customer: {
            storeName: { contains: search, mode: 'insensitive' },
          },
        };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: order },
        include: {
          order: {
            include: {
              customer: {
                select: { id: true, storeName: true, contactName: true, phone: true },
              },
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
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
  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
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
            deliveryRoute: {
              include: {
                driver: {
                  select: { id: true, firstName: true, lastName: true, phone: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Нэхэмжлэл олдсонгүй.');
    }

    return invoice;
  }
}
