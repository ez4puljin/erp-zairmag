import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ---------------------------------------------------------------------------
  // POST /api/invoices/generate/:orderId - Generate invoice from delivered order
  // ---------------------------------------------------------------------------
  @Post('generate/:orderId')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  generate(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.invoicesService.generate(orderId);
  }

  // ---------------------------------------------------------------------------
  // GET /api/invoices - List invoices (paginated)
  // ---------------------------------------------------------------------------
  @Get()
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.findAll(pagination, search);
  }

  // ---------------------------------------------------------------------------
  // GET /api/invoices/:id - Get single invoice
  // ---------------------------------------------------------------------------
  @Get(':id')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }
}
