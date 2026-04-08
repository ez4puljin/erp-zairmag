import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('api/drivers')
@UseGuards(RolesGuard)
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  findAll() {
    return this.driversService.findAll();
  }

  @Get('active-routes')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getActiveRoutes() {
    return this.driversService.getActiveRoutes();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findOne(id);
  }

  @Get(':id/deliveries')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  getDeliveries(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date?: string,
  ) {
    return this.driversService.getDriverDeliveries(id, date);
  }

  @Patch(':id/deliveries/:orderId')
  @Roles(Role.DRIVER, Role.ADMIN)
  updateDelivery(
    @Param('id', ParseUUIDPipe) driverId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateDeliveryDto,
  ) {
    return this.driversService.updateDelivery(driverId, orderId, dto);
  }

  @Post()
  @Roles(Role.ADMIN)
  createDriver(@Body() body: { firstName: string; lastName: string; phone: string; email: string; password: string }) {
    return this.driversService.createDriver(body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  updateDriver(@Param('id') id: string, @Body() body: { firstName?: string; lastName?: string; phone?: string; email?: string }) {
    return this.driversService.updateDriver(id, body);
  }

  @Post(':id/toggle-active')
  @Roles(Role.ADMIN)
  toggleDriverActive(@Param('id') id: string) {
    return this.driversService.toggleDriverActive(id);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.driversService.resetPassword(id, body.password);
  }
}
