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
exports.CategoriesService = exports.UpdateCategoryDto = exports.CreateCategoryDto = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
class CreateCategoryDto {
    name;
    parentId;
}
exports.CreateCategoryDto = CreateCategoryDto;
class UpdateCategoryDto {
    name;
    parentId;
}
exports.UpdateCategoryDto = UpdateCategoryDto;
let CategoriesService = class CategoriesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.category.findUnique({
            where: { name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException(`Category "${dto.name}" already exists`);
        }
        if (dto.parentId) {
            const parent = await this.prisma.category.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent) {
                throw new common_1.NotFoundException(`Parent category with ID "${dto.parentId}" not found`);
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Category with ID "${id}" not found`);
        }
        return category;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name) {
            const existing = await this.prisma.category.findFirst({
                where: { name: dto.name, id: { not: id } },
            });
            if (existing) {
                throw new common_1.ConflictException(`Category "${dto.name}" already exists`);
            }
        }
        if (dto.parentId) {
            if (dto.parentId === id) {
                throw new common_1.ConflictException('A category cannot be its own parent');
            }
            const parent = await this.prisma.category.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent) {
                throw new common_1.NotFoundException(`Parent category with ID "${dto.parentId}" not found`);
            }
        }
        return this.prisma.category.update({
            where: { id },
            data: dto,
            include: { parent: true, children: true },
        });
    }
    async remove(id) {
        const category = await this.findOne(id);
        if (category.children.length > 0) {
            throw new common_1.ConflictException('Cannot delete a category that has child categories');
        }
        if (category.products.length > 0) {
            throw new common_1.ConflictException('Cannot delete a category that has products');
        }
        return this.prisma.category.delete({ where: { id } });
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map