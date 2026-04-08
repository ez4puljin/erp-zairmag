import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RestockDto, AdjustStockDto } from './dto/restock.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role, StockMovementReason } from '@prisma/client';

@Controller('api/inventory')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  getOverview() {
    return this.inventoryService.getOverview();
  }

  @Post('restock')
  restock(@Body() dto: RestockDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.restock(dto, userId);
  }

  @Post('adjust')
  adjustStock(@Body() dto: AdjustStockDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.adjustStock(dto, userId);
  }

  @Get('movements')
  getMovements(
    @Query('productId') productId?: string,
    @Query('reason') reason?: StockMovementReason,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovements({
      productId,
      reason,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: string) {
    return this.inventoryService.getLowStock(
      threshold ? parseInt(threshold) : undefined,
    );
  }
}
