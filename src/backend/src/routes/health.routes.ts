import { Router } from 'express';
import { prisma } from '../database/client';

const router = Router();

router.get('/', async (_req, res) => {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      responseTime: `${Date.now() - start}ms`,
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
