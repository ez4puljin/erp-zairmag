import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CashClosingsService } from './cash-closings.service';
import { CreateCashClosingDto } from './dto/create-cash-closing.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/cash-closings')
export class CashClosingsController {
  constructor(private readonly service: CashClosingsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async create(
    @Body() dto: CreateCashClosingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(dto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async findAll(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.service.findAll(dateFrom, dateTo);
  }

  @Get('daily-summary')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async getDailySummary(@Query('date') date: string) {
    return this.service.getDailySummary(date || new Date().toISOString().split('T')[0]);
  }

  @Get('latest')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async getLatest() {
    return this.service.getLatest();
  }
}
