import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/client';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';

export async function createOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Cart is empty', 400));
    }

    // Check stock and compute total
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return next(new AppError(`Insufficient stock for ${item.product.name}`, 400));
      }
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.quantity * Number(item.product.price),
      0
    );

    // Create order + update stock in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          totalAmount,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          },
        },
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
      });

      // Decrease stock
      await Promise.all(
        cart.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    res.status(201).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
}

export async function getOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const orders = await prisma.order.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ status: 'success', data: { orders } });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (!order) return next(new AppError('Order not found', 404));
    if (!isAdmin && order.userId !== userId) return next(new AppError('Forbidden', 403));

    res.json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
}
