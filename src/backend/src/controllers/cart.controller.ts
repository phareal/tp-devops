import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getCart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, price: true, imageUrl: true, stock: true } } },
        },
      },
    });

    if (!cart) {
      res.json({ status: 'success', data: { cart: { items: [], total: 0 } } });
      return;
    }

    const total = cart.items.reduce((sum, item) => sum + item.quantity * Number(item.product.price), 0);

    res.json({ status: 'success', data: { cart: { ...cart, total } } });
  } catch (error) {
    next(error);
  }
}

export async function addToCart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { productId, quantity = 1 } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) return next(new AppError('Product not found', 404));
    if (product.stock < quantity) return next(new AppError('Insufficient stock', 400));

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) cart = await prisma.cart.create({ data: { userId } });

    const cartItem = await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
      include: { product: { select: { id: true, name: true, price: true } } },
    });

    res.status(201).json({ status: 'success', data: { cartItem } });
  } catch (error) {
    next(error);
  }
}

export async function updateCartItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { quantity } = req.body;
    const { itemId } = req.params;

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return next(new AppError('Cart not found', 404));

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      res.status(204).send();
      return;
    }

    const item = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    res.json({ status: 'success', data: { item } });
  } catch (error) {
    next(error);
  }
}

export async function removeFromCart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.itemId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
