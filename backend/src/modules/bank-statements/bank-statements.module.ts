import { Module } from '@nestjs/common';
import { BankStatementsController } from './bank-statements.controller';
import { BankStatementsService } from './bank-statements.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { ExpensesModule } from '../expenses/expenses.module';

/**
 * Хуулгын мөрийг бүртгэхдээ төлбөр/зардлыг өөрсдийнх нь сервисээр үүсгэдэг
 * тул тэдгээр модулиудыг импортолно — дансны үлдэгдэл, харилцагчийн өр,
 * авлагын дэвтрийн логикийг давхардуулахгүйн тулд.
 */
@Module({
  imports: [PrismaModule, PaymentsModule, ExpensesModule],
  controllers: [BankStatementsController],
  providers: [BankStatementsService],
})
export class BankStatementsModule {}
