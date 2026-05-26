import request from 'supertest';
import app from '../app';
import { prisma } from '../database/client';

let token: string;
let productId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@order-test.com' } } });
  await prisma.product.deleteMany({ where: { name: { contains: 'Order Test' } } });

  const reg = await request(app).post('/api/auth/register').send({
    email: 'order@order-test.com',
    password: 'Password123!',
    firstName: 'Order',
    lastName: 'User',
  });
  token = reg.body.data.token;

  const product = await prisma.product.create({
    data: {
      name: 'Order Test Product',
      description: 'Product for order tests',
      price: 49.99,
      stock: 100,
      category: 'Test',
    },
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { contains: '@order-test.com' } } });
  await prisma.product.deleteMany({ where: { name: { contains: 'Order Test' } } });
  await prisma.$disconnect();
});

describe('POST /api/orders (empty cart)', () => {
  it('rejects order with empty cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app).post('/api/orders');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/orders (with cart)', () => {
  beforeAll(async () => {
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, quantity: 2 });
  });

  it('creates order from cart', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.data.order.totalAmount).toBeDefined();
    expect(res.body.data.order.items.length).toBe(1);
    expect(res.body.data.order.status).toBe('PENDING');
  });

  it('cart is empty after order', async () => {
    const res = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toEqual([]);
  });
});

describe('GET /api/orders', () => {
  it('returns user orders', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
    expect(res.body.data.orders.length).toBeGreaterThan(0);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders/:id', () => {
  let orderId: string;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);
    orderId = res.body.data.orders[0]?.id;
  });

  it('returns specific order', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.order.id).toBe(orderId);
  });

  it('returns 404 for unknown order', async () => {
    const res = await request(app)
      .get('/api/orders/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
