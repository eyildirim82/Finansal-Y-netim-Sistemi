import { logError } from '../../shared/logger';
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
          logError('Email işleme hatası:', error);
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

    } catch (error) {
      logError('Otomatik email çekme hatası:', error);
      return res.status(500).json({
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

      return res.json({
        success: true,
        message: 'Email başarıyla işlendi',
        data: {
          transaction: savedTransaction,
          matchResult
        }
      });

    } catch (error) {
      logError('Email işleme hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Email işlenirken hata oluştu'
      });
    }
  }

  // Banka işlemlerini getir
  async getBankTransactions(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, direction, isMatched, startDate, endDate } = req.query;
      
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      // Filtreleme koşulları
      const where: any = {};
      
      if (direction) where.direction = direction;
      if (isMatched !== undefined) where.isMatched = isMatched === 'true';
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = new Date(startDate as string);
        if (endDate) where.transactionDate.lte = new Date(endDate as string);
      }

      // Toplam sayı
      const total = await prisma.bankTransaction.count({ where });

      // İşlemleri getir
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

    } catch (error) {
      logError('Banka işlemleri getirme hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Banka işlemleri getirilemedi'
      });
    }
  }

  // Eşleşmemiş ödemeleri getir
  async getUnmatchedPayments(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      // Toplam sayı
      const total = await prisma.bankTransaction.count({
        where: { isMatched: false }
      });

      // Eşleşmemiş işlemleri getir
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

    } catch (error) {
      logError('Eşleşmemiş ödemeler getirme hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Eşleşmemiş ödemeler getirilemedi'
      });
    }
  }

  // Manuel ödeme eşleştirme
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
        where: { id: transactionId }
      });
      
      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: 'İşlem bulunamadı'
        });
      }

      // Müşteriyi getir
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
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

    } catch (error) {
      logError('Manuel eşleştirme hatası:', error);
      return res.status(500).json({
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

      return res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      logError('Email ayarları getirme hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Email ayarları getirilemedi'
      });
    }
  }

  // Email bağlantı testi
  async testEmailConnection(req: Request, res: Response) {
    try {
      const isConnected = await this.emailService.testConnection();
      
      return res.json({
        success: true,
        data: {
          connected: isConnected
        }
      });

    } catch (error) {
      logError('Email bağlantı testi hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Email bağlantı testi yapılamadı'
      });
    }
  }

  // Eşleştirme istatistikleri
  async getMatchingStats(req: Request, res: Response) {
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

    } catch (error) {
      logError('Eşleştirme istatistikleri hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Eşleştirme istatistikleri getirilemedi'
      });
    }
  }

  // Otomatik eşleştirme çalıştır
  async runAutoMatching(req: Request, res: Response) {
    try {
      const { limit = 100 } = req.query;
      const limitNum = parseInt(limit as string) || 100;

      // Eşleşmemiş işlemleri getir
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

        } catch (error) {
          logError(`İşlem eşleştirme hatası (${transaction.id}):`, error);
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

    } catch (error) {
      logError('Otomatik eşleştirme hatası:', error);
      return res.status(500).json({
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
      logError('Email parse hatası:', error);
      return null;
    }
  }
} 