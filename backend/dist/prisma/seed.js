"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcrypt = __importStar(require("bcrypt"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding database...');
    await prisma.auditLog.deleteMany();
    await prisma.dailyProductSales.deleteMany();
    await prisma.dailySalesReport.deleteMany();
    await prisma.deliveryRoute.deleteMany();
    await prisma.customerLedgerEntry.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.customerPrice.deleteMany();
    await prisma.tierPrice.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.customerCategory.deleteMany();
    await prisma.user.deleteMany();
    const password = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@icecream.mn',
            password,
            firstName: 'Админ',
            lastName: 'Менежер',
            phone: '99001122',
            role: client_1.Role.ADMIN,
        },
    });
    const warehouseManager = await prisma.user.create({
        data: {
            email: 'warehouse@icecream.mn',
            password,
            firstName: 'Агуулах',
            lastName: 'Менежер',
            phone: '99003344',
            role: client_1.Role.WAREHOUSE_MANAGER,
        },
    });
    const driver1 = await prisma.user.create({
        data: {
            email: 'driver1@icecream.mn',
            password,
            firstName: 'Бат',
            lastName: 'Жолооч',
            phone: '99005566',
            role: client_1.Role.DRIVER,
        },
    });
    const driver2 = await prisma.user.create({
        data: {
            email: 'driver2@icecream.mn',
            password,
            firstName: 'Дорж',
            lastName: 'Жолооч',
            phone: '99007788',
            role: client_1.Role.DRIVER,
        },
    });
    const customerUser1 = await prisma.user.create({
        data: {
            email: 'store1@customer.mn',
            password,
            firstName: 'Болд',
            lastName: 'Дэлгүүр',
            phone: '88001122',
            role: client_1.Role.CUSTOMER,
        },
    });
    const customerUser2 = await prisma.user.create({
        data: {
            email: 'store2@customer.mn',
            password,
            firstName: 'Сүх',
            lastName: 'Дэлгүүр',
            phone: '88003344',
            role: client_1.Role.CUSTOMER,
        },
    });
    const customerUser3 = await prisma.user.create({
        data: {
            email: 'store3@customer.mn',
            password,
            firstName: 'Ганаа',
            lastName: 'Маркет',
            phone: '88005566',
            role: client_1.Role.CUSTOMER,
        },
    });
    const cat1 = await prisma.customerCategory.create({ data: { name: 'БЗД 3-р хороо', type: 'KHOROO' } });
    const cat2 = await prisma.customerCategory.create({ data: { name: 'СБД 1-р хороо', type: 'KHOROO' } });
    const cat3 = await prisma.customerCategory.create({ data: { name: 'ХУД 5-р хороо', type: 'KHOROO' } });
    const cat4 = await prisma.customerCategory.create({ data: { name: 'Дархан сум', type: 'SUM' } });
    const cat5 = await prisma.customerCategory.create({ data: { name: 'Эрдэнэт сум', type: 'SUM' } });
    const customer1 = await prisma.customer.create({
        data: {
            userId: customerUser1.id,
            storeName: 'Болд Дэлгүүр',
            contactName: 'Болд',
            phone: '88001122',
            email: 'store1@customer.mn',
            address: 'БЗД, 3-р хороо, 15-р байр',
            city: 'Улаанбаатар',
            latitude: 47.9184,
            longitude: 106.9177,
            creditLimit: 5000000,
            pricingTier: client_1.PricingTierLevel.GOLD,
            customerCategoryId: cat1.id,
        },
    });
    const customer2 = await prisma.customer.create({
        data: {
            userId: customerUser2.id,
            storeName: 'Сүх Маркет',
            contactName: 'Сүх',
            phone: '88003344',
            email: 'store2@customer.mn',
            address: 'СБД, 8-р хороо, 22-р байр',
            city: 'Улаанбаатар',
            latitude: 47.9212,
            longitude: 106.9054,
            creditLimit: 3000000,
            pricingTier: client_1.PricingTierLevel.SILVER,
            customerCategoryId: cat2.id,
        },
    });
    const customer3 = await prisma.customer.create({
        data: {
            userId: customerUser3.id,
            storeName: 'Ганаа 24/7',
            contactName: 'Ганаа',
            phone: '88005566',
            email: 'store3@customer.mn',
            address: 'ЧД, 5-р хороо, Их дэлгүүр',
            city: 'Улаанбаатар',
            latitude: 47.9145,
            longitude: 106.9167,
            creditLimit: 2000000,
            pricingTier: client_1.PricingTierLevel.STANDARD,
            customerCategoryId: cat3.id,
        },
    });
    const catIceCream = await prisma.category.create({
        data: { name: 'Зайрмаг' },
    });
    const catGelato = await prisma.category.create({
        data: { name: 'Гелато', parentId: catIceCream.id },
    });
    const catBar = await prisma.category.create({
        data: { name: 'Зайрмагны мөс' },
    });
    const catTub = await prisma.category.create({
        data: { name: 'Савтай зайрмаг' },
    });
    const catCone = await prisma.category.create({
        data: { name: 'Дундуур зайрмаг' },
    });
    const supplier1 = await prisma.supplier.create({
        data: { name: 'Монгол Сүү ХХК', contactName: 'Батбаяр', phone: '99112233', email: 'info@mongolsuu.mn', address: 'ХУД, 1-р хороо', city: 'Улаанбаатар' },
    });
    const supplier2 = await prisma.supplier.create({
        data: { name: 'Италиан Гелато', contactName: 'Марко', phone: '99445566', email: 'marco@gelato.it', address: 'СБД, 3-р хороо', city: 'Улаанбаатар' },
    });
    const supplier3 = await prisma.supplier.create({
        data: { name: 'Ариун Зайрмаг ХХК', contactName: 'Сарнай', phone: '99778899', email: 'info@ariun.mn', address: 'БЗД, 7-р хороо', city: 'Улаанбаатар' },
    });
    const products = await Promise.all([
        prisma.product.create({
            data: {
                name: 'Ванилийн зайрмаг 5L',
                sku: 'IC-VAN-5L',
                description: 'Сонгодог ванилийн амттай, 5 литрийн сав',
                categoryId: catTub.id,
                supplierId: supplier1.id,
                unit: client_1.ProductUnit.LITER,
                costPrice: 15000,
                sellingPrice: 25000,
                stockAvailable: 100,
                reorderLevel: 20,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Шоколадны зайрмаг 5L',
                sku: 'IC-CHO-5L',
                description: 'Бельгийн шоколадны амттай, 5 литрийн сав',
                categoryId: catTub.id,
                supplierId: supplier1.id,
                unit: client_1.ProductUnit.LITER,
                costPrice: 18000,
                sellingPrice: 28000,
                stockAvailable: 80,
                reorderLevel: 15,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Гүзээлзгэнэтэй зайрмаг 5L',
                sku: 'IC-STR-5L',
                description: 'Шинэ гүзээлзгэнэтэй, 5 литрийн сав',
                categoryId: catTub.id,
                supplierId: supplier1.id,
                unit: client_1.ProductUnit.LITER,
                costPrice: 20000,
                sellingPrice: 32000,
                stockAvailable: 60,
                reorderLevel: 10,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Манго гелато 1L',
                sku: 'GEL-MAN-1L',
                description: 'Италийн жинхэнэ гелато, манго амт',
                categoryId: catGelato.id,
                supplierId: supplier2.id,
                unit: client_1.ProductUnit.LITER,
                costPrice: 12000,
                sellingPrice: 20000,
                stockAvailable: 50,
                reorderLevel: 10,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Фисташкийн гелато 1L',
                sku: 'GEL-PIS-1L',
                description: 'Италийн жинхэнэ гелато, фисташки амт',
                categoryId: catGelato.id,
                supplierId: supplier2.id,
                unit: client_1.ProductUnit.LITER,
                costPrice: 14000,
                sellingPrice: 22000,
                stockAvailable: 40,
                reorderLevel: 10,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Классик зайрмагны мөс',
                sku: 'BAR-CLA-1',
                description: 'Шоколадаар бүрсэн зайрмагны мөс',
                categoryId: catBar.id,
                supplierId: supplier3.id,
                unit: client_1.ProductUnit.BOX,
                costPrice: 25000,
                sellingPrice: 40000,
                stockAvailable: 200,
                reorderLevel: 30,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Карамелтай зайрмагны мөс',
                sku: 'BAR-CAR-1',
                description: 'Карамелийн бүрхүүлтэй зайрмагны мөс',
                categoryId: catBar.id,
                supplierId: supplier3.id,
                unit: client_1.ProductUnit.BOX,
                costPrice: 28000,
                sellingPrice: 45000,
                stockAvailable: 150,
                reorderLevel: 25,
            },
        }),
        prisma.product.create({
            data: {
                name: 'Дундуур зайрмаг - Ванил',
                sku: 'CONE-VAN-1',
                description: 'Дундуур савтай ванилийн зайрмаг, 12 ширхэгтэй хайрцаг',
                categoryId: catCone.id,
                supplierId: supplier3.id,
                unit: client_1.ProductUnit.BOX,
                costPrice: 18000,
                sellingPrice: 30000,
                stockAvailable: 120,
                reorderLevel: 20,
            },
        }),
    ]);
    await prisma.tierPrice.createMany({
        data: [
            { productId: products[0].id, tier: client_1.PricingTierLevel.GOLD, price: 22500 },
            { productId: products[1].id, tier: client_1.PricingTierLevel.GOLD, price: 25200 },
            { productId: products[5].id, tier: client_1.PricingTierLevel.GOLD, price: 36000 },
            { productId: products[0].id, tier: client_1.PricingTierLevel.SILVER, price: 23750 },
            { productId: products[1].id, tier: client_1.PricingTierLevel.SILVER, price: 26600 },
        ],
    });
    console.log('✅ Seed completed!');
    console.log('');
    console.log('📋 Test accounts:');
    console.log('  Admin:      admin@icecream.mn / password123');
    console.log('  Warehouse:  warehouse@icecream.mn / password123');
    console.log('  Driver 1:   driver1@icecream.mn / password123');
    console.log('  Driver 2:   driver2@icecream.mn / password123');
    console.log('  Customer 1: store1@customer.mn / password123 (Gold tier)');
    console.log('  Customer 2: store2@customer.mn / password123 (Silver tier)');
    console.log('  Customer 3: store3@customer.mn / password123 (Standard tier)');
    console.log('');
    console.log(`📦 Created ${products.length} products in ${5} categories`);
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map