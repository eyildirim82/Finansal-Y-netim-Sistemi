"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedPDFParserService = void 0;
const logger_1 = require("../../shared/logger");
const fs = __importStar(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const crypto = __importStar(require("crypto"));
class AdvancedPDFParserService {
    async parsePDF(filePath) {
        try {
            console.log(`📄 Gelişmiş PDF parsing başlatılıyor: ${filePath}`);
            const { text, lines } = await this.extractTextAndLines(filePath);
            const records = this.findRecordBoundaries(lines);
            const parsedRecords = this.parseRecordFields(records);
            const normalizedRecords = this.normalizeRecords(parsedRecords);
            const enrichedRecords = this.enrichRecords(normalizedRecords);
            const qualityCheckedRecords = this.performQualityChecks(enrichedRecords);
            const finalTransactions = this.mapToStorageFormat(qualityCheckedRecords);
            const accountInfo = this.extractAccountInfo(lines);
            const summary = this.calculateSummary(finalTransactions);
            const quality = this.generateQualityReport(qualityCheckedRecords);
            console.log(`✅ Gelişmiş PDF parsing tamamlandı: ${finalTransactions.length} işlem`);
            return {
                transactions: finalTransactions,
                accountInfo,
                summary,
                quality
            };
        }
        catch (error) {
            (0, logger_1.logError)('Gelişmiş PDF parsing hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            throw new Error(`PDF parse edilemedi: ${errorMessage}`);
        }
    }
    async extractTextAndLines(filePath) {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await (0, pdf_parse_1.default)(dataBuffer);
        console.log(`📄 PDF içeriği okundu, ${data.text.length} karakter`);
        const lines = data.text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => this.cleanLine(line));
        console.log(`📄 ${lines.length} satır temizlendi`);
        return { text: data.text, lines };
    }
    cleanLine(line) {
        let cleaned = line;
        cleaned = cleaned.replace(/^\d+\/\d+$/, '');
        cleaned = cleaned.replace(/^(?:Tarih Aralığı|Müşteri Adı|Müşteri Numarası|Hesap Adı|IBAN\/Hesap No|Kullanılabilir Bakiye)\b.*$/, '');
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/-\s+(\w)/g, '$1');
        return cleaned.trim();
    }
    findRecordBoundaries(lines) {
        const records = [];
        let currentRecord = [];
        let currentStartLine = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (this.isRecordStart(line)) {
                if (currentRecord.length > 0) {
                    records.push({
                        startLine: currentStartLine,
                        lines: currentRecord
                    });
                }
                currentRecord = [line];
                currentStartLine = i;
            }
            else if (currentRecord.length > 0) {
                currentRecord.push(line);
            }
        }
        if (currentRecord.length > 0) {
            records.push({
                startLine: currentStartLine,
                lines: currentRecord
            });
        }
        console.log(`📋 ${records.length} kayıt sınırı bulundu`);
        return records;
    }
    isRecordStart(line) {
        return AdvancedPDFParserService.DATETIME_HEAD.test(line);
    }
    parseRecordFields(records) {
        const parsedRecords = [];
        for (const record of records) {
            try {
                const recordText = record.lines.join(' ');
                const dateTimeMatch = recordText.match(AdvancedPDFParserService.DATETIME_HEAD);
                if (!dateTimeMatch)
                    continue;
                const dateTime = `${dateTimeMatch[1]} ${dateTimeMatch[2]}`;
                const financialData = this.extractFinancialData(recordText);
                if (!financialData)
                    continue;
                const description = this.extractDescription(recordText, dateTime, financialData);
                parsedRecords.push({
                    startLine: record.startLine,
                    dateTime,
                    description,
                    amount: financialData.amount,
                    currency: financialData.currency,
                    balance: financialData.balance,
                    balanceCurrency: financialData.balanceCurrency,
                    raw: recordText
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
                console.log(`⚠️ Kayıt parse edilemedi (satır ${record.startLine}): ${errorMessage}`);
            }
        }
        console.log(`📊 ${parsedRecords.length} kayıt alan ayrıştırması tamamlandı`);
        return parsedRecords;
    }
    extractFinancialData(recordText) {
        const matches = Array.from(recordText.matchAll(AdvancedPDFParserService.AMT_CCY_G));
        if (matches.length >= 2) {
            const last = matches[matches.length - 1];
            const prev = matches[matches.length - 2];
            const [balanceStr, balanceCcy] = last[0].trim().split(/\s+/).slice(-2);
            const [amountStr, amountCcy] = prev[0].trim().split(/\s+/).slice(-2);
            const amount = this.parseAmount(amountStr);
            const balance = this.parseAmount(balanceStr);
            return {
                amount,
                currency: amountCcy,
                balance,
                balanceCurrency: balanceCcy,
                headBeforeAmount: recordText.slice(0, prev.index).trim()
            };
        }
        const onlyNums = Array.from(recordText.matchAll(AdvancedPDFParserService.TR_AMOUNT_RE)).map(m => m[0]);
        if (onlyNums.length >= 2) {
            const amountStr = onlyNums[onlyNums.length - 2];
            const balanceStr = onlyNums[onlyNums.length - 1];
            const amount = this.parseAmount(amountStr);
            const balance = this.parseAmount(balanceStr);
            return {
                amount,
                currency: 'TL',
                balance,
                balanceCurrency: 'TL',
                headBeforeAmount: recordText.slice(0, recordText.lastIndexOf(amountStr)).trim()
            };
        }
        return null;
    }
    extractDescription(recordText, dateTime, financialData) {
        let desc = (financialData.headBeforeAmount || recordText).trim();
        desc = desc.replace(AdvancedPDFParserService.DATETIME_HEAD, '').trim();
        const rules = [
            { re: /\bInternet\s*-\s*Mobil\b/gi, to: '' },
            { re: /\bDiğer\b/gi, to: '' },
            { re: /\bŞube\b/gi, to: '' },
            { re: /^(?:Para\s+Gönder|Diğer)\s*/i, to: '' },
            { re: /C\/H\s*MAHSUBEN/gi, to: '' },
            { re: /\.Ykb\s*den\s*gelen/gi, to: '' },
            { re: /\s*-\s*/g, to: ' - ' },
            { re: /\.{2,}/g, to: '.' },
        ];
        for (const { re, to } of rules)
            desc = desc.replace(re, to);
        const ibans = [];
        desc = desc.replace(/\bTR\d{24}\b/g, (m) => {
            ibans.push(m);
            return `__IBAN_${ibans.length - 1}__`;
        });
        desc = desc.replace(/\b\d{10,}\b/g, '');
        desc = desc.replace(/__IBAN_(\d+)__/g, (_, i) => ibans[Number(i)]);
        desc = desc.replace(/\s+/g, ' ').trim();
        return desc || 'İşlem';
    }
    normalizeRecords(records) {
        return records.map(record => ({
            ...record,
            dateTime: this.normalizeDateTime(record.dateTime),
            amount: this.normalizeAmount(record.amount),
            balance: this.normalizeAmount(record.balance),
            description: this.normalizeText(record.description)
        }));
    }
    normalizeDateTime(dateTimeStr) {
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute, second] = timePart.split(':');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    }
    normalizeAmount(amount) {
        return Math.round(amount * 100) / 100;
    }
    normalizeText(text) {
        text = text.normalize('NFKC');
        text = text.replace(/\s+/g, ' ');
        return text.trim();
    }
    enrichRecords(records) {
        return records.map(record => {
            const enriched = {
                date_time: record.dateTime,
                date_time_iso: record.dateTime.toISOString(),
                description: record.description,
                debit: record.amount < 0 ? Math.abs(record.amount) : 0,
                credit: record.amount > 0 ? record.amount : 0,
                amount: record.amount,
                currency: record.currency,
                balance: record.balance,
                balance_currency: record.balanceCurrency,
                raw: record.raw,
                confidence: 1.0,
                anomalies: [],
                hash: ''
            };
            const categoryInfo = this.categorizeTransaction(record.description);
            enriched.category = categoryInfo.category;
            enriched.subcategory = categoryInfo.subcategory;
            const operationInfo = this.extractOperationInfo(record.description);
            enriched.op = operationInfo.op;
            enriched.channel = operationInfo.channel;
            enriched.direction = operationInfo.direction;
            const counterpartyInfo = this.extractCounterparty(record.description);
            enriched.counterparty_name = counterpartyInfo.name;
            enriched.counterparty_iban = counterpartyInfo.iban;
            enriched.hash = this.generateHash(enriched);
            return enriched;
        });
    }
    categorizeTransaction(description) {
        const desc = description.toUpperCase();
        if (/\bBSMV\b/.test(desc)) {
            return { category: 'fee', subcategory: 'fee_bsmv' };
        }
        if (/ELEKTRON[İI]K\s+FON\s+TRANSFER[İI].*ÜCRET[İI]/.test(desc)) {
            return { category: 'fee', subcategory: 'fee_eft' };
        }
        if (/\bGELEN\s+FAST\b/.test(desc) || /\bGELEN\s+EFT\b/.test(desc) || /\bGELEN\s+HAVALE\b/.test(desc)) {
            return { category: 'incoming', subcategory: 'incoming_transfer' };
        }
        if (/\bG[İI]DEN\s+FAST\b/.test(desc) || /\bG[İI]DEN\s+EFT\b/.test(desc) || /\bG[İI]DEN\s+HAVALE\b/.test(desc)) {
            return { category: 'outgoing', subcategory: 'outgoing_transfer' };
        }
        if (/\bPOS\b/.test(desc)) {
            return { category: 'pos', subcategory: 'pos_purchase' };
        }
        if (/Fatura|Elektrik|Do[gğ]algaz|Doğalgaz|Su|Telekom|İnternet/.test(desc)) {
            return { category: 'utility', subcategory: 'utility_bill' };
        }
        return { category: 'other', subcategory: 'other' };
    }
    extractOperationInfo(description) {
        const desc = description.toUpperCase();
        let op;
        let channel;
        let direction;
        if (/\bFAST\b/.test(desc))
            op = 'FAST';
        else if (/\bEFT\b/.test(desc))
            op = 'EFT';
        else if (/\bHAVALE\b/.test(desc))
            op = 'HAVALE';
        else if (/\bPOS\b/.test(desc))
            op = 'POS';
        else if (/\bFatura\b/.test(desc))
            op = 'Fatura';
        else if (/Para\s+Gönder/.test(desc))
            op = 'Para Gönder';
        if (/Internet\s*-\s*Mobil|Internet\s{2,}-\s*Mobil/.test(desc))
            channel = 'Internet - Mobil';
        else if (/\bDiğer\b/.test(desc))
            channel = 'Diğer';
        else if (/\bŞube\b/.test(desc))
            channel = 'Şube';
        else
            channel = 'Diğer';
        if (/\bGELEN\b/.test(desc))
            direction = 'GELEN';
        else if (/\bG[İI]DEN\b/.test(desc))
            direction = 'GİDEN';
        return { op, channel, direction };
    }
    extractCounterparty(description) {
        const desc = description || '';
        const ibanMatch = desc.match(/\bTR\d{24}\b/);
        const iban = ibanMatch ? ibanMatch[0] : undefined;
        const m = desc.match(/(G[İI]DEN|GELEN)\s+(FAST|EFT|HAVALE)\s*-\s*([^-]+)/i);
        let name = m ? m[3].trim() : undefined;
        if (!name) {
            const parts = desc.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2)
                name = parts[1];
        }
        if (name && name.length < 2)
            name = undefined;
        return { name, iban };
    }
    generateHash(transaction) {
        const hashString = `${transaction.date_time_iso}|${transaction.amount.toFixed(2)}|${transaction.balance.toFixed(2)}|${transaction.description.substring(0, 120)}`;
        return crypto.createHash('sha256').update(hashString).digest('hex');
    }
    performQualityChecks(transactions) {
        const sorted = [...transactions].sort((a, b) => {
            const t = (a.date_time_iso || '').localeCompare(b.date_time_iso || '');
            return t !== 0 ? t : 0;
        });
        const anomalies = [];
        const tol = 0.01;
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const expected = (prev.balance ?? 0) + (curr.credit ?? 0) - (curr.debit ?? 0);
            const diff = Math.abs(expected - (curr.balance ?? 0));
            if (diff > tol) {
                anomalies.push({
                    lineNumber: i,
                    expectedBalance: Number(expected.toFixed(2)),
                    actualBalance: curr.balance,
                    difference: Number(diff.toFixed(2))
                });
                curr.confidence = Math.max(0, (curr.confidence || 1) * 0.8);
                curr.anomalies = [...(curr.anomalies || []), `Bakiye tutarsızlığı: ${diff.toFixed(2)} TL`];
            }
        }
        const seen = new Set();
        for (const tx of sorted) {
            if (!tx.hash)
                continue;
            if (seen.has(tx.hash)) {
                tx.confidence = Math.max(0, (tx.confidence || 1) * 0.5);
                tx.anomalies = [...(tx.anomalies || []), 'Tekrarlanan işlem'];
            }
            else {
                seen.add(tx.hash);
            }
        }
        return sorted;
    }
    mapToStorageFormat(transactions) {
        return transactions.map((transaction, index) => ({
            ...transaction,
            id: transaction.hash.substring(0, 16)
        }));
    }
    extractAccountInfo(lines) {
        const accountInfo = {};
        for (const line of lines) {
            if (line.includes('Müşteri Adı Soyadı:')) {
                const match = line.match(/Müşteri Adı Soyadı:(.+)/);
                if (match)
                    accountInfo.accountHolder = match[1].trim();
            }
            if (line.includes('IBAN/Hesap No:')) {
                const match = line.match(/IBAN\/Hesap No:(.+)/);
                if (match) {
                    const iban = match[1].trim();
                    accountInfo.iban = iban;
                    accountInfo.accountNumber = iban;
                }
            }
            if (line.includes('Tarih Aralığı:')) {
                const match = line.match(/Tarih Aralığı:(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
                if (match) {
                    accountInfo.startDate = this.parseDate(match[1]);
                    accountInfo.endDate = this.parseDate(match[2]);
                }
            }
            if (line.includes('Kullanılabilir Bakiye:')) {
                const match = line.match(/Kullanılabilir Bakiye:([\d\.,]+)\s*TL/);
                if (match) {
                    accountInfo.endBalance = this.parseAmount(match[1]);
                }
            }
        }
        return accountInfo;
    }
    calculateSummary(transactions) {
        const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
        const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
        const categoryDistribution = {};
        transactions.forEach(tx => {
            const category = tx.category || 'other';
            categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
        });
        return {
            totalDebit,
            totalCredit,
            transactionCount: transactions.length,
            successRate: transactions.length > 0 ? 1.0 : 0.0,
            rejectedCount: 0,
            anomalyCount: transactions.filter(tx => tx.anomalies && tx.anomalies.length > 0).length,
            categoryDistribution
        };
    }
    generateQualityReport(transactions) {
        const anomalies = [];
        const duplicates = [];
        const rejected = [];
        const tol = 0.01;
        for (let i = 1; i < transactions.length; i++) {
            const prev = transactions[i - 1];
            const curr = transactions[i];
            const expected = (prev.balance ?? 0) + (curr.credit ?? 0) - (curr.debit ?? 0);
            const diff = Math.abs(expected - (curr.balance ?? 0));
            if (diff > tol) {
                anomalies.push({
                    lineNumber: i,
                    expectedBalance: Number(expected.toFixed(2)),
                    actualBalance: curr.balance,
                    difference: Number(diff.toFixed(2))
                });
            }
        }
        const hashCounts = new Map();
        transactions.forEach(tx => {
            hashCounts.set(tx.hash, (hashCounts.get(tx.hash) || 0) + 1);
        });
        hashCounts.forEach((count, hash) => {
            if (count > 1)
                duplicates.push(hash);
        });
        return {
            balanceReconciliation: {
                anomalies,
                totalAnomalies: anomalies.length
            },
            duplicates: {
                count: duplicates.length,
                hashes: duplicates
            },
            rejected: {
                count: rejected.length,
                lines: rejected
            }
        };
    }
    parseDate(dateStr) {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    parseAmount(amountStr) {
        if (!amountStr)
            return 0;
        let s = amountStr
            .replace(/\u00a0/g, ' ')
            .replace(/[₺$€£]/g, '')
            .replace(/[^\d.,\- ]/g, '')
            .trim();
        s = s.replace(/,(\d)(?!\d)/g, ',$10');
        let integer = s, dec = '';
        const m = s.match(/,(\d{1,2})$/);
        if (m) {
            integer = s.slice(0, m.index);
            dec = m[1];
        }
        integer = integer.replace(/[.\s]/g, '');
        const sign = integer.includes('-') || s.trim().startsWith('-') ? -1 : 1;
        integer = integer.replace(/-/g, '');
        const normalized = dec ? `${integer}.${dec}` : integer;
        const num = Number(normalized);
        return Number.isFinite(num) ? sign * num : 0;
    }
}
exports.AdvancedPDFParserService = AdvancedPDFParserService;
AdvancedPDFParserService.DATETIME_HEAD = /^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})/;
AdvancedPDFParserService.TR_AMOUNT_RE = /-?(?:\d{1,3}(?:[.\u00a0\s]\d{3})+|\d+)(?:,\d{1,2})?/;
AdvancedPDFParserService.CCY_RE = /(?:TL|TRY|USD|EUR|GBP)/;
AdvancedPDFParserService.AMT_CCY_G = new RegExp(`${AdvancedPDFParserService.TR_AMOUNT_RE.source}\\s+${AdvancedPDFParserService.CCY_RE.source}`, 'gi');
//# sourceMappingURL=advancedPDFParserService.js.map