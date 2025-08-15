import { BaseService } from '../../shared/services/BaseService';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../../shared/types';
import { Customer } from '@prisma/client';

export class CustomerService extends BaseService {
  
  /**
   * Tüm müşterileri getir (sayfalama ile)
   */
  async getCustomers(
    params: PaginationParams & {
      address?: string;
      accountType?: string;
      tag1?: string;
      tag2?: string;
      isActive?: boolean;
      type?: string;
      hasDebt?: boolean;
    },
    userId?: string
  ): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    return this.safeDatabaseOperation(async () => {
      const { page, limit, sortBy, sortOrder } = this.validatePaginationParams(params);
      const { address, accountType, tag1, tag2, isActive, type, hasDebt } = params;
      const skip = (page - 1) * limit;

      // Kullanıcıya ve filtrelere özel sorgu
      const whereClause: any = userId ? { userId } : {};
      if (address) whereClause.address = { contains: address };
      if (accountType) whereClause.accountType = { contains: accountType };
      if (tag1) whereClause.tag1 = { contains: tag1 };
      if (tag2) whereClause.tag2 = { contains: tag2 };
      if (typeof isActive === 'boolean') whereClause.isActive = isActive;
      if (type) whereClause.type = type;
      if (typeof hasDebt === 'boolean') {
        whereClause.balance = {
          is: { netBalance: hasDebt ? { lt: 0 } : { gte: 0 } }
        };
      }

      // Bakiye sıralaması için özel mantık
      let orderByClause;
      if (sortBy === 'balance') {
        // Bakiye sıralaması için balance tablosunu join et
        orderByClause = {
          balance: {
            netBalance: sortOrder
          }
        };
      } else {
        orderByClause = { [sortBy]: sortOrder };
      }

      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: orderByClause,
          select: {
            id: true,
            code: true,
            name: true,
            originalName: true,
            nameVariations: true,
            phone: true,
            address: true,
            type: true,
            accountType: true,
            lastPaymentDate: true,
            paymentPattern: true,
            dueDays: true,
            tag1: true,
            tag2: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
            balance: {
              select: {
                totalDebit: true,
                totalCredit: true,
                netBalance: true
              }
            }
          }
        }),
        this.prisma.customer.count({ where: whereClause })
      ]);

      return this.createPaginatedResponse(customers, total, page, limit);
    }, 'Müşteriler getirilemedi');
  }

  /**
   * ID ile müşteri getir
   */
  async getCustomerById(id: string): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          transactions: {
            include: {
              category: true
            },
            orderBy: { date: 'desc' }
          },
          balance: true
        }
      });

      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      return customer;
    }, 'Müşteri getirilemedi');
  }

  /**
   * Yeni müşteri oluştur
   */
  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      return await this.prisma.customer.create({
        data: {
          ...data,
          dueDays: data.dueDays || 0
        }
      });
    }, 'Müşteri oluşturulamadı');
  }

  /**
   * Müşteri güncelle
   */
  async updateCustomer(id: string, data: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findUnique({ where: { id } });
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      return await this.prisma.customer.update({
        where: { id },
        data
      });
    }, 'Müşteri güncellenemedi');
  }

  /**
   * Müşteri sil
   */
  async deleteCustomer(id: string): Promise<ApiResponse<boolean>> {
    return this.safeDatabaseOperation(async () => {
      const customer = await this.prisma.customer.findUnique({ where: { id } });
      if (!customer) {
        throw new Error('Müşteri bulunamadı');
      }

      // İlişkili işlemleri kontrol et
      const transactionCount = await this.prisma.transaction.count({
        where: { customerId: id }
      });

      if (transactionCount > 0) {
        throw new Error('Bu müşteriye ait işlemler bulunduğu için silinemez');
      }

      await this.prisma.customer.delete({ where: { id } });
      return true;
    }, 'Müşteri silinemedi');
  }

  /**
   * Müşteri ara
   */
  async searchCustomers(query: string, params: PaginationParams): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    return this.safeDatabaseOperation(async () => {
      const { page, limit, sortBy, sortOrder } = this.validatePaginationParams(params);
      const skip = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        this.prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { address: { contains: query } }
            ]
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            balance: {
              select: {
                totalDebit: true,
                totalCredit: true,
                netBalance: true
              }
            }
          }
        }),
        this.prisma.customer.count({
          where: {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { address: { contains: query } }
            ]
          }
        })
      ]);

      return this.createPaginatedResponse(customers, total, page, limit);
    }, 'Müşteri arama başarısız');
  }

  /**
   * Müşteri bakiyesini güncelle
   */
  async updateCustomerBalance(id: string, amount: number): Promise<ApiResponse<Customer>> {
    return this.safeDatabaseOperation(async () => {
      // Önce mevcut bakiyeyi kontrol et
      const existingBalance = await this.prisma.balance.findUnique({
        where: { customerId: id }
      });

      if (existingBalance) {
        // Mevcut bakiyeyi güncelle
        await this.prisma.balance.update({
          where: { customerId: id },
          data: {
            netBalance: {
              increment: amount
            },
            lastUpdated: new Date()
          }
        });
      } else {
        // Yeni bakiye oluştur
        await this.prisma.balance.create({
          data: {
            customerId: id,
            netBalance: amount,
            totalDebit: amount > 0 ? amount : 0,
            totalCredit: amount < 0 ? Math.abs(amount) : 0
          }
        });
      }

      const updatedCustomer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          balance: true
        }
      });

      if (!updatedCustomer) {
        throw new Error('Müşteri bulunamadı');
      }

      return updatedCustomer;
    }, 'Müşteri bakiyesi güncellenemedi');
  }

  /**
   * Vadesi geçmiş müşterileri getir
   */
  async getOverdueCustomers(): Promise<ApiResponse<Customer[]>> {
    return this.safeDatabaseOperation(async () => {
      const today = new Date();
      
      return await this.prisma.customer.findMany({
        where: {
          extractTransactions: {
            some: {
              dueDate: {
                lt: today
              }
            }
          }
        },
        include: {
          extractTransactions: {
            where: {
              dueDate: {
                lt: today
              }
            }
          },
          balance: true
        }
      });
    }, 'Vadesi geçmiş müşteriler getirilemedi');
  }

  /**
   * Müşteri istatistiklerini getir
   */
  async getCustomerStats(
    filters: {
      address?: string;
      accountType?: string;
      tag1?: string;
      tag2?: string;
      isActive?: boolean;
      type?: string;
      hasDebt?: boolean;
    },
    userId?: string
  ): Promise<ApiResponse<{
    total: number;
    active: number;
    debt: number;
    avgBalance: number;
  }>> {
    return this.safeDatabaseOperation(async () => {
      console.log('🔍 CustomerService.getCustomerStats - Başladı');
      console.log('🔍 CustomerService.getCustomerStats - userId:', userId);
      console.log('🔍 CustomerService.getCustomerStats - filters:', filters);
      
      const { address, accountType, tag1, tag2, isActive, type, hasDebt } = filters;

      // Kullanıcıya ve filtrelere özel sorgu
      const whereClause: any = userId ? { userId } : {};
      if (address) whereClause.address = { contains: address };
      if (accountType) whereClause.accountType = { contains: accountType };
      if (tag1) whereClause.tag1 = { contains: tag1 };
      if (tag2) whereClause.tag2 = { contains: tag2 };
      if (typeof isActive === 'boolean') whereClause.isActive = isActive;
      if (type) whereClause.type = type;
      if (typeof hasDebt === 'boolean') {
        whereClause.balance = {
          is: { netBalance: hasDebt ? { lt: 0 } : { gte: 0 } }
        };
      }

      console.log('🔍 CustomerService.getCustomerStats - whereClause:', whereClause);

      // Tüm müşterileri getir (sayfalama olmadan)
      const customers = await this.prisma.customer.findMany({
        where: whereClause,
        include: {
          balance: {
            select: {
              netBalance: true
            }
          }
        }
      });

      console.log('🔍 CustomerService.getCustomerStats - customers count:', customers.length);
      console.log('🔍 CustomerService.getCustomerStats - İlk 3 müşteri:', customers.slice(0, 3).map(c => ({ id: c.id, name: c.name, userId: c.userId })));

      const total = customers.length;
      const active = customers.filter(c => c.isActive).length;
      const debt = customers.filter(c => c.balance && c.balance.netBalance < 0).length;
      const avgBalance = total > 0 
        ? customers.reduce((sum, c) => sum + (c.balance?.netBalance || 0), 0) / total 
        : 0;

      const stats = {
        total,
        active,
        debt,
        avgBalance
      };

      console.log('🔍 CustomerService.getCustomerStats - Hesaplanan stats:', stats);

      return stats;
    }, 'Müşteri istatistikleri getirilemedi');
  }

  /**
   * Tüm müşterileri sil
   */
  async deleteAllCustomers(userId?: string): Promise<ApiResponse<{ deletedCount: number }>> {
    return this.safeDatabaseOperation(async () => {
      console.log('🗑️ CustomerService.deleteAllCustomers - Başladı');
      console.log('🗑️ CustomerService.deleteAllCustomers - userId:', userId);
      
      // Kullanıcıya özel müşterileri bul
      const whereClause: any = userId ? { userId } : {};
      console.log('🗑️ CustomerService.deleteAllCustomers - whereClause:', whereClause);
      
      // Önce silinecek müşteri sayısını al
      const customerCount = await this.prisma.customer.count({ where: whereClause });
      console.log('🗑️ CustomerService.deleteAllCustomers - customerCount:', customerCount);
      
      if (customerCount === 0) {
        console.log('🗑️ CustomerService.deleteAllCustomers - Müşteri sayısı 0, işlem sonlandırılıyor');
        return { deletedCount: 0 };
      }

      // Cascade delete eklendiği için artık ilişkili işlemleri kontrol etmeye gerek yok
      // Tüm ilişkili veriler (transactions, balances, extractTransactions, vb.) otomatik silinecek
      console.log('🗑️ CustomerService.deleteAllCustomers - Cascade delete aktif, ilişkili veriler otomatik silinecek');

      // Tüm müşterileri sil (cascade ile ilişkili veriler de silinir)
      console.log('🗑️ CustomerService.deleteAllCustomers - Müşteriler siliniyor...');
      await this.prisma.customer.deleteMany({
        where: whereClause
      });

      console.log('🗑️ CustomerService.deleteAllCustomers - Müşteriler başarıyla silindi');
      return { deletedCount: customerCount };
    }, 'Tüm müşteriler silinemedi');
  }
}
