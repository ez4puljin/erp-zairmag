import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role, OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto, AdminCreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, CancelOrderDto } from './dto/update-order-status.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ---------------------------------------------------------------------------
  // POST /api/orders/admin - Create order on behalf of customer (ADMIN only)
  // ---------------------------------------------------------------------------
  @Post('admin')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  async adminCreate(
    @Body() dto: AdminCreateOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.createOrder(dto, user.id, dto.customerId);
  }

  // ---------------------------------------------------------------------------
  // POST /api/orders - Create order (CUSTOMER only)
  // ---------------------------------------------------------------------------
  @Post()
  @Roles(Role.CUSTOMER)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { id: string; role: Role; customerId?: string },
  ) {
    if (!user.customerId) {
      throw new BadRequestException(
        'User does not have an associated customer account.',
      );
    }
    return this.ordersService.createOrder(dto, user.id, user.customerId);
  }

  // ---------------------------------------------------------------------------
  // GET /api/orders - List orders (filtered by role)
  // ---------------------------------------------------------------------------
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: OrderStatus,
    @Query('statuses') statuses?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('receiptPrinted') receiptPrinted?: string,
    @CurrentUser() user?: { id: string; role: Role; customerId?: string },
  ) {
    const effectiveCustomerId =
      user?.role === Role.CUSTOMER ? user.customerId : customerId;

    const pagination = { page: page ? Number(page) : 1, limit: limit ? Math.min(Number(limit), 100) : 20 };

    return this.ordersService.findAll(pagination as any, {
      status,
      statuses,
      customerId: effectiveCustomerId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      receiptPrinted,
    });
  }

  // ---------------------------------------------------------------------------
  // GET /api/orders/:id/stock-warnings - Check stock warnings for an order
  // ---------------------------------------------------------------------------
  @Get(':id/stock-warnings')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getStockWarnings(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.getStockWarnings(id);
  }

  // ---------------------------------------------------------------------------
  // GET /api/orders/:id - Get single order
  // ---------------------------------------------------------------------------
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: Role; customerId?: string },
  ) {
    const order = await this.ordersService.findOne(id);

    if (
      user.role === Role.CUSTOMER &&
      order.customerId !== user.customerId
    ) {
      throw new ForbiddenException('You can only view your own orders.');
    }

    return order;
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/orders/:id/status - Update order status
  // ---------------------------------------------------------------------------
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    // Strict state transition validation
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      PENDING: ['APPROVED', 'CANCELLED'],
      APPROVED: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [], // terminal state
      CANCELLED: [], // terminal state
      CANCELLATION_REQUESTED: ['CANCELLED', 'APPROVED', 'SHIPPING'],
    };

    const order = await this.ordersService.findOne(id);
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `"${order.status}" төлөвөөс "${dto.status}" руу шилжих боломжгүй.`,
      );
    }

    switch (dto.status) {
      case 'APPROVED':
        if (user.role === Role.DRIVER) {
          throw new ForbiddenException('Drivers cannot approve orders.');
        }
        return this.ordersService.approveOrder(id, user.id);

      case 'SHIPPING':
        if (user.role === Role.DRIVER) {
          throw new ForbiddenException('Drivers cannot set orders to shipping.');
        }
        if (!dto.driverId) {
          throw new BadRequestException(
            'driverId is required when setting status to SHIPPING.',
          );
        }
        return this.ordersService.updateToShipping(id, dto.driverId, dto.deliveryNotes);

      case 'DELIVERED':
        if (user.role === Role.DRIVER) {
          await this.ordersService.verifyDriverAssignment(id, user.id);
        }
        return this.ordersService.deliverOrder(id, user.id, dto.paymentMethod);

      default:
        throw new BadRequestException(
          `Invalid target status: ${dto.status}. Allowed: APPROVED, SHIPPING, DELIVERED`,
        );
    }
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/orders/:id/receipt-printed - Mark receipt as printed
  // ---------------------------------------------------------------------------
  @Patch(':id/receipt-printed')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER, Role.DRIVER)
  markReceiptPrinted(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.markReceiptPrinted(id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/orders/:id/request-cancel - Customer requests cancellation
  // Customer can only request cancellation, Manager must approve it
  // ---------------------------------------------------------------------------
  @Patch(':id/request-cancel')
  @Roles(Role.CUSTOMER)
  async requestCancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: { id: string; role: Role; customerId?: string },
  ) {
    const order = await this.ordersService.findOne(id);

    if (order.customerId !== user.customerId) {
      throw new ForbiddenException('Та зөвхөн өөрийн захиалгыг цуцлах хүсэлт илгээх боломжтой.');
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.CANCELLATION_REQUESTED
    ) {
      throw new BadRequestException(
        `Энэ статустай захиалга цуцлах боломжгүй: ${order.status}`,
      );
    }

    return this.ordersService.requestCancellation(id, user.id, dto.cancellationNote);
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/orders/:id/approve-cancel - Manager approves cancellation
  // ---------------------------------------------------------------------------
  @Patch(':id/approve-cancel')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async approveCancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.approveCancellation(id, user.id, dto.cancellationNote);
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/orders/:id/reject-cancel - Manager rejects cancellation request
  // ---------------------------------------------------------------------------
  @Patch(':id/reject-cancel')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async rejectCancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.rejectCancellation(id, user.id, dto.cancellationNote);
  }

  // ---------------------------------------------------------------------------
  // PATCH /api/orders/:id/cancel - Direct cancel (ADMIN only - bypass workflow)
  // ---------------------------------------------------------------------------
  @Patch(':id/cancel')
  @Roles(Role.ADMIN)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.ordersService.cancelOrder(id, user.id, dto.cancellationNote);
  }
}
