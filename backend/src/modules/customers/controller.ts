import { logError } from '@/shared/logger';
import { Request, Response } from 'express';

import { PrismaClient, Prisma } from '@prisma/client';
import { validationResult } from 'express-validator';
import { t } from '../../utils/i18n';



// Allowed fields for sorting customers
export type CustomerSortField = 'name' | 'phone' | 'address' | 'type';
const ALLOWED_SORT_FIELDS: CustomerSortField[] = ['name', 'phone', 'address', 'type'];

const prisma = new PrismaClient();

type CustomerWithTransactionsCount = Prisma.CustomerGetPayload<{
  include: { _count: { select: { transactions: true } } };
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
        sortOrder = 'asc'
      } = req.query;

      const sortField = sortBy as string;
      if (!ALLOWED_SORT_FIELDS.includes(sortField as CustomerSortField)) {
        return res.status(400).json({
          success: false,
          message: 'Ge\u00e7erli bir s\u0131ralama alan\u0131 giriniz'
        });
      }

      const userId = (req as any).user.id;
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
        userId: userId // Kullanıcıya özel müşteriler
      };

      if (type) {
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
      const orderBy: { [key in CustomerSortField]?: 'asc' | 'desc' } = {};
      orderBy[sortField as CustomerSortField] = sortOrder as 'asc' | 'desc';


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
      })) as CustomerWithTransactionsCount[];

      return res.json({
        success: true,
        customers,
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
      })) as CustomerWithTransactionsCount | null;

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: t(req, 'CUSTOMER_NOT_FOUND')
        });
      }

      return res.json({
        success: true,
        data: customer
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
        tag2
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

      const {
        name,
        phone,
        address,
        type,
        accountType,
        tag1,
        tag2
      } = req.body;

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
          name,
          phone,
          address,
          type,
          accountType,
          tag1,
          tag2
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
      const { q, limit = 10 } = req.query;
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

      const customers = await prisma.customer.findMany({
        where: {
          userId: userId,
          OR: [
            { name: { contains: searchQuery } },
            { phone: { contains: searchQuery } }
          ]
        },
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
}
