"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const logger_1 = require("@/shared/logger");
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const i18n_1 = require("../../utils/i18n");
const uuid_1 = require("uuid");
const ALLOWED_SORT_FIELDS = ['name', 'phone', 'address', 'type'];
const prisma = new client_1.PrismaClient();
class CustomerController {
    static async getAllCustomers(req, res) {
        try {
            const { page = 1, limit = 10, type, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
            const sortField = sortBy;
            if (!ALLOWED_SORT_FIELDS.includes(sortField)) {
                return res.status(400).json({
                    success: false,
                    message: 'Ge\u00e7erli bir s\u0131ralama alan\u0131 giriniz'
                });
            }
            const userId = req.user.id;
            const pageNum = Number(page);
            const limitNum = Number(limit);
            if (!Number.isInteger(pageNum) ||
                !Number.isInteger(limitNum) ||
                pageNum <= 0 ||
                limitNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Sayfa ve limit pozitif tamsayı olmalıdır'
                });
            }
            const skip = (pageNum - 1) * limitNum;
            const where = {
                userId: userId
            };
            if (type) {
                where.type = type;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { phone: { contains: search } },
                    { address: { contains: search } }
                ];
            }
            const orderBy = {};
            orderBy[sortField] = sortOrder;
            const total = await prisma.customer.count({ where });
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
                        take: 5
                    }
                },
                orderBy,
                skip,
                take: limitNum
            }));
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
        }
        catch (error) {
            (0, logger_1.logError)('Müşteriler getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMERS_FETCH_ERROR')
            });
        }
    }
    static async getCustomer(req, res) {
        try {
            const { id } = req.params;
            const customerId = id;
            const userId = req.user.id;
            const customer = (await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId: userId
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
            }));
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMER_NOT_FOUND')
                });
            }
            return res.json({
                success: true,
                data: customer
            });
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMER_FETCH_ERROR')
            });
        }
    }
    static async createCustomer(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'VALIDATION_ERROR'),
                    errors: errors.array()
                });
            }
            const { name, phone, address, type = 'INDIVIDUAL', accountType, tag1, tag2 } = req.body;
            const userId = req.user.id;
            let code;
            do {
                code = `CUST_${(0, uuid_1.v4)()}`;
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
                message: (0, i18n_1.t)(req, 'CUSTOMER_CREATE_SUCCESS'),
                data: customer
            });
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri oluşturulurken hata:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMER_CREATE_ERROR')
            });
        }
    }
    static async updateCustomer(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'VALIDATION_ERROR'),
                    errors: errors.array()
                });
            }
            const { id } = req.params;
            const customerId = id;
            const userId = req.user.id;
            const { name, phone, address, type, accountType, tag1, tag2 } = req.body;
            const existingCustomer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    userId: userId
                }
            });
            if (!existingCustomer) {
                return res.status(404).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMER_NOT_FOUND')
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
                message: (0, i18n_1.t)(req, 'CUSTOMER_UPDATE_SUCCESS'),
                data: customer
            });
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri güncellenirken hata:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMER_UPDATE_ERROR')
            });
        }
    }
    static async deleteCustomer(req, res) {
        try {
            const { id } = req.params;
            const customerId = id;
            const userId = req.user.id;
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
            }));
            if (!existingCustomer) {
                return res.status(404).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMER_NOT_FOUND')
                });
            }
            if (existingCustomer?._count?.transactions > 0) {
                return res.status(400).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMER_DELETE_HAS_TRANSACTIONS')
                });
            }
            await prisma.customer.delete({
                where: { id: customerId }
            });
            return res.json({
                success: true,
                message: (0, i18n_1.t)(req, 'CUSTOMER_DELETE_SUCCESS')
            });
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri silinirken hata:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMER_DELETE_ERROR')
            });
        }
    }
    static async getCustomerStats(req, res) {
        try {
            const { customerId } = req.params;
            const customerIdStr = customerId;
            const userId = req.user.id;
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerIdStr,
                    userId: userId
                }
            });
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMER_NOT_FOUND')
                });
            }
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
            const monthlyStats = await prisma.transaction.groupBy({
                by: ['type'],
                where: { customerId: customerIdStr },
                _sum: { amount: true },
                _count: true
            });
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
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri istatistikleri getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMER_STATS_ERROR')
            });
        }
    }
    static async searchCustomers(req, res) {
        try {
            const { q, limit = 10 } = req.query;
            const searchQuery = q;
            const limitNum = Number(limit);
            const userId = req.user.id;
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
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri arama hatası:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMER_SEARCH_ERROR')
            });
        }
    }
    static async deleteMultipleCustomers(req, res) {
        try {
            const { ids } = req.body;
            const userId = req.user.id;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMER_ID_LIST_REQUIRED')
                });
            }
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
            }));
            if (customers.length !== ids.length) {
                return res.status(404).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMERS_NOT_FOUND')
                });
            }
            const customersWithTransactions = customers.filter(c => (c._count?.transactions ?? 0) > 0);
            if (customersWithTransactions.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: (0, i18n_1.t)(req, 'CUSTOMERS_DELETE_HAS_TRANSACTIONS')
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
                message: (0, i18n_1.t)(req, 'CUSTOMERS_DELETE_SUCCESS', { count: ids.length })
            });
        }
        catch (error) {
            (0, logger_1.logError)('Toplu müşteri silme hatası:', error);
            return res.status(500).json({
                success: false,
                message: (0, i18n_1.t)(req, 'CUSTOMERS_DELETE_ERROR')
            });
        }
    }
}
exports.CustomerController = CustomerController;
//# sourceMappingURL=controller.js.map