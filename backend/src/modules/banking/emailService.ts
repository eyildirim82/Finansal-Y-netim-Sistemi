import { logError } from '@/shared/logger';
import { ImapFlow } from 'imapflow';
// @ts-ignore
import { simpleParser } from 'mailparser';
// @ts-ignore
import { decodeWords } from 'libmime';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Yapı Kredi FAST e-postalarını okur, direction'ı güvenilir
 * şekilde tespit eder ve işlem objesi döner.
 */
export class YapiKrediFASTEmailService {
  private imap: ImapFlow | null = null;
  private isConnected = false;
  private failedLogPath: string;

  /** Yapı Kredi FAST / HAVALE / EFT e-posta regex'leri */
  private patterns = {
    fast: /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınıza|ınızdan),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden) (?<amt>[\d\.]+,\d{2}) TL FAST ödemesi (?:gelmiştir|gönderilmiştir)\./si,
    havale: /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınızdan|ınıza),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL HAVALE (?:çıkışı gerçekleşmiştir|çıkışı|ödemesi gönderilmiştir|ödemesi gelmiştir|gönderilmiştir|gelmiştir)\./si,
    eft: /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınızdan|ınıza),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL EFT (?:girişi gerçekleşmiştir|girişi|ödemesi gelmiştir|ödemesi gönderilmiştir)\./si,
    balance: /(?<mask>\d+X+\d+) TL hesab(?:ınızın|ınızın) kullanılabilir bakiyesi (?<bal>[\d\.]+,\d{2}) TL/si
  };

  // Performance configuration
  private config = {
    batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '10'),
    concurrencyLimit: parseInt(process.env.EMAIL_CONCURRENCY_LIMIT || '5'),
    timeout: parseInt(process.env.EMAIL_TIMEOUT || '5000'),
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '1000')
  };

  // Performance metrics
  private metrics = {
    totalEmails: 0,
    processedEmails: 0,
    failedEmails: 0,
    totalProcessingTime: 0,
    avgProcessingTime: 0,
    emailsPerSecond: 0,
    retryCount: 0
  };

  constructor() {
    this.failedLogPath = path.join(__dirname, '../../../logs/failed-fast-emails.log');
    console.log(`📧 Email Service configured - Batch: ${this.config.batchSize}, Concurrency: ${this.config.concurrencyLimit}`);
  }

  /* ───────────────────────── IMAP ───────────────────────── */

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    // Tüm email credential'ları environment variable'dan alınır
    const cfg = {
      host: process.env.EMAIL_HOST!, // Örn: 'imap.yapikredi.com.tr'
      port: +(process.env.EMAIL_PORT || '993'), // Örn: 993
      secure: true,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!
      }
    };

    if (!cfg.host || !cfg.port || !cfg.auth.user || !cfg.auth.pass) {
      throw new Error('Email servis environment variable eksik! EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS zorunlu.');
    }

    this.imap = new ImapFlow(cfg);
    try {
      await this.imap.connect();
      this.isConnected = true;
      console.log('IMAP bağlantısı başarılı.');
      return true;
    } catch (err) {
      logError('IMAP bağlantı hatası:', err);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.imap && this.isConnected) {
      await this.imap.logout();
      this.isConnected = false;
    }
  }

  /* ───────────────────────── CORE ───────────────────────── */

  /** Görülmemiş Yapı Kredi FAST e-postalarını alır */
  async fetchYapiKrediFASTEmails(): Promise<any[]> {
    if (!this.isConnected) await this.connect();
    console.log('IMAP bağlantısı kuruldu mu:', this.isConnected);
    
    try {
      await this.imap!.mailboxOpen('INBOX');
      console.log('INBOX mailbox açıldı.');
    } catch (err) {
      logError('INBOX mailbox açılamadı:', err);
      throw err;
    }

    const criteria = {
      unseen: true,
      subject: ['FAST', 'HAVALE', 'EFT', 'asistan']
    };

    return await this.fetchEmailsBatch(criteria);
  }

  async fetchEmailsBatch(criteria: any): Promise<any[]> {
    const startTime = Date.now();
    const messages: any[] = [];

    try {
      const lock = await this.imap!.getMailboxLock('INBOX');
      try {
        const emails = this.imap!.fetch(criteria, {
          source: true,
          envelope: true,
          bodyStructure: true,
          bodyParts: ['']
        });

        for await (const email of emails) {
          try {
            const parsed = await simpleParser(email.source);
            const transaction = await this.parseYapiKrediFASTEmail(parsed);
            
            if (transaction) {
              messages.push({
                transaction,
                email: parsed
              });
              this.metrics.processedEmails++;
            } else {
              this.metrics.failedEmails++;
            }
          } catch (err) {
            logError('Email parse hatası:', err);
            this.metrics.failedEmails++;
          }
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      logError('Email batch fetch hatası:', err);
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

  async processBatchWithConcurrency(batch: any[], concurrencyLimit: number): Promise<any[]> {
    const results: any[] = [];
    const queue = [...batch];
    const running: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      if (queue.length === 0) return;

      const item = queue.shift()!;
      try {
        const result = await this.processEmailItem(item);
        if (result) results.push(result);
      } catch (error) {
        logError('Batch processing error:', error);
      }

      // Recursively process next item
      await processNext();
    };

    // Start concurrent processing
    for (let i = 0; i < Math.min(concurrencyLimit, batch.length); i++) {
      running.push(processNext());
    }

    await Promise.all(running);
    return results;
  }

  private async processEmailItem(item: any): Promise<any> {
    // Implementation for processing individual email items
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

  /* ───────────────────────── PARSING ───────────────────────── */

  async parseYapiKrediFASTEmail(mail: any): Promise<any> {
    if (!mail || !mail.text) {
      logError('Invalid email data:', mail);
      return null;
    }

    const body = this.cleanHtml(mail.text);
    let match = null;
    let type = '';

    // FAST pattern'i dene
    match = body.match(this.patterns.fast);
    if (match) type = 'FAST';

    // HAVALE pattern'i dene
    if (!match) {
      match = body.match(this.patterns.havale);
      if (match) type = 'HAVALE';
    }

    // EFT pattern'i dene
    if (!match) {
      match = body.match(this.patterns.eft);
      if (match) type = 'EFT';
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
      } catch (err) {
        logError('Parse edilemeyen e-posta loglanamadı:', err);
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

  /* ───────────────────────── HELPERS ───────────────────────── */

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.disconnect();
      return true;
    } catch (e) {
      return false;
    }
  }

  detectDirection(mail: any, bodyText: string): string {
    const subj = decodeWords(mail.subject || '').toLowerCase();

    if (subj.includes('asistan-gelen')) return 'IN';
    if (subj.includes('asistan-giden')) return 'OUT';

    if (/(hesabınıza|gelmiştir|girişi|kişiden)/i.test(bodyText)) return 'IN';
    if (/(hesabınızdan|gönderilmiştir|çıkışı|kişiye)/i.test(bodyText)) return 'OUT';

    throw new Error('Direction tespit edilemedi');
  }

  cleanHtml(html: string): string {
    const entityMap: { [key: string]: string } = {
      '&nbsp;': ' ', '&ouml;': 'ö', '&Ouml;': 'Ö', '&uuml;': 'ü', '&Uuml;': 'Ü', 
      '&ccedil;': 'ç', '&Ccedil;': 'Ç', '&ş': 'ş', '&Ş': 'Ş', '&ğ': 'ğ', 
      '&Ğ': 'Ğ', '&İ': 'İ', '&ı': 'ı', '&amp;': '&'
    };

    let out = html;
    // Hızlı entity replace
    out = out.replace(/&[a-zA-Z]+?;/g, m => entityMap[m] || m);

    return out
      .replace(/&nbsp;/gi, ' ')
      .replace(/=\r?\n/g, '') // quoted-printable soft break
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** "10/07/2025 18:47:29" → Date */
  parseDate(str: string): Date | null {
    if (!str) return null;
    const parts = str.split(/[\/ :]/).map(Number);
    const [d, m, y, h = 0, mi = 0, s = 0] = parts;
    if ([d, m, y].some(n => isNaN(n))) return null;
    return new Date(y, m - 1, d, h, mi, s);
  }

  /** "1.234,56" → 1234.56 */
  parseAmount(str: string): number {
    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
  }

  /* ───────────────────────── IDLE ───────────────────────── */

  async startRealtimeMonitoring(callback: (transaction: any) => void): Promise<void> {
    if (!this.isConnected) await this.connect();

    try {
      await this.imap!.mailboxOpen('INBOX');
      
      // IDLE mode başlat
      const idle = await this.imap!.idle();
      
      if (idle && typeof idle === 'object' && 'on' in idle) {
        (idle as any).on('message', async (msg: any) => {
          try {
            const lock = await this.imap!.getMailboxLock('INBOX');
            try {
              const email = await this.imap!.fetchOne(msg.uid, {
                source: true,
                envelope: true
              });
              
              if (email) {
                const parsed = await simpleParser(email.source);
                const transaction = await this.parseYapiKrediFASTEmail(parsed);
                
                if (transaction) {
                  callback(transaction);
                }
              }
            } finally {
              lock.release();
            }
          } catch (err) {
            logError('Realtime email processing error:', err);
          }
        });
      }

      console.log('🔄 Realtime email monitoring başlatıldı');
      
    } catch (err) {
      logError('Realtime monitoring başlatılamadı:', err);
      throw err;
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
} 