import { logError } from '@/shared/logger';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReportController {
  // Dashboard özet raporu
  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req as any).user.id;

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
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

      // Toplam müşteri sayısı
      const customerCount = await prisma.customer.count({
        where: (req as any).user.role !== 'ADMIN' ? { userId } : {}
      });

      // Toplam işlem sayısı
      const transactionCount = await prisma.transaction.count({ where });

      // Bu ay vs geçen ay karşılaştırması
      const currentMonth = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const currentMonthIncome = await prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'INCOME',
          date: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            lte: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
          }
        },
        _sum: { amount: true }
      });

      const lastMonthIncome = await prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'INCOME',
          date: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lte: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
          }
        },
        _sum: { amount: true }
      });

      const currentMonthExpense = await prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'EXPENSE',
          date: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            lte: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
          }
        },
        _sum: { amount: true }
      });

      const lastMonthExpense = await prisma.transaction.aggregate({
        where: {
          ...where,
          type: 'EXPENSE',
          date: {
            gte: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
            lte: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
          }
        },
        _sum: { amount: true }
      });

      res.json({
        totalIncome: incomeStats._sum.amount || 0,
        totalExpense: expenseStats._sum.amount || 0,
        netAmount: (incomeStats._sum.amount || 0) - (expenseStats._sum.amount || 0),
        totalTransactions: transactionCount,
        customerCount,
        monthlyComparison: {
          currentMonth: {
            income: currentMonthIncome._sum.amount || 0,
            expense: currentMonthExpense._sum.amount || 0,
            net: (currentMonthIncome._sum.amount || 0) - (currentMonthExpense._sum.amount || 0)
          },
          lastMonth: {
            income: lastMonthIncome._sum.amount || 0,
            expense: lastMonthExpense._sum.amount || 0,
            net: (lastMonthIncome._sum.amount || 0) - (lastMonthExpense._sum.amount || 0)
          }
        }
      });
    } catch (error) {
      logError('Dashboard özeti getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Dashboard özeti getirilirken bir hata oluştu'
      });
    }
  }

  // Aylık trend raporu
  static async getMonthlyTrend(req: Request, res: Response) {
    try {
      const { year } = req.query;
      const userId = (req as any).user.id;

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      let yearNum: number | undefined;
      if (year !== undefined) {
        yearNum = Number(year);
        if (!Number.isInteger(yearNum) || yearNum <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Yıl pozitif tamsayı olmalıdır'
          });
        }
        where.date = {
          gte: new Date(yearNum, 0, 1),
          lte: new Date(yearNum, 11, 31)
        };
      }

      // Aylık gelir ve gider verileri
      const monthlyData = await prisma.$queryRaw`
        SELECT 
          EXTRACT(MONTH FROM date) as month,
          type,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM "Transaction"
        WHERE ${where.userId ? `"userId" = ${userId}` : '1=1'}
        ${yearNum ? `AND EXTRACT(YEAR FROM date) = ${yearNum}` : ''}
        GROUP BY EXTRACT(MONTH FROM date), type
        ORDER BY month, type
      `;

      // 12 aylık veri yapısı oluştur
      const monthlyTrend = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(2024, i, 1).toLocaleDateString('tr-TR', { month: 'long' }),
        income: 0,
        expense: 0,
        net: 0
      }));

      // Verileri doldur
      (monthlyData as any[]).forEach((item: any) => {
        const monthIndex = item.month - 1;
        if (item.type === 'INCOME') {
          monthlyTrend[monthIndex].income = parseFloat(item.total_amount);
        } else {
          monthlyTrend[monthIndex].expense = parseFloat(item.total_amount);
        }
        monthlyTrend[monthIndex].net = monthlyTrend[monthIndex].income - monthlyTrend[monthIndex].expense;
      });

      return res.json({
        success: true,
        data: monthlyTrend
      });
    } catch (error) {
      logError('Aylık trend raporu hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Aylık trend raporu getirilirken bir hata oluştu'
      });
    }
  }

  // Kategori bazında rapor
  static async getCategoryReport(req: Request, res: Response) {
    try {
      const { startDate, endDate, type } = req.query;
      const userId = (req as any).user.id;

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      if (type) {
        where.type = type;
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

      const categoryStats = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: { amount: true },
        _count: true
      });

      // Kategori bilgilerini al
      const categoryIds = [...new Set(categoryStats.map(stat => stat.categoryId).filter(Boolean))];
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds as string[] } },
        select: { id: true, name: true }
      });

      // Kategori bazında verileri birleştir
      const categoryReport = categories.map(category => {
        const incomeStats = categoryStats.find(stat => 
          stat.categoryId === category.id && stat.type === 'INCOME'
        );
        const expenseStats = categoryStats.find(stat => 
          stat.categoryId === category.id && stat.type === 'EXPENSE'
        );

        return {
          category,
          income: {
            amount: incomeStats?._sum.amount || 0,
            count: incomeStats?._count || 0
          },
          expense: {
            amount: expenseStats?._sum.amount || 0,
            count: expenseStats?._count || 0
          },
          total: {
            amount: (incomeStats?._sum.amount || 0) + (expenseStats?._sum.amount || 0),
            count: (incomeStats?._count || 0) + (expenseStats?._count || 0)
          }
        };
      });

      res.json({
        success: true,
        data: categoryReport
      });
    } catch (error) {
      logError('Kategori raporu getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Kategori raporu getirilirken bir hata oluştu'
      });
    }
  }

  // Müşteri bazında rapor
  static async getCustomerReport(req: Request, res: Response) {
    try {
      const { startDate, endDate, type, limit = 10 } = req.query;
      const userId = (req as any).user.id;
      const limitNum = Number(limit);

      if (!Number.isInteger(limitNum) || limitNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit pozitif tamsayı olmalıdır'
        });
      }

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      if (type) {
        where.type = type;
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

      const customerStats = await prisma.transaction.groupBy({
        by: ['customerId', 'type'],
        where,
        _sum: { amount: true },
        _count: true
      });

      // Müşteri bilgilerini al
      const customerIds = [...new Set(customerStats.map(stat => stat.customerId).filter(Boolean))];
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds as string[] } },
        select: { id: true, name: true, code: true, type: true }
      });

      // Müşteri bazında verileri birleştir
      const customerReport = customers.map(customer => {
        const incomeStats = customerStats.find(stat => 
          stat.customerId === customer.id && stat.type === 'INCOME'
        );
        const expenseStats = customerStats.find(stat => 
          stat.customerId === customer.id && stat.type === 'EXPENSE'
        );

        const totalIncome = incomeStats?._sum.amount || 0;
        const totalExpense = expenseStats?._sum.amount || 0;

        return {
          customer,
          income: {
            amount: totalIncome,
            count: incomeStats?._count || 0
          },
          expense: {
            amount: totalExpense,
            count: expenseStats?._count || 0
          },
          net: totalIncome - totalExpense,
          total: {
            amount: totalIncome + totalExpense,
            count: (incomeStats?._count || 0) + (expenseStats?._count || 0)
          }
        };
      });

      // Net tutara göre sırala ve limit uygula
      const sortedReport = customerReport
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
        .slice(0, limitNum);

      return res.json({
        success: true,
        data: sortedReport
      });
    } catch (error) {
      logError('Müşteri raporu getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Müşteri raporu getirilirken bir hata oluştu'
      });
    }
  }

  // Günlük trend raporu
  static async getDailyTrend(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req as any).user.id;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Başlangıç ve bitiş tarihi gerekli'
        });
      }

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };

      const dailyData = await prisma.$queryRaw`
        SELECT 
          DATE(date) as day,
          type,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM "Transaction"
        WHERE ${where.userId ? `"userId" = ${userId}` : '1=1'}
        AND date >= ${new Date(startDate as string)}
        AND date <= ${new Date(endDate as string)}
        GROUP BY DATE(date), type
        ORDER BY day, type
      `;

      // Tarih aralığındaki tüm günleri oluştur
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const dailyTrend: any[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dailyTrend.push({
          date: new Date(d).toISOString().split('T')[0],
          dayName: new Date(d).toLocaleDateString('tr-TR', { weekday: 'long' }),
          income: 0,
          expense: 0,
          net: 0
        });
      }

      // Verileri doldur
      (dailyData as any[]).forEach((item: any) => {
        const dayIndex = dailyTrend.findIndex(day => day.date === item.day);
        if (dayIndex !== -1) {
          if (item.type === 'INCOME') {
            dailyTrend[dayIndex].income = parseFloat(item.total_amount);
          } else {
            dailyTrend[dayIndex].expense = parseFloat(item.total_amount);
          }
          dailyTrend[dayIndex].net = dailyTrend[dayIndex].income - dailyTrend[dayIndex].expense;
        }
      });

      return res.json({
        success: true,
        data: dailyTrend
      });
    } catch (error) {
      logError('Günlük trend raporu hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Günlük trend raporu getirilirken bir hata oluştu'
      });
    }
  }

  // Nakit akışı raporu
  static async getCashFlowReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req as any).user.id;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Başlangıç ve bitiş tarihi gerekli'
        });
      }

      const where: any = {};
      if ((req as any).user.role !== 'ADMIN') {
        where.userId = userId;
      }

      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };

      // Gelir ve gider toplamları
      const incomeTotal = await prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true }
      });

      const expenseTotal = await prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true }
      });

      // Kategori bazında nakit akışı
      const categoryCashFlow = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: { amount: true }
      });

      // Müşteri bazında nakit akışı
      const customerCashFlow = await prisma.transaction.groupBy({
        by: ['customerId', 'type'],
        where,
        _sum: { amount: true }
      });

      // Kategori bilgilerini al
      const categoryIds = [...new Set(categoryCashFlow.map(flow => flow.categoryId).filter(Boolean))];
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds as string[] } },
        select: { id: true, name: true }
      });

      // Müşteri bilgilerini al
      const customerIds = [...new Set(customerCashFlow.map(flow => flow.customerId).filter(Boolean))];
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds as string[] } },
        select: { id: true, name: true, type: true }
      });

      const cashFlowReport = {
        summary: {
          totalIncome: incomeTotal._sum.amount || 0,
          totalExpense: expenseTotal._sum.amount || 0,
          netCashFlow: (incomeTotal._sum.amount || 0) - (expenseTotal._sum.amount || 0)
        },
        categoryCashFlow: categoryCashFlow.map(flow => ({
          category: categories.find(c => c.id === flow.categoryId),
          type: flow.type,
          amount: flow._sum.amount || 0
        })),
        customerCashFlow: customerCashFlow.map(flow => ({
          customer: customers.find(c => c.id === flow.customerId),
          type: flow.type,
          amount: flow._sum.amount || 0
        }))
      };

      return res.json({
        success: true,
        data: cashFlowReport
      });
    } catch (error) {
      logError('Nakit akışı raporu getirilirken hata:', error);
      return res.status(500).json({
        success: false,
        message: 'Nakit akışı raporu getirilirken bir hata oluştu'
      });
    }
  }

  // Birleşik Dashboard Raporu (Entegrasyon)
  static async getIntegratedDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Temel finansal veriler
      const basicStats = await this.getBasicFinancialStats(userId);
      
      // Ekstre verileri
      const extractStats = await this.getExtractStats(userId);
      
      // Yapı Kredi verileri
      const bankingStats = await this.getBankingStats(userId);
      
      // Kasa verileri
      const cashStats = await this.getCashStats(userId);

      res.json({
        success: true,
        data: {
          basic: basicStats,
          extracts: extractStats,
          banking: bankingStats,
          cash: cashStats,
          summary: {
            totalCustomers: basicStats.customerCount + extractStats.newCustomers,
            totalTransactions: basicStats.transactionCount + extractStats.totalTransactions,
            totalCollections: bankingStats.totalCollections,
            cashBalance: cashStats.currentBalance
          }
        }
      });

    } catch (error) {
      logError('Birleşik dashboard hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Birleşik dashboard getirilirken bir hata oluştu'
      });
    }
  }

  // Temel finansal istatistikler
  private static async getBasicFinancialStats(userId: string) {
    const currentMonth = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [incomeStats, expenseStats, customerCount, transactionCount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME' },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE' },
        _sum: { amount: true }
      }),
      prisma.customer.count({ where: { userId } }),
      prisma.transaction.count({ where: { userId } })
    ]);

    return {
      totalIncome: incomeStats._sum.amount || 0,
      totalExpense: expenseStats._sum.amount || 0,
      netAmount: (incomeStats._sum.amount || 0) - (expenseStats._sum.amount || 0),
      customerCount,
      transactionCount
    };
  }

  // Ekstre istatistikleri
  private static async getExtractStats(userId: string) {
    const [extractCount, transactionCount, newCustomers] = await Promise.all([
      prisma.extract.count({ where: { userId } }),
      prisma.extractTransaction.count({
        where: { extract: { userId } }
      }),
      prisma.customer.count({
        where: {
          userId,
          extractTransactions: { some: {} }
        }
      })
    ]);

    return {
      totalExtracts: extractCount,
      totalTransactions: transactionCount,
      newCustomers
    };
  }

  // Yapı Kredi istatistikleri
  private static async getBankingStats(userId: string) {
    const [totalTransactions, matchedTransactions, totalCollections] = await Promise.all([
      prisma.bankTransaction.count(),
      prisma.bankTransaction.count({ where: { isMatched: true } }),
      prisma.bankTransaction.aggregate({
        where: { direction: 'IN' },
        _sum: { amount: true }
      })
    ]);

    return {
      totalTransactions,
      matchedTransactions,
      unmatchedTransactions: totalTransactions - matchedTransactions,
      totalCollections: totalCollections._sum.amount || 0,
      matchRate: totalTransactions > 0 ? (matchedTransactions / totalTransactions) * 100 : 0
    };
  }

  // Kasa istatistikleri
  private static async getCashStats(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayFlow, lastFlow, totalCashTransactions] = await Promise.all([
      prisma.cashFlow.findFirst({
        where: { userId, date: today }
      }),
      prisma.cashFlow.findFirst({
        where: { userId },
        orderBy: { date: 'desc' }
      }),
      prisma.transaction.count({
        where: { userId, type: 'CASH' }
      })
    ]);

    return {
      currentBalance: todayFlow?.closingBalance || lastFlow?.closingBalance || 0,
      todayIncome: todayFlow?.totalIncome || 0,
      todayExpense: todayFlow?.totalExpense || 0,
      totalCashTransactions,
      hasTodayRecord: !!todayFlow
    };
  }

  // Tahsilat raporu
  static async getCollectionReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req as any).user.id;

      const where: any = {};
      if (startDate && endDate) {
        where.transactionDate = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      // Yapı Kredi ödemeleri
      const bankPayments = await prisma.bankTransaction.findMany({
        where: { ...where, direction: 'IN' },
        include: {
          customer: true,
          paymentMatches: {
            include: { customer: true }
          }
        },
        orderBy: { transactionDate: 'desc' }
      });

      // Müşteri bazında tahsilat analizi
      const customerCollections = new Map();

      bankPayments.forEach(payment => {
        const customerId = payment.matchedCustomerId || 'unmatched';
        const customerName = payment.customer?.name || 'Eşleşmeyen Ödeme';
        
        if (!customerCollections.has(customerId)) {
          customerCollections.set(customerId, {
            customerId,
            customerName,
            totalPaid: 0,
            paymentCount: 0,
            lastPaymentDate: null,
            isMatched: !!payment.matchedCustomerId
          });
        }

        const collection = customerCollections.get(customerId);
        collection.totalPaid += payment.amount;
        collection.paymentCount++;
        
        if (!collection.lastPaymentDate || payment.transactionDate > collection.lastPaymentDate) {
          collection.lastPaymentDate = payment.transactionDate;
        }
      });

      const summary = {
        totalPayments: bankPayments.length,
        totalAmount: bankPayments.reduce((sum, p) => sum + p.amount, 0),
        matchedPayments: bankPayments.filter(p => p.isMatched).length,
        unmatchedPayments: bankPayments.filter(p => !p.isMatched).length,
        uniqueCustomers: customerCollections.size
      };

      res.json({
        success: true,
        data: {
          summary,
          payments: bankPayments,
          customerCollections: Array.from(customerCollections.values())
        }
      });

    } catch (error) {
      logError('Tahsilat raporu hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Tahsilat raporu getirilirken bir hata oluştu'
      });
    }
  }

  // Yaşlandırma analizi
  static async getAgingAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Müşteri bakiyelerini al
      const customers = await prisma.customer.findMany({
        where: { userId, isActive: true },
        include: {
          transactions: {
            orderBy: { date: 'desc' }
          }
        }
      });

      const agingData = customers.map(customer => {
        const totalDebit = customer.transactions
          .filter(t => t.type === 'CUSTOMER' && t.amount < 0)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const totalCredit = customer.transactions
          .filter(t => t.type === 'CUSTOMER' && t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalCredit - totalDebit;
        const lastTransaction = customer.transactions[0];

        // Yaşlandırma kategorileri
        const aging = {
          current: 0, // 0-30 gün
          days30: 0,  // 31-60 gün
          days60: 0,  // 61-90 gün
          days90: 0   // 90+ gün
        };

        if (balance > 0 && lastTransaction) {
          const daysSinceLastTransaction = Math.floor(
            (new Date().getTime() - lastTransaction.date.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastTransaction <= 30) {
            aging.current = balance;
          } else if (daysSinceLastTransaction <= 60) {
            aging.days30 = balance;
          } else if (daysSinceLastTransaction <= 90) {
            aging.days60 = balance;
          } else {
            aging.days90 = balance;
          }
        }

        return {
          customer: {
            id: customer.id,
            name: customer.name,
            code: customer.code
          },
          balance,
          lastTransactionDate: lastTransaction?.date,
          aging
        };
      });

      // Toplam yaşlandırma özeti
      const totalAging = agingData.reduce((acc, item) => ({
        current: acc.current + item.aging.current,
        days30: acc.days30 + item.aging.days30,
        days60: acc.days60 + item.aging.days60,
        days90: acc.days90 + item.aging.days90
      }), { current: 0, days30: 0, days60: 0, days90: 0 });

      res.json({
        success: true,
        data: {
          summary: totalAging,
          customers: agingData.filter(item => item.balance > 0)
        }
      });

    } catch (error) {
      logError('Yaşlandırma analizi hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Yaşlandırma analizi getirilirken bir hata oluştu'
      });
    }
  }
} 