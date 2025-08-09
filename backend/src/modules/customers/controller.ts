import { logError } from '../../shared/logger';
import { Request, Response } from 'express';

import { PrismaClient, Prisma } from '@prisma/client';
import { validationResult } from 'express-validator';
import { t } from '../../utils/i18n';
import { v4 as uuidv4 } from 'uuid';



// Allowed fields for sorting customers
export type CustomerSortField = 'name' | 'phone' | 'address' | 'type' | 'createdAt' | 'balance';
const ALLOWED_SORT_FIELDS: CustomerSortField[] = ['name', 'phone', 'address', 'type', 'createdAt', 'balance'];

const prisma = new PrismaClient();

type CustomerWithTransactionsCount = Prisma.CustomerGetPayload<{
  include: { _count: { select: { transactions: true } } };
}>;

type CustomerListItem = Prisma.CustomerGetPayload<{
  include: {
    _count: { select: { transactions: true } };
    balance: { select: { totalDebit: true; totalCredit: true; netBalance: true; lastUpdated: true } };
    transactions: { select: { id: true; type: true; amount: true; date: true } };
  };
}>;

type CustomerWithTransactions = Prisma.CustomerGetPayload<{
  include: {
    transactions: {
      include: {
        category: { select: { id: true; name: true } };
        user: { select: { id: true; username: true } };
      };
      orderBy: { date: 'desc' };
    };
    _count: { select: { transactions: true } };
  };
}>;

export class CustomerController {
  // Tüm müşterileri getir (filtreleme ve sayfalama ile)
  static async getAllCustomers(req: Request, res: Response): Promise<Response> {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        search,
        sortBy = 'name',
        sortOrder = 'asc',
        hideFactoring = 'true'
      } = req.query;

      const sortField = sortBy as string;
      if (!ALLOWED_SORT_FIELDS.includes(sortField as CustomerSortField)) {
        return res.status(400).json({
          success: false,
          message: 'Ge\u00e7erli bir s\u0131ralama alan\u0131 giriniz'
        });
      }

      const userId = (req as any).user.id;
      console.log('[DEBUG] /customers endpoint userId:', userId);
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
      const where: Prisma.CustomerWhereInput = {
        userId: userId, // Kullanıcıya özel müşteriler
        // MH ile başlayan müşterileri hariç tut
        code: {
          not: {
            startsWith: 'MH'
          }
        }
      };

      // FAKTORİNG müşterilerini gizleme filtresi
      if (hideFactoring === 'true' || hideFactoring === '1') {
        where.name = {
          not: {
            contains: 'FAKTORING'
          }
        };
      }

