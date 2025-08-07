"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingController = void 0;
const logger_1 = require("@/shared/logger");
const client_1 = require("@prisma/client");
const emailService_1 = require("./emailService");
const paymentMatchingService_1 = require("./paymentMatchingService");
const prisma = new client_1.PrismaClient();
class BankingController {
    constructor() {
        this.emailService = new emailService_1.YapiKrediFASTEmailService();
        this.matchingService = new paymentMatchingService_1.PaymentMatchingService();
    }
    async fetchEmails(req, res) {
        try {
            console.log('📧 Otomatik email çekme başlatılıyor...');
            const emails = await this.emailService.fetchYapiKrediFASTEmails();
            if (emails.length === 0) {
                return res.json({
                    success: true,
                    message: 'Yeni email bulunamadı',
                    data: { processed: 0, transactions: [] }
                });
            }
            const processedTransactions = [];
            let duplicateCount = 0;
            for (const emailData of emails) {
                try {
                    const existingTransaction = await prisma.bankTransaction.findFirst({
                        where: { messageId: emailData.transaction.messageId }
                    });
                    if (existingTransaction) {
                        duplicateCount++;
                        continue;
                    }
                    const savedTransaction = await prisma.bankTransaction.create({
                        data: emailData.transaction
                    });
                    const matchResult = await this.matchingService.matchTransaction(savedTransaction);
                    await this.matchingService.saveMatchResult(savedTransaction.id, matchResult);
                    processedTransactions.push({
                        transaction: savedTransaction,
                        matchResult
                    });
                }
                catch (error) {
                    (0, logger_1.logError)('Email işleme hatası:', error);
                }
            }
            const metrics = this.emailService.getMetrics();
            return res.json({
                success: true,
                message: `${processedTransactions.length} email işlendi, ${duplicateCount} duplikasyon`,
                data: {
                    processed: processedTransactions.length,
                    duplicates: duplicateCount,
                    transactions: processedTransactions,
                    metrics
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Otomatik email çekme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Email çekme sırasında hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async processEmail(req, res) {
        try {
            const { emailContent, emailSubject, messageId } = req.body;
            if (!emailContent || !messageId) {
                return res.status(400).json({
                    success: false,
                    message: 'Email içeriği ve messageId gerekli'
                });
            }
            const transaction = await this.parseYapiKrediEmail(emailContent, emailSubject, messageId);
            if (!transaction) {
                return res.status(400).json({
                    success: false,
                    message: 'Email parse edilemedi'
                });
            }
            const existingTransaction = await prisma.bankTransaction.findFirst({
                where: { messageId: transaction.messageId }
            });
            if (existingTransaction) {
                return res.status(409).json({
                    success: false,
                    message: 'Bu işlem zaten mevcut',
                    transactionId: existingTransaction.id
                });
            }
            const savedTransaction = await prisma.bankTransaction.create({
                data: transaction
            });
            const matchResult = await this.matchingService.matchTransaction(savedTransaction);
            await this.matchingService.saveMatchResult(savedTransaction.id, matchResult);
            return res.json({
                success: true,
                message: 'Email başarıyla işlendi',
                data: {
                    transaction: savedTransaction,
                    matchResult
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Email işleme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Email işlenirken hata oluştu'
            });
        }
    }
    async getBankTransactions(req, res) {
        try {
            const { page = 1, limit = 20, direction, isMatched, startDate, endDate } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            const where = {};
            if (direction)
                where.direction = direction;
            if (isMatched !== undefined)
                where.isMatched = isMatched === 'true';
            if (startDate || endDate) {
                where.transactionDate = {};
                if (startDate)
                    where.transactionDate.gte = new Date(startDate);
                if (endDate)
                    where.transactionDate.lte = new Date(endDate);
            }
            const total = await prisma.bankTransaction.count({ where });
            const transactions = await prisma.bankTransaction.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    paymentMatches: {
                        include: {
                            customer: {
                                select: {
                                    id: true,
                                    name: true,
                                    code: true
                                }
                            }
                        }
                    }
                },
                orderBy: { transactionDate: 'desc' },
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
            (0, logger_1.logError)('Banka işlemleri getirme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Banka işlemleri getirilemedi'
            });
        }
    }
    async getUnmatchedPayments(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;
            const skip = (pageNum - 1) * limitNum;
            const total = await prisma.bankTransaction.count({
                where: { isMatched: false }
            });
            const transactions = await prisma.bankTransaction.findMany({
                where: { isMatched: false },
                orderBy: { transactionDate: 'desc' },
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
            (0, logger_1.logError)('Eşleşmemiş ödemeler getirme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Eşleşmemiş ödemeler getirilemedi'
            });
        }
    }
    async matchPayment(req, res) {
        try {
            const { transactionId, customerId } = req.body;
            if (!transactionId || !customerId) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction ID ve Customer ID gerekli'
                });
            }
            const transaction = await prisma.bankTransaction.findUnique({
                where: { id: transactionId }
            });
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    error: 'İşlem bulunamadı'
                });
            }
            const customer = await prisma.customer.findUnique({
                where: { id: customerId }
            });
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    error: 'Müşteri bulunamadı'
                });
            }
            const matchResult = {
                matched: true,
                customer: customer,
                confidence: 1.0,
                methods: ['manual_match']
            };
            await this.matchingService.saveMatchResult(transactionId, matchResult);
            return res.json({
                success: true,
                message: 'Eşleştirme başarıyla kaydedildi',
                data: {
                    transaction: transaction,
                    customer: customer,
                    confidence: 1.0
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Manuel eşleştirme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Manuel eşleştirme yapılamadı'
            });
        }
    }
    async getEmailSettings(req, res) {
        try {
            const settings = {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                user: process.env.EMAIL_USER,
                isConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
            };
            return res.json({
                success: true,
                data: settings
            });
        }
        catch (error) {
            (0, logger_1.logError)('Email ayarları getirme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Email ayarları getirilemedi'
            });
        }
    }
    async testEmailConnection(req, res) {
        try {
            const isConnected = await this.emailService.testConnection();
            return res.json({
                success: true,
                data: {
                    connected: isConnected
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Email bağlantı testi hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Email bağlantı testi yapılamadı'
            });
        }
    }
    async getMatchingStats(req, res) {
        try {
            const totalTransactions = await prisma.bankTransaction.count();
            const matchedTransactions = await prisma.bankTransaction.count({
                where: { isMatched: true }
            });
            const unmatchedTransactions = totalTransactions - matchedTransactions;
            const stats = {
                total: totalTransactions,
                matched: matchedTransactions,
                unmatched: unmatchedTransactions,
                matchRate: totalTransactions > 0 ? (matchedTransactions / totalTransactions) * 100 : 0
            };
            return res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            (0, logger_1.logError)('Eşleştirme istatistikleri hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Eşleştirme istatistikleri getirilemedi'
            });
        }
    }
    async runAutoMatching(req, res) {
        try {
            const { limit = 100 } = req.query;
            const limitNum = parseInt(limit) || 100;
            const unmatchedTransactions = await prisma.bankTransaction.findMany({
                where: { isMatched: false },
                take: limitNum,
                orderBy: { transactionDate: 'desc' }
            });
            let matchedCount = 0;
            const results = [];
            for (const transaction of unmatchedTransactions) {
                try {
                    const matchResult = await this.matchingService.matchTransaction(transaction);
                    if (matchResult.matched) {
                        await this.matchingService.saveMatchResult(transaction.id, matchResult);
                        matchedCount++;
                    }
                    results.push({
                        transactionId: transaction.id,
                        matched: matchResult.matched,
                        confidence: matchResult.confidence,
                        customer: matchResult.customer?.name || null
                    });
                }
                catch (error) {
                    (0, logger_1.logError)(`İşlem eşleştirme hatası (${transaction.id}):`, error);
                    results.push({
                        transactionId: transaction.id,
                        matched: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return res.json({
                success: true,
                message: `${matchedCount} işlem eşleştirildi`,
                data: {
                    processed: unmatchedTransactions.length,
                    matched: matchedCount,
                    results
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Otomatik eşleştirme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Otomatik eşleştirme çalıştırılamadı'
            });
        }
    }
    async parseYapiKrediEmail(emailContent, emailSubject, messageId) {
        try {
            const mockEmail = {
                html: emailContent,
                subject: emailSubject,
                messageId: messageId,
                from: '',
                date: new Date()
            };
            return await this.emailService.parseYapiKrediFASTEmail(mockEmail);
        }
        catch (error) {
            (0, logger_1.logError)('Email parse hatası:', error);
            return null;
        }
    }
}
exports.BankingController = BankingController;
//# sourceMappingURL=controller.js.map