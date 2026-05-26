import { Router } from 'express';
import { body } from 'express-validator';
import { createOrder, getOrders, getOrder, updateOrderStatus } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.post('/', createOrder);
router.get('/:id', getOrder);

router.patch(
  '/:id/status',
  authorize('ADMIN'),
  [body('status').isIn(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'])],
  validate,
  updateOrderStatus
);

export default router;
