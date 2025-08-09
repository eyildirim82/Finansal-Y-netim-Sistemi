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
Object.defineProperty(exports, "__esModule", { value: true });
exports.YapiKrediFASTEmailService = void 0;
const logger_1 = require("../../shared/logger");
const imapflow_1 = require("imapflow");
const mailparser_1 = require("mailparser");
const libmime_1 = require("libmime");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class YapiKrediFASTEmailService {
    constructor() {
        this.imap = null;
        this.isConnected = false;
        this.patterns = {
            fast: /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınıza|ınızdan),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden) (?<amt>[\d\.]+,\d{2}) TL FAST ödemesi (?:gelmiştir|gönderilmiştir)\./si,
            havale: /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınızdan|ınıza),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL HAVALE (?:çıkışı gerçekleşmiştir|çıkışı|ödemesi gönderilmiştir|ödemesi gelmiştir|gönderilmiştir|gelmiştir)\./si,
            eft: /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınızdan|ınıza),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL EFT (?:girişi gerçekleşmiştir|girişi|ödemesi gelmiştir|ödemesi gönderilmiştir)\./si,
            balance: /(?<mask>\d+X+\d+) TL hesab(?:ınızın|ınızın) kullanılabilir bakiyesi (?<bal>[\d\.]+,\d{2}) TL/si
        };
        this.config = {
            batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '10'),
            concurrencyLimit: parseInt(process.env.EMAIL_CONCURRENCY_LIMIT || '5'),
            timeout: parseInt(process.env.EMAIL_TIMEOUT || '5000'),
            maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
            retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '1000')
        };
        this.metrics = {
            totalEmails: 0,
            processedEmails: 0,
            failedEmails: 0,
            totalProcessingTime: 0,
            avgProcessingTime: 0,
            emailsPerSecond: 0,
            retryCount: 0
        };
        this.failedLogPath = path.join(__dirname, '../../../logs/failed-fast-emails.log');
        console.log(`📧 Email Service configured - Batch: ${this.config.batchSize}, Concurrency: ${this.config.concurrencyLimit}`);
    }
    async connect() {
        if (this.isConnected)
            return true;
        const cfg = {
            host: process.env.EMAIL_HOST,
            port: +(process.env.EMAIL_PORT || '993'),
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        };
        if (!cfg.host || !cfg.port || !cfg.auth.user || !cfg.auth.pass) {
            throw new Error('Email servis environment variable eksik! EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS zorunlu.');
        }
        this.imap = new imapflow_1.ImapFlow(cfg);
        try {
            await this.imap.connect();
            this.isConnected = true;
            console.log('IMAP bağlantısı başarılı.');
            return true;
        }
        catch (err) {
            (0, logger_1.logError)('IMAP bağlantı hatası:', err);
            throw err;
        }
    }
    async disconnect() {
        if (this.imap && this.isConnected) {
            await this.imap.logout();
            this.isConnected = false;
        }
    }
    async fetchYapiKrediFASTEmails() {
        if (!this.isConnected)
            await this.connect();
        console.log('IMAP bağlantısı kuruldu mu:', this.isConnected);
        try {
            await this.imap.mailboxOpen('INBOX');
            console.log('INBOX mailbox açıldı.');
        }
        catch (err) {
            (0, logger_1.logError)('INBOX mailbox açılamadı:', err);
            throw err;
        }
        const criteria = {
            unseen: true,
            subject: ['FAST', 'HAVALE', 'EFT', 'asistan']
        };
        return await this.fetchEmailsBatch(criteria);
    }
    async fetchEmailsBatch(criteria) {
        const startTime = Date.now();
        const messages = [];
        try {
            const lock = await this.imap.getMailboxLock('INBOX');
            try {
                const emails = this.imap.fetch(criteria, {
                    source: true,
                    envelope: true,
                    bodyStructure: true,
                    bodyParts: ['']
                });
                for await (const email of emails) {
                    try {
                        const parsed = await (0, mailparser_1.simpleParser)(email.source);
                        const transaction = await this.parseYapiKrediFASTEmail(parsed);
                        if (transaction) {
                            messages.push({
                                transaction,
                                email: parsed
                            });
                            this.metrics.processedEmails++;
                        }
                        else {
                            this.metrics.failedEmails++;
                        }
                    }
                    catch (err) {
                        (0, logger_1.logError)('Email parse hatası:', err);
                        this.metrics.failedEmails++;
                    }
                }
            }
            finally {
                lock.release();
            }
        }
        catch (err) {
            (0, logger_1.logError)('Email batch fetch hatası:', err);
            throw err;
        }
        const endTime = Date.now();
        this.metrics.totalProcessingTime += (endTime - startTime);
        this.metrics.totalEmails += messages.length;
        this.metrics.avgProcessingTime = this.metrics.totalProcessingTime / this.metrics.processedEmails;
        this.metrics.emailsPerSecond = this.metrics.processedEmails / (this.metrics.totalProcessingTime / 1000);
        console.log(`📧 ${messages.length} email işlendi. Ortalama: ${this.metrics.avgProcessingTime.toFixed(2)}ms/email`);
        return messages;
    }
    async processBatchWithConcurrency(batch, concurrencyLimit) {
        const results = [];
        const queue = [...batch];
        const running = [];
        const processNext = async () => {
            if (queue.length === 0)
                return;
            const item = queue.shift();
            try {
                const result = await this.processEmailItem(item);
                if (result)
                    results.push(result);
            }
            catch (error) {
                (0, logger_1.logError)('Batch processing error:', error);
            }
            await processNext();
        };
        for (let i = 0; i < Math.min(concurrencyLimit, batch.length); i++) {
            running.push(processNext());
        }
        await Promise.all(running);
        return results;
    }
    async processEmailItem(item) {
        return item;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
        this.metrics = {
            totalEmails: 0,
            processedEmails: 0,
            failedEmails: 0,
            totalProcessingTime: 0,
            avgProcessingTime: 0,
            emailsPerSecond: 0,
            retryCount: 0
        };
    }
    async parseYapiKrediFASTEmail(mail) {
        if (!mail || !mail.text) {
            (0, logger_1.logError)('Invalid email data:', mail);
            return null;
        }
        const body = this.cleanHtml(mail.text);
        let match = null;
        let type = '';
        match = body.match(this.patterns.fast);
        if (match)
            type = 'FAST';
        if (!match) {
            match = body.match(this.patterns.havale);
            if (match)
                type = 'HAVALE';
        }
        if (!match) {
            match = body.match(this.patterns.eft);
            if (match)
                type = 'EFT';
        }
        if (!match) {
            const failObj = {
                date: new Date().toISOString(),
                subject: mail.subject,
                from: mail.from,
                body: body.substring(0, 200) + '...',
                error: 'Pattern match failed'
            };
            try {
                fs.appendFileSync(this.failedLogPath, JSON.stringify(failObj) + '\n', 'utf8');
            }
            catch (err) {
                (0, logger_1.logError)('Parse edilemeyen e-posta loglanamadı:', err);
            }
            return null;
        }
        const bal = body.match(this.patterns.balance);
        const balanceAfter = bal && bal.groups ? this.parseAmount(bal.groups.bal) : null;
        return {
            messageId: mail.messageId,
            bankCode: 'YAPIKREDI',
            source: 'email',
            direction: this.detectDirection(mail, body),
            accountIban: match.groups?.iban || '',
            maskedAccount: match.groups?.mask || '',
            transactionDate: this.parseDate(match.groups?.dt || '') || mail.date || new Date(),
            amount: this.parseAmount(match.groups?.amt || '0'),
            counterpartyName: match.groups?.party?.trim() || '',
            balanceAfter,
            rawEmailData: JSON.stringify({
                subject: mail.subject,
                from: mail.from,
                date: mail.date
            }),
            parsedData: JSON.stringify(match.groups),
            createdAt: new Date(),
            isMatched: false,
            transactionType: type
        };
    }
    async testConnection() {
        try {
            await this.connect();
            await this.disconnect();
            return true;
        }
        catch (e) {
            return false;
        }
    }
    detectDirection(mail, bodyText) {
        const subj = (0, libmime_1.decodeWords)(mail.subject || '').toLowerCase();
        if (subj.includes('asistan-gelen'))
            return 'IN';
        if (subj.includes('asistan-giden'))
            return 'OUT';
        if (/(hesabınıza|gelmiştir|girişi|kişiden)/i.test(bodyText))
            return 'IN';
        if (/(hesabınızdan|gönderilmiştir|çıkışı|kişiye)/i.test(bodyText))
            return 'OUT';
        throw new Error('Direction tespit edilemedi');
    }
    cleanHtml(html) {
        const entityMap = {
            '&nbsp;': ' ', '&ouml;': 'ö', '&Ouml;': 'Ö', '&uuml;': 'ü', '&Uuml;': 'Ü',
            '&ccedil;': 'ç', '&Ccedil;': 'Ç', '&ş': 'ş', '&Ş': 'Ş', '&ğ': 'ğ',
            '&Ğ': 'Ğ', '&İ': 'İ', '&ı': 'ı', '&amp;': '&'
        };
        let out = html;
        out = out.replace(/&[a-zA-Z]+?;/g, m => entityMap[m] || m);
        return out
            .replace(/&nbsp;/gi, ' ')
            .replace(/=\r?\n/g, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    parseDate(str) {
        if (!str)
            return null;
        const parts = str.split(/[\/ :]/).map(Number);
        const [d, m, y, h = 0, mi = 0, s = 0] = parts;
        if ([d, m, y].some(n => isNaN(n)))
            return null;
        return new Date(y, m - 1, d, h, mi, s);
    }
    parseAmount(str) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    async startRealtimeMonitoring(callback) {
        if (!this.isConnected)
            await this.connect();
        try {
            await this.imap.mailboxOpen('INBOX');
            const idle = await this.imap.idle();
            if (idle && typeof idle === 'object' && 'on' in idle) {
                idle.on('message', async (msg) => {
                    try {
                        const lock = await this.imap.getMailboxLock('INBOX');
                        try {
                            const email = await this.imap.fetchOne(msg.uid, {
                                source: true,
                                envelope: true
                            });
                            if (email) {
                                const parsed = await (0, mailparser_1.simpleParser)(email.source);
                                const transaction = await this.parseYapiKrediFASTEmail(parsed);
                                if (transaction) {
                                    callback(transaction);
                                }
                            }
                        }
                        finally {
                            lock.release();
                        }
                    }
                    catch (err) {
                        (0, logger_1.logError)('Realtime email processing error:', err);
                    }
                });
            }
            console.log('🔄 Realtime email monitoring başlatıldı');
        }
        catch (err) {
            (0, logger_1.logError)('Realtime monitoring başlatılamadı:', err);
            throw err;
        }
    }
}
exports.YapiKrediFASTEmailService = YapiKrediFASTEmailService;
function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}
//# sourceMappingURL=emailService.js.map