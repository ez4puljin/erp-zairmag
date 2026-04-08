import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PurchaseReceiptsService } from './purchase-receipts.service';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/purchase-receipts')
export class PurchaseReceiptsController {
  constructor(private readonly service: PurchaseReceiptsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async create(
    @Body() dto: CreatePurchaseReceiptDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('supplierId') supplierId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll(pagination, { supplierId, dateFrom, dateTo });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
