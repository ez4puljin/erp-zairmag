import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments')
  @Roles(Role.ADMIN)
  recordPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.recordPayment(dto, userId);
  }

  @Get('payments')
  @Roles(Role.ADMIN)
  findAll(
    @Query() pagination: PaginationDto,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
  ) {
    return this.paymentsService.findAll(pagination, customerId, status, method);
  }

  @Get('customers/:id/payments')
  @Roles(Role.ADMIN, Role.CUSTOMER)
  findByCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: any,
  ) {
    if (user.role !== Role.ADMIN && user.customerId !== id) {
      throw new ForbiddenException('You can only access your own payments');
    }
    return this.paymentsService.findByCustomer(id, pagination);
  }
}
