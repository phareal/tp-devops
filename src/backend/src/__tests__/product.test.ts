import request from 'supertest';
import app from '../app';
import { prisma } from '../database/client';
import bcrypt from 'bcryptjs';

let adminToken: string;
let customerToken: string;
let productId: string;

beforeAll(async () => {
  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin.products@test.com',
      password: await bcrypt.hash('Password123!', 12),
      firstName: 'Admin',
      lastName: 'Test',
      role: 'ADMIN',
    },
  });
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: 'admin.products@test.com',
    password: 'Password123!',
  });
  adminToken = adminLogin.body.data.token;

  // Customer
  await prisma.user.create({
    data: {
      email: 'customer.products@test.com',
      password: await bcrypt.hash('Password123!', 12),
      firstName: 'Customer',
      lastName: 'Test',
    },
  });
  const custLogin = await request(app).post('/api/auth/login').send({
    email: 'customer.products@test.com',
    password: 'Password123!',
  });
  customerToken = custLogin.body.data.token;
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { name: { contains: '[TEST]' } } });
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
  await prisma.$disconnect();
});

describe('GET /api/products', () => {
  it('returns paginated product list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data.products).toBeInstanceOf(Array);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/products?category=Informatique');
    expect(res.status).toBe(200);
  });

  it('searches by name', async () => {
    const res = await request(app).get('/api/products?search=test');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/products (admin only)', () => {
  it('creates product as admin', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '[TEST] Product 1',
        description: 'Test description',
        price: 99.99,
        stock: 10,
        category: 'Test',
      });
    expect(res.status).toBe(201);
    productId = res.body.data.product.id;
  });

  it('rejects product creation by customer', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: '[TEST] P2', description: 'D', price: 10, category: 'C' });
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated product creation', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: '[TEST] P3', description: 'D', price: 10, category: 'C' });
    expect(res.status).toBe(401);
  });

  it('validates required fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/:id', () => {
  it('returns product by id', async () => {
    if (!productId) return;
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.product.id).toBe(productId);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/products/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/products/:id', () => {
  it('updates product as admin', async () => {
    if (!productId) return;
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 99 });
    expect(res.status).toBe(200);
    expect(res.body.data.product.stock).toBe(99);
  });
});

describe('DELETE /api/products/:id', () => {
  it('soft-deletes product as admin', async () => {
    if (!productId) return;
    const res = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });
});
