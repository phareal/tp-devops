import request from 'supertest';
import app from '../app';
import { prisma } from '../database/client';

let token: string;
let productId: string;

beforeAll(async () => {
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: '@cart-test.com' } } });
  await prisma.product.deleteMany({ where: { name: { contains: 'Cart Test' } } });

  const reg = await request(app).post('/api/auth/register').send({
    email: 'cart@cart-test.com',
    password: 'Password123!',
    firstName: 'Cart',
    lastName: 'User',
  });
  token = reg.body.data.token;

  const product = await prisma.product.create({
    data: {
      name: 'Cart Test Product',
      description: 'Test product for cart tests',
      price: 29.99,
      stock: 50,
      category: 'Test',
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: '@cart-test.com' } } });
  await prisma.product.deleteMany({ where: { name: { contains: 'Cart Test' } } });
  await prisma.$disconnect();
});

describe('GET /api/cart', () => {
  it('returns empty cart for new user', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toEqual([]);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/cart/items', () => {
  it('adds item to cart', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.cartItem.productId).toBe(productId);
    expect(res.body.data.cartItem.quantity).toBe(2);
  });

  it('rejects unknown product', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('rejects quantity exceeding stock', async () => {
    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 9999 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/cart (with items)', () => {
  it('returns cart with items and total', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items.length).toBeGreaterThan(0);
    expect(res.body.data.cart.total).toBeGreaterThan(0);
  });
});

describe('DELETE /api/cart', () => {
  it('clears the cart', async () => {
    const res = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
