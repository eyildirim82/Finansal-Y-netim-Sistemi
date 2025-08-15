"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const BaseService_1 = require("../../shared/services/BaseService");
class CustomerService extends BaseService_1.BaseService {
    async getCustomers(params, userId) {
        return this.safeDatabaseOperation(async () => {
            const { page, limit, sortBy, sortOrder } = this.validatePaginationParams(params);
            const { address, accountType, tag1, tag2, isActive, type, hasDebt } = params;
            const skip = (page - 1) * limit;
            const whereClause = userId ? { userId } : {};
            if (address)
                whereClause.address = { contains: address };
            if (accountType)
                whereClause.accountType = { contains: accountType };
            if (tag1)
                whereClause.tag1 = { contains: tag1 };
            if (tag2)
                whereClause.tag2 = { contains: tag2 };
            if (typeof isActive === 'boolean')
                whereClause.isActive = isActive;
            if (type)
                whereClause.type = type;
            if (typeof hasDebt === 'boolean') {
                whereClause.balance = {
                    is: { netBalance: hasDebt ? { lt: 0 } : { gte: 0 } }
                };
            }
            const [customers, total] = await Promise.all([
                this.prisma.customer.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { [sortBy]: sortOrder },
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
    async getCustomerById(id) {
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
    async createCustomer(data) {
        return this.safeDatabaseOperation(async () => {
            return await this.prisma.customer.create({
                data: {
                    ...data,
                    dueDays: data.dueDays || 0
                }
            });
        }, 'Müşteri oluşturulamadı');
    }
    async updateCustomer(id, data) {
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
    async deleteCustomer(id) {
        return this.safeDatabaseOperation(async () => {
            const customer = await this.prisma.customer.findUnique({ where: { id } });
            if (!customer) {
                throw new Error('Müşteri bulunamadı');
            }
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
    async searchCustomers(query, params) {
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
    async updateCustomerBalance(id, amount) {
        return this.safeDatabaseOperation(async () => {
            const existingBalance = await this.prisma.balance.findUnique({
                where: { customerId: id }
            });
            if (existingBalance) {
                await this.prisma.balance.update({
                    where: { customerId: id },
                    data: {
                        netBalance: {
                            increment: amount
                        },
                        lastUpdated: new Date()
                    }
                });
            }
            else {
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
    async getOverdueCustomers() {
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
    async getCustomerStats(filters, userId) {
        return this.safeDatabaseOperation(async () => {
            console.log('🔍 CustomerService.getCustomerStats - Başladı');
            console.log('🔍 CustomerService.getCustomerStats - userId:', userId);
            console.log('🔍 CustomerService.getCustomerStats - filters:', filters);
            const { address, accountType, tag1, tag2, isActive, type, hasDebt } = filters;
            const whereClause = userId ? { userId } : {};
            if (address)
                whereClause.address = { contains: address };
            if (accountType)
                whereClause.accountType = { contains: accountType };
            if (tag1)
                whereClause.tag1 = { contains: tag1 };
            if (tag2)
                whereClause.tag2 = { contains: tag2 };
            if (typeof isActive === 'boolean')
                whereClause.isActive = isActive;
            if (type)
                whereClause.type = type;
            if (typeof hasDebt === 'boolean') {
                whereClause.balance = {
                    is: { netBalance: hasDebt ? { lt: 0 } : { gte: 0 } }
                };
            }
            console.log('🔍 CustomerService.getCustomerStats - whereClause:', whereClause);
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
    async deleteAllCustomers(userId) {
        return this.safeDatabaseOperation(async () => {
            const whereClause = userId ? { userId } : {};
            const customerCount = await this.prisma.customer.count({ where: whereClause });
            if (customerCount === 0) {
                return { deletedCount: 0 };
            }
            const customersWithTransactions = await this.prisma.customer.findMany({
                where: whereClause,
                include: {
                    transactions: {
                        select: { id: true }
                    }
                }
            });
            const customersWithTransactionsCount = customersWithTransactions.filter(c => c.transactions.length > 0).length;
            if (customersWithTransactionsCount > 0) {
                throw new Error(`${customersWithTransactionsCount} müşterinin işlemleri bulunduğu için silinemez. Önce işlemleri siliniz.`);
            }
            await this.prisma.customer.deleteMany({
                where: whereClause
            });
            return { deletedCount: customerCount };
        }, 'Tüm müşteriler silinemedi');
    }
}
exports.CustomerService = CustomerService;
//# sourceMappingURL=service.js.map