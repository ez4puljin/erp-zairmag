/**
 * Дотоод хэрэглээний 13 оронтой баркод үүсгэнэ (EAN-13, "200" угтвар = дотоод хэрэглээ).
 *
 * ЗӨВХӨН баркодгүй бараанд нэмнэ — бодит баркодыг хэзээ ч дарж бичихгүй.
 * (Өмнө нь энэ скрипт бүх барааны sku-г дарж бичдэг байсан. Бараа материалын
 *  жинхэнэ баркод орж ирсэн тул тэр зан үйл нь дата устгах эрсдэлтэй болсон.)
 *
 * Run: npx ts-node scripts/regenerate-barcodes.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function ean13Checksum(d12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(d12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function generateBarcode(): string {
  const prefix = '200';
  let body = '';
  for (let i = 0; i < 9; i++) {
    body += Math.floor(Math.random() * 10).toString();
  }
  const d12 = prefix + body;
  return d12 + ean13Checksum(d12);
}

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, barcodes: { select: { code: true } } },
  });
  const missing = products.filter((p) => p.barcodes.length === 0);
  console.log(`Бараа: ${products.length}, баркодгүй: ${missing.length}`);

  if (missing.length === 0) {
    console.log('Бүх бараа баркодтой — өөрчлөх зүйл алга.');
    return;
  }

  // Аль хэдийн ашиглагдаж буй кодуудыг давхардуулахгүйн тулд цуглуулна.
  const used = new Set<string>(
    (await prisma.productBarcode.findMany({ select: { code: true } })).map((b) => b.code),
  );

  let added = 0;
  for (const p of missing) {
    let code: string;
    do {
      code = generateBarcode();
    } while (used.has(code));
    used.add(code);

    await prisma.productBarcode.create({ data: { productId: p.id, code } });
    added++;
    console.log(`  [${added}/${missing.length}] ${p.name} → ${code}`);
  }

  console.log(`\n✓ ${added} бараанд шинэ баркод нэмэв (бусдыг хөндөөгүй)`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
