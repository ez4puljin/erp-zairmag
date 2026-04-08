import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() pagination: PaginationDto, @Query('city') city?: string) {
    return this.customersService.findAll(pagination, city);
  }

  @Get('me')
  @Roles(Role.CUSTOMER)
  async getMyProfile(@CurrentUser() user: any) {
    if (!user.customerId) {
      throw new ForbiddenException('No customer profile linked to this user');
    }
    return this.customersService.findOne(user.customerId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CUSTOMER)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.assertAdminOrSelf(user, id);
    return this.customersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.softDelete(id);
  }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.deactivateCustomer(id);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN)
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customersService.activateCustomer(id);
  }

  @Post(':id/credentials')
  @Roles(Role.ADMIN)
  createCredentials(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { email: string; password: string },
  ) {
    return this.customersService.createCredentials(id, body);
  }

  @Post(':id/reset-password')
  @Roles(Role.ADMIN)
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { password: string },
  ) {
    return this.customersService.resetPassword(id, body.password);
  }

  @Get(':id/balance')
  @Roles(Role.ADMIN, Role.CUSTOMER)
  getBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.assertAdminOrSelf(user, id);
    return this.customersService.getBalance(id);
  }

  @Get(':id/orders')
  @Roles(Role.ADMIN, Role.CUSTOMER)
  getOrders(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: any,
  ) {
    this.assertAdminOrSelf(user, id);
    return this.customersService.getOrders(id, pagination);
  }

  private assertAdminOrSelf(user: any, customerId: string): void {
    if (user.role === Role.ADMIN) return;
    if (user.customerId !== customerId) {
      throw new ForbiddenException('You can only access your own data');
    }
  }
}
