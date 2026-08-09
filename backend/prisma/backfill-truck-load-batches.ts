/**
 * Ачилтын багцын түүхийг нөөцийн хөдөлгөөнөөс сэргээнэ.
 *
 * TruckLoadBatch нэмэхээс өмнө нэмэлт ачилт нь TruckLoadItem.loadedQty-г
 * нэмдэг байсан тул "хэзээ юуг нэмсэн" гэдэг тусдаа хадгалагддаггүй байв.
 * Гэвч ачилт болгонд TRANSFER_OUT хөдөлгөөн үүсдэг тул тэднийг
 * (locationCode + секунд хүртэлх хугацаа)-гаар бүлэглэн багцыг сэргээж болно.
 *
 * Дахин ажиллуулахад аюулгүй: багц аль хэдийн байгаа ачилтыг алгасна.
 *
 * Ажиллуулах: cd backend && npx ts-node prisma/backfill-truck-load-batches.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const loads = await prisma.truckLoad.findMany({
    include: { items: true, batches: { select: { id: true } } },
    orderBy: { loadNumber: 'asc' },
  });

  let created = 0;
  let skipped = 0;

  for (const load of loads) {
    if (load.batches.length > 0) {
      skipped++;
      continue;
    }

    const movements = await prisma.stockMovement.findMany({
      where: {
        reason: 'TRANSFER_OUT',
        locationCode: `TRUCK-${load.loadNumber}`,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Нэг ачилтын үйлдлээр үүссэн хөдөлгөөнүүд ижил хормын мөчид бичигддэг.
    const groups = new Map<string, typeof movements>();
    for (const m of movements) {
      const key = m.createdAt.toISOString().slice(0, 19);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    }

    if (groups.size === 0) {
      // Хөдөлгөөн олдоогүй бол одоогийн барааг анхны ачилт болгон бүртгэнэ.
      if (load.items.length === 0) continue;
      await prisma.truckLoadBatch.create({
        data: {
          truckLoadId: load.id,
          sequence: 1,
          note: 'Анхны ачилт (сэргээсэн)',
          createdById: load.createdById,
          createdAt: load.createdAt,
          items: {
            create: load.items.map((i) => ({ productId: i.productId, quantity: i.loadedQty })),
          },
        },
      });
      created++;
      console.log(`#${load.loadNumber}: хөдөлгөөн алга — 1 багц (одоогийн барааг ашиглав)`);
      continue;
    }

    let seq = 0;
    for (const [ts, group] of [...groups.entries()].sort()) {
      seq++;
      // Нэг багцад нэг бараа давхардвал нэгтгэнэ.
      const byProduct = new Map<string, number>();
      for (const m of group) {
        byProduct.set(m.productId, (byProduct.get(m.productId) ?? 0) + Math.abs(m.quantity));
      }
      await prisma.truckLoadBatch.create({
        data: {
          truckLoadId: load.id,
          sequence: seq,
          note: seq === 1 ? 'Анхны ачилт' : 'Нэмэлт ачилт',
          createdById: group[0].createdById,
          createdAt: new Date(`${ts}Z`),
          items: {
            create: [...byProduct.entries()].map(([productId, quantity]) => ({ productId, quantity })),
          },
        },
      });
      created++;
    }
    console.log(`#${load.loadNumber}: ${seq} багц сэргээв`);
  }

  console.log(`\nҮүсгэсэн багц: ${created}, аль хэдийн байсан ачилт: ${skipped}`);

  // Сэргээсэн багцын нийлбэр нь loadedQty-тай таарч байгаа эсэхийг шалгана.
  console.log('\n=== ТУЛГАЛТ ===');
  let ok = true;
  const check = await prisma.truckLoad.findMany({
    include: { items: { include: { product: true } }, batches: { include: { items: true } } },
    orderBy: { loadNumber: 'asc' },
  });
  for (const load of check) {
    const fromBatches = new Map<string, number>();
    for (const b of load.batches) {
      for (const bi of b.items) {
        fromBatches.set(bi.productId, (fromBatches.get(bi.productId) ?? 0) + bi.quantity);
      }
    }
    for (const item of load.items) {
      const sum = fromBatches.get(item.productId) ?? 0;
      const good = sum === item.loadedQty;
      if (!good) ok = false;
      console.log(
        `  ${good ? 'OK  ' : 'ЗӨРҮҮ'} #${load.loadNumber} ${item.product.name}: ` +
        `loadedQty=${item.loadedQty}, багцаас=${sum}`,
      );
    }
  }
  console.log(ok ? '\nБҮГД ТААРСАН' : '\nЗӨРҮҮ ИЛЭРСЭН');
}

main()
  .catch((e) => { console.error('АЛДАА:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
