import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      password: await bcrypt.hash('Admin1234!', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  // Demo customer
  await prisma.user.upsert({
    where: { email: 'customer@ecommerce.com' },
    update: {},
    create: {
      email: 'customer@ecommerce.com',
      password: await bcrypt.hash('Customer1234!', 12),
      firstName: 'Jean',
      lastName: 'Dupont',
    },
  });

  // Products
  const products = [
    { name: 'MacBook Pro 14"', description: 'Laptop Apple M3 Pro, 18GB RAM', price: 2199.99, stock: 15, category: 'Informatique' },
    { name: 'iPhone 15 Pro', description: 'Smartphone Apple, 256GB, Titanium', price: 1199.99, stock: 30, category: 'Téléphonie' },
    { name: 'AirPods Pro 2', description: 'Écouteurs sans fil avec ANC', price: 279.99, stock: 50, category: 'Audio' },
    { name: 'iPad Air M2', description: 'Tablette 11 pouces, 256GB WiFi', price: 899.99, stock: 20, category: 'Informatique' },
    { name: 'Samsung 4K OLED 65"', description: 'TV OLED 65 pouces, 120Hz', price: 1799.99, stock: 8, category: 'TV & Vidéo' },
    { name: 'Sony WH-1000XM5', description: 'Casque sans fil ANC premium', price: 349.99, stock: 25, category: 'Audio' },
    { name: 'Dell XPS 15', description: 'Laptop Intel i9, RTX 4070, 32GB', price: 2499.99, stock: 10, category: 'Informatique' },
    { name: 'Google Pixel 8', description: 'Smartphone Android, 128GB', price: 699.99, stock: 20, category: 'Téléphonie' },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  console.log('Seed complete!');
  console.log('Admin: admin@ecommerce.com / Admin1234!');
  console.log('Customer: customer@ecommerce.com / Customer1234!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
