import { Module } from '@nestjs/common';
import { BankStatementsController } from './bank-statements.controller';
import { BankStatementsService } from './bank-statements.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BankStatementsController],
  providers: [BankStatementsService],
})
export class BankStatementsModule {}
