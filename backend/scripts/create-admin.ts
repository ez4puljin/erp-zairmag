/**
 * Create initial admin user on a fresh database.
 * Safe to run multiple times — skips if admin@icecream.mn already exists.
 *
 * Run: cd backend && npx ts-node scripts/create-admin.ts
 *
 * Default credentials:
 *   Email:    admin@icecream.mn
 *   Password: password123
 */
import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@icecream.mn';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return;
  }

  const password = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email,
      password,
      firstName: 'Админ',
      lastName: 'Менежер',
      phone: '99001122',
      role: Role.ADMIN,
    },
  });

  console.log('Admin user created:');
  console.log(`  Email:    ${admin.email}`);
  console.log(`  Password: password123`);
  console.log(`  Role:     ADMIN`);
  console.log('');
  console.log('Please change the password after first login!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
