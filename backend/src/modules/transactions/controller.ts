import { logError } from '@/shared/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

export class TransactionController {
  // Tüm işlemleri getir (filtreleme ve sayfalama ile)
  static async getAllTransactions(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        categoryId,
        customerId,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        search
      } = req.query;

      const pageNum = Number(page);
      const limitNum = Number(limit);

      if (
        !Number.isInteger(pageNum) ||
        !Number.isInteger(limitNum) ||
        pageNum <= 0 ||
        limitNum <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Sayfa ve limit pozitif tamsayı olmalıdır'
        });
      }

      const skip = (pageNum - 1) * limitNum;

      // Filtreleme koşulları
      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (categoryId) {
        where.categoryId = categoryId as string;
      }

      if (customerId) {
        where.customerId = customerId as string;
      }

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lte = new Date(endDate as string);
        }
      }

      if (minAmount || maxAmount) {
        where.amount = {};
        if (minAmount) {
          where.amount.gte = parseFloat(minAmount as string);
        }
        if (maxAmount) {
          where.amount.lte = parseFloat(maxAmount as string);
        }
      }

      if (search) {
        where.OR = [
          { description: { contains: search as string, mode: 'insensitive' } },
          { customer: { name: { contains: search as string, mode: 'insensitive' } } },
          { category: { name: { contains: search as string, mode: 'insensitive' } } }
        ];
      }

      // Toplam kayıt sayısı
      const total = await prisma.transaction.count({ where });

      // İşlemleri getir
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              code: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limitNum
      });

      res.json({
        success: true,
        transactions,
        total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logError('İşlemler getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'İşlemler getirilirken bir hata oluştu'
      });
    }
  }

  // Tek işlem getir
  static async getTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transactionId = id;

      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              code: true,
              address: true,
              type: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'İşlem bulunamadı'
        });
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logError('İşlem getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'İşlem getirilirken bir hata oluştu'
      });
    }
  }

  // Yeni işlem oluştur
  static async createTransaction(req: Request, res: Response) {
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
        type,
        amount,
        description,
        date,
        categoryId,
        customerId,
        reference,
        notes
      } = req.body;

      const userId = (req as any).user.id;

      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          categoryId: categoryId ? categoryId : null,
          customerId: customerId ? customerId : null,
          reference,
          notes,
          userId
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'İşlem başarıyla oluşturuldu',
        data: transaction
      });
    } catch (error) {
      logError('İşlem oluşturulurken hata:', error);
      res.status(500).json({
        success: false,
        message: 'İşlem oluşturulurken bir hata oluştu'
      });
    }
  }

  // İşlem güncelle
  static async updateTransaction(req: Request, res: Response) {
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
      const transactionId = id;
      const userId = (req as any).user.id;

      const {
        type,
        amount,
        description,
        date,
        categoryId,
        customerId,
        reference,
        notes
      } = req.body;

      // İşlemin var olup olmadığını kontrol et
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'İşlem bulunamadı'
        });
      }

      // Sadece kendi işlemlerini güncelleyebilir (admin hariç)
      if (existingTransaction.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Bu işlemi güncelleme yetkiniz yok'
        });
      }

      const transaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          type,
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          categoryId: categoryId ? categoryId : null,
          customerId: customerId ? customerId : null,
          reference,
          notes
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'İşlem başarıyla güncellendi',
        data: transaction
      });
    } catch (error) {
      logError('İşlem güncellenirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'İşlem güncellenirken bir hata oluştu'
      });
    }
  }

  // İşlem sil
  static async deleteTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const transactionId = id;
      const userId = (req as any).user.id;

      // İşlemin var olup olmadığını kontrol et
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'İşlem bulunamadı'
        });
      }

      // Sadece kendi işlemlerini silebilir (admin hariç)
      if (existingTransaction.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Bu işlemi silme yetkiniz yok'
        });
      }

      await prisma.transaction.delete({
        where: { id: transactionId }
      });

      res.json({
        success: true,
        message: 'İşlem başarıyla silindi'
      });
    } catch (error) {
      logError('İşlem silinirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'İşlem silinirken bir hata oluştu'
      });
    }
  }

  // İşlem istatistikleri
  static async getTransactionStats(req: Request, res: Response) {
    try {
      const { startDate, endDate, customerId, categoryId } = req.query;

      const where: any = {};

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lte = new Date(endDate as string);
        }
      }

      if (customerId) {
        where.customerId = customerId as string;
      }

      if (categoryId) {
        where.categoryId = categoryId as string;
      }

      // Toplam gelir ve gider
      const incomeStats = await prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
        _count: true
      });

      const expenseStats = await prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true
      });

      // Kategori bazında istatistikler
      const categoryStats = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: { amount: true },
        _count: true
      });

      // Müşteri bazında istatistikler
      const customerStats = await prisma.transaction.groupBy({
        by: ['customerId', 'type'],
        where,
        _sum: { amount: true },
        _count: true
      });

      // Aylık trend
      const monthlyTrend = await prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true
      });

      res.json({
        success: true,
        data: {
          summary: {
            totalIncome: incomeStats._sum.amount || 0,
            totalExpense: expenseStats._sum.amount || 0,
            netAmount: (incomeStats._sum.amount || 0) - (expenseStats._sum.amount || 0),
            incomeCount: incomeStats._count,
            expenseCount: expenseStats._count
          },
          categoryStats,
          customerStats,
          monthlyTrend
        }
      });
    } catch (error) {
      logError('İşlem istatistikleri getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'İşlem istatistikleri getirilirken bir hata oluştu'
      });
    }
  }

  // Toplu işlem silme
  static async deleteMultipleTransactions(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      const userId = (req as any).user.id;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli ID listesi gerekli'
        });
      }

      // İşlemlerin var olup olmadığını ve yetki kontrolü
      const transactions = await prisma.transaction.findMany({
        where: { id: { in: ids } }
      });

      if (transactions.length !== ids.length) {
        return res.status(404).json({
          success: false,
          message: 'Bazı işlemler bulunamadı'
        });
      }

      // Yetki kontrolü (admin değilse sadece kendi işlemlerini silebilir)
      if ((req as any).user.role !== 'ADMIN') {
        const unauthorizedTransactions = transactions.filter(t => t.userId !== userId);
        if (unauthorizedTransactions.length > 0) {
          return res.status(403).json({
            success: false,
            message: 'Bazı işlemleri silme yetkiniz yok'
          });
        }
      }

      await prisma.transaction.deleteMany({
        where: { id: { in: ids } }
      });

      res.json({
        success: true,
        message: `${ids.length} işlem başarıyla silindi`
      });
    } catch (error) {
      logError('Toplu işlem silme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'İşlemler silinirken bir hata oluştu'
      });
    }
  }
} 