import { Controller, Get, Post, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PurchaseReceiptsService } from './purchase-receipts.service';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { QueryPurchaseReceiptDto } from './dto/query-purchase-receipt.dto';
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
  async findAll(@Query() query: QueryPurchaseReceiptDto) {
    const { supplierId, productId, dateFrom, dateTo } = query;
    return this.service.findAll(query, { supplierId, productId, dateFrom, dateTo });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
