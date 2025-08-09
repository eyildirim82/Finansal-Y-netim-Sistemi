import { logError } from '../../shared/logger';
import { PrismaClient } from '@prisma/client';

/**
 * Yapı Kredi FAST Ödeme Eşleştirme Servisi
 * Gelen FAST işlemlerini müşterilerle otomatik olarak eşleştirir
 */
export class PaymentMatchingService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Müşteri isimlerini normalize etme
   */
  normalizeCustomerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-zçğıöşü]/g, '') // Sadece harfler
      .replace(/ltd\.?/g, '')
      .replace(/a\.?ş\.?/g, '')
      .replace(/san\.?/g, '')
      .replace(/ve\s+tic\.?/g, '')
      .replace(/endüstriyel/g, '')
      .replace(/kontrol/g, '')
      .replace(/sistemleri/g, '')
      .trim();
  }

  /**
   * İki isim arasındaki benzerliği hesaplama (Levenshtein distance)
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeCustomerName(name1);
    const normalized2 = this.normalizeCustomerName(name2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const matrix: number[][] = [];
    const len1 = normalized1.length;
    const len2 = normalized2.length;
    
    // Matrix oluşturma
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Levenshtein distance hesaplama
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = normalized1[i - 1] === normalized2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    
    return maxLength === 0 ? 1.0 : (maxLength - distance) / maxLength;
  }

  /**
   * Müşteri isim varyasyonlarını kontrol etme
   */
  checkNameVariations(customerName: string, transactionName: string): { match: boolean; confidence: number; method: string } {
    const similarity = this.calculateNameSimilarity(customerName, transactionName);
    
    // Yüksek benzerlik kontrolü
    if (similarity >= 0.8) {
      return { match: true, confidence: similarity, method: 'name_similarity' };
    }
    
    // Kısaltma kontrolü (örn: "ABC İNŞAAT" vs "ABC")
    const customerWords = customerName.split(/\s+/);
    const transactionWords = transactionName.split(/\s+/);
    
    // İlk kelime eşleşmesi
    if (customerWords[0] && transactionWords[0] && 
        customerWords[0].toLowerCase() === transactionWords[0].toLowerCase()) {
      return { match: true, confidence: 0.7, method: 'first_word_match' };
    }
    
    // Kısaltma kontrolü
    const customerInitials = customerWords.map(w => w.charAt(0)).join('');
    const transactionInitials = transactionWords.map(w => w.charAt(0)).join('');
    
    if (customerInitials.length > 1 && customerInitials === transactionInitials) {
      return { match: true, confidence: 0.6, method: 'initials_match' };
    }
    
    return { match: false, confidence: similarity, method: 'no_match' };
  }

  /**
   * Tutar deseni kontrolü
   */
  async checkAmountPattern(transactionAmount: number, customerId: string): Promise<{ match: boolean; confidence: number; method: string }> {
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

      // Tam tutar eşleşmesi
      const exactMatch = recentTransactions.find(t => Math.abs(t.amount - transactionAmount) < 0.01);
      if (exactMatch) {
        return { match: true, confidence: 0.9, method: 'exact_amount_match' };
      }

      // Benzer tutar deseni (örn: 1000, 2000, 3000 gibi düzenli ödemeler)
      const amounts = recentTransactions.map(t => t.amount).sort((a, b) => a - b);
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      
      // Ortalama tutara yakınlık kontrolü (%10 tolerans)
      const tolerance = avgAmount * 0.1;
      if (Math.abs(transactionAmount - avgAmount) <= tolerance) {
        return { match: true, confidence: 0.7, method: 'average_amount_pattern' };
      }

      // Düzenli artış/azalış deseni
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

    } catch (error) {
      logError('Tutar deseni kontrolü hatası:', error);
      return { match: false, confidence: 0, method: 'error' };
    }
  }

  /**
   * IBAN eşleştirme kontrolü
   */
  checkIBANMatch(transactionIBAN: string, customerIBAN: string | null): { match: boolean; confidence: number; method: string } {
    if (!customerIBAN) {
      return { match: false, confidence: 0, method: 'no_customer_iban' };
    }

    // Tam IBAN eşleşmesi
    if (transactionIBAN === customerIBAN) {
      return { match: true, confidence: 1.0, method: 'exact_iban_match' };
    }

    // Maskelenmiş IBAN karşılaştırması (son 4 hane)
    const transactionLast4 = transactionIBAN.slice(-4);
    const customerLast4 = customerIBAN.slice(-4);
    
    if (transactionLast4 === customerLast4) {
      return { match: true, confidence: 0.8, method: 'partial_iban_match' };
    }

    return { match: false, confidence: 0, method: 'no_iban_match' };
  }

  /**
   * Tüm müşterileri getir
   */
  async getCustomers(): Promise<any[]> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          isActive: true,
          // FAKTORİNG müşterilerini hariç tut
          name: {
            not: {
              contains: 'FAKTORİNG'
            }
          }
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

    } catch (error) {
      logError('Müşteri getirme hatası:', error);
      return [];
    }
  }

  /**
   * İşlemi müşterilerle eşleştir
   */
  async matchTransaction(transaction: any): Promise<{
    matched: boolean;
    customer?: any;
    confidence: number;
    methods: string[];
    allMatches?: any[];
    error?: string;
  }> {
    try {
      console.log(`🔍 Eşleştirme başlatılıyor: ${transaction.counterpartyName} - ${transaction.amount} TL`);
      
      const customers = await this.getCustomers();
      console.log(`📋 ${customers.length} müşteri kontrol ediliyor...`);
      
      const matches: any[] = [];
      
      for (const customer of customers) {
        console.log(`  🔍 Müşteri kontrol ediliyor: ${customer.name}`);
        
        let totalConfidence = 0;
        let matchMethods: string[] = [];
        
        // 1. İsim benzerliği kontrolü
        const nameMatch = this.checkNameVariations(customer.name, transaction.counterpartyName);
        console.log(`    📝 İsim eşleşmesi: ${nameMatch.match ? '✅' : '❌'} (${(nameMatch.confidence * 100).toFixed(1)}%)`);
        
        if (nameMatch.match) {
          totalConfidence += nameMatch.confidence * 0.5; // %50 ağırlık
          matchMethods.push(nameMatch.method);
        }
        
        // 2. Orijinal isim kontrolü
        if (customer.originalName) {
          const originalNameMatch = this.checkNameVariations(customer.originalName, transaction.counterpartyName);
          if (originalNameMatch.match && originalNameMatch.confidence > nameMatch.confidence) {
            totalConfidence = totalConfidence - (nameMatch.confidence * 0.5) + (originalNameMatch.confidence * 0.5);
            matchMethods = matchMethods.filter(m => m !== nameMatch.method);
            matchMethods.push(originalNameMatch.method);
          }
        }
        
        // 3. İsim varyasyonları kontrolü
        for (const variation of customer.nameVariations) {
          const variationMatch = this.checkNameVariations(variation, transaction.counterpartyName);
          if (variationMatch.match && variationMatch.confidence > nameMatch.confidence) {
            totalConfidence = totalConfidence - (nameMatch.confidence * 0.5) + (variationMatch.confidence * 0.5);
            matchMethods = matchMethods.filter(m => m !== nameMatch.method);
            matchMethods.push(variationMatch.method);
            break;
          }
        }
        
        // 4. Tutar deseni kontrolü
        const amountMatch = await this.checkAmountPattern(transaction.amount, customer.id);
        if (amountMatch.match) {
          totalConfidence += amountMatch.confidence * 0.3; // %30 ağırlık
          matchMethods.push(amountMatch.method);
        }
        
        // 5. IBAN eşleştirme kontrolü (eğer müşteride IBAN bilgisi varsa)
        // Bu kısım şimdilik devre dışı çünkü schema'da IBAN field'ı yok
        // const ibanMatch = this.checkIBANMatch(transaction.accountIban, customer.yapikrediIban);
        // if (ibanMatch.match) {
        //   totalConfidence += ibanMatch.confidence * 0.2; // %20 ağırlık
        //   matchMethods.push(ibanMatch.method);
        // }
        
        console.log(`    🎯 Toplam güven: ${(totalConfidence * 100).toFixed(1)}%`);
        
        // Eşleşme skoru %70'den yüksekse kaydet
        if (totalConfidence >= 0.7) {
          console.log(`    ✅ Eşleşme bulundu!`);
          matches.push({
            customer,
            confidence: totalConfidence,
            methods: matchMethods
          });
        }
      }
      
      // En yüksek güvenilirlik skoruna sahip eşleşmeyi seç
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

    } catch (error) {
      logError('❌ Eşleştirme hatası:', error);
      return {
        matched: false,
        confidence: 0,
        methods: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Eşleştirme sonucunu database'e kaydetme
   */
  async saveMatchResult(transactionId: string, matchResult: any): Promise<boolean> {
    try {
      if (!matchResult.matched) {
        // Eşleşme bulunamadı, sadece işlemi güncelle
        await this.prisma.bankTransaction.update({
          where: { id: transactionId },
          data: {
            isMatched: false,
            confidenceScore: 0
          }
        });
        return true;
      }

      // Eşleşme bulundu, PaymentMatch kaydı oluştur
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

      // BankTransaction'ı güncelle
      await this.prisma.bankTransaction.update({
        where: { id: transactionId },
        data: {
          isMatched: true,
          matchedCustomerId: matchResult.customer.id,
          confidenceScore: matchResult.confidence
        }
      });

      // Müşteri bilgilerini güncelle
      await this.prisma.customer.update({
        where: { id: matchResult.customer.id },
        data: {
          lastPaymentDate: new Date()
        }
      });

      console.log(`✅ Eşleştirme kaydedildi: PaymentMatch ID ${paymentMatch.id}`);
      return true;

    } catch (error) {
      logError('❌ Eşleştirme kaydetme hatası:', error);
      return false;
    }
  }

  /**
   * Eşleşmeyen işlemleri getir
   */
  async getUnmatchedTransactions(limit: number = 50): Promise<any[]> {
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

    } catch (error) {
      logError('❌ Eşleşmeyen işlemler getirme hatası:', error);
      return [];
    }
  }

  /**
   * Eşleştirmeyi onayla/reddet
   */
  async confirmMatch(matchId: string, confirmed: boolean = true): Promise<boolean> {
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
        // BankTransaction'ı da onayla
        await this.prisma.bankTransaction.update({
          where: { id: paymentMatch.bankTransactionId },
          data: {
            isMatched: true,
            matchedCustomerId: paymentMatch.customerId,
            confidenceScore: paymentMatch.confidenceScore
          }
        });

        console.log(`✅ Eşleştirme onaylandı: ${paymentMatch.customer.name}`);
      } else {
        console.log(`❌ Eşleştirme reddedildi: ${paymentMatch.customer.name}`);
      }

      return true;

    } catch (error) {
      logError('❌ Eşleştirme onaylama hatası:', error);
      return false;
    }
  }

  /**
   * Eşleştirme istatistiklerini getir
   */
  async getMatchingStatistics(): Promise<any> {
    try {
      const [
        totalTransactions,
        matchedTransactions,
        unmatchedTransactions,
        avgConfidence
      ] = await Promise.all([
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

    } catch (error) {
      logError('❌ Eşleştirme istatistikleri hatası:', error);
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