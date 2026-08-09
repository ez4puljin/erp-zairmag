/**
 * Банкны хуулгын урсгалыг бодит сервисээр туршина: файл оруулах → гүйлгээ засах
 * → статистик шалгах → цэвэрлэх. Туршилтын өгөгдлөө өөрөө устгана.
 *
 *   npx ts-node -T scripts/test-bank-statement.ts <хуулгын-файл>
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BankStatementsService } from '../src/modules/bank-statements/bank-statements.service';

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Хуулгын файлын замыг өгнө үү');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const service = app.get(BankStatementsService);
  let statementId: string | undefined;

  try {
    const buffer = fs.readFileSync(file);
    const stmt = await service.upload(buffer, path.basename(file));
    statementId = stmt.id;

    console.log('── Оруулсан хуулга ──');
    console.log({
      accountNumber: stmt.accountNumber,
      currency: stmt.currency,
      dateFrom: stmt.dateFrom,
      dateTo: stmt.dateTo,
      txnCount: stmt.txnCount,
      feeCount: stmt.feeCount,
      totalCredit: stmt.totalCredit,
      totalDebit: stmt.totalDebit,
      filledCount: stmt.filledCount,
      missing: stmt.missing,
    });

    const settlement = stmt.transactions.find((t) => t.isSettlement);
    const fee = stmt.transactions.find((t) => t.isFee);
    console.log('\n── Автомат бөглөлт ──');
    console.log('ПОС:', settlement && {
      desc: settlement.customDescription,
      action: settlement.action,
      partner: settlement.partnerName,
    });
    console.log('Шимтгэл:', fee && {
      desc: fee.customDescription,
      action: fee.action,
    });

    // Гүйлгээ засах
    const target = stmt.transactions.find((t) => t.credit > 0 && !t.isSettlement)!;
    await service.updateTransaction(stmt.id, target.id, {
      partnerName: 'Сүх Маркет',
      partnerAccount: '120101',
      customDescription: 'Дэлгүүрийн төлбөр',
      action: 'close',
    });

    // Утга нөхөх
    const filled = await service.fillDescriptions(stmt.id);
    console.log('\n── Утга нөхсөн мөр ──', filled);

    const after = await service.findOne(stmt.id);
    console.log('── Нөхсөний дараа ──', {
      filledCount: after.filledCount,
      missing: after.missing,
    });

    // Дебит/кредит солих, дараа нь буцаах
    await service.swapDebitCredit(stmt.id);
    const swapped = await service.findOne(stmt.id);
    await service.swapDebitCredit(stmt.id);
    const restored = await service.findOne(stmt.id);
    console.log('\n── Дебит/Кредит солих ──', {
      эх: { credit: stmt.totalCredit, debit: stmt.totalDebit },
      солисон: { credit: swapped.totalCredit, debit: swapped.totalDebit },
      буцаасан: { credit: restored.totalCredit, debit: restored.totalDebit },
    });

    // Хуанли
    const [y, m] = (stmt.dateFrom ?? '2026-08-01').split('-').map(Number);
    const cal = await service.calendar(y, m);
    console.log('\n── Хуанли ──', JSON.stringify(cal.days));

    // Харилцагч хайх
    console.log('\n── Харилцагч хайлт "марк" ──',
      (await service.searchCustomers('марк')).map((c) => c.storeName));
  } finally {
    if (statementId) {
      await service.remove(statementId);
      console.log('\nТуршилтын хуулгыг устгав.');
    }
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
