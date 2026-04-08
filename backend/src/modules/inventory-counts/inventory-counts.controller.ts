import { Controller, Get, Post, Patch, Body, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { InventoryCountsService } from './inventory-counts.service';
import { CreateInventoryCountDto, UpdateCountItemsDto } from './dto/create-inventory-count.dto';

@Controller('api/inventory-counts')
export class InventoryCountsController {
  constructor(private readonly service: InventoryCountsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  create(@Body() dto: CreateInventoryCountDto, @Req() req: any) {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/report')
  getReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getReport(id);
  }

  @Patch(':id/items')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  updateItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountItemsDto,
  ) {
    return this.service.updateItems(id, dto.items);
  }

  @Post(':id/finalize')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  finalize(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.finalize(id, req.user.id);
  }
}
