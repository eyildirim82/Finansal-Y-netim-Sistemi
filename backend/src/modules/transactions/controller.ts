import { logError } from '../../shared/logger';
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

      return res.json({
        success: true,
        data: {
          transactions,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error) {
      logError('İşlemler getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'İşlemler getirilirken bir hata oluştu'
      });
    }
  }

  // Tek işlem getir
  static async getTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id },
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
        }
      });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'İşlem bulunamadı'
        });
      }

      return res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      logError('İşlem getirilirken hata:', error);
      return res.status(500).json({
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
        customerId
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

      return res.status(201).json({
        success: true,
        message: 'İşlem başarıyla oluşturuldu',
        data: transaction
      });
    } catch (error) {
      logError('İşlem oluşturulurken hata:', error);
      return res.status(500).json({
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
      const {
        type,
        amount,
        description,
        date,
        categoryId,
        customerId
      } = req.body;

      // İşlemin var olup olmadığını kontrol et
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'İşlem bulunamadı'
        });
      }

      const updatedTransaction = await prisma.transaction.update({
        where: { id },
        data: {
          type,
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          categoryId: categoryId ? categoryId : null,
          customerId: customerId ? customerId : null
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

      return res.json({
        success: true,
        message: 'İşlem başarıyla güncellendi',
        data: updatedTransaction
      });

    } catch (error) {
      logError('İşlem güncellenirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'İşlem güncellenirken bir hata oluştu'
      });
    }
  }

  // İşlem sil
  static async deleteTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // İşlemin var olup olmadığını kontrol et
      const existingTransaction = await prisma.transaction.findUnique({
        where: { id }
      });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message: 'İşlem bulunamadı'
        });
      }

      await prisma.transaction.delete({
        where: { id }
      });

      return res.json({
        success: true,
        message: 'İşlem başarıyla silindi'
      });

    } catch (error) {
      logError('İşlem silinirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'İşlem silinirken bir hata oluştu'
      });
    }
  }

  // İşlem istatistikleri
  static async getTransactionStats(req: Request, res: Response) {
    try {
      const { startDate, endDate, type } = req.query;
      const userId = (req as any).user.id;

      const where: any = { userId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          where.date.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.date.lte = new Date(endDate as string);
        }
      }

      if (type) {
        where.type = type;
      }

      // Toplam istatistikler
      const totalStats = await prisma.transaction.aggregate({
        where,
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // Gelir istatistikleri
      const incomeStats = await prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // Gider istatistikleri
      const expenseStats = await prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // Kategori bazında istatistikler
      const categoryStats = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where,
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // Müşteri bazında istatistikler
      const customerStats = await prisma.transaction.groupBy({
        by: ['customerId'],
        where,
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      const stats = {
        summary: {
          totalTransactions: totalStats._count?.id || 0,
          totalAmount: totalStats._sum?.amount || 0,
          totalIncome: incomeStats._sum?.amount || 0,
          totalExpense: expenseStats._count?.id || 0,
          netAmount: (incomeStats._sum?.amount || 0) - (expenseStats._sum?.amount || 0)
        },
        categoryStats,
        customerStats
      };

      return res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logError('İşlem istatistikleri hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'İşlem istatistikleri alınırken bir hata oluştu'
      });
    }
  }

  // Çoklu işlem silme
  static async deleteMultipleTransactions(req: Request, res: Response) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli işlem ID\'leri gerekli'
        });
      }

      // İşlemlerin var olup olmadığını kontrol et
      const existingTransactions = await prisma.transaction.findMany({
        where: {
          id: { in: ids }
        }
      });

      if (existingTransactions.length !== ids.length) {
        return res.status(400).json({
          success: false,
          message: 'Bazı işlemler bulunamadı'
        });
      }

      // İşlemleri sil
      await prisma.transaction.deleteMany({
        where: {
          id: { in: ids }
        }
      });

      return res.json({
        success: true,
        message: `${ids.length} işlem başarıyla silindi`
      });

    } catch (error) {
      logError('Çoklu işlem silme hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'İşlemler silinirken bir hata oluştu'
      });
    }
  }
} 