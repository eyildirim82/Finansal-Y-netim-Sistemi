import { logError } from '@/shared/logger';
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

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      logError('Kategori getirilirken hata:', error);
      res.status(500).json({
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
        description,
        color,
        type
      } = req.body;

      const userId = (req as any).user.id;

      // Kategori adı benzersizlik kontrolü
      const existingCategory = await prisma.category.findFirst({
        where: { 
          name,
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
          description,
          color,
          type,
          userId
        }
      });

      res.status(201).json({
        success: true,
        message: 'Kategori başarıyla oluşturuldu',
        data: category
      });
    } catch (error) {
      logError('Kategori oluşturulurken hata:', error);
      res.status(500).json({
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
      const categoryId = parseInt(id);
      const userId = (req as any).user.id;

      const {
        name,
        description,
        color,
        type
      } = req.body;

      // Kategorinin var olup olmadığını kontrol et
      const existingCategory = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: 'Kategori bulunamadı'
        });
      }

      // Sadece kendi kategorilerini güncelleyebilir (admin hariç)
      if (existingCategory.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Bu kategoriyi güncelleme yetkiniz yok'
        });
      }

      // Kategori adı benzersizlik kontrolü (kendi adı hariç)
      const duplicateCategory = await prisma.category.findFirst({
        where: { 
          name,
          userId,
          id: { not: categoryId }
        }
      });

      if (duplicateCategory) {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde bir kategori zaten mevcut'
        });
      }

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: {
          name,
          description,
          color,
          type
        }
      });

      res.json({
        success: true,
        message: 'Kategori başarıyla güncellendi',
        data: category
      });
    } catch (error) {
      logError('Kategori güncellenirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Kategori güncellenirken bir hata oluştu'
      });
    }
  }

  // Kategori sil
  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const categoryId = parseInt(id);
      const userId = (req as any).user.id;

      // Kategorinin var olup olmadığını kontrol et
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

      // Sadece kendi kategorilerini silebilir (admin hariç)
      if (existingCategory.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Bu kategoriyi silme yetkiniz yok'
        });
      }

      // İşlemleri olan kategoriyi silmeye izin verme
      if (existingCategory._count.transactions > 0) {
        return res.status(400).json({
          success: false,
          message: 'İşlemleri olan kategori silinemez'
        });
      }

      await prisma.category.delete({
        where: { id: categoryId }
      });

      res.json({
        success: true,
        message: 'Kategori başarıyla silindi'
      });
    } catch (error) {
      logError('Kategori silinirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Kategori silinirken bir hata oluştu'
      });
    }
  }

  // Kategori istatistikleri
  static async getCategoryStats(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const categoryIdNum = parseInt(categoryId);

      // Kategorinin var olup olmadığını kontrol et
      const category = await prisma.category.findUnique({
        where: { id: categoryIdNum }
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Kategori bulunamadı'
        });
      }

      // Kategori işlem istatistikleri
      const incomeStats = await prisma.transaction.aggregate({
        where: { 
          categoryId: categoryIdNum,
          type: 'INCOME'
        },
        _sum: { amount: true },
        _count: true
      });

      const expenseStats = await prisma.transaction.aggregate({
        where: { 
          categoryId: categoryIdNum,
          type: 'EXPENSE'
        },
        _sum: { amount: true },
        _count: true
      });

      // Aylık trend
      const monthlyStats = await prisma.transaction.groupBy({
        by: ['type'],
        where: { categoryId: categoryIdNum },
        _sum: { amount: true },
        _count: true
      });

      res.json({
        success: true,
        data: {
          category,
          summary: {
            totalIncome: incomeStats._sum.amount || 0,
            totalExpense: expenseStats._sum.amount || 0,
            netAmount: (incomeStats._sum.amount || 0) - (expenseStats._sum.amount || 0),
            incomeCount: incomeStats._count,
            expenseCount: expenseStats._count
          },
          monthlyStats
        }
      });
    } catch (error) {
      logError('Kategori istatistikleri getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Kategori istatistikleri getirilirken bir hata oluştu'
      });
    }
  }

  // Kategori arama (autocomplete için)
  static async searchCategories(req: Request, res: Response) {
    try {
      const { q, type, limit = 10 } = req.query;
      const searchQuery = q as string;
      const limitNum = parseInt(limit as string);
      const userId = (req as any).user.id;

      if (!searchQuery || searchQuery.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const where: any = {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } }
        ]
      };

      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      if (type) {
        where.type = type;
      }

      const categories = await prisma.category.findMany({
        where,
        select: {
          id: true,
          name: true,
          
          type: true
        },
        take: limitNum,
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logError('Kategori arama hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Kategori arama sırasında bir hata oluştu'
      });
    }
  }
} 