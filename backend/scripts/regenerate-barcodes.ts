/**
 * Regenerate 13-digit fictitious barcodes for all products.
 * Prefix "200" = internal/private use (like EAN-13 restricted range).
 * Followed by 10 random digits, last digit is EAN-13 checksum.
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
  const products = await prisma.product.findMany({ select: { id: true, name: true, sku: true } });
  console.log(`Found ${products.length} products`);

  const used = new Set<string>();
  let updated = 0;

  for (const p of products) {
    let code: string;
    do {
      code = generateBarcode();
    } while (used.has(code));
    used.add(code);

    await prisma.product.update({
      where: { id: p.id },
      data: { sku: code },
    });
    updated++;
    console.log(`  [${updated}/${products.length}] ${p.name} → ${code}`);
  }

  console.log(`\n✓ Updated ${updated} products with new 13-digit barcodes`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
