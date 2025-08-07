"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMatchingService = void 0;
const logger_1 = require("@/shared/logger");
const client_1 = require("@prisma/client");
class PaymentMatchingService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    normalizeCustomerName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-zçğıöşü]/g, '')
            .replace(/ltd\.?/g, '')
            .replace(/a\.?ş\.?/g, '')
            .replace(/san\.?/g, '')
            .replace(/ve\s+tic\.?/g, '')
            .replace(/endüstriyel/g, '')
            .replace(/kontrol/g, '')
            .replace(/sistemleri/g, '')
            .trim();
    }
    calculateNameSimilarity(name1, name2) {
        const normalized1 = this.normalizeCustomerName(name1);
        const normalized2 = this.normalizeCustomerName(name2);
        if (normalized1 === normalized2)
            return 1.0;
        const matrix = [];
        const len1 = normalized1.length;
        const len2 = normalized2.length;
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
            }
        }
        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
    }
    checkNameVariations(customerName, transactionName) {
        const similarity = this.calculateNameSimilarity(customerName, transactionName);
        if (similarity >= 0.8) {
            return { match: true, confidence: similarity, method: 'name_similarity' };
        }
        const customerWords = customerName.split(/\s+/);
        const transactionWords = transactionName.split(/\s+/);
        if (customerWords[0] && transactionWords[0] &&
            customerWords[0].toLowerCase() === transactionWords[0].toLowerCase()) {
            return { match: true, confidence: 0.7, method: 'first_word_match' };
        }
        const customerInitials = customerWords.map(w => w.charAt(0)).join('');
        const transactionInitials = transactionWords.map(w => w.charAt(0)).join('');
        if (customerInitials.length > 1 && customerInitials === transactionInitials) {
            return { match: true, confidence: 0.6, method: 'initials_match' };
        }
        return { match: false, confidence: similarity, method: 'no_match' };
    }
    async checkAmountPattern(transactionAmount, customerId) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentTransactions = await this.prisma.transaction.findMany({
                where: {
                    customerId: customerId,
                    createdAt: {
                        gte: thirtyDaysAgo
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 10
            });
            if (recentTransactions.length === 0) {
                return { match: false, confidence: 0, method: 'no_recent_transactions' };
            }
            const exactMatch = recentTransactions.find(t => Math.abs(t.amount - transactionAmount) < 0.01);
            if (exactMatch) {
                return { match: true, confidence: 0.9, method: 'exact_amount_match' };
            }
            const amounts = recentTransactions.map(t => t.amount).sort((a, b) => a - b);
            const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
            const tolerance = avgAmount * 0.1;
            if (Math.abs(transactionAmount - avgAmount) <= tolerance) {
                return { match: true, confidence: 0.7, method: 'average_amount_pattern' };
            }
            if (amounts.length >= 3) {
                const differences = [];
                for (let i = 1; i < amounts.length; i++) {
                    differences.push(amounts[i] - amounts[i - 1]);
                }
                const avgDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
                const lastAmount = amounts[amounts.length - 1];
                const expectedNextAmount = lastAmount + avgDifference;
                if (Math.abs(transactionAmount - expectedNextAmount) <= tolerance) {
                    return { match: true, confidence: 0.8, method: 'sequential_amount_pattern' };
                }
            }
            return { match: false, confidence: 0, method: 'no_amount_pattern' };
        }
        catch (error) {
            (0, logger_1.logError)('Tutar deseni kontrolü hatası:', error);
            return { match: false, confidence: 0, method: 'error' };
        }
    }
    checkIBANMatch(transactionIBAN, customerIBAN) {
        if (!customerIBAN) {
            return { match: false, confidence: 0, method: 'no_customer_iban' };
        }
        if (transactionIBAN === customerIBAN) {
            return { match: true, confidence: 1.0, method: 'exact_iban_match' };
        }
        const transactionLast4 = transactionIBAN.slice(-4);
        const customerLast4 = customerIBAN.slice(-4);
        if (transactionLast4 === customerLast4) {
            return { match: true, confidence: 0.8, method: 'partial_iban_match' };
        }
        return { match: false, confidence: 0, method: 'no_iban_match' };
    }
    async getCustomers() {
        try {
            const customers = await this.prisma.customer.findMany({
                where: {
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    originalName: true,
                    nameVariations: true,
                    balance: true,
                    lastPaymentDate: true,
                    paymentPattern: true
                }
            });
            return customers.map(customer => ({
                ...customer,
                nameVariations: customer.nameVariations ? JSON.parse(customer.nameVariations) : []
            }));
        }
        catch (error) {
            (0, logger_1.logError)('Müşteri getirme hatası:', error);
            return [];
        }
    }
    async matchTransaction(transaction) {
        try {
            console.log(`🔍 Eşleştirme başlatılıyor: ${transaction.counterpartyName} - ${transaction.amount} TL`);
            const customers = await this.getCustomers();
            console.log(`📋 ${customers.length} müşteri kontrol ediliyor...`);
            const matches = [];
            for (const customer of customers) {
                console.log(`  🔍 Müşteri kontrol ediliyor: ${customer.name}`);
                let totalConfidence = 0;
                let matchMethods = [];
                const nameMatch = this.checkNameVariations(customer.name, transaction.counterpartyName);
                console.log(`    📝 İsim eşleşmesi: ${nameMatch.match ? '✅' : '❌'} (${(nameMatch.confidence * 100).toFixed(1)}%)`);
                if (nameMatch.match) {
                    totalConfidence += nameMatch.confidence * 0.5;
                    matchMethods.push(nameMatch.method);
                }
                if (customer.originalName) {
                    const originalNameMatch = this.checkNameVariations(customer.originalName, transaction.counterpartyName);
                    if (originalNameMatch.match && originalNameMatch.confidence > nameMatch.confidence) {
                        totalConfidence = totalConfidence - (nameMatch.confidence * 0.5) + (originalNameMatch.confidence * 0.5);
                        matchMethods = matchMethods.filter(m => m !== nameMatch.method);
                        matchMethods.push(originalNameMatch.method);
                    }
                }
                for (const variation of customer.nameVariations) {
                    const variationMatch = this.checkNameVariations(variation, transaction.counterpartyName);
                    if (variationMatch.match && variationMatch.confidence > nameMatch.confidence) {
                        totalConfidence = totalConfidence - (nameMatch.confidence * 0.5) + (variationMatch.confidence * 0.5);
                        matchMethods = matchMethods.filter(m => m !== nameMatch.method);
                        matchMethods.push(variationMatch.method);
                        break;
                    }
                }
                const amountMatch = await this.checkAmountPattern(transaction.amount, customer.id);
                if (amountMatch.match) {
                    totalConfidence += amountMatch.confidence * 0.3;
                    matchMethods.push(amountMatch.method);
                }
                console.log(`    🎯 Toplam güven: ${(totalConfidence * 100).toFixed(1)}%`);
                if (totalConfidence >= 0.7) {
                    console.log(`    ✅ Eşleşme bulundu!`);
                    matches.push({
                        customer,
                        confidence: totalConfidence,
                        methods: matchMethods
                    });
                }
            }
            if (matches.length > 0) {
                matches.sort((a, b) => b.confidence - a.confidence);
                const bestMatch = matches[0];
                console.log(`🎯 En iyi eşleşme: ${bestMatch.customer.name} (${(bestMatch.confidence * 100).toFixed(1)}%)`);
                return {
                    matched: true,
                    customer: bestMatch.customer,
                    confidence: bestMatch.confidence,
                    methods: bestMatch.methods,
                    allMatches: matches
                };
            }
            console.log(`❌ Eşleşme bulunamadı`);
            return {
                matched: false,
                confidence: 0,
                methods: []
            };
        }
        catch (error) {
            (0, logger_1.logError)('❌ Eşleştirme hatası:', error);
            return {
                matched: false,
                confidence: 0,
                methods: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async saveMatchResult(transactionId, matchResult) {
        try {
            if (!matchResult.matched) {
                await this.prisma.bankTransaction.update({
                    where: { id: transactionId },
                    data: {
                        isMatched: false,
                        confidenceScore: 0
                    }
                });
                return true;
            }
            const paymentMatch = await this.prisma.paymentMatch.create({
                data: {
                    bankTransactionId: transactionId,
                    customerId: matchResult.customer.id,
                    matchedAmount: matchResult.customer.balance?.amount || 0,
                    confidenceScore: matchResult.confidence,
                    matchMethod: matchResult.methods.join(', '),
                    isConfirmed: false
                }
            });
            await this.prisma.bankTransaction.update({
                where: { id: transactionId },
                data: {
                    isMatched: true,
                    matchedCustomerId: matchResult.customer.id,
                    confidenceScore: matchResult.confidence
                }
            });
            await this.prisma.customer.update({
                where: { id: matchResult.customer.id },
                data: {
                    lastPaymentDate: new Date()
                }
            });
            console.log(`✅ Eşleştirme kaydedildi: PaymentMatch ID ${paymentMatch.id}`);
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('❌ Eşleştirme kaydetme hatası:', error);
            return false;
        }
    }
    async getUnmatchedTransactions(limit = 50) {
        try {
            const transactions = await this.prisma.bankTransaction.findMany({
                where: {
                    isMatched: false
                },
                orderBy: {
                    transactionDate: 'desc'
                },
                take: limit,
                include: {
                    paymentMatches: {
                        include: {
                            customer: true
                        }
                    }
                }
            });
            return transactions;
        }
        catch (error) {
            (0, logger_1.logError)('❌ Eşleşmeyen işlemler getirme hatası:', error);
            return [];
        }
    }
    async confirmMatch(matchId, confirmed = true) {
        try {
            const paymentMatch = await this.prisma.paymentMatch.update({
                where: { id: matchId },
                data: {
                    isConfirmed: confirmed
                },
                include: {
                    bankTransaction: true,
                    customer: true
                }
            });
            if (confirmed) {
                await this.prisma.bankTransaction.update({
                    where: { id: paymentMatch.bankTransactionId },
                    data: {
                        isMatched: true,
                        matchedCustomerId: paymentMatch.customerId,
                        confidenceScore: paymentMatch.confidenceScore
                    }
                });
                console.log(`✅ Eşleştirme onaylandı: ${paymentMatch.customer.name}`);
            }
            else {
                console.log(`❌ Eşleştirme reddedildi: ${paymentMatch.customer.name}`);
            }
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('❌ Eşleştirme onaylama hatası:', error);
            return false;
        }
    }
    async getMatchingStatistics() {
        try {
            const [totalTransactions, matchedTransactions, unmatchedTransactions, avgConfidence] = await Promise.all([
                this.prisma.bankTransaction.count(),
                this.prisma.bankTransaction.count({ where: { isMatched: true } }),
                this.prisma.bankTransaction.count({ where: { isMatched: false } }),
                this.prisma.bankTransaction.aggregate({
                    where: { isMatched: true },
                    _avg: { confidenceScore: true }
                })
            ]);
            return {
                total: totalTransactions,
                matched: matchedTransactions,
                unmatched: unmatchedTransactions,
                matchRate: totalTransactions > 0 ? (matchedTransactions / totalTransactions) * 100 : 0,
                avgConfidence: avgConfidence._avg.confidenceScore || 0
            };
        }
        catch (error) {
            (0, logger_1.logError)('❌ Eşleştirme istatistikleri hatası:', error);
            return {
                total: 0,
                matched: 0,
                unmatched: 0,
                matchRate: 0,
                avgConfidence: 0
            };
        }
    }
}
exports.PaymentMatchingService = PaymentMatchingService;
//# sourceMappingURL=paymentMatchingService.js.map