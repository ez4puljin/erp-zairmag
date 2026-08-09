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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
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
  findAll(@Query() query: QueryPaymentDto) {
    return this.paymentsService.findAll(query);
  }

  // Засах/устгах нь өр болон дансны үлдэгдлийг хөдөлгөдөг тул зөвхөн админ.
  @Patch('payments/:id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(id, dto);
  }

  @Delete('payments/:id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(id);
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
