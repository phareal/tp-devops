'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const products = [
  { name: 'MacBook Pro 14"', description: 'Apple M3 Pro chip, 18GB RAM, 512GB SSD. Professional laptop for developers.', price: 1999.99, category: 'Electronics', stock: 15, imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' },
  { name: 'iPhone 15 Pro', description: 'Titanium design, A17 Pro chip, 256GB. Pro camera system with 48MP main.', price: 1199.99, category: 'Electronics', stock: 30, imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400' },
  { name: 'Sony WH-1000XM5', description: 'Industry-leading noise cancellation, 30hr battery. Premium wireless headphones.', price: 349.99, category: 'Electronics', stock: 25, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
  { name: 'Nike Air Max 270', description: 'Max Air unit in heel for all-day comfort. Breathable mesh upper.', price: 129.99, category: 'Shoes', stock: 50, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
  { name: 'Adidas Ultraboost 22', description: 'Boost midsole returns energy with every stride. Primeknit+ upper adapts to foot.', price: 189.99, category: 'Shoes', stock: 40, imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400' },
  { name: "Levi's 501 Original Jeans", description: 'The original straight fit. 100% cotton denim, button fly.', price: 79.99, category: 'Clothing', stock: 100, imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400' },
  { name: 'The North Face Puffer Jacket', description: '550-fill down insulation. Water-repellent finish. Perfect for cold weather.', price: 249.99, category: 'Clothing', stock: 20, imageUrl: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400' },
  { name: 'Kindle Paperwhite', description: '6.8" display, 16GB storage, adjustable warm light. Waterproof e-reader.', price: 139.99, category: 'Electronics', stock: 35, imageUrl: 'https://images.unsplash.com/photo-1592424002053-21f369ad7fdb?w=400' },
  { name: 'Dyson V15 Detect', description: 'Laser dust detection, HEPA filtration, 60min runtime. Cordless vacuum.', price: 749.99, category: 'Home', stock: 8, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
  { name: 'Instant Pot Duo 7-in-1', description: '7 appliances in one: pressure cooker, slow cooker, rice cooker, steamer, saute, yogurt maker, warmer.', price: 89.99, category: 'Home', stock: 45, imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' },
  { name: 'Yoga Mat Premium', description: 'Non-slip 6mm thick mat with alignment lines. Eco-friendly TPE material.', price: 49.99, category: 'Sports', stock: 60, imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400' },
  { name: 'LEGO Technic Set', description: 'Advanced building set for ages 10+. 1200 pieces with motorized functions.', price: 119.99, category: 'Toys', stock: 22, imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400' },
];

async function main() {
  console.log('Seeding database...');

  // Promote admin user to ADMIN role
  const adminUpdate = await prisma.user.updateMany({
    where: { email: 'admin@ecommerce.com' },
    data: { role: 'ADMIN' },
  });
  console.log(`Promoted ${adminUpdate.count} user(s) to ADMIN`);

  // Get existing product names
  const existing = await prisma.product.findMany({ select: { name: true } });
  const existingNames = new Set(existing.map(p => p.name));
  const toCreate = products.filter(p => !existingNames.has(p.name));

  if (toCreate.length > 0) {
    await prisma.product.createMany({ data: toCreate });
    console.log(`Created ${toCreate.length} products`);
  } else {
    console.log('Products already seeded');
  }

  const count = await prisma.product.count();
  console.log(`Total products in DB: ${count}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
