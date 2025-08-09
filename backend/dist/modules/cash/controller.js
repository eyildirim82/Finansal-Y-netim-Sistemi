"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashController = void 0;
const logger_1 = require("../../shared/logger");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CashController {
    async createCashFlow(req, res) {
        try {
            const userId = req.user.id;
            const { date, openingBalance, closingBalance, totalIncome, totalExpense, difference, notes } = req.body;
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
            return res.json({
                success: true,
                cashFlow
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kasa akışı oluşturma hatası:', error);
            return res.status(500).json({ error: 'Kasa akışı oluşturulamadı' });
        }
    }
    async getCashFlows(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, startDate, endDate } = req.query;
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
            const where = { userId };
            if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }
            const cashFlows = await prisma.cashFlow.findMany({
                where,
                orderBy: { date: 'desc' },
                skip,
                take: limitNum
            });
            const total = await prisma.cashFlow.count({ where });
            return res.json({
                cashFlows,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kasa akışları getirme hatası:', error);
            return res.status(500).json({ error: 'Kasa akışları getirilemedi' });
        }
    }
    async getCurrentBalance(req, res) {
        try {
            const userId = req.user.id;
            const lastCashFlow = await prisma.cashFlow.findFirst({
                where: { userId },
                orderBy: { date: 'desc' }
            });
            if (!lastCashFlow) {
                return res.json({
                    success: true,
                    data: {
                        currentBalance: 0,
                        lastUpdate: null,
                        message: 'Henüz kasa kaydı bulunmuyor'
                    }
                });
            }
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const lastFlowDate = new Date(lastCashFlow.date);
            lastFlowDate.setHours(0, 0, 0, 0);
            let currentBalance = lastCashFlow.closingBalance;
            if (lastFlowDate.getTime() !== today.getTime()) {
                const todayTransactions = await prisma.transaction.findMany({
                    where: {
                        userId,
                        date: {
                            gte: today
                        }
                    }
                });
                const todayIncome = todayTransactions
                    .filter(t => t.type === 'INCOME')
                    .reduce((sum, t) => sum + t.amount, 0);
                const todayExpense = todayTransactions
                    .filter(t => t.type === 'EXPENSE')
                    .reduce((sum, t) => sum + t.amount, 0);
                currentBalance = lastCashFlow.closingBalance + todayIncome - todayExpense;
            }
            return res.json({
                success: true,
                data: {
                    currentBalance,
                    lastUpdate: lastCashFlow.date,
                    lastCashFlow: {
                        openingBalance: lastCashFlow.openingBalance,
                        closingBalance: lastCashFlow.closingBalance,
                        totalIncome: lastCashFlow.totalIncome,
                        totalExpense: lastCashFlow.totalExpense
                    }
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Mevcut bakiye hesaplama hatası:', error);
            return res.status(500).json({ error: 'Mevcut bakiye hesaplanamadı' });
        }
    }
    async countCash(req, res) {
        try {
            const userId = req.user.id;
            const { actualAmount, notes } = req.body;
            if (!actualAmount || isNaN(Number(actualAmount))) {
                return res.status(400).json({
                    success: false,
                    error: 'Geçerli bir tutar gerekli'
                });
            }
            const lastCashFlow = await prisma.cashFlow.findFirst({
                where: { userId },
                orderBy: { date: 'desc' }
            });
            const expectedBalance = lastCashFlow ? lastCashFlow.closingBalance : 0;
            const actualBalance = Number(actualAmount);
            const difference = actualBalance - expectedBalance;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingFlow = await prisma.cashFlow.findFirst({
                where: {
                    userId,
                    date: today
                }
            });
            if (existingFlow) {
                await prisma.cashFlow.update({
                    where: { id: existingFlow.id },
                    data: {
                        closingBalance: actualBalance,
                        difference,
                        notes: notes || `Kasa sayımı: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} TL`
                    }
                });
            }
            else {
                await prisma.cashFlow.create({
                    data: {
                        userId,
                        date: today,
                        openingBalance: expectedBalance,
                        closingBalance: actualBalance,
                        totalIncome: difference > 0 ? difference : 0,
                        totalExpense: difference < 0 ? Math.abs(difference) : 0,
                        difference,
                        notes: notes || `Kasa sayımı: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} TL`
                    }
                });
            }
            return res.json({
                success: true,
                data: {
                    expectedBalance,
                    actualBalance,
                    difference,
                    message: difference === 0 ? 'Kasa sayımı doğru' : `Fark: ${difference > 0 ? '+' : ''}${difference.toFixed(2)} TL`
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kasa sayımı hatası:', error);
            return res.status(500).json({ error: 'Kasa sayımı yapılamadı' });
        }
    }
    async getCashReport(req, res) {
        try {
            const userId = req.user.id;
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    error: 'Başlangıç ve bitiş tarihi gerekli'
                });
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
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
            const transactions = await prisma.transaction.findMany({
                where: {
                    userId,
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                include: {
                    category: true,
                    customer: true
                },
                orderBy: { date: 'desc' }
            });
            const totalIncome = transactions
                .filter(t => t.type === 'INCOME')
                .reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = transactions
                .filter(t => t.type === 'EXPENSE')
                .reduce((sum, t) => sum + t.amount, 0);
            const netCashFlow = totalIncome - totalExpense;
            return res.json({
                success: true,
                data: {
                    period: { start, end },
                    summary: {
                        totalIncome,
                        totalExpense,
                        netCashFlow,
                        cashFlowCount: cashFlows.length,
                        transactionCount: transactions.length
                    },
                    cashFlows,
                    transactions
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kasa raporu hatası:', error);
            return res.status(500).json({ error: 'Kasa raporu oluşturulamadı' });
        }
    }
    async addCashTransaction(req, res) {
        try {
            const userId = req.user.id;
            const { type, amount, description, categoryId, customerId, date } = req.body;
            if (!type || !amount || !description) {
                return res.status(400).json({
                    success: false,
                    error: 'Tip, tutar ve açıklama gerekli'
                });
            }
            if (!['INCOME', 'EXPENSE'].includes(type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Geçersiz işlem tipi'
                });
            }
            const transaction = await prisma.transaction.create({
                data: {
                    userId,
                    type,
                    amount: Number(amount),
                    description,
                    date: date ? new Date(date) : new Date(),
                    categoryId: categoryId || null,
                    customerId: customerId || null
                },
                include: {
                    category: true,
                    customer: true
                }
            });
            return res.json({
                success: true,
                data: transaction
            });
        }
        catch (error) {
            (0, logger_1.logError)('Kasa işlemi ekleme hatası:', error);
            return res.status(500).json({ error: 'Kasa işlemi eklenemedi' });
        }
    }
    async getCashTransactions(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, type, startDate, endDate } = req.query;
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
            const where = { userId };
            if (type)
                where.type = type;
            if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                };
            }
            const transactions = await prisma.transaction.findMany({
                where,
                include: {
                    category: true,
                    customer: true
                },
                orderBy: { date: 'desc' },
                skip,
                take: limitNum
            });
            const total = await prisma.transaction.count({ where });
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
            (0, logger_1.logError)('Kasa işlemleri getirme hatası:', error);
            return res.status(500).json({ error: 'Kasa işlemleri getirilemedi' });
        }
    }
}
exports.CashController = CashController;
//# sourceMappingURL=controller.js.map