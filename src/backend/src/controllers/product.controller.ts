import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/client';
import { AppError } from '../middleware/errorHandler';

export async function getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, search, page = '1', limit = '12', minPrice, maxPrice } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isActive: true };

    if (category) where.category = category as string;
    if (search) where.name = { contains: search as string, mode: 'insensitive' };
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice as string);
      if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);

    res.json({
      status: 'success',
      data: { products, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || !product.isActive) return next(new AppError('Product not found', 404));
    res.json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, price, stock, imageUrl, category } = req.body;
    const product = await prisma.product.create({
      data: { name, description, price, stock: stock ?? 0, imageUrl, category },
    });
    res.status(201).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
    });
    res.json({ status: 'success', data: { categories: categories.map(c => c.category) } });
  } catch (error) {
    next(error);
  }
}
