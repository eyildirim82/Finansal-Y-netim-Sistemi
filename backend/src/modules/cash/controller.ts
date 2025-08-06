import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CashController {
  // Kasa akışı oluşturma
  async createCashFlow(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const {
        date,
        openingBalance,
        closingBalance,
        totalIncome,
        totalExpense,
        difference,
        notes
      } = req.body;

      // Aynı tarih için kayıt var mı kontrol et
      const existingFlow = await prisma.cashFlow.findFirst({
        where: {
          userId,
          date: new Date(date)
        }
      });

      if (existingFlow) {
        return res.status(409).json({ error: 'Bu tarih için zaten kasa kaydı var' });
      }

      const cashFlow = await prisma.cashFlow.create({
        data: {
          userId,
          date: new Date(date),
          openingBalance: Number(openingBalance),
          closingBalance: Number(closingBalance),
          totalIncome: Number(totalIncome) || 0,
          totalExpense: Number(totalExpense) || 0,
          difference: Number(difference) || 0,
          notes
        }
      });

      res.json({
        success: true,
        cashFlow
      });

    } catch (error) {
      console.error('Kasa akışı oluşturma hatası:', error);
      res.status(500).json({ error: 'Kasa akışı oluşturulamadı' });
    }
  }

  // Kasa akışları listesi
  async getCashFlows(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { userId };
      
      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const cashFlows = await prisma.cashFlow.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit)
      });

      const total = await prisma.cashFlow.count({ where });

      res.json({
        cashFlows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Kasa akışları listesi hatası:', error);
      res.status(500).json({ error: 'Kasa akışları alınamadı' });
    }
  }

  // Güncel kasa durumu
  async getCurrentBalance(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Bugünün kasa kaydı
      const todayFlow = await prisma.cashFlow.findFirst({
        where: {
          userId,
          date: today
        }
      });

      // Son kasa kaydı
      const lastFlow = await prisma.cashFlow.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
      });

      // Bugünkü işlemler (kasa işlemleri)
      const todayTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          date: {
            gte: today
          },
          type: 'CASH' // Kasa işlemleri
        }
      });

      const totalIncome = todayTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = todayTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const currentBalance = {
        today: todayFlow?.closingBalance || 0,
        lastRecord: lastFlow?.closingBalance || 0,
        todayIncome: totalIncome,
        todayExpense: totalExpense,
        calculatedBalance: (todayFlow?.openingBalance || lastFlow?.closingBalance || 0) + totalIncome - totalExpense,
        hasTodayRecord: !!todayFlow
      };

      res.json(currentBalance);

    } catch (error) {
      console.error('Kasa durumu hatası:', error);
      res.status(500).json({ error: 'Kasa durumu alınamadı' });
    }
  }

  // Kasa sayımı
  async countCash(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { actualAmount, notes } = req.body;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Bugünün kasa kaydı
      let todayFlow = await prisma.cashFlow.findFirst({
        where: {
          userId,
          date: today
        }
      });

      if (!todayFlow) {
        // Bugün için kayıt yoksa oluştur
        const lastFlow = await prisma.cashFlow.findFirst({
          where: { userId },
          orderBy: { date: 'desc' }
        });

        todayFlow = await prisma.cashFlow.create({
          data: {
            userId,
            date: today,
            openingBalance: lastFlow?.closingBalance || 0,
            closingBalance: Number(actualAmount),
            totalIncome: 0,
            totalExpense: 0,
            difference: Number(actualAmount) - (lastFlow?.closingBalance || 0),
            notes: `Kasa sayımı: ${notes || ''}`
          }
        });
      } else {
        // Mevcut kaydı güncelle
        const difference = Number(actualAmount) - todayFlow.closingBalance;
        
        todayFlow = await prisma.cashFlow.update({
          where: { id: todayFlow.id },
          data: {
            closingBalance: Number(actualAmount),
            difference,
            notes: `Kasa sayımı güncelleme: ${notes || ''}`
          }
        });
      }

      res.json({
        success: true,
        cashFlow: todayFlow,
        difference: todayFlow.difference
      });

    } catch (error) {
      console.error('Kasa sayımı hatası:', error);
      res.status(500).json({ error: 'Kasa sayımı yapılamadı' });
    }
  }

  // Kasa raporu
  async getCashReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date();
      const end = endDate ? new Date(endDate as string) : new Date();
      
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const cashFlows = await prisma.cashFlow.findMany({
        where: {
          userId,
          date: {
            gte: start,
            lte: end
          }
        },
        orderBy: { date: 'asc' }
      });

      // İstatistikler
      const totalIncome = cashFlows.reduce((sum, flow) => sum + flow.totalIncome, 0);
      const totalExpense = cashFlows.reduce((sum, flow) => sum + flow.totalExpense, 0);
      const totalDifference = cashFlows.reduce((sum, flow) => sum + flow.difference, 0);
      const averageDailyBalance = cashFlows.length > 0 
        ? cashFlows.reduce((sum, flow) => sum + flow.closingBalance, 0) / cashFlows.length 
        : 0;

      // Günlük trend
      const dailyTrend = cashFlows.map(flow => ({
        date: flow.date,
        openingBalance: flow.openingBalance,
        closingBalance: flow.closingBalance,
        totalIncome: flow.totalIncome,
        totalExpense: flow.totalExpense,
        difference: flow.difference
      }));

      const report = {
        period: {
          start: start,
          end: end
        },
        summary: {
          totalDays: cashFlows.length,
          totalIncome,
          totalExpense,
          netCashFlow: totalIncome - totalExpense,
          totalDifference,
          averageDailyBalance
        },
        dailyTrend,
        cashFlows
      };

      res.json(report);

    } catch (error) {
      console.error('Kasa raporu hatası:', error);
      res.status(500).json({ error: 'Kasa raporu oluşturulamadı' });
    }
  }

  // Kasa işlemi ekleme (nakit giriş/çıkış)
  async addCashTransaction(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { amount, description, categoryId, date } = req.body;

      if (!amount || !description) {
        return res.status(400).json({ error: 'Tutar ve açıklama gerekli' });
      }

      // Kasa işlemi oluştur
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          type: 'CASH',
          amount: Number(amount),
          description,
          date: date ? new Date(date) : new Date(),
          categoryId: categoryId || null,
          currency: 'TRY'
        }
      });

      // Bugünün kasa kaydını güncelle
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let todayFlow = await prisma.cashFlow.findFirst({
        where: {
          userId,
          date: today
        }
      });

      if (todayFlow) {
        const newTotalIncome = Number(amount) > 0 ? todayFlow.totalIncome + Number(amount) : todayFlow.totalIncome;
        const newTotalExpense = Number(amount) < 0 ? todayFlow.totalExpense + Math.abs(Number(amount)) : todayFlow.totalExpense;
        const newClosingBalance = todayFlow.closingBalance + Number(amount);

        await prisma.cashFlow.update({
          where: { id: todayFlow.id },
          data: {
            totalIncome: newTotalIncome,
            totalExpense: newTotalExpense,
            closingBalance: newClosingBalance
          }
        });
      }

      res.json({
        success: true,
        transaction
      });

    } catch (error) {
      console.error('Kasa işlemi ekleme hatası:', error);
      res.status(500).json({ error: 'Kasa işlemi eklenemedi' });
    }
  }

  // Kasa işlemleri listesi
  async getCashTransactions(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 20, startDate, endDate } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        userId,
        type: 'CASH'
      };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true
        },
        orderBy: { date: 'desc' },
        skip,
        take: Number(limit)
      });

      const total = await prisma.transaction.count({ where });

      res.json({
        transactions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      console.error('Kasa işlemleri listesi hatası:', error);
      res.status(500).json({ error: 'Kasa işlemleri alınamadı' });
    }
  }
} 