"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
function ean13Checksum(d12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const n = Number(d12[i]);
        sum += i % 2 === 0 ? n : n * 3;
    }
    return (10 - (sum % 10)) % 10;
}
function generateBarcode() {
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
    const used = new Set();
    let updated = 0;
    for (const p of products) {
        let code;
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
//# sourceMappingURL=regenerate-barcodes.js.map