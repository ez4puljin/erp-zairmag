import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { BankStatementsService } from './bank-statements.service';
import {
  QueryStatementsDto,
  CalendarQueryDto,
  UpdateTransactionDto,
  UpdateConfigDto,
  CrossAccountDto,
  UpdateCrossAccountDto,
  SearchCustomersDto,
} from './dto/bank-statement.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/bank-statements')
@Roles(Role.ADMIN)
export class BankStatementsController {
  constructor(private readonly service: BankStatementsService) {}

  // --- Тохиргоо ---
  // Тодорхой замууд нь :id-аас өмнө бүртгэгдэх ёстой, эс бөгөөс "config"
  // гэдгийг ID гэж үзэж ParseUUIDPipe алдаа өгнө.

  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.service.updateConfig(dto);
  }

  @Get('config/cross-accounts')
  listCrossAccounts() {
    return this.service.listCrossAccounts();
  }

  @Post('config/cross-accounts')
  createCrossAccount(@Body() dto: CrossAccountDto) {
    return this.service.createCrossAccount(dto);
  }

  @Patch('config/cross-accounts/:id')
  updateCrossAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrossAccountDto,
  ) {
    return this.service.updateCrossAccount(id, dto);
  }

  @Delete('config/cross-accounts/:id')
  deleteCrossAccount(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCrossAccount(id);
  }

  // --- Харилцагч хайх ---

  @Get('customers/search')
  searchCustomers(@Query() query: SearchCustomersDto) {
    return this.service.searchCustomers(query.q ?? '', query.limit);
  }

  // --- Хуанли ---

  @Get('calendar')
  calendar(@Query() query: CalendarQueryDto) {
    return this.service.calendar(query.year, query.month);
  }

  // --- Хуулга ---

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('Файл оруулна уу');
    return this.service.upload(file.buffer, file.originalname, userId);
  }

  @Get()
  findAll(@Query() query: QueryStatementsDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/fill-descriptions')
  fillDescriptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.fillDescriptions(id);
  }

  @Post(':id/swap-debit-credit')
  swapDebitCredit(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.swapDebitCredit(id);
  }

  @Patch(':id/transactions/:txnId')
  updateTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txnId', ParseUUIDPipe) txnId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.updateTransaction(id, txnId, dto);
  }
}
