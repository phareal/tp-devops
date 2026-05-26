import { Router } from 'express';
import { prisma } from '../database/client';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Admin only — list all users
router.get('/', authorize('ADMIN'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
    res.json({ status: 'success', data: { users } });
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get('/:id', async (req, res, next) => {
  try {
    const requester = (req as any).user;
    if (requester.role !== 'ADMIN' && requester.userId !== req.params.id) {
      return next(new AppError('Forbidden', 403));
    }
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
    if (!user) return next(new AppError('User not found', 404));
    res.json({ status: 'success', data: { user } });
  } catch (error) {
    next(error);
  }
});

export default router;
