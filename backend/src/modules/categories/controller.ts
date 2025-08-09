import { logError } from '../../shared/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

export class CategoryController {
  // Tüm kategorileri getir
  static async getAllCategories(req: Request, res: Response) {
    try {
      const { type, search } = req.query;
      const userId = (req as any).user.id;

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      if (type) {
        where.type = type;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json(categories);
    } catch (error) {
      logError('Kategoriler getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Kategoriler getirilirken bir hata oluştu'
      });
    }
  }

  // Tek kategori getir
  static async getCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const categoryId = id;

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          transactions: {
            select: {
              id: true,
              type: true,
              amount: true,
              date: true,
              description: true
            },
            orderBy: { date: 'desc' },
            take: 10
          },
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori bulunamadı'
        });
      }

      return res.json({
        success: true,
        data: category
      });
    } catch (error) {
      logError('Kategori getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Kategori getirilirken bir hata oluştu'
      });
    }
  }

  // Yeni kategori oluştur
  static async createCategory(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validasyon hatası',
          errors: errors.array()
        });
      }

      const {
        name,
        type
      } = req.body;

      const userId = (req as any).user.id;

      // Kategori adı benzersizlik kontrolü
      const existingCategory = await prisma.category.findFirst({
        where: { 
          name,
          type,
          userId
        }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde bir kategori zaten mevcut'
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          type,
          userId
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Kategori başarıyla oluşturuldu',
        data: category
      });

    } catch (error) {
      logError('Kategori oluşturma hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Kategori oluşturulurken bir hata oluştu'
      });
    }
  }

  // Kategori güncelle
  static async updateCategory(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validasyon hatası',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const categoryId = id;
      const {
        name,
        type
      } = req.body;

      const userId = (req as any).user.id;

      // Kategori var mı kontrol et
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Kategori bulunamadı'
        });
      }

      // Kullanıcı yetkisi kontrol et
      if (existingCategory.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bu kategoriyi düzenleme yetkiniz yok'
        });
      }

      // Yeni isim benzersizlik kontrolü
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name,
          type,
          userId,
          id: { not: categoryId }
        }
      });

      if (duplicateCategory) {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde başka bir kategori zaten mevcut'
        });
      }

      const updatedCategory = await prisma.category.update({
        where: { id: categoryId },
        data: {
          name,
          type
        }
      });

      return res.json({
        success: true,
        message: 'Kategori başarıyla güncellendi',
        data: updatedCategory
      });

    } catch (error) {
      logError('Kategori güncelleme hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Kategori güncellenirken bir hata oluştu'
      });
    }
  }

  // Kategori sil
  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const categoryId = id;
      const userId = (req as any).user.id;

      // Kategori var mı kontrol et
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Kategori bulunamadı'
        });
      }

      // Kullanıcı yetkisi kontrol et
      if (existingCategory.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Bu kategoriyi silme yetkiniz yok'
        });
      }

      // Kategoriye bağlı işlem var mı kontrol et
      if (existingCategory._count.transactions > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu kategoriye bağlı işlemler bulunduğu için silinemez'
        });
      }

      await prisma.category.delete({
        where: { id: categoryId }
      });

      return res.json({
        success: true,
        message: 'Kategori başarıyla silindi'
      });

    } catch (error) {
      logError('Kategori silme hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Kategori silinirken bir hata oluştu'
      });
    }
  }

  // Kategori istatistikleri
  static async getCategoryStats(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const categoryIdNum = id;
      const userId = (req as any).user.id;

      // Kategori var mı kontrol et
      const category = await prisma.category.findUnique({
        where: { id: categoryIdNum }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori bulunamadı'
        });
      }

      // Gelir istatistikleri
      const incomeStats = await prisma.transaction.aggregate({
        where: {
          categoryId: categoryIdNum,
          type: 'INCOME',
          userId
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // Gider istatistikleri
      const expenseStats = await prisma.transaction.aggregate({
        where: {
          categoryId: categoryIdNum,
          type: 'EXPENSE',
          userId
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // Son işlemler
      const recentTransactions = await prisma.transaction.findMany({
        where: { categoryId: categoryIdNum },
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          customer: true
        }
      });

      const stats = {
        category,
        summary: {
          totalIncome: incomeStats._sum?.amount || 0,
          totalExpense: expenseStats._sum?.amount || 0,
          netAmount: (incomeStats._sum?.amount || 0) - (expenseStats._sum?.amount || 0),
          incomeCount: incomeStats._count?.id || 0,
          expenseCount: expenseStats._count?.id || 0,
          totalCount: (incomeStats._count?.id || 0) + (expenseStats._count?.id || 0)
        },
        recentTransactions
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logError('Kategori istatistikleri hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Kategori istatistikleri alınırken bir hata oluştu'
      });
    }
  }

  // Kategori arama
  static async searchCategories(req: Request, res: Response) {
    try {
      const { q, type, page = 1, limit = 20 } = req.query;
      const userId = (req as any).user.id;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const where: any = { userId };

      if (q) {
        where.name = {
          contains: q as string,
          mode: 'insensitive'
        };
      }

      if (type) {
        where.type = type;
      }

      const categories = await prisma.category.findMany({
        where,
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      });

      const total = await prisma.category.count({ where });

      return res.json({
        success: true,
        data: {
          categories,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error) {
      logError('Kategori arama hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Kategori arama sırasında bir hata oluştu'
      });
    }
  }
} 