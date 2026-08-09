import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TruckLoadsService } from './truck-loads.service';
import { CreateTruckLoadDto } from './dto/create-truck-load.dto';
import { UpdateTruckLoadDto } from './dto/update-truck-load.dto';
import { SubmitReturnDto } from './dto/submit-return.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/truck-loads')
export class TruckLoadsController {
  constructor(private readonly service: TruckLoadsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  create(@Body() dto: CreateTruckLoadDto, @Req() req: any) {
    // Жолооч зөвхөн ӨӨРТӨӨ ачилт үүсгэнэ — өөр жолоочийн нэр дээр үүсгэхийг зөвшөөрөхгүй.
    const payload =
      req.user.role === Role.DRIVER ? { ...dto, driverId: req.user.id } : dto;
    return this.service.create(payload, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTruckLoadDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/dispatch')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  dispatch(@Param('id') id: string, @Req() req: any) {
    // Жолооч зөвхөн өөрийн ачилтыг илгээнэ.
    const onlyDriverId = req.user.role === Role.DRIVER ? req.user.id : undefined;
    return this.service.dispatch(id, req.user.id, onlyDriverId);
  }

  // Жолооч өдрийн дундуур агуулахад эргэж ирээд өөрөө нэмэлт ачилт
  // бүртгэдэг тул DRIVER-т нээлттэй. Бүртгэл нь ачилтын түүхэнд тусдаа
  // багц болж үлддэг.
  @Post(':id/add-items')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  addItems(@Param('id') id: string, @Body() body: { items: { productId: string; loadedQty: number }[] }, @Req() req: any) {
    return this.service.addItems(id, body.items, req.user.id);
  }

  @Post(':id/submit-return')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  submitReturn(@Param('id') id: string, @Body() dto: SubmitReturnDto, @Req() req: any) {
    return this.service.submitReturn(id, dto, req.user.id);
  }

  @Post(':id/verify-return')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  verifyReturn(@Param('id') id: string, @Req() req: any) {
    return this.service.verifyReturn(id, req.user.id);
  }

  // Driver requests completion (no quantities). Status -> COMPLETION_REQUESTED
  @Post(':id/request-completion')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  requestCompletion(@Param('id') id: string, @Req() req: any) {
    return this.service.requestCompletion(id, req.user.id);
  }

  // Admin approves: enters return quantities per item, stock returns to warehouse
  @Post(':id/approve-completion')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  approveCompletion(@Param('id') id: string, @Body() dto: SubmitReturnDto, @Req() req: any) {
    return this.service.approveCompletion(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancel(id, req.user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  findAll(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      driverId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('driver/active')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  getDriverActiveLoad(@Req() req: any) {
    const role = req.user.role;
    // Admin/Manager can see any dispatched load; Driver sees only their own
    if (role === 'ADMIN' || role === 'WAREHOUSE_MANAGER') {
      return this.service.getAnyActiveLoad();
    }
    return this.service.getDriverActiveLoad(req.user.id);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
