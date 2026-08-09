/**
 * Банкны хуулгын бүтэн урсгалыг бодит сервисээр туршина:
 *   оруулах → данс холбох → харилцагч/ангилал сонгох → бүртгэх →
 *   харилцагчийн өр, дансны үлдэгдэл өөрчлөгдсөнийг шалгах → буцаах →
 *   бүх зүйл сэргэсэнийг шалгах → цэвэрлэх.
 *
 *   npx ts-node -T scripts/test-bank-statement.ts <хуулгын-файл>
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BankStatementsService } from '../src/modules/bank-statements/bank-statements.service';
import { PrismaService } from '../src/prisma/prisma.service';

const n = (v: unknown) => Number(v);

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Хуулгын файлын замыг өгнө үү');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const service = app.get(BankStatementsService);
  const prisma = app.get(PrismaService);
  let statementId: string | undefined;
  let tempCategoryId: string | undefined;
  const TEMP_CATEGORY = '__туршилт__';

  try {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
    const account = await prisma.bankAccount.findFirstOrThrow();
    const customer = await prisma.customer.findFirstOrThrow();
    // Зардлын ангилал байхгүй бол туршилтын хугацаанд түр үүсгэнэ.
    let category = await prisma.expenseCategory.findFirst();
    if (!category) {
      category = await prisma.expenseCategory.create({ data: { name: TEMP_CATEGORY } });
      tempCategoryId = category.id;
    }

    const before = {
      debt: n(customer.outstandingDebt),
      balance: n(account.currentBalance),
    };
    console.log('── Эхний төлөв ──', {
      харилцагч: customer.storeName,
      өр: before.debt,
      данс: account.accountNumber,
      үлдэгдэл: before.balance,
    });

    const stmt = await service.upload(fs.readFileSync(file), path.basename(file), admin.id);
    statementId = stmt.id;
    console.log('\n── Оруулсан ──', {
      данс: stmt.accountNumber,
      холбогдсонДанс: stmt.bankAccountId ? 'тийм' : 'үгүй',
      гүйлгээ: stmt.txnCount,
      орлого: stmt.totalCredit,
      зарлага: stmt.totalDebit,
    });

    // Хуулгын данс автоматаар олдоогүй бол гараар холбоно.
    if (!stmt.bankAccountId) await service.setBankAccount(stmt.id, account.id);

    // Тайлбар нөхөж, мөр бүрд харилцагч/ангилал онооно.
    await service.fillDescriptions(stmt.id);
    let current = await service.findOne(stmt.id);
    for (const t of current.transactions) {
      await service.updateTransaction(
        stmt.id,
        t.id,
        t.isIncome ? { customerId: customer.id } : { expenseCategoryId: category.id },
      );
    }

    current = await service.findOne(stmt.id);
    console.log('\n── Бөглөсний дараа ──', {
      бэлэн: current.readyCount,
      дутуу: current.missing,
    });

    // Шимтгэлийг нийлбэрээр нь нэг зардал болгож хаана.
    const withFees = await service.postFees(stmt.id, admin.id, category.id);
    console.log('\n── Шимтгэл ──', {
      мөр: withFees.fee.count,
      нийлбэр: withFees.fee.total,
      бүртгэсэн: withFees.fee.posted,
      зардлынДугаар: withFees.fee.expenseNumber,
    });

    // Бүгдийг бүртгэнэ.
    const result = await service.postAll(stmt.id, admin.id);
    console.log('\n── Бүртгэсэн ──', {
      бүртгэсэн: result.posted,
      алгассан: result.skipped,
      төлөв: `${result.postedCount}/${result.txnCount}`,
    });

    const afterPost = {
      debt: n((await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).outstandingDebt),
      balance: n((await prisma.bankAccount.findUniqueOrThrow({ where: { id: account.id } })).currentBalance),
    };
    const expectedDebt = before.debt - current.totalCredit;
    // Дансны үлдэгдэлд шимтгэлийн нэгдсэн зардал ч нөлөөлнө.
    const expectedBalance =
      before.balance + current.totalCredit - current.totalDebit - withFees.fee.total;
    console.log('── Нөлөө ──', {
      өр: `${before.debt} → ${afterPost.debt} (хүлээсэн ${expectedDebt})`,
      үлдэгдэл: `${before.balance} → ${afterPost.balance} (хүлээсэн ${expectedBalance})`,
      тулгалт:
        afterPost.debt === expectedDebt && afterPost.balance === expectedBalance ? 'ТААРСАН' : 'ЗӨРҮҮТЭЙ',
    });

    // Үүссэн бичилтүүд.
    const posted = await service.findOne(stmt.id);
    console.log('\n── Үүссэн бичилт ──', {
      төлбөр: posted.transactions.filter((t) => t.paymentId).length,
      зардал: posted.transactions.filter((t) => t.expenseId).length,
    });

    // Бүгдийг буцаана.
    for (const t of posted.transactions.filter((x) => x.postedAt && !x.isFee)) {
      await service.unpostTransaction(stmt.id, t.id);
    }
    await service.unpostFees(stmt.id);
    const afterUnpost = {
      debt: n((await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).outstandingDebt),
      balance: n((await prisma.bankAccount.findUniqueOrThrow({ where: { id: account.id } })).currentBalance),
    };
    console.log('\n── Буцаасны дараа ──', {
      өр: `${afterUnpost.debt} (эх ${before.debt})`,
      үлдэгдэл: `${afterUnpost.balance} (эх ${before.balance})`,
      сэргэсэн:
        afterUnpost.debt === before.debt && afterUnpost.balance === before.balance ? 'ТИЙМ' : 'ҮГҮЙ',
    });

    // Буцаасны дараа энэ хуулганд ямар ч холбоос үлдэх ёсгүй.
    const leftovers = await prisma.bankTransaction.count({
      where: {
        statementId: stmt.id,
        OR: [{ paymentId: { not: null } }, { expenseId: { not: null } }, { postedAt: { not: null } }],
      },
    });
    const feeLink = await prisma.bankStatement.count({
      where: { id: stmt.id, feeExpenseId: { not: null } },
    });
    console.log('Үлдсэн холбоос:', leftovers + feeLink);
  } finally {
    if (statementId) {
      await service.remove(statementId);
      console.log('\nТуршилтын хуулгыг устгав.');
    }
    if (tempCategoryId) {
      await prisma.expenseCategory.delete({ where: { id: tempCategoryId } });
      console.log('Түр ангиллыг устгав.');
    }
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
