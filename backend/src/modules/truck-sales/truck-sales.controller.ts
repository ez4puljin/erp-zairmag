import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TruckSalesService } from './truck-sales.service';
import { CreateTruckSaleDto } from './dto/create-truck-sale.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/truck-sales')
export class TruckSalesController {
  constructor(private readonly service: TruckSalesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  create(@Body() dto: CreateTruckSaleDto, @Req() req: any) {
    return this.service.createSale(dto, req.user.id);
  }

  @Get('truck-load/:truckLoadId')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  findByTruckLoad(@Param('truckLoadId') truckLoadId: string) {
    return this.service.findByTruckLoad(truckLoadId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id/void')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  voidSale(@Param('id') id: string, @Req() req: any) {
    return this.service.voidSale(id, req.user.id);
  }
}
