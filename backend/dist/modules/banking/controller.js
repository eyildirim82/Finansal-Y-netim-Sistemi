"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingController = void 0;
const logger_1 = require("../../shared/logger");
const client_1 = require("@prisma/client");
const emailService_1 = require("./emailService");
const paymentMatchingService_1 = require("./paymentMatchingService");
const pdfParserService_1 = require("./pdfParserService");
const etlService_1 = require("./etlService");
const prisma = new client_1.PrismaClient();
class BankingController {
    constructor() {
        this.emailService = new emailService_1.YapiKrediFASTEmailService();
        this.matchingService = new paymentMatchingService_1.PaymentMatchingService();
        this.pdfParserService = new pdfParserService_1.PDFParserService();
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
    async getPDFTransactions(req, res) {
        try {
            const { page = 1, limit = 50, direction, category, startDate, endDate } = req.query;
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 50;
            const skip = (pageNum - 1) * limitNum;
            const where = {};
            if (direction)
                where.direction = direction;
            if (category)
                where.category = category;
            if (startDate || endDate) {
                where.dateTimeIso = {};
                if (startDate)
                    where.dateTimeIso.gte = startDate;
                if (endDate)
                    where.dateTimeIso.lte = endDate;
            }
            const total = await prisma.pDFTransaction.count({ where });
            const transactions = await prisma.pDFTransaction.findMany({
                where,
                orderBy: { dateTimeIso: 'desc' },
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
            (0, logger_1.logError)('PDF işlemleri getirme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'PDF işlemleri getirilemedi'
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
                host: process.env.EMAIL_HOST || process.env.MAIL_HOST,
                port: process.env.EMAIL_PORT || process.env.MAIL_PORT,
                user: process.env.EMAIL_USER || process.env.MAIL_USER,
                from: process.env.YAPIKREDI_FROM_EMAIL,
                subjectFilter: process.env.YAPIKREDI_SUBJECT_FILTER,
                autoProcess: (process.env.YAPIKREDI_AUTO_PROCESS || 'false').toLowerCase() === 'true',
                realtimeMonitoring: (process.env.YAPIKREDI_REALTIME_MONITORING || 'false').toLowerCase() === 'true',
                isConfigured: !!((process.env.EMAIL_HOST || process.env.MAIL_HOST) && (process.env.EMAIL_USER || process.env.MAIL_USER) && (process.env.EMAIL_PASS || process.env.MAIL_PASS))
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
    async getEmailStats(req, res) {
        try {
            const stats = await this.emailService.getEmailStats();
            return res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            (0, logger_1.logError)('Email istatistikleri hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Email istatistikleri getirilemedi'
            });
        }
    }
    async fetchEmailsByDateRange(req, res) {
        try {
            const { startDate, endDate } = req.body;
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Başlangıç ve bitiş tarihi gerekli'
                });
            }
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz tarih formatı'
                });
            }
            const emails = await this.emailService.fetchEmailsByDateRange(start, end);
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
            return res.json({
                success: true,
                message: `${processedTransactions.length} email işlendi, ${duplicateCount} duplikasyon`,
                data: {
                    processed: processedTransactions.length,
                    duplicates: duplicateCount,
                    transactions: processedTransactions,
                    dateRange: { startDate: start, endDate: end }
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Tarih aralığı email çekme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Tarih aralığında email çekilemedi'
            });
        }
    }
    async startRealtimeMonitoring(req, res) {
        try {
            await this.emailService.startRealtimeMonitoring((transaction) => {
                console.log('🔄 Yeni işlem tespit edildi:', transaction);
            });
            return res.json({
                success: true,
                message: 'Realtime monitoring başlatıldı'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Realtime monitoring başlatma hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Realtime monitoring başlatılamadı'
            });
        }
    }
    async stopRealtimeMonitoring(req, res) {
        try {
            await this.emailService.stopRealtimeMonitoring();
            return res.json({
                success: true,
                message: 'Realtime monitoring durduruldu'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Realtime monitoring durdurma hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Realtime monitoring durdurulamadı'
            });
        }
    }
    async updateEmailSettings(req, res) {
        try {
            const { host, port, user, pass, secure } = req.body;
            const success = await this.emailService.updateEmailSettings({
                host, port, user, pass, secure
            });
            if (success) {
                return res.json({
                    success: true,
                    message: 'Email ayarları güncellendi'
                });
            }
            else {
                return res.status(400).json({
                    success: false,
                    error: 'Email ayarları güncellenemedi'
                });
            }
        }
        catch (error) {
            (0, logger_1.logError)('Email ayarları güncelleme hatası:', error);
            return res.status(500).json({
                success: false,
                error: 'Email ayarları güncellenemedi'
            });
        }
    }
    async detectMissingTransactions(req, res) {
        try {
            console.log('🔍 Eksik işlem tespiti başlatılıyor...');
            const transactions = await prisma.bankTransaction.findMany({
                orderBy: {
                    transactionDate: 'asc'
                }
            });
            if (transactions.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        missingTransactions: [],
                        summary: {
                            totalGaps: 0,
                            totalDifference: 0,
                            criticalIssues: 0
                        }
                    }
                });
            }
            const firstTransaction = transactions[0];
            const startBalance = (firstTransaction.balanceAfter || 0) -
                (firstTransaction.direction === 'IN' ? firstTransaction.amount : -firstTransaction.amount);
            let currentBalance = startBalance;
            const balanceGaps = [];
            for (let i = 0; i < transactions.length; i++) {
                const tx = transactions[i];
                if (tx.direction === 'IN') {
                    currentBalance += tx.amount;
                }
                else {
                    currentBalance -= tx.amount;
                }
                if (tx.balanceAfter) {
                    const difference = tx.balanceAfter - currentBalance;
                    if (Math.abs(difference) > 1.0) {
                        balanceGaps.push({
                            index: i,
                            transaction: tx,
                            expectedBalance: currentBalance,
                            actualBalance: tx.balanceAfter,
                            difference: difference,
                            missingAmount: Math.abs(difference),
                            isCritical: Math.abs(difference) > 100
                        });
                    }
                }
            }
            const dailyGaps = {};
            balanceGaps.forEach(gap => {
                const date = gap.transaction.transactionDate.toISOString().split('T')[0];
                if (!dailyGaps[date]) {
                    dailyGaps[date] = {
                        gaps: [],
                        totalDifference: 0,
                        criticalGaps: 0
                    };
                }
                dailyGaps[date].gaps.push(gap);
                dailyGaps[date].totalDifference += gap.difference;
                if (gap.isCritical) {
                    dailyGaps[date].criticalGaps++;
                }
            });
            const missingTransactions = [];
            Object.keys(dailyGaps).forEach(date => {
                const day = dailyGaps[date];
                if (Math.abs(day.totalDifference) > 1000) {
                    missingTransactions.push({
                        date: date,
                        estimatedAmount: Math.abs(day.totalDifference),
                        direction: day.totalDifference > 0 ? 'IN' : 'OUT',
                        confidence: 'Yüksek',
                        criticalGaps: day.criticalGaps,
                        totalGaps: day.gaps.length,
                        transactions: day.gaps.map((gap) => ({
                            id: gap.transaction.id,
                            counterpartyName: gap.transaction.counterpartyName,
                            amount: gap.transaction.amount,
                            direction: gap.transaction.direction,
                            transactionDate: gap.transaction.transactionDate,
                            difference: gap.difference,
                            isCritical: gap.isCritical
                        }))
                    });
                }
            });
            const totalDifference = balanceGaps.reduce((sum, gap) => sum + Math.abs(gap.difference), 0);
            const criticalIssues = balanceGaps.filter(gap => gap.isCritical).length;
            const summary = {
                totalGaps: balanceGaps.length,
                totalDifference: totalDifference,
                criticalIssues: criticalIssues,
                missingTransactionsCount: missingTransactions.length,
                startBalance: startBalance,
                endBalance: currentBalance,
                severity: totalDifference > 10000 ? 'CRITICAL' : totalDifference > 1000 ? 'HIGH' : 'LOW'
            };
            return res.json({
                success: true,
                data: {
                    missingTransactions,
                    balanceGaps: balanceGaps.map(gap => ({
                        id: gap.transaction.id,
                        counterpartyName: gap.transaction.counterpartyName,
                        transactionDate: gap.transaction.transactionDate,
                        amount: gap.transaction.amount,
                        direction: gap.transaction.direction,
                        expectedBalance: gap.expectedBalance,
                        actualBalance: gap.actualBalance,
                        difference: gap.difference,
                        isCritical: gap.isCritical
                    })),
                    summary
                }
            });
        }
        catch (error) {
            console.error('❌ Eksik işlem tespiti hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            return res.status(500).json({
                success: false,
                message: 'Eksik işlem tespiti sırasında hata oluştu',
                error: errorMessage
            });
        }
    }
    async parsePDFTransactions(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'PDF dosyası yüklenmedi'
                });
            }
            const filePath = req.file.path;
            console.log(`📄 PDF dosyası yüklendi: ${filePath}`);
            const result = await this.pdfParserService.parsePDF(filePath);
            const existingTransactions = await prisma.bankTransaction.findMany({
                where: {
                    transactionDate: {
                        gte: result.accountInfo?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        lte: result.accountInfo?.endDate || new Date()
                    }
                },
                orderBy: {
                    transactionDate: 'asc'
                }
            });
            console.log(`📊 Mevcut sistem işlemleri alındı: ${existingTransactions.length} işlem`);
            let missingAnalysis = null;
            try {
                if (typeof this.pdfParserService.detectMissingTransactions === 'function') {
                    missingAnalysis = await this.pdfParserService.detectMissingTransactions(result.transactions, existingTransactions);
                }
            }
            catch (missingError) {
                console.log('Eksik işlem tespiti yapılamadı:', missingError);
            }
            return res.json({
                success: true,
                message: 'PDF başarıyla parse edildi',
                data: {
                    ...result,
                    existingTransactions: existingTransactions.length,
                    missingAnalysis
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('PDF parsing hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'PDF parse edilirken hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async savePDFTransactions(req, res) {
        try {
            const { transactions, accountInfo } = req.body;
            if (!transactions || !Array.isArray(transactions)) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli işlem verisi gerekli'
                });
            }
            const savedTransactions = [];
            let duplicateCount = 0;
            for (const tx of transactions) {
                try {
                    const existingTransaction = await prisma.bankTransaction.findFirst({
                        where: {
                            transactionDate: new Date(tx.date),
                            amount: tx.credit > 0 ? tx.credit : tx.debit,
                            direction: tx.credit > 0 ? 'IN' : 'OUT'
                        }
                    });
                    if (existingTransaction) {
                        duplicateCount++;
                        continue;
                    }
                    const savedTransaction = await prisma.bankTransaction.create({
                        data: {
                            messageId: `PDF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            bankCode: 'PDF_IMPORT',
                            direction: tx.credit > 0 ? 'IN' : 'OUT',
                            accountIban: accountInfo.accountNumber || 'UNKNOWN',
                            transactionDate: new Date(tx.date),
                            amount: tx.credit > 0 ? tx.credit : tx.debit,
                            senderName: tx.description,
                            counterpartyName: tx.description,
                            balanceAfter: tx.balance,
                            isMatched: false,
                            rawEmailData: JSON.stringify(tx),
                            parsedData: JSON.stringify({
                                source: 'PDF_IMPORT',
                                accountInfo,
                                originalTransaction: tx
                            })
                        }
                    });
                    savedTransactions.push(savedTransaction);
                }
                catch (error) {
                    (0, logger_1.logError)('İşlem kaydetme hatası:', error);
                }
            }
            return res.json({
                success: true,
                message: `${savedTransactions.length} işlem kaydedildi, ${duplicateCount} duplikasyon`,
                data: {
                    saved: savedTransactions.length,
                    duplicates: duplicateCount,
                    transactions: savedTransactions
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('PDF işlem kaydetme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlemler kaydedilirken hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async deleteTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            if (!transactionId) {
                return res.status(400).json({
                    success: false,
                    message: 'İşlem ID gerekli'
                });
            }
            const transaction = await prisma.bankTransaction.findUnique({
                where: { id: transactionId }
            });
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'İşlem bulunamadı'
                });
            }
            await prisma.paymentMatch.deleteMany({
                where: { bankTransactionId: transactionId }
            });
            await prisma.bankTransaction.delete({
                where: { id: transactionId }
            });
            return res.json({
                success: true,
                message: 'İşlem başarıyla silindi',
                data: {
                    deletedTransaction: transaction
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('İşlem silme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlem silinirken hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async deleteTransactions(req, res) {
        try {
            const { transactionIds, startDate, endDate, direction, isMatched, bankCode, minAmount, maxAmount } = req.body;
            let whereClause = {};
            if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
                whereClause.id = { in: transactionIds };
            }
            else {
                if (startDate || endDate) {
                    whereClause.transactionDate = {};
                    if (startDate)
                        whereClause.transactionDate.gte = new Date(startDate);
                    if (endDate)
                        whereClause.transactionDate.lte = new Date(endDate);
                }
                if (direction)
                    whereClause.direction = direction;
                if (isMatched !== undefined)
                    whereClause.isMatched = isMatched;
                if (bankCode)
                    whereClause.bankCode = bankCode;
                if (minAmount || maxAmount) {
                    whereClause.amount = {};
                    if (minAmount)
                        whereClause.amount.gte = parseFloat(minAmount);
                    if (maxAmount)
                        whereClause.amount.lte = parseFloat(maxAmount);
                }
            }
            const transactionsToDelete = await prisma.bankTransaction.findMany({
                where: whereClause,
                include: {
                    paymentMatches: true
                }
            });
            if (transactionsToDelete.length === 0) {
                return res.json({
                    success: true,
                    message: 'Silinecek işlem bulunamadı',
                    data: {
                        deletedCount: 0,
                        totalAmount: 0
                    }
                });
            }
            const transactionIdsToDelete = transactionsToDelete.map(tx => tx.id);
            await prisma.paymentMatch.deleteMany({
                where: { bankTransactionId: { in: transactionIdsToDelete } }
            });
            await prisma.bankTransaction.deleteMany({
                where: whereClause
            });
            const totalAmount = transactionsToDelete.reduce((sum, tx) => sum + tx.amount, 0);
            return res.json({
                success: true,
                message: `${transactionsToDelete.length} işlem başarıyla silindi`,
                data: {
                    deletedCount: transactionsToDelete.length,
                    totalAmount: totalAmount,
                    deletedTransactions: transactionsToDelete.map(tx => ({
                        id: tx.id,
                        date: tx.transactionDate,
                        amount: tx.amount,
                        direction: tx.direction,
                        description: tx.counterpartyName
                    }))
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Toplu işlem silme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'İşlemler silinirken hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async cleanupOldTransactions(req, res) {
        try {
            const { beforeDate, dryRun = false } = req.body;
            console.log('🧹 Eski işlem temizleme isteği:', { beforeDate, dryRun });
            if (!beforeDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Tarih belirtilmedi'
                });
            }
            const cutoffDate = new Date(beforeDate);
            if (isNaN(cutoffDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz tarih formatı'
                });
            }
            const oldTransactions = await prisma.bankTransaction.findMany({
                where: {
                    transactionDate: {
                        lt: cutoffDate
                    }
                },
                include: {
                    paymentMatches: true
                }
            });
            if (oldTransactions.length === 0) {
                return res.json({
                    success: true,
                    message: 'Silinecek eski işlem bulunamadı',
                    data: {
                        deletedCount: 0,
                        totalAmount: 0,
                        dryRun: dryRun
                    }
                });
            }
            if (dryRun) {
                const totalAmount = oldTransactions.reduce((sum, tx) => sum + tx.amount, 0);
                return res.json({
                    success: true,
                    message: `DRY RUN: ${oldTransactions.length} eski işlem silinecek`,
                    data: {
                        deletedCount: oldTransactions.length,
                        totalAmount: totalAmount,
                        dryRun: true,
                        cutoffDate: cutoffDate,
                        preview: oldTransactions.slice(0, 10).map(tx => ({
                            id: tx.id,
                            date: tx.transactionDate,
                            amount: tx.amount,
                            direction: tx.direction,
                            description: tx.counterpartyName
                        }))
                    }
                });
            }
            const transactionIds = oldTransactions.map(tx => tx.id);
            await prisma.paymentMatch.deleteMany({
                where: { bankTransactionId: { in: transactionIds } }
            });
            await prisma.bankTransaction.deleteMany({
                where: {
                    transactionDate: {
                        lt: cutoffDate
                    }
                }
            });
            const totalAmount = oldTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            return res.json({
                success: true,
                message: `${oldTransactions.length} eski işlem başarıyla silindi`,
                data: {
                    deletedCount: oldTransactions.length,
                    totalAmount: totalAmount,
                    cutoffDate: cutoffDate,
                    dryRun: false
                }
            });
        }
        catch (error) {
            (0, logger_1.logError)('Eski işlem temizleme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'Eski işlemler silinirken hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async processPDFWithETL(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'PDF dosyası yüklenmedi'
                });
            }
            const filePath = req.file.path;
            console.log(`📄 PDF ETL işleme başlatılıyor: ${filePath}`);
            const result = await (0, etlService_1.processPDFToDatabase)(filePath);
            if (result.success) {
                return res.json({
                    success: true,
                    message: result.message,
                    data: {
                        processedCount: result.count,
                        filePath: filePath
                    }
                });
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        }
        catch (error) {
            (0, logger_1.logError)('PDF ETL işleme hatası:', error);
            return res.status(500).json({
                success: false,
                message: 'PDF işleme sırasında hata oluştu',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
exports.BankingController = BankingController;
//# sourceMappingURL=controller.js.map