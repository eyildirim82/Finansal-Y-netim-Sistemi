import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { YapiKrediFASTEmailService } from './emailService';
import { PaymentMatchingService } from './paymentMatchingService';

const prisma = new PrismaClient();

export class BankingController {
  private emailService: YapiKrediFASTEmailService;
  private matchingService: PaymentMatchingService;

  constructor() {
    this.emailService = new YapiKrediFASTEmailService();
    this.matchingService = new PaymentMatchingService();
  }

  // Otomatik email çekme
  async fetchEmails(req: Request, res: Response) {
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
          // Duplikasyon kontrolü
          const existingTransaction = await prisma.bankTransaction.findFirst({
            where: { messageId: emailData.transaction.messageId }
          });

          if (existingTransaction) {
            duplicateCount++;
            continue;
          }

          // İşlemi kaydet
          const savedTransaction = await prisma.bankTransaction.create({
            data: emailData.transaction
          });

          // Otomatik eşleştirme
          const matchResult = await this.matchingService.matchTransaction(savedTransaction);
          await this.matchingService.saveMatchResult(savedTransaction.id, matchResult);

          processedTransactions.push({
            transaction: savedTransaction,
            matchResult
          });

        } catch (error) {
          console.error('Email işleme hatası:', error);
        }
      }

      const metrics = this.emailService.getMetrics();

      res.json({
        success: true,
        message: `${processedTransactions.length} email işlendi, ${duplicateCount} duplikasyon`,
        data: {
          processed: processedTransactions.length,
          duplicates: duplicateCount,
          transactions: processedTransactions,
          metrics
        }
      });

    } catch (error) {
      console.error('Otomatik email çekme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Email çekme sırasında hata oluştu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Email işleme (manuel)
  async processEmail(req: Request, res: Response) {
    try {
      const { emailContent, emailSubject, messageId } = req.body;

      if (!emailContent || !messageId) {
        return res.status(400).json({
          success: false,
          message: 'Email içeriği ve messageId gerekli'
        });
      }

      // Email parsing
      const transaction = await this.parseYapiKrediEmail(emailContent, emailSubject, messageId);
      
      if (!transaction) {
        return res.status(400).json({
          success: false,
          message: 'Email parse edilemedi'
        });
      }

      // Duplikasyon kontrolü
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

      // İşlemi kaydet
      const savedTransaction = await prisma.bankTransaction.create({
        data: transaction
      });

      // Otomatik eşleştirme
      const matchResult = await this.matchingService.matchTransaction(savedTransaction);
      await this.matchingService.saveMatchResult(savedTransaction.id, matchResult);

      res.json({
        success: true,
        message: 'Email başarıyla işlendi',
        data: {
          transaction: savedTransaction,
          matchResult
        }
      });

    } catch (error) {
      console.error('Email işleme hatası:', error);
      res.status(500).json({
        success: false,
        message: 'Email işlenirken hata oluştu'
      });
    }
  }

  // Banka işlemleri listesi
  async getBankTransactions(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, direction, isMatched } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);

      if (
        !Number.isInteger(pageNum) ||
        !Number.isInteger(limitNum) ||
        pageNum <= 0 ||
        limitNum <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: 'Sayfa ve limit pozitif tamsayı olmalıdır'
        });
      }

      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (direction) where.direction = direction;
      if (isMatched !== undefined) where.isMatched = isMatched === 'true';

      const transactions = await prisma.bankTransaction.findMany({
        where,
        include: {
          customer: true,
          paymentMatches: {
            include: { customer: true }
          }
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limitNum
      });

      const total = await prisma.bankTransaction.count({ where });

      res.json({
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Banka işlemleri getirme hatası:', error);
      res.status(500).json({ error: 'Banka işlemleri getirilemedi' });
    }
  }

  // Eşleşmeyen ödemeler
  async getUnmatchedPayments(req: Request, res: Response) {
    try {
      const { limit = 50 } = req.query;
      const limitNum = Number(limit);

      if (!Number.isInteger(limitNum) || limitNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit pozitif tamsayı olmalıdır'
        });
      }

      const transactions = await this.matchingService.getUnmatchedTransactions(limitNum);

      res.json({
        success: true,
        data: transactions,
        count: transactions.length
      });

    } catch (error) {
      console.error('Eşleşmeyen ödemeler getirme hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Eşleşmeyen ödemeler getirilemedi'
      });
    }
  }

  // Manuel eşleştirme
  async matchPayment(req: Request, res: Response) {
    try {
      const { transactionId, customerId } = req.body;
      
      if (!transactionId || !customerId) {
        return res.status(400).json({
          success: false,
          error: 'Transaction ID ve Customer ID gerekli'
        });
      }

      // Transaction'ı getir
      const transaction = await prisma.bankTransaction.findUnique({
        where: { id: Number(transactionId) }
      });
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'İşlem bulunamadı'
        });
      }

      // Müşteriyi getir
      const customer = await prisma.customer.findUnique({
        where: { id: Number(customerId) }
      });
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Müşteri bulunamadı'
        });
      }

      // Manuel eşleştirme sonucu oluştur
      const matchResult = {
        matched: true,
        customer: customer,
        confidence: 1.0,
        methods: ['manual_match']
      };

      // Eşleştirmeyi kaydet
      await this.matchingService.saveMatchResult(Number(transactionId), matchResult);

      res.json({
        success: true,
        message: 'Eşleştirme başarıyla kaydedildi',
        data: {
          transaction: transaction,
          customer: customer,
          confidence: 1.0
        }
      });

    } catch (error) {
      console.error('Manuel eşleştirme hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Manuel eşleştirme yapılamadı'
      });
    }
  }

  // Email ayarları
  async getEmailSettings(req: Request, res: Response) {
    try {
      const settings = {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER,
        isConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
      };

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('Email ayarları getirme hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Email ayarları getirilemedi'
      });
    }
  }

  // Email bağlantı testi
  async testEmailConnection(req: Request, res: Response) {
    try {
      const isConnected = await this.emailService.testConnection();
      
      res.json({
        success: true,
        data: {
          connected: isConnected
        }
      });

    } catch (error) {
      console.error('Email bağlantı testi hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Email bağlantı testi yapılamadı'
      });
    }
  }

  // Eşleştirme istatistikleri
  async getMatchingStats(req: Request, res: Response) {
    try {
      const stats = await this.matchingService.getMatchingStatistics();
      
      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Eşleştirme istatistikleri hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Eşleştirme istatistikleri getirilemedi'
      });
    }
  }

  // Otomatik eşleştirme çalıştır
  async runAutoMatching(req: Request, res: Response) {
    try {
      const { limit = 100 } = req.query;
      const limitNum = Number(limit);

      if (!Number.isInteger(limitNum) || limitNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Limit pozitif tamsayı olmalıdır'
        });
      }

      const unmatchedTransactions = await this.matchingService.getUnmatchedTransactions(limitNum);
      let matchedCount = 0;

      for (const transaction of unmatchedTransactions) {
        const matchResult = await this.matchingService.matchTransaction(transaction);
        if (matchResult.matched) {
          await this.matchingService.saveMatchResult(transaction.id, matchResult);
          matchedCount++;
        }
      }

      res.json({
        success: true,
        message: `${matchedCount} işlem eşleştirildi`,
        data: {
          processed: unmatchedTransactions.length,
          matched: matchedCount
        }
      });

    } catch (error) {
      console.error('Otomatik eşleştirme hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Otomatik eşleştirme çalıştırılamadı'
      });
    }
  }

  // Private methods
  private async parseYapiKrediEmail(emailContent: any, emailSubject: string, messageId: string) {
    try {
      // Email service'i kullanarak parse et
      const mockEmail = {
        html: emailContent,
        subject: emailSubject,
        messageId: messageId,
        from: '',
        date: new Date()
      };

      return await this.emailService.parseYapiKrediFASTEmail(mockEmail);
    } catch (error) {
      console.error('Email parse hatası:', error);
      return null;
    }
  }
} 