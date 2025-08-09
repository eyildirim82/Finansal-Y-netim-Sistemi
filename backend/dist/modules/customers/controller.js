"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const logger_1 = require("../../shared/logger");
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const i18n_1 = require("../../utils/i18n");
const uuid_1 = require("uuid");
const ALLOWED_SORT_FIELDS = ['name', 'phone', 'address', 'type', 'createdAt', 'balance'];
const prisma = new client_1.PrismaClient();
class CustomerController {
    static async getAllCustomers(req, res) {
        try {
            const { page = 1, limit = 10, type, search, sortBy = 'name', sortOrder = 'asc', hideFactoring = 'true' } = req.query;
            const sortField = sortBy;
            if (!ALLOWED_SORT_FIELDS.includes(sortField)) {
                return res.status(400).json({
                    success: false,
                    message: 'Ge\u00e7erli bir s\u0131ralama alan\u0131 giriniz'
                });
            }
            const userId = req.user.id;
            console.log('[DEBUG] /customers endpoint userId:', userId);
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
                userId: userId,
                code: {
                    not: {
                        startsWith: 'MH'
                    }
                }
            };
            if (hideFactoring === 'true' || hideFactoring === '1') {
                where.name = {
                    not: {
                        contains: 'FAKTORING'
                    }
                };
            }
            if (type && typeof type === 'string' && type.trim() !== '') {
                where.type = type;
            }
            if (search) {
                where.OR = [
                    { name: { contains: search } },
                    { phone: { contains: search } },
                    { address: { contains: search } }
                ];
            }
            let orderBy;
            if (sortField === 'balance') {
                orderBy = { balance: { netBalance: sortOrder } };
            }
            else {
                orderBy = { [sortField]: sortOrder };
            }
            const total = await prisma.customer.count({ where });
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
                        take: 5
                    }
                },
                orderBy,
                skip,
                take: limitNum
            }));
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
            const extractCountMap = new Map();
            extractTransactionCounts.forEach(item => {
                extractCountMap.set(item.customerId, item._count.customerId);
            });
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
            const allTransactions = [
                ...customer.transactions.map((tx) => ({
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
            const { q, limit = 10, hideFactoring = 'true' } = req.query;
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
            const whereClause = {
                userId: userId,
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
    static async deleteOldCustomers(req, res) {
        try {
            const { beforeDate, deleteAll, force } = req.body;
            const userId = req.user.id;
            console.log('[DEBUG] deleteOldCustomers - Params:', { beforeDate, deleteAll, force, userId });
            let whereClause = { userId };
            if (deleteAll === true || deleteAll === 'true') {
                whereClause = { userId };
            }
            else if (beforeDate) {
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
                }
                catch (error) {
                    return res.status(400).json({
                        error: 'Geçerli bir tarih formatı giriniz'
                    });
                }
            }
            else {
                return res.status(400).json({
                    error: 'beforeDate veya deleteAll parametresi gerekli'
                });
            }
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
            const customersWithTransactions = customers.filter(c => (c._count?.transactions ?? 0) > 0);
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
            const allCustomerIds = customers.map(c => c.id);
            await prisma.balance.deleteMany({
                where: {
                    customerId: {
                        in: allCustomerIds
                    }
                }
            });
            if ((force === true || force === 'true') && customersWithAnyTransactions.length > 0) {
                const customerIds = customersWithAnyTransactions.map(c => c.id);
                await prisma.transaction.deleteMany({
                    where: {
                        customerId: {
                            in: customerIds
                        }
                    }
                });
                await prisma.extractTransaction.deleteMany({
                    where: {
                        customerId: {
                            in: customerIds
                        }
                    }
                });
                await prisma.bankTransaction.deleteMany({
                    where: {
                        matchedCustomerId: {
                            in: customerIds
                        }
                    }
                });
                await prisma.paymentMatch.deleteMany({
                    where: {
                        customerId: {
                            in: customerIds
                        }
                    }
                });
            }
            await prisma.customer.deleteMany({
                where: whereClause
            });
            return res.json({
                success: true,
                message: `${customers.length} müşteri başarıyla silindi`,
                deletedCount: customers.length,
                forceDeleted: (force === true || force === 'true') && customersWithAnyTransactions.length > 0
            });
        }
        catch (error) {
            console.error('[DEBUG] deleteOldCustomers - Detaylı hata:', error);
            (0, logger_1.logError)('Eski müşterileri silme hatası:', error);
            return res.status(500).json({
                error: 'Müşteriler silinirken hata oluştu',
                details: error instanceof Error ? error.message : 'Bilinmeyen hata'
            });
        }
    }
}
exports.CustomerController = CustomerController;
//# sourceMappingURL=controller.js.map