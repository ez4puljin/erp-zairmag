import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TruckSalesService } from './truck-sales.service';
import { CreateTruckSaleDto } from './dto/create-truck-sale.dto';
import { UpdateTruckSaleDto } from './dto/update-truck-sale.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/truck-sales')
export class TruckSalesController {
  constructor(private readonly service: TruckSalesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  create(@Body() dto: CreateTruckSaleDto, @Req() req: any) {
    // Огноог нөхөж бичих эрхийг зөвхөн админ/менежерт өгнө —
    // эс бөгөөс жолооч борлуулалтаа өөр өдөр рүү шилжүүлэх боломжтой болно.
    const canBackdate =
      req.user.role === Role.ADMIN || req.user.role === Role.WAREHOUSE_MANAGER;
    const payload = canBackdate ? dto : { ...dto, saleDate: undefined };
    return this.service.createSale(payload, req.user.id);
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

  // Борлуулалт засах — үлдэгдэл, өр, төлбөрт нөлөөлдөг тул зөвхөн админ.
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTruckSaleDto, @Req() req: any) {
    return this.service.updateSale(id, dto, req.user.id);
  }

  @Delete(':id/void')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  voidSale(
    @Param('id') id: string,
    @Req() req: any,
    @Query('allowWarehouseReturn') allowWarehouseReturn?: string,
  ) {
    return this.service.voidSale(id, req.user.id, allowWarehouseReturn === 'true');
  }
}
