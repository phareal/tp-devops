import { Router } from 'express';
import { body } from 'express-validator';
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getCart);
router.delete('/', clearCart);

router.post(
  '/items',
  [
    body('productId').isUUID(),
    body('quantity').optional().isInt({ min: 1 }),
  ],
  validate,
  addToCart
);

router.patch(
  '/items/:itemId',
  [body('quantity').isInt({ min: 0 })],
  validate,
  updateCartItem
);

router.delete('/items/:itemId', removeFromCart);

export default router;
