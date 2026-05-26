import request from 'supertest';
import app from '../app';
import { prisma } from '../database/client';

let userToken: string;
let userId: string;
let adminToken: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@user-test.com' } } });

  const reg = await request(app).post('/api/auth/register').send({
    email: 'regular@user-test.com',
    password: 'Password123!',
    firstName: 'Regular',
    lastName: 'User',
  });
  userToken = reg.body.data.token;
  userId = reg.body.data.user.id;

  // Create admin
  const adminReg = await request(app).post('/api/auth/register').send({
    email: 'admin@user-test.com',
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'User',
  });
  adminToken = adminReg.body.data.token;
  await prisma.user.update({ where: { id: adminReg.body.data.user.id }, data: { role: 'ADMIN' } });
  // Re-login to get token with ADMIN role
  const login = await request(app).post('/api/auth/login').send({
    email: 'admin@user-test.com',
    password: 'Password123!',
  });
  adminToken = login.body.data.token;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@user-test.com' } } });
  await prisma.$disconnect();
});

describe('GET /api/users/:id', () => {
  it('user can get own profile', async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('regular@user-test.com');
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app)
      .get('/api/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('rejects user accessing other profile', async () => {
    const otherReg = await request(app).post('/api/auth/register').send({
      email: 'other@user-test.com',
      password: 'Password123!',
      firstName: 'Other',
      lastName: 'User',
    });
    const res = await request(app)
      .get(`/api/users/${otherReg.body.data.user.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/users (admin only)', () => {
  it('admin can list all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });

  it('non-admin cannot list users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });
});
