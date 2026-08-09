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
  SetBankAccountDto,
  PostFeesDto,
} from './dto/bank-statement.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/bank-statements')
@Roles(Role.ADMIN)
export class BankStatementsController {
  constructor(private readonly service: BankStatementsService) {}

  // Тодорхой замууд нь :id-аас өмнө бүртгэгдэх ёстой — эс бөгөөс "config"
  // гэдгийг ID гэж үзэж ParseUUIDPipe алдаа өгнө.

  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.service.updateConfig(dto);
  }

  @Get('calendar')
  calendar(@Query() query: CalendarQueryDto) {
    return this.service.calendar(query.year, query.month);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser('id') userId: string) {
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

  @Patch(':id/bank-account')
  setBankAccount(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetBankAccountDto) {
    return this.service.setBankAccount(id, dto.bankAccountId ?? null);
  }

  @Post(':id/fill-descriptions')
  fillDescriptions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.fillDescriptions(id);
  }

  @Post(':id/swap-debit-credit')
  swapDebitCredit(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.swapDebitCredit(id);
  }

  @Post(':id/post-all')
  postAll(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.postAll(id, userId);
  }

  @Post(':id/post-fees')
  postFees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostFeesDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.postFees(id, userId, dto.expenseCategoryId);
  }

  @Post(':id/unpost-fees')
  unpostFees(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unpostFees(id);
  }

  @Patch(':id/transactions/:txnId')
  updateTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txnId', ParseUUIDPipe) txnId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.updateTransaction(id, txnId, dto);
  }

  @Post(':id/transactions/:txnId/post')
  postTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txnId', ParseUUIDPipe) txnId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.postTransaction(id, txnId, userId);
  }

  @Post(':id/transactions/:txnId/unpost')
  unpostTransaction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txnId', ParseUUIDPipe) txnId: string,
  ) {
    return this.service.unpostTransaction(id, txnId);
  }
}
