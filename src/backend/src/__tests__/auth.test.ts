import request from 'supertest';
import app from '../app';
import { prisma } from '../database/client';

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'user1@test.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    const payload = { email: 'dup@test.com', password: 'Password123!', firstName: 'A', lastName: 'B' };
    await request(app).post('/api/auth/register').send(payload);
    const res = await request(app).post('/api/auth/register').send(payload);
    expect(res.status).toBe(409);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test2@test.com',
      password: '123',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'Password123!',
      firstName: 'A',
      lastName: 'B',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@test.com',
      password: 'Password123!',
      firstName: 'Login',
      lastName: 'User',
    });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'me@test.com',
      password: 'Password123!',
      firstName: 'Me',
      lastName: 'User',
    });
    token = res.body.data.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@test.com');
  });

  it('rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });
});
