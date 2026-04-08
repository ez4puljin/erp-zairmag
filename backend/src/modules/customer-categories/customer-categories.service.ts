import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerCategoryDto } from './dto/create-customer-category.dto';
import { UpdateCustomerCategoryDto } from './dto/update-customer-category.dto';

@Injectable()
export class CustomerCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.customerCategory.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.customerCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`CustomerCategory with ID ${id} not found`);
    }

    return category;
  }

  async create(dto: CreateCustomerCategoryDto) {
    return this.prisma.customerCategory.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerCategoryDto) {
    await this.findOne(id);

    return this.prisma.customerCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category._count.customers > 0) {
      throw new BadRequestException(
        'Энэ ангилалд харьяалагдсан харилцагчид байгаа тул устгах боломжгүй',
      );
    }

    return this.prisma.customerCategory.delete({
      where: { id },
    });
  }
}