      // Sadece type parametresi DOLU ise filtre uygula
      if (type && typeof type === 'string' && type.trim() !== '') {
        where.type = type as string;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string } },
          { phone: { contains: search as string } },
          { address: { contains: search as string } }
        ];
      }

      // Sıralama
      let orderBy: any;
      if (sortField === 'balance') {
        orderBy = { balance: { netBalance: sortOrder as 'asc' | 'desc' } };
      } else {
        orderBy = { [sortField as CustomerSortField]: sortOrder as 'asc' | 'desc' };
      }


      // Toplam kayıt sayısı
      const total = await prisma.customer.count({ where });

      // Müşterileri getir
      const customers = (await prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              transactions: true
            }
          },
          balance: {
            select: {
              totalDebit: true,
              totalCredit: true,
              netBalance: true,
              lastUpdated: true
            }
          },
          transactions: {
            select: {
              id: true,
              type: true,
              amount: true,
              date: true
            },
            orderBy: { date: 'desc' },
            take: 5 // Son 5 işlem
          }
        },
        orderBy,
        skip,
        take: limitNum
      })) as CustomerListItem[];

      // Her müşteri için toplam işlem sayısını hesapla (normal + ekstre)
      // Performans için toplu sorgu kullan
      const customerIds = customers.map(c => c.id);
      const extractTransactionCounts = await prisma.extractTransaction.groupBy({
        by: ['customerId'],
        where: {
          customerId: {
            in: customerIds
          }
        },
        _count: {
          customerId: true
        }
      });
      
      // Her müşteri için en son vade tarihini al
      const latestDueDates = await prisma.extractTransaction.groupBy({
        by: ['customerId'],
        where: {
          customerId: {
            in: customerIds
          },
          dueDate: {
            not: null
          }
        },
        _max: {
          dueDate: true
        }
      });
      
      // Count map oluştur
      const extractCountMap = new Map();
      extractTransactionCounts.forEach(item => {
        extractCountMap.set(item.customerId, item._count.customerId);
      });
      
      // Vade tarihi map oluştur
      const dueDateMap = new Map();
      latestDueDates.forEach(item => {
        dueDateMap.set(item.customerId, item._max.dueDate);
      });
      
      const customersWithTotalCounts = customers.map((customer) => {
        const extractTransactionCount = extractCountMap.get(customer.id) || 0;
        const totalTransactionCount = customer._count.transactions + extractTransactionCount;
        const latestDueDate = dueDateMap.get(customer.id);
        

        
        return {
          ...customer,
          // Frontend basit sayısal bakiye bekliyor
          balance: customer.balance?.netBalance ?? 0,
          dueDate: latestDueDate,
          _count: {
            ...customer._count,
            transactions: totalTransactionCount
          }
        };
      });

      return res.json({
        success: true,
        customers: customersWithTotalCounts,
        total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      logError('Müşteriler getirilirken hata:', error);


      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMERS_FETCH_ERROR')
      });
    }
  }

  // Tek müşteri getir
  static async getCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const customerId = id;
      const userId = (req as any).user.id;

      const customer = (await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId: userId // Kullanıcıya özel müşteri
        },
        include: {
          transactions: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true
                }
              },
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            },
            orderBy: { date: 'desc' }
          },
          _count: {
            select: {
              transactions: true
            }
          }
        }
      })) as CustomerWithTransactions | null;

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMER_NOT_FOUND')
        });
      }

      // Ekstre işlemlerini de getir
      const extractTransactions = await prisma.extractTransaction.findMany({
        where: {
          customerId: customerId
        },
        include: {
          extract: {
            select: {
              id: true,
              fileName: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      // Tüm işlemleri birleştir ve sırala
      const allTransactions = [
        ...customer.transactions.map((tx: any) => ({
          ...tx,
          source: 'manual',
          type: tx.type || 'MANUAL'
        })),
        ...extractTransactions.map(tx => ({
          id: tx.id,
          date: tx.date,
          description: tx.description,
          debit: tx.debit,
          credit: tx.credit,
          amount: tx.debit > 0 ? tx.debit : tx.credit,
          type: tx.debit > 0 ? 'DEBIT' : 'CREDIT',
          source: 'extract',
          extractFileName: tx.extract?.fileName,
          documentType: tx.documentType,
          voucherNo: tx.voucherNo,
          dueDate: tx.dueDate,
          amountBase: tx.amountBase,
          discount: tx.discount,
          amountNet: tx.amountNet,
          vat: tx.vat
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const customerWithAllTransactions = {
        ...customer,
        transactions: allTransactions,
        _count: {
          ...customer._count,
          transactions: allTransactions.length
        }
      };

      return res.json({
        success: true,
        data: customerWithAllTransactions
      });
    } catch (error) {
      logError('Müşteri getirilirken hata:', error);

      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMER_FETCH_ERROR')
      });
    }
  }

  // Yeni müşteri oluştur
  static async createCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: t(req, 'VALIDATION_ERROR'),
          errors: errors.array()
        });
      }

      const {
        name,
        phone,
        address,
        type = 'INDIVIDUAL',
        accountType,
        tag1,
        tag2,
        dueDays
      } = req.body;

      const userId = (req as any).user.id;

      let code: string;
      do {
        code = `CUST_${uuidv4()}`;
      } while (await prisma.customer.findUnique({ where: { code } }));

      const customer = await prisma.customer.create({
        data: {
          code,
          name,
          phone,
          address,
          type,
          accountType,
          tag1,
          tag2,
          dueDays: dueDays ? parseInt(dueDays) : null,
          userId: userId
        }
      });

      return res.status(201).json({
        success: true,
        message: t(req, 'CUSTOMER_CREATE_SUCCESS'),
        data: customer
      });
    } catch (error) {
      logError('Müşteri oluşturulurken hata:', error);

      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMER_CREATE_ERROR')
      });
    }
  }

  // Müşteri güncelle
  static async updateCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: t(req, 'VALIDATION_ERROR'),
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const customerId = id;
      const userId = (req as any).user.id;

      const { dueDays } = req.body;

      // Müşterinin var olup olmadığını kontrol et
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          id: customerId,
          userId: userId
        }
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMER_NOT_FOUND')
        });
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          dueDays: dueDays ? parseInt(dueDays) : null
        }
      });

      return res.json({
        success: true,
        message: t(req, 'CUSTOMER_UPDATE_SUCCESS'),
        data: customer
      });
    } catch (error) {
      logError('Müşteri güncellenirken hata:', error);

      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMER_UPDATE_ERROR')
      });
    }
  }

  // Vade günü güncelle (sadece dueDays alanı için)
  static async updateCustomerDueDays(req: Request, res: Response): Promise<Response> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: t(req, 'VALIDATION_ERROR'),
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const customerId = id;
      const userId = (req as any).user.id;

      const { dueDays } = req.body;

      // Müşterinin var olup olmadığını kontrol et
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          id: customerId,
          userId: userId
        }
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMER_NOT_FOUND')
        });
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          dueDays: dueDays ? parseInt(dueDays) : null
        }
      });

      return res.json({
        success: true,
        message: 'Vade günü başarıyla güncellendi',
        data: customer
      });
    } catch (error) {
      logError('Vade günü güncellenirken hata:', error);

      return res.status(500).json({
        success: false,
        message: 'Vade günü güncellenirken hata oluştu'
      });
    }
  }

  // Müşteri sil
  static async deleteCustomer(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const customerId = id;
      const userId = (req as any).user.id;

      // Müşterinin var olup olmadığını kontrol et
      const existingCustomer = (await prisma.customer.findFirst({
        where: {
          id: customerId,
          userId: userId
        },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      })) as CustomerWithTransactionsCount | null;

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMER_NOT_FOUND')
        });
      }

      // İşlemleri olan müşteriyi silmeye izin verme
      if (existingCustomer?._count?.transactions > 0) {
        return res.status(400).json({
          success: false,
          message: t(req, 'CUSTOMER_DELETE_HAS_TRANSACTIONS')
        });
      }

      await prisma.customer.delete({
        where: { id: customerId }
      });

      return res.json({
        success: true,
        message: t(req, 'CUSTOMER_DELETE_SUCCESS')
      });
    } catch (error) {
      logError('Müşteri silinirken hata:', error);

      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMER_DELETE_ERROR')
      });
    }
  }

  // Müşteri istatistikleri
  static async getCustomerStats(req: Request, res: Response): Promise<Response> {
    try {
      const { customerId } = req.params;
      const customerIdStr = customerId;
      const userId = (req as any).user.id;

      // Müşterinin var olup olmadığını kontrol et
      const customer = await prisma.customer.findFirst({
        where: { 
          id: customerIdStr,
          userId: userId
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMER_NOT_FOUND')
        });
      }

      // Müşteri işlem istatistikleri
      const incomeStats = await prisma.transaction.aggregate({
        where: { 
          customerId: customerIdStr,
          type: 'INCOME'
        },
        _sum: { amount: true },
        _count: true
      });

      const expenseStats = await prisma.transaction.aggregate({
        where: { 
          customerId: customerIdStr,
          type: 'EXPENSE'
        },
        _sum: { amount: true },
        _count: true
      });

      // Aylık trend
      const monthlyStats = await prisma.transaction.groupBy({
        by: ['type'],
        where: { customerId: customerIdStr },
        _sum: { amount: true },
        _count: true
      });

      // Kategori bazında istatistikler
      const categoryStats = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where: { customerId: customerIdStr },
        _sum: { amount: true },
        _count: true
      });

      return res.json({
        success: true,
        data: {
          customer,
          summary: {
            totalIncome: incomeStats._sum?.amount || 0,
            totalExpense: expenseStats._sum?.amount || 0,
            netAmount: (incomeStats._sum?.amount || 0) - (expenseStats._sum?.amount || 0),
            incomeCount: incomeStats._count,
            expenseCount: expenseStats._count
          },
          monthlyStats,
          categoryStats
        }
      });
    } catch (error) {
      logError('Müşteri istatistikleri getirilirken hata:', error);

      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMER_STATS_ERROR')
      });
    }
  }

  // Müşteri arama (autocomplete için)
  static async searchCustomers(req: Request, res: Response): Promise<Response> {
    try {
      const { q, limit = 10, hideFactoring = 'true' } = req.query;
      const searchQuery = q as string;
      const limitNum = Number(limit);
      const userId = (req as any).user.id;

      if (!Number.isInteger(limitNum) || limitNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit pozitif tamsayı olmalıdır'
        });
      }

      if (!searchQuery || searchQuery.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const whereClause: Prisma.CustomerWhereInput = {
        userId: userId,
        // MH ile başlayan müşterileri hariç tut
        code: {
          not: {
            startsWith: 'MH'
          }
        },
        OR: [
          { name: { contains: searchQuery } },
          { phone: { contains: searchQuery } }
        ]
      };

      // FAKTORİNG müşterilerini gizleme filtresi
      if (hideFactoring === 'true' || hideFactoring === '1') {
        whereClause.name = {
          not: {
            contains: 'FAKTORİNG'
          }
        };
      }

      const customers = await prisma.customer.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          phone: true,
          type: true
        },
        take: limitNum,
        orderBy: { name: 'asc' }
      });

      return res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      logError('Müşteri arama hatası:', error);

      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMER_SEARCH_ERROR')
      });
    }
  }

  // Toplu müşteri silme
  static async deleteMultipleCustomers(req: Request, res: Response): Promise<Response> {
    try {
      const { ids } = req.body;
      const userId = (req as any).user.id;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: t(req, 'CUSTOMER_ID_LIST_REQUIRED')
        });
      }

      // Müşterilerin var olup olmadığını ve yetki kontrolü
      const customers = (await prisma.customer.findMany({
        where: {
          id: { in: ids },
          userId: userId
        },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      })) as CustomerWithTransactionsCount[];

      if (customers.length !== ids.length) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMERS_NOT_FOUND')
        });
      }

      const customersWithTransactions = customers.filter(
        c => (c._count?.transactions ?? 0) > 0
      );
      if (customersWithTransactions.length > 0) {
        return res.status(400).json({
          success: false,
          message: t(req, 'CUSTOMERS_DELETE_HAS_TRANSACTIONS')
        });
      }

      await prisma.customer.deleteMany({
        where: { 
          id: { in: ids },
          userId: userId
        }
      });

      return res.json({
        success: true,
        message: t(req, 'CUSTOMERS_DELETE_SUCCESS', { count: ids.length })
      });
    } catch (error) {
      logError('Toplu müşteri silme hatası:', error);
      return res.status(500).json({
        success: false,
        message: t(req, 'CUSTOMERS_DELETE_ERROR')
      });
    }
  }

  // Eski müşterileri silme
  static async deleteOldCustomers(req: Request, res: Response): Promise<Response> {
    try {
      const { beforeDate, deleteAll, force } = req.body;
      const userId = (req as any).user.id;

      console.log('[DEBUG] deleteOldCustomers - Params:', { beforeDate, deleteAll, force, userId });

      let whereClause: any = { userId };

      if (deleteAll === true || deleteAll === 'true') {
        // Tüm müşterileri sil
        whereClause = { userId };
      } else if (beforeDate) {
        // Belirli tarihten önceki müşterileri sil
        try {
          const date = new Date(beforeDate);
          if (isNaN(date.getTime())) {
            return res.status(400).json({ 
              error: 'Geçerli bir tarih formatı giriniz' 
            });
          }
          whereClause = {
            userId,
            createdAt: {
              lt: date
            }
          };
        } catch (error) {
          return res.status(400).json({ 
            error: 'Geçerli bir tarih formatı giriniz' 
          });
        }
      } else {
        return res.status(400).json({ 
          error: 'beforeDate veya deleteAll parametresi gerekli' 
        });
      }

      // Önce müşteri ID'lerini al
      const customers = await prisma.customer.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (customers.length === 0) {
        return res.json({
          success: true,
          message: 'Silinecek müşteri bulunamadı',
          deletedCount: 0
        });
      }

      // İşlemi olan müşterileri kontrol et
      const customersWithTransactions = customers.filter(
        c => (c._count?.transactions ?? 0) > 0
      );

      // Ekstre işlemlerini kontrol et
      const customerIds = customers.map(c => c.id);
      const extractTransactionCounts = await prisma.extractTransaction.groupBy({
        by: ['customerId'],
        where: {
          customerId: {
            in: customerIds
          }
        },
        _count: {
          customerId: true
        }
      });

      // Banka işlemlerini kontrol et
      const bankTransactionCounts = await prisma.bankTransaction.groupBy({
        by: ['matchedCustomerId'],
        where: {
          matchedCustomerId: {
            in: customerIds
          }
        },
        _count: {
          matchedCustomerId: true
        }
      });

      // Ödeme eşleştirmelerini kontrol et
      const paymentMatchCounts = await prisma.paymentMatch.groupBy({
        by: ['customerId'],
        where: {
          customerId: {
            in: customerIds
          }
        },
        _count: {
          customerId: true
        }
      });

      // Count map'leri oluştur
      const extractCountMap = new Map();
      extractTransactionCounts.forEach(item => {
        extractCountMap.set(item.customerId, item._count.customerId);
      });

      const bankCountMap = new Map();
      bankTransactionCounts.forEach(item => {
        bankCountMap.set(item.matchedCustomerId, item._count.matchedCustomerId);
      });

      const paymentCountMap = new Map();
      paymentMatchCounts.forEach(item => {
        paymentCountMap.set(item.customerId, item._count.customerId);
      });

      // Tüm işlemleri olan müşterileri bul
      const customersWithAnyTransactions = customers.filter(c => {
        const transactionCount = c._count?.transactions ?? 0;
        const extractCount = extractCountMap.get(c.id) ?? 0;
        const bankCount = bankCountMap.get(c.id) ?? 0;
        const paymentCount = paymentCountMap.get(c.id) ?? 0;
        
        return transactionCount > 0 || extractCount > 0 || bankCount > 0 || paymentCount > 0;
      });

      if (customersWithAnyTransactions.length > 0 && !(force === true || force === 'true')) {
        return res.status(400).json({
          success: false,
          message: `${customersWithAnyTransactions.length} müşterinin işlemi var. Zorla silmek için force: true parametresi ekleyin.`,
          customersWithTransactions: customersWithAnyTransactions.map(c => ({
            id: c.id,
            name: c.name,
            transactionCount: c._count.transactions,
            extractTransactionCount: extractCountMap.get(c.id) ?? 0,
            bankTransactionCount: bankCountMap.get(c.id) ?? 0,
            paymentMatchCount: paymentCountMap.get(c.id) ?? 0
          }))
        });
      }

      // Tüm müşteriler için bakiyeleri sil (force modundan bağımsız olarak)
      const allCustomerIds = customers.map(c => c.id);
      await prisma.balance.deleteMany({
        where: {
          customerId: {
            in: allCustomerIds
          }
        }
      });

      // İşlemleri olan müşterileri zorla silmek istiyorsa, önce işlemleri sil
      if ((force === true || force === 'true') && customersWithAnyTransactions.length > 0) {
        const customerIds = customersWithAnyTransactions.map(c => c.id);
        
        // İşlemleri sil
        await prisma.transaction.deleteMany({
          where: {
            customerId: {
              in: customerIds
            }
          }
        });

        // Ekstre işlemlerini sil
        await prisma.extractTransaction.deleteMany({
          where: {
            customerId: {
              in: customerIds
            }
          }
        });

        // Banka işlemlerini sil
        await prisma.bankTransaction.deleteMany({
          where: {
            matchedCustomerId: {
              in: customerIds
            }
          }
        });

        // Ödeme eşleştirmelerini sil
        await prisma.paymentMatch.deleteMany({
          where: {
            customerId: {
              in: customerIds
            }
          }
        });
      }

      // Müşterileri sil
      await prisma.customer.deleteMany({
        where: whereClause
      });

      return res.json({
        success: true,
        message: `${customers.length} müşteri başarıyla silindi`,
        deletedCount: customers.length,
        forceDeleted: (force === true || force === 'true') && customersWithAnyTransactions.length > 0
      });

    } catch (error) {
      console.error('[DEBUG] deleteOldCustomers - Detaylı hata:', error);
      logError('Eski müşterileri silme hatası:', error);
      return res.status(500).json({ 
        error: 'Müşteriler silinirken hata oluştu',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }
}
