import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

export class CustomerController {
  // Tüm müşterileri getir (filtreleme ve sayfalama ile)
  static async getAllCustomers(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        type,
        search,
        sortBy = 'name',
        sortOrder = 'asc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Filtreleme koşulları
      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string, mode: 'insensitive' } },
          { address: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      // Sıralama
      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder;

      // Toplam kayıt sayısı
      const total = await prisma.customer.count({ where });

      // Müşterileri getir
      const customers = await prisma.customer.findMany({
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
      });

      res.json({
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
      console.error('Müşteriler getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteriler getirilirken bir hata oluştu'
      });
    }
  }

  // Tek müşteri getir
  static async getCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customerId = id;

      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          transactions: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  color: true
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
            orderBy: { date: 'desc' }
          },
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Müşteri bulunamadı'
        });
      }

      res.json({
        success: true,
        data: customer
      });
    } catch (error) {
      console.error('Müşteri getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteri getirilirken bir hata oluştu'
      });
    }
  }

  // Yeni müşteri oluştur
  static async createCustomer(req: Request, res: Response) {
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
        email,
        phone,
        address,
        type,
        taxNumber,
        notes
      } = req.body;

      const userId = (req as any).user.id;

      // Email benzersizlik kontrolü
      if (email) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { email }
        });

        if (existingCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Bu email adresi zaten kullanılıyor'
          });
        }
      }

      const customer = await prisma.customer.create({
        data: {
          name,
          email,
          phone,
          address,
          type,
          taxNumber,
          notes,
          userId
        }
      });

      res.status(201).json({
        success: true,
        message: 'Müşteri başarıyla oluşturuldu',
        data: customer
      });
    } catch (error) {
      console.error('Müşteri oluşturulurken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteri oluşturulurken bir hata oluştu'
      });
    }
  }

  // Müşteri güncelle
  static async updateCustomer(req: Request, res: Response) {
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
      const customerId = parseInt(id);
      const userId = (req as any).user.id;

      const {
        name,
        email,
        phone,
        address,
        type,
        taxNumber,
        notes
      } = req.body;

      // Müşterinin var olup olmadığını kontrol et
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Müşteri bulunamadı'
        });
      }

      // Sadece kendi müşterilerini güncelleyebilir (admin hariç)
      if (existingCustomer.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Bu müşteriyi güncelleme yetkiniz yok'
        });
      }

      // Email benzersizlik kontrolü (kendi email'i hariç)
      if (email && email !== existingCustomer.email) {
        const duplicateCustomer = await prisma.customer.findFirst({
          where: { 
            email,
            id: { not: customerId }
          }
        });

        if (duplicateCustomer) {
          return res.status(400).json({
            success: false,
            message: 'Bu email adresi zaten kullanılıyor'
          });
        }
      }

      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: {
          name,
          email,
          phone,
          address,
          type,
          taxNumber,
          notes
        }
      });

      res.json({
        success: true,
        message: 'Müşteri başarıyla güncellendi',
        data: customer
      });
    } catch (error) {
      console.error('Müşteri güncellenirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteri güncellenirken bir hata oluştu'
      });
    }
  }

  // Müşteri sil
  static async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customerId = parseInt(id);
      const userId = (req as any).user.id;

      // Müşterinin var olup olmadığını kontrol et
      const existingCustomer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Müşteri bulunamadı'
        });
      }

      // Sadece kendi müşterilerini silebilir (admin hariç)
      if (existingCustomer.userId !== userId && (req as any).user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Bu müşteriyi silme yetkiniz yok'
        });
      }

      // İşlemleri olan müşteriyi silmeye izin verme
      if (existingCustomer._count.transactions > 0) {
        return res.status(400).json({
          success: false,
          message: 'İşlemleri olan müşteri silinemez'
        });
      }

      await prisma.customer.delete({
        where: { id: customerId }
      });

      res.json({
        success: true,
        message: 'Müşteri başarıyla silindi'
      });
    } catch (error) {
      console.error('Müşteri silinirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteri silinirken bir hata oluştu'
      });
    }
  }

  // Müşteri istatistikleri
  static async getCustomerStats(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const customerIdNum = parseInt(customerId);

      // Müşterinin var olup olmadığını kontrol et
      const customer = await prisma.customer.findUnique({
        where: { id: customerIdNum }
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Müşteri bulunamadı'
        });
      }

      // Müşteri işlem istatistikleri
      const incomeStats = await prisma.transaction.aggregate({
        where: { 
          customerId: customerIdNum,
          type: 'INCOME'
        },
        _sum: { amount: true },
        _count: true
      });

      const expenseStats = await prisma.transaction.aggregate({
        where: { 
          customerId: customerIdNum,
          type: 'EXPENSE'
        },
        _sum: { amount: true },
        _count: true
      });

      // Aylık trend
      const monthlyStats = await prisma.transaction.groupBy({
        by: ['type'],
        where: { customerId: customerIdNum },
        _sum: { amount: true },
        _count: true
      });

      // Kategori bazında istatistikler
      const categoryStats = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where: { customerId: customerIdNum },
        _sum: { amount: true },
        _count: true
      });

      res.json({
        success: true,
        data: {
          customer,
          summary: {
            totalIncome: incomeStats._sum.amount || 0,
            totalExpense: expenseStats._sum.amount || 0,
            netAmount: (incomeStats._sum.amount || 0) - (expenseStats._sum.amount || 0),
            incomeCount: incomeStats._count,
            expenseCount: expenseStats._count
          },
          monthlyStats,
          categoryStats
        }
      });
    } catch (error) {
      console.error('Müşteri istatistikleri getirilirken hata:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteri istatistikleri getirilirken bir hata oluştu'
      });
    }
  }

  // Müşteri arama (autocomplete için)
  static async searchCustomers(req: Request, res: Response) {
    try {
      const { q, limit = 10 } = req.query;
      const searchQuery = q as string;
      const limitNum = parseInt(limit as string);

      if (!searchQuery || searchQuery.length < 2) {
        return res.json({
          success: true,
          data: []
        });
      }

      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
            { phone: { contains: searchQuery, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          type: true
        },
        take: limitNum,
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: customers
      });
    } catch (error) {
      console.error('Müşteri arama hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteri arama sırasında bir hata oluştu'
      });
    }
  }

  // Toplu müşteri silme
  static async deleteMultipleCustomers(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      const userId = (req as any).user.id;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli ID listesi gerekli'
        });
      }

      // Müşterilerin var olup olmadığını ve yetki kontrolü
      const customers = await prisma.customer.findMany({
        where: { id: { in: ids } },
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        }
      });

      if (customers.length !== ids.length) {
        return res.status(404).json({
          success: false,
          message: 'Bazı müşteriler bulunamadı'
        });
      }

      // Yetki kontrolü ve işlem kontrolü
      const unauthorizedCustomers = customers.filter(c => 
        c.userId !== userId && (req as any).user.role !== 'ADMIN'
      );

      if (unauthorizedCustomers.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Bazı müşterileri silme yetkiniz yok'
        });
      }

      const customersWithTransactions = customers.filter(c => c._count.transactions > 0);
      if (customersWithTransactions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'İşlemleri olan müşteriler silinemez'
        });
      }

      await prisma.customer.deleteMany({
        where: { id: { in: ids } }
      });

      res.json({
        success: true,
        message: `${ids.length} müşteri başarıyla silindi`
      });
    } catch (error) {
      console.error('Toplu müşteri silme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Müşteriler silinirken bir hata oluştu'
      });
    }
  }
} 