"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const logger_1 = require("../../shared/logger");
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const prisma = new client_1.PrismaClient();
class TransactionController {
    static async getAllTransactions(req, res) {
        try {
            const { page = 1, limit = 25, type, categoryId, customerId, startDate, endDate, minAmount, maxAmount, search } = req.query;
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
            const where = {};
            if (type) {
                where.type = type;
            }
            if (categoryId) {
                where.categoryId = categoryId;
            }
            if (customerId) {
                where.customerId = customerId;
            }
            if (startDate || endDate) {
                where.date = {};
                if (startDate) {
                    where.date.gte = new Date(startDate);
                }
                if (endDate) {
                    where.date.lte = new Date(endDate);
                }
            }
            if (minAmount || maxAmount) {
                where.amount = {};
                if (minAmount) {
                    where.amount.gte = parseFloat(minAmount);
                }
                if (maxAmount) {
                    where.amount.lte = parseFloat(maxAmount);
                }
            }
            if (search) {
                where.OR = [
                    { description: { contains: search, mode: 'insensitive' } },
                    { customer: { name: { contains: search, mode: 'insensitive' } } },
                    { category: { name: { contains: search, mode: 'insensitive' } } }
                ];
            }
            const total = await prisma.transaction.count({ where });
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
        }
        catch (error) {
            (0, logger_1.logError)('İşlemler getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlemler getirilirken bir hata oluştu'
            });
        }
    }
    static async getTransaction(req, res) {
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
        }
        catch (error) {
            (0, logger_1.logError)('İşlem getirilirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlem getirilirken bir hata oluştu'
            });
        }
    }
    static async createTransaction(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validasyon hatası',
                    errors: errors.array()
                });
            }
            const { type, amount, description, date, categoryId, customerId } = req.body;
            const userId = req.user.id;
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
        }
        catch (error) {
            (0, logger_1.logError)('İşlem oluşturulurken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlem oluşturulurken bir hata oluştu'
            });
        }
    }
    static async updateTransaction(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validasyon hatası',
                    errors: errors.array()
                });
            }
            const { id } = req.params;
            const { type, amount, description, date, categoryId, customerId } = req.body;
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
        }
        catch (error) {
            (0, logger_1.logError)('İşlem güncellenirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlem güncellenirken bir hata oluştu'
            });
        }
    }
    static async deleteTransaction(req, res) {
        try {
            const { id } = req.params;
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
        }
        catch (error) {
            (0, logger_1.logError)('İşlem silinirken hata:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlem silinirken bir hata oluştu'
            });
        }
    }
    static async getTransactionStats(req, res) {
        try {
            const { startDate, endDate, type } = req.query;
            const userId = req.user.id;
            const where = { userId };
            if (startDate || endDate) {
                where.date = {};
                if (startDate) {
                    where.date.gte = new Date(startDate);
                }
                if (endDate) {
                    where.date.lte = new Date(endDate);
                }
            }
            if (type) {
                where.type = type;
            }
            const totalStats = await prisma.transaction.aggregate({
                where,
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            });
            const incomeStats = await prisma.transaction.aggregate({
                where: { ...where, type: 'INCOME' },
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            });
            const expenseStats = await prisma.transaction.aggregate({
                where: { ...where, type: 'EXPENSE' },
                _sum: {
                    amount: true
                },
                _count: {
                    id: true
                }
            });
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
        }
        catch (error) {
            (0, logger_1.logError)('İşlem istatistikleri hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlem istatistikleri alınırken bir hata oluştu'
            });
        }
    }
    static async deleteMultipleTransactions(req, res) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli işlem ID\'leri gerekli'
                });
            }
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
            await prisma.transaction.deleteMany({
                where: {
                    id: { in: ids }
                }
            });
            return res.json({
                success: true,
                message: `${ids.length} işlem başarıyla silindi`
            });
        }
        catch (error) {
            (0, logger_1.logError)('Çoklu işlem silme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlemler silinirken bir hata oluştu'
            });
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=controller.js.map