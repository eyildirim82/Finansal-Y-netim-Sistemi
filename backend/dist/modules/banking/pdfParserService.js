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
exports.PDFParserService = void 0;
const logger_1 = require("../../shared/logger");
const fs = __importStar(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
class PDFParserService {
    async parsePDF(filePath) {
        try {
            console.log(`📄 PDF parsing başlatılıyor: ${filePath}`);
            const dataBuffer = fs.readFileSync(filePath);
            const data = await (0, pdf_parse_1.default)(dataBuffer);
            console.log(`📄 PDF içeriği okundu, ${data.text.length} karakter`);
            const lines = data.text.split('\n').filter(line => line.trim());
            const isYapiKredi = this.isYapiKrediPDF(lines);
            if (isYapiKredi) {
                console.log('🏦 Yapı Kredi PDF formatı tespit edildi');
                return this.parseYapiKrediPDF(lines);
            }
            console.log('📄 Genel PDF formatı kullanılıyor');
            const accountInfo = this.extractAccountInfo(lines);
            const transactions = this.parseTransactions(lines);
            const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
            console.log(`📅 İşlemler tarihe göre sıralandı: ${sortedTransactions.length} işlem`);
            const summary = this.calculateSummary(sortedTransactions);
            console.log(`✅ PDF parsing tamamlandı: ${sortedTransactions.length} işlem bulundu`);
            return {
                transactions: sortedTransactions,
                accountInfo,
                summary
            };
        }
        catch (error) {
            (0, logger_1.logError)('PDF parsing hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            throw new Error(`PDF parse edilemedi: ${errorMessage}`);
        }
    }
    extractAccountInfo(lines) {
        const accountInfo = {};
        for (let i = 0; i < Math.min(lines.length, 50); i++) {
            const line = lines[i];
            if (line.includes('Hesap No:') || line.includes('Account No:')) {
                const match = line.match(/(?:Hesap No:|Account No:)\s*([A-Z0-9\s-]+)/i);
                if (match)
                    accountInfo.accountNumber = match[1].trim();
            }
            if (line.includes('Hesap Sahibi:') || line.includes('Account Holder:')) {
                const match = line.match(/(?:Hesap Sahibi:|Account Holder:)\s*(.+)/i);
                if (match)
                    accountInfo.accountHolder = match[1].trim();
            }
            if (line.includes('Tarih:') || line.includes('Date:')) {
                const dateMatch = line.match(/(\d{2}[\/\.]\d{2}[\/\.]\d{4})/g);
                if (dateMatch && dateMatch.length >= 2) {
                    accountInfo.startDate = this.parseDate(dateMatch[0]);
                    accountInfo.endDate = this.parseDate(dateMatch[1]);
                }
            }
            if (line.includes('Başlangıç Bakiyesi:') || line.includes('Opening Balance:')) {
                const balanceMatch = line.match(/[\d\.,]+/g);
                if (balanceMatch) {
                    accountInfo.startBalance = this.parseAmount(balanceMatch[0]);
                }
            }
        }
        return accountInfo;
    }
    parseTransactions(lines) {
        const transactions = [];
        let inTransactionSection = false;
        let headerFound = false;
        console.log(`🔍 ${lines.length} satır analiz ediliyor...`);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (i < 20) {
                console.log(`📄 Satır ${i}: "${line}"`);
            }
            if (this.isTransactionHeader(line)) {
                console.log(`✅ İşlem başlığı bulundu: "${line}"`);
                inTransactionSection = true;
                headerFound = true;
                continue;
            }
            if (!headerFound && this.containsDate(line)) {
                console.log(`📅 Tarih içeren satır bulundu: "${line}"`);
                const transaction = this.parseTransactionLine(line);
                if (transaction) {
                    transactions.push(transaction);
                }
                continue;
            }
            if (!inTransactionSection)
                continue;
            if (this.isTotalRow(line)) {
                console.log(`🛑 Toplam satırı bulundu: "${line}"`);
                break;
            }
            const transaction = this.parseTransactionLine(line);
            if (transaction) {
                console.log(`✅ İşlem parse edildi: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
                transactions.push(transaction);
            }
        }
        console.log(`📊 Toplam ${transactions.length} işlem bulundu`);
        return transactions;
    }
    isTransactionHeader(line) {
        const headerPatterns = [
            /Tarih.*Açıklama.*Borç.*Alacak.*Bakiye/i,
            /Date.*Description.*Debit.*Credit.*Balance/i,
            /İşlem Tarihi.*Açıklama.*Tutar.*Bakiye/i,
            /Tarih.*İşlem.*Tutar.*Bakiye/i,
            /Date.*Transaction.*Amount.*Balance/i,
            /Tarih.*Açıklama.*Tutar/i,
            /Date.*Description.*Amount/i,
            /Hareket.*Tarihi/i,
            /Transaction.*Date/i
        ];
        const headerKeywords = [
            'tarih', 'date', 'açıklama', 'description', 'borç', 'debit',
            'alacak', 'credit', 'bakiye', 'balance', 'tutar', 'amount',
            'işlem', 'transaction', 'hareket'
        ];
        const lowerLine = line.toLowerCase();
        const keywordCount = headerKeywords.filter(keyword => lowerLine.includes(keyword)).length;
        if (keywordCount >= 2) {
            return true;
        }
        return headerPatterns.some(pattern => pattern.test(line));
    }
    isTotalRow(line) {
        const totalPatterns = [
            /TOPLAM/i,
            /TOTAL/i,
            /GENEL TOPLAM/i,
            /GRAND TOTAL/i
        ];
        return totalPatterns.some(pattern => pattern.test(line));
    }
    containsDate(line) {
        const datePatterns = [
            /(\d{2}[\/\.]\d{2}[\/\.]\d{4})/,
            /(\d{4}-\d{2}-\d{2})/,
            /(\d{2}-\d{2}-\d{4})/
        ];
        return datePatterns.some(pattern => pattern.test(line));
    }
    findAmountPositions(line, amounts) {
        const positions = [];
        for (const amountStr of amounts) {
            const position = line.indexOf(amountStr);
            if (position !== -1) {
                const amount = this.parseAmount(amountStr);
                if (amount > 0.01) {
                    positions.push({ amount, position });
                }
            }
        }
        return positions.sort((a, b) => a.position - b.position);
    }
    parseTransactionLine(line) {
        try {
            const datePatterns = [
                /(\d{2}[\/\.]\d{2}[\/\.]\d{4})/,
                /(\d{4}-\d{2}-\d{2})/,
                /(\d{2}-\d{2}-\d{4})/
            ];
            let date = null;
            let dateStr = '';
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    dateStr = match[1];
                    date = this.parseDate(dateStr);
                    break;
                }
            }
            if (!date) {
                console.log(`⚠️ Tarih bulunamadı: "${line}"`);
                return null;
            }
            const amountPatterns = [
                /[\d\.,]+/g,
                /[\d\s\.,]+/g,
                /[\d\.,]+(?:\s*TL)?/g
            ];
            let amounts = [];
            for (const pattern of amountPatterns) {
                amounts = line.match(pattern) || [];
                if (amounts.length >= 2)
                    break;
            }
            const numericAmounts = amounts
                .map(amt => this.parseAmount(amt))
                .filter(amt => amt !== 0 && amt > 0.01);
            console.log(`💰 Satır: "${line}"`);
            console.log(`💰 Bulunan tutarlar: ${amounts.join(', ')}`);
            console.log(`💰 Sayısal tutarlar: ${numericAmounts.join(', ')}`);
            const lineParts = line.split(/\s+/).filter(part => part.trim());
            console.log(`📋 Satır parçaları: ${lineParts.join(' | ')}`);
            if (numericAmounts.length < 2) {
                console.log(`⚠️ Yeterli tutar bulunamadı: ${numericAmounts.length} tutar`);
                return null;
            }
            let debit = 0;
            let credit = 0;
            let balance = 0;
            const amountPositions = this.findAmountPositions(line, amounts);
            if (amountPositions.length >= 3) {
                const lastThree = amountPositions.slice(-3);
                debit = lastThree[0].amount;
                credit = lastThree[1].amount;
                balance = lastThree[2].amount;
            }
            else if (amountPositions.length === 2) {
                const lastTwo = amountPositions.slice(-2);
                if (lastTwo[1].amount > lastTwo[0].amount) {
                    if (lastTwo[0].amount > 0) {
                        credit = lastTwo[0].amount;
                    }
                    else {
                        debit = Math.abs(lastTwo[0].amount);
                    }
                    balance = lastTwo[1].amount;
                }
                else {
                    balance = lastTwo[0].amount;
                    if (lastTwo[1].amount > 0) {
                        credit = lastTwo[1].amount;
                    }
                    else {
                        debit = Math.abs(lastTwo[1].amount);
                    }
                }
            }
            else if (amountPositions.length === 1) {
                balance = amountPositions[0].amount;
            }
            let description = line;
            description = description.replace(dateStr, '').trim();
            amounts.forEach(amt => {
                description = description.replace(amt, '').trim();
            });
            description = description.replace(/\s+/g, ' ').trim();
            if (description.length < 3) {
                description = 'İşlem';
            }
            const transaction = {
                date,
                description: description || 'İşlem',
                debit,
                credit,
                balance
            };
            console.log(`✅ İşlem oluşturuldu: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
            console.log(`   📅 Tarih: ${transaction.date.toLocaleDateString('tr-TR')}`);
            console.log(`   💰 Bakiye: ${transaction.balance.toLocaleString('tr-TR')} TL`);
            console.log(`   💰 Alacak: ${transaction.credit.toLocaleString('tr-TR')} TL`);
            console.log(`   💰 Borç: ${transaction.debit.toLocaleString('tr-TR')} TL`);
            return transaction;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            console.log(`⚠️ İşlem satırı parse edilemedi: ${line} - Hata: ${errorMessage}`);
            return null;
        }
    }
    parseDate(dateStr) {
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        if (dateStr.includes('.')) {
            const [day, month, year] = dateStr.split('.');
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        if (dateStr.includes('-')) {
            return new Date(dateStr);
        }
        throw new Error(`Bilinmeyen tarih formatı: ${dateStr}`);
    }
    parseAmount(amountStr) {
        try {
            let cleanAmount = amountStr.trim();
            cleanAmount = cleanAmount.replace(/[₺$€£]/g, '');
            cleanAmount = cleanAmount.replace(/[^\d.,]/g, '');
            cleanAmount = cleanAmount.replace(',', '.');
            const dots = cleanAmount.match(/\./g);
            if (dots && dots.length > 1) {
                const parts = cleanAmount.split('.');
                const lastPart = parts.pop();
                const firstParts = parts.join('');
                cleanAmount = firstParts + '.' + lastPart;
            }
            const amount = parseFloat(cleanAmount);
            if (isNaN(amount)) {
                console.log(`⚠️ Tutar parse edilemedi: "${amountStr}" -> "${cleanAmount}"`);
                return 0;
            }
            return amount;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            console.log(`⚠️ Tutar parsing hatası: "${amountStr}" - ${errorMessage}`);
            return 0;
        }
    }
    calculateSummary(transactions) {
        const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
        const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
        return {
            totalDebit,
            totalCredit,
            transactionCount: transactions.length
        };
    }
    async detectMissingTransactions(pdfTransactions, existingTransactions = []) {
        const missingTransactions = [];
        const gaps = [];
        console.log(`🔍 PDF'den ${pdfTransactions.length} işlem, sistemde ${existingTransactions.length} işlem bulundu`);
        const sortedPdfTransactions = [...pdfTransactions].sort((a, b) => a.date.getTime() - b.date.getTime());
        const sortedExistingTransactions = [...existingTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const existingTransactionMap = new Map();
        for (const tx of sortedExistingTransactions) {
            const dateKey = new Date(tx.date).toISOString().split('T')[0];
            const amount = Math.abs(tx.amount || tx.credit || tx.debit || 0);
            if (!existingTransactionMap.has(dateKey)) {
                existingTransactionMap.set(dateKey, new Set());
            }
            existingTransactionMap.get(dateKey).add(amount);
        }
        for (const pdfTx of sortedPdfTransactions) {
            const dateKey = pdfTx.date.toISOString().split('T')[0];
            const pdfAmount = Math.abs(pdfTx.credit || pdfTx.debit || 0);
            const existingAmounts = existingTransactionMap.get(dateKey);
            if (!existingAmounts) {
                console.log(`📅 ${dateKey} tarihinde hiç işlem yok, PDF'de ${pdfAmount} TL işlem var`);
                missingTransactions.push({
                    date: pdfTx.date,
                    estimatedAmount: pdfAmount,
                    direction: pdfTx.credit > 0 ? 'IN' : 'OUT',
                    confidence: 'Yüksek',
                    description: pdfTx.description,
                    type: 'MISSING_DATE'
                });
                continue;
            }
            const foundAmount = Array.from(existingAmounts).find(amount => Math.abs(amount - pdfAmount) <= 1);
            if (!foundAmount) {
                console.log(`💰 ${dateKey} tarihinde ${pdfAmount} TL tutarında işlem eksik`);
                missingTransactions.push({
                    date: pdfTx.date,
                    estimatedAmount: pdfAmount,
                    direction: pdfTx.credit > 0 ? 'IN' : 'OUT',
                    confidence: 'Yüksek',
                    description: pdfTx.description,
                    type: 'MISSING_AMOUNT'
                });
            }
            else {
                console.log(`✅ ${dateKey} tarihinde ${pdfAmount} TL işlem mevcut`);
            }
        }
        if (sortedPdfTransactions.length > 1) {
            for (let i = 1; i < sortedPdfTransactions.length; i++) {
                const currentTx = sortedPdfTransactions[i];
                const previousTx = sortedPdfTransactions[i - 1];
                const expectedChange = currentTx.credit - currentTx.debit;
                const actualChange = currentTx.balance - previousTx.balance;
                const difference = Math.abs(expectedChange - actualChange);
                if (difference > 0.01) {
                    const missingAmount = expectedChange - actualChange;
                    gaps.push({
                        date: currentTx.date,
                        expectedChange,
                        actualChange,
                        difference,
                        missingAmount,
                        confidence: this.calculateConfidence(difference, currentTx.balance)
                    });
                }
            }
        }
        const totalMissing = missingTransactions.reduce((sum, tx) => sum + tx.estimatedAmount, 0);
        const criticalIssues = missingTransactions.filter(tx => tx.estimatedAmount > 1000).length;
        const missingDays = new Set(missingTransactions.map(tx => tx.date.toISOString().split('T')[0])).size;
        const severity = this.calculateSeverity(totalMissing, criticalIssues, missingDays);
        console.log(`📊 Eksik işlem analizi tamamlandı:`);
        console.log(`   - Toplam eksik tutar: ${totalMissing.toLocaleString('tr-TR')} TL`);
        console.log(`   - Eksik işlem sayısı: ${missingTransactions.length}`);
        console.log(`   - Eksik gün sayısı: ${missingDays}`);
        console.log(`   - Kritik işlemler: ${criticalIssues}`);
        return {
            missingTransactions: missingTransactions.sort((a, b) => a.date.getTime() - b.date.getTime()),
            summary: {
                totalMissing,
                criticalIssues,
                missingTransactionsCount: missingTransactions.length,
                missingDays,
                severity,
                gapsCount: gaps.length
            }
        };
    }
    groupGapsByDate(gaps) {
        const grouped = new Map();
        for (const gap of gaps) {
            const dateKey = gap.date.toISOString().split('T')[0];
            if (!grouped.has(dateKey)) {
                grouped.set(dateKey, []);
            }
            grouped.get(dateKey).push(gap);
        }
        return grouped;
    }
    calculateConfidence(difference, balance) {
        const percentage = (difference / balance) * 100;
        if (percentage < 1)
            return 'Yüksek';
        if (percentage < 5)
            return 'Orta';
        return 'Düşük';
    }
    calculateAverageConfidence(gaps) {
        const confidences = gaps.map(gap => gap.confidence);
        const highCount = confidences.filter(c => c === 'Yüksek').length;
        const mediumCount = confidences.filter(c => c === 'Orta').length;
        if (highCount > mediumCount)
            return 'Yüksek';
        if (mediumCount > 0)
            return 'Orta';
        return 'Düşük';
    }
    calculateSeverity(totalDifference, criticalIssues, missingDays) {
        if (totalDifference > 10000 || criticalIssues > 5 || missingDays > 10) {
            return 'CRITICAL';
        }
        if (totalDifference > 5000 || criticalIssues > 2 || missingDays > 5) {
            return 'HIGH';
        }
        if (totalDifference > 1000 || criticalIssues > 0 || missingDays > 0) {
            return 'LOW';
        }
        return 'NONE';
    }
    isYapiKrediPDF(lines) {
        const yapiKrediIndicators = [
            'Yapı ve Kredi Bankası A.Ş.',
            'yapikredi.com.tr',
            'Müşteri Adı Soyadı:',
            'IBAN/Hesap No:',
            'TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye'
        ];
        const text = lines.join(' ');
        return yapiKrediIndicators.some(indicator => text.includes(indicator));
    }
    parseYapiKrediPDF(lines) {
        console.log('🏦 Yapı Kredi PDF parsing başlatılıyor...');
        const accountInfo = this.extractYapiKrediAccountInfo(lines);
        const transactions = this.parseYapiKrediTransactions(lines);
        const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
        console.log(`📅 Yapı Kredi işlemleri sıralandı: ${sortedTransactions.length} işlem`);
        const summary = this.calculateSummary(sortedTransactions);
        console.log(`✅ Yapı Kredi PDF parsing tamamlandı: ${sortedTransactions.length} işlem bulundu`);
        return {
            transactions: sortedTransactions,
            accountInfo,
            summary
        };
    }
    extractYapiKrediAccountInfo(lines) {
        const accountInfo = {};
        for (const line of lines) {
            if (line.includes('Müşteri Adı Soyadı:')) {
                const match = line.match(/Müşteri Adı Soyadı:(.+)/);
                if (match) {
                    accountInfo.accountHolder = match[1].trim();
                }
            }
            if (line.includes('IBAN/Hesap No:')) {
                const match = line.match(/IBAN\/Hesap No:(.+)/);
                if (match) {
                    accountInfo.accountNumber = match[1].trim();
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
        console.log('🏦 Yapı Kredi hesap bilgileri:', accountInfo);
        return accountInfo;
    }
    parseYapiKrediTransactions(lines) {
        const transactions = [];
        let inTransactionSection = false;
        console.log(`🔍 Yapı Kredi işlemleri analiz ediliyor...`);
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye')) {
                console.log(`✅ Yapı Kredi işlem başlığı bulundu`);
                inTransactionSection = true;
                continue;
            }
            if (!inTransactionSection)
                continue;
            if (line.match(/^\d+\/\d+$/))
                continue;
            if (!line)
                continue;
            const transaction = this.parseYapiKrediTransactionLine(line);
            if (transaction) {
                console.log(`✅ Yapı Kredi işlem parse edildi: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
                transactions.push(transaction);
            }
        }
        console.log(`📊 Yapı Kredi toplam ${transactions.length} işlem bulundu`);
        return transactions;
    }
    parseYapiKrediTransactionLine(line) {
        try {
            const dateTimeMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})/);
            if (!dateTimeMatch) {
                console.log(`⚠️ Yapı Kredi tarih formatı bulunamadı: "${line}"`);
                return null;
            }
            const dateStr = dateTimeMatch[1];
            const timeStr = dateTimeMatch[2];
            const date = this.parseDate(dateStr);
            let remainingLine = line.substring(dateTimeMatch[0].length);
            const amountCcyPattern = /-?(?:\d{1,3}(?:[.\u00a0\s]\d{3})+|\d+)(?:,\d{1,2})?\s+(?:TL|TRY|USD|EUR|GBP)/gi;
            const amountMatches = Array.from(remainingLine.matchAll(amountCcyPattern));
            let transactionAmount;
            let balance;
            let description;
            if (amountMatches.length < 2) {
                const onlyAmountPattern = /-?(?:\d{1,3}(?:[.\u00a0\s]\d{3})+|\d+)(?:,\d{1,2})?/g;
                const onlyAmounts = Array.from(remainingLine.matchAll(onlyAmountPattern)).map(m => m[0]);
                if (onlyAmounts.length < 2) {
                    console.log(`⚠️ Yapı Kredi yeterli tutar bulunamadı: "${line}"`);
                    return null;
                }
                transactionAmount = this.parseAmount(onlyAmounts[onlyAmounts.length - 2]);
                balance = this.parseAmount(onlyAmounts[onlyAmounts.length - 1]);
                description = remainingLine.slice(0, remainingLine.lastIndexOf(onlyAmounts[onlyAmounts.length - 2])).trim();
            }
            else {
                const last = amountMatches[amountMatches.length - 1];
                const prev = amountMatches[amountMatches.length - 2];
                const [balanceStr] = last[0].trim().split(/\s+(?=[A-Z]{2,3}|TL|TRY|USD|EUR|GBP$)/);
                const [amountStr] = prev[0].trim().split(/\s+(?=[A-Z]{2,3}|TL|TRY|USD|EUR|GBP$)/);
                transactionAmount = this.parseAmount(amountStr);
                balance = this.parseAmount(balanceStr);
                description = remainingLine.slice(0, prev.index).trim();
            }
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
                description = description.replace(re, to);
            const ibans = [];
            description = description.replace(/\bTR\d{24}\b/g, (m) => {
                ibans.push(m);
                return `__IBAN_${ibans.length - 1}__`;
            });
            description = description.replace(/\b\d{10,}\b/g, '');
            description = description.replace(/__IBAN_(\d+)__/g, (_, i) => ibans[Number(i)]);
            description = description.replace(/\s+/g, ' ').trim();
            if (description.length < 3) {
                description = 'İşlem';
            }
            let debit = 0;
            let credit = 0;
            if (transactionAmount > 0) {
                credit = transactionAmount;
            }
            else {
                debit = Math.abs(transactionAmount);
            }
            const transaction = {
                date,
                description: description || 'İşlem',
                debit,
                credit,
                balance
            };
            console.log(`✅ Yapı Kredi işlem oluşturuldu: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
            console.log(`   📅 Tarih: ${transaction.date.toLocaleDateString('tr-TR')} ${timeStr}`);
            console.log(`   💰 İşlem Tutarı: ${transactionAmount.toLocaleString('tr-TR')} TL`);
            console.log(`   💰 Bakiye: ${transaction.balance.toLocaleString('tr-TR')} TL`);
            console.log(`   💰 Alacak: ${transaction.credit.toLocaleString('tr-TR')} TL`);
            console.log(`   💰 Borç: ${transaction.debit.toLocaleString('tr-TR')} TL`);
            return transaction;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            console.log(`⚠️ Yapı Kredi işlem satırı parse edilemedi: ${line} - Hata: ${errorMessage}`);
            return null;
        }
    }
}
exports.PDFParserService = PDFParserService;
//# sourceMappingURL=pdfParserService.js.map