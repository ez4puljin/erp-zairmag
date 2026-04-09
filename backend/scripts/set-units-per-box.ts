/**
 * Set random units-per-box values for all products that have unitsPerBox <= 1.
 * Common ice cream box sizes: 6, 8, 10, 12, 16, 20, 24
 *
 * Run: npx ts-node scripts/set-units-per-box.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BOX_SIZES = [6, 8, 10, 12, 16, 20, 24];

function pickBoxSize() {
  return BOX_SIZES[Math.floor(Math.random() * BOX_SIZES.length)];
}

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, unitsPerBox: true },
  });
  console.log(`Found ${products.length} products`);

  let updated = 0;
  for (const p of products) {
    const newSize = pickBoxSize();
    await prisma.product.update({
      where: { id: p.id },
      data: { unitsPerBox: newSize },
    });
    updated++;
    console.log(`  [${updated}/${products.length}] ${p.name}: ${p.unitsPerBox} → ${newSize} ш/хайрцаг`);
  }

  console.log(`\n✓ Updated ${updated} products with random box sizes`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
