import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/:id', param('id').isUUID(), validate, getProduct);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('category').trim().notEmpty(),
    body('stock').optional().isInt({ min: 0 }),
  ],
  validate,
  createProduct
);

router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isUUID(),
  validate,
  updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isUUID(),
  validate,
  deleteProduct
);

export default router;
