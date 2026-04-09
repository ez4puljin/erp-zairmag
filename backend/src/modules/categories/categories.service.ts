import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID "${dto.parentId}" not found`);
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId,
      },
      include: { parent: true, children: true },
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        products: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.category.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(`Category "${dto.name}" already exists`);
      }
    }

    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('A category cannot be its own parent');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID "${dto.parentId}" not found`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
      include: { parent: true, children: true },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    if (category.children.length > 0) {
      throw new ConflictException('Cannot delete a category that has child categories');
    }

    if (category.products.length > 0) {
      throw new ConflictException('Cannot delete a category that has products');
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
