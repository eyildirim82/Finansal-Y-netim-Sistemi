import { logError } from '../../shared/logger';
import * as fs from 'fs';
import pdf from 'pdf-parse';

export interface PDFTransaction {
  date: Date;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType?: string;
  reference?: string;
}

export interface PDFParseResult {
  transactions: PDFTransaction[];
  accountInfo: {
    accountNumber?: string;
    accountHolder?: string;
    startDate?: Date;
    endDate?: Date;
    startBalance?: number;
    endBalance?: number;
  };
  summary: {
    totalDebit: number;
    totalCredit: number;
    transactionCount: number;
  };
}

export class PDFParserService {
  
  /**
   * PDF dosyasını parse eder ve hesap hareketlerini çıkarır
   */
  async parsePDF(filePath: string): Promise<PDFParseResult> {
    try {
      console.log(`📄 PDF parsing başlatılıyor: ${filePath}`);
      
      // PDF dosyasını oku
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      console.log(`📄 PDF içeriği okundu, ${data.text.length} karakter`);
      
      // Metni satırlara böl
      const lines = data.text.split('\n').filter(line => line.trim());
      
      // Yapı Kredi PDF'i mi kontrol et
      const isYapiKredi = this.isYapiKrediPDF(lines);
      
      if (isYapiKredi) {
        console.log('🏦 Yapı Kredi PDF formatı tespit edildi');
        return this.parseYapiKrediPDF(lines);
      }
      
      // Genel parser
      console.log('📄 Genel PDF formatı kullanılıyor');
      
      // Hesap bilgilerini çıkar
      const accountInfo = this.extractAccountInfo(lines);
      
      // İşlemleri parse et
      const transactions = this.parseTransactions(lines);
      
      // İşlemleri tarihe göre sırala
      const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      console.log(`📅 İşlemler tarihe göre sıralandı: ${sortedTransactions.length} işlem`);
      
      // Özet bilgileri hesapla
      const summary = this.calculateSummary(sortedTransactions);
      
      console.log(`✅ PDF parsing tamamlandı: ${sortedTransactions.length} işlem bulundu`);
      
      return {
        transactions: sortedTransactions,
        accountInfo,
        summary
      };
      
    } catch (error) {
      logError('PDF parsing hatası:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      throw new Error(`PDF parse edilemedi: ${errorMessage}`);
    }
  }
  
  /**
   * Hesap bilgilerini çıkarır
   */
  private extractAccountInfo(lines: string[]): PDFParseResult['accountInfo'] {
    const accountInfo: PDFParseResult['accountInfo'] = {};
    
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];
      
      // Hesap numarası
      if (line.includes('Hesap No:') || line.includes('Account No:')) {
        const match = line.match(/(?:Hesap No:|Account No:)\s*([A-Z0-9\s-]+)/i);
        if (match) accountInfo.accountNumber = match[1].trim();
      }
      
      // Hesap sahibi
      if (line.includes('Hesap Sahibi:') || line.includes('Account Holder:')) {
        const match = line.match(/(?:Hesap Sahibi:|Account Holder:)\s*(.+)/i);
        if (match) accountInfo.accountHolder = match[1].trim();
      }
      
      // Tarih aralığı
      if (line.includes('Tarih:') || line.includes('Date:')) {
        const dateMatch = line.match(/(\d{2}[\/\.]\d{2}[\/\.]\d{4})/g);
        if (dateMatch && dateMatch.length >= 2) {
          accountInfo.startDate = this.parseDate(dateMatch[0]);
          accountInfo.endDate = this.parseDate(dateMatch[1]);
        }
      }
      
      // Başlangıç bakiyesi
      if (line.includes('Başlangıç Bakiyesi:') || line.includes('Opening Balance:')) {
        const balanceMatch = line.match(/[\d\.,]+/g);
        if (balanceMatch) {
          accountInfo.startBalance = this.parseAmount(balanceMatch[0]);
        }
      }
    }
    
    return accountInfo;
  }
  
  /**
   * İşlemleri parse eder
   */
  private parseTransactions(lines: string[]): PDFTransaction[] {
    const transactions: PDFTransaction[] = [];
    let inTransactionSection = false;
    let headerFound = false;
    
    console.log(`🔍 ${lines.length} satır analiz ediliyor...`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Debug için ilk 20 satırı yazdır
      if (i < 20) {
        console.log(`📄 Satır ${i}: "${line}"`);
      }
      
      // İşlem başlığı satırını tespit et
      if (this.isTransactionHeader(line)) {
        console.log(`✅ İşlem başlığı bulundu: "${line}"`);
        inTransactionSection = true;
        headerFound = true;
        continue;
      }
      
      // Eğer başlık bulunamadıysa, tarih içeren satırları işlem olarak kabul et
      if (!headerFound && this.containsDate(line)) {
        console.log(`📅 Tarih içeren satır bulundu: "${line}"`);
        const transaction = this.parseTransactionLine(line);
        if (transaction) {
          transactions.push(transaction);
        }
        continue;
      }
      
      // İşlem bölümünde değilse atla
      if (!inTransactionSection) continue;
      
      // Toplam satırını tespit et
      if (this.isTotalRow(line)) {
        console.log(`🛑 Toplam satırı bulundu: "${line}"`);
        break;
      }
      
      // İşlem satırını parse et
      const transaction = this.parseTransactionLine(line);
      if (transaction) {
        console.log(`✅ İşlem parse edildi: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
        transactions.push(transaction);
      }
    }
    
    console.log(`📊 Toplam ${transactions.length} işlem bulundu`);
    return transactions;
  }
  
  /**
   * İşlem başlığı satırını tespit eder
   */
  private isTransactionHeader(line: string): boolean {
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
    
    // Başlık kelimelerini kontrol et
    const headerKeywords = [
      'tarih', 'date', 'açıklama', 'description', 'borç', 'debit', 
      'alacak', 'credit', 'bakiye', 'balance', 'tutar', 'amount',
      'işlem', 'transaction', 'hareket'
    ];
    
    const lowerLine = line.toLowerCase();
    const keywordCount = headerKeywords.filter(keyword => lowerLine.includes(keyword)).length;
    
    // En az 2 başlık kelimesi varsa başlık olarak kabul et
    if (keywordCount >= 2) {
      return true;
    }
    
    return headerPatterns.some(pattern => pattern.test(line));
  }
  
  /**
   * Toplam satırını tespit eder
   */
  private isTotalRow(line: string): boolean {
    const totalPatterns = [
      /TOPLAM/i,
      /TOTAL/i,
      /GENEL TOPLAM/i,
      /GRAND TOTAL/i
    ];
    
    return totalPatterns.some(pattern => pattern.test(line));
  }
  
  /**
   * Satırın tarih içerip içermediğini kontrol eder
   */
  private containsDate(line: string): boolean {
    const datePatterns = [
      /(\d{2}[\/\.]\d{2}[\/\.]\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}-\d{2}-\d{4})/
    ];
    
    return datePatterns.some(pattern => pattern.test(line));
  }
  
  /**
   * Satırdaki tutarların pozisyonlarını bulur
   */
  private findAmountPositions(line: string, amounts: string[]): Array<{amount: number, position: number}> {
    const positions: Array<{amount: number, position: number}> = [];
    
    for (const amountStr of amounts) {
      const position = line.indexOf(amountStr);
      if (position !== -1) {
        const amount = this.parseAmount(amountStr);
        if (amount > 0.01) { // 1 kuruştan büyük tutarlar
          positions.push({ amount, position });
        }
      }
    }
    
    // Pozisyona göre sırala
    return positions.sort((a, b) => a.position - b.position);
  }
  
  /**
   * Tek bir işlem satırını parse eder
   */
  private parseTransactionLine(line: string): PDFTransaction | null {
    try {
      // Tarih formatlarını dene
      const datePatterns = [
        /(\d{2}[\/\.]\d{2}[\/\.]\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
        /(\d{2}-\d{2}-\d{4})/
      ];
      
      let date: Date | null = null;
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
      
      // Tutarları çıkar - daha esnek regex
      const amountPatterns = [
        /[\d\.,]+/g,  // Basit sayı formatı
        /[\d\s\.,]+/g, // Boşluklu sayı formatı
        /[\d\.,]+(?:\s*TL)?/g  // TL ile biten sayılar
      ];
      
      let amounts: string[] = [];
      for (const pattern of amountPatterns) {
        amounts = line.match(pattern) || [];
        if (amounts.length >= 2) break;
      }
      
      const numericAmounts = amounts
        .map(amt => this.parseAmount(amt))
        .filter(amt => amt !== 0 && amt > 0.01); // 1 kuruştan büyük tutarlar
      
             console.log(`💰 Satır: "${line}"`);
       console.log(`💰 Bulunan tutarlar: ${amounts.join(', ')}`);
       console.log(`💰 Sayısal tutarlar: ${numericAmounts.join(', ')}`);
       
       // Satır formatını analiz et
       const lineParts = line.split(/\s+/).filter(part => part.trim());
       console.log(`📋 Satır parçaları: ${lineParts.join(' | ')}`);
      
      if (numericAmounts.length < 2) {
        console.log(`⚠️ Yeterli tutar bulunamadı: ${numericAmounts.length} tutar`);
        return null;
      }
      
             // Gelişmiş bakiye hesaplama algoritması
       let debit = 0;
       let credit = 0;
       let balance = 0;
       
       // Tutarları pozisyonlarına göre ayır
       const amountPositions = this.findAmountPositions(line, amounts);
       
       if (amountPositions.length >= 3) {
         // Son 3 tutar: Borç, Alacak, Bakiye (standart format)
         const lastThree = amountPositions.slice(-3);
         debit = lastThree[0].amount;
         credit = lastThree[1].amount;
         balance = lastThree[2].amount;
       } else if (amountPositions.length === 2) {
         // Son 2 tutar: Borç/Alacak, Bakiye
         const lastTwo = amountPositions.slice(-2);
         
         // Hangi tutarın borç/alacak olduğunu belirle
         if (lastTwo[1].amount > lastTwo[0].amount) {
           // İkinci tutar daha büyükse, ilki borç/alacak, ikincisi bakiye
           if (lastTwo[0].amount > 0) {
             credit = lastTwo[0].amount;
           } else {
             debit = Math.abs(lastTwo[0].amount);
           }
           balance = lastTwo[1].amount;
         } else {
           // İlk tutar daha büyükse, o bakiye olabilir
           balance = lastTwo[0].amount;
           if (lastTwo[1].amount > 0) {
             credit = lastTwo[1].amount;
           } else {
             debit = Math.abs(lastTwo[1].amount);
           }
         }
       } else if (amountPositions.length === 1) {
         // Tek tutar varsa, bu bakiye
         balance = amountPositions[0].amount;
       }
      
      // Açıklama kısmını çıkar
      let description = line;
      
      // Tarihi çıkar
      description = description.replace(dateStr, '').trim();
      
      // Tutarları çıkar
      amounts.forEach(amt => {
        description = description.replace(amt, '').trim();
      });
      
      // Fazla boşlukları temizle
      description = description.replace(/\s+/g, ' ').trim();
      
      // Çok kısa açıklamaları filtrele
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
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.log(`⚠️ İşlem satırı parse edilemedi: ${line} - Hata: ${errorMessage}`);
      return null;
    }
  }
  
  /**
   * Tarihi parse eder
   */
  private parseDate(dateStr: string): Date {
    // DD/MM/YYYY formatı
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // DD.MM.YYYY formatı
    if (dateStr.includes('.')) {
      const [day, month, year] = dateStr.split('.');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // YYYY-MM-DD formatı
    if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
    
    throw new Error(`Bilinmeyen tarih formatı: ${dateStr}`);
  }
  
  /**
   * Tutarı parse eder
   */
  private parseAmount(amountStr: string): number {
    try {
      // Boşlukları temizle
      let cleanAmount = amountStr.trim();
      
      // TL, ₺, $ gibi para birimlerini kaldır
      cleanAmount = cleanAmount.replace(/[₺$€£]/g, '');
      
      // Sadece sayı, virgül ve nokta bırak
      cleanAmount = cleanAmount.replace(/[^\d.,]/g, '');
      
      // Virgülü noktaya çevir (Türkçe format)
      cleanAmount = cleanAmount.replace(',', '.');
      
      // Birden fazla nokta varsa sadece sonuncusunu bırak
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.log(`⚠️ Tutar parsing hatası: "${amountStr}" - ${errorMessage}`);
      return 0;
    }
  }
  
  /**
   * Özet bilgileri hesaplar
   */
  private calculateSummary(transactions: PDFTransaction[]): PDFParseResult['summary'] {
    const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
    
    return {
      totalDebit,
      totalCredit,
      transactionCount: transactions.length
    };
  }
  
  /**
   * PDF'den çıkarılan işlemlerle mevcut sistem işlemlerini karşılaştırır ve eksik olanları tespit eder
   */
  async detectMissingTransactions(
    pdfTransactions: PDFTransaction[], 
    existingTransactions: any[] = []
  ): Promise<{
    missingTransactions: any[];
    summary: any;
  }> {
    const missingTransactions: any[] = [];
    const gaps: any[] = [];
    
    console.log(`🔍 PDF'den ${pdfTransactions.length} işlem, sistemde ${existingTransactions.length} işlem bulundu`);
    
    // İşlemleri tarihe göre sırala
    const sortedPdfTransactions = [...pdfTransactions].sort((a, b) => a.date.getTime() - b.date.getTime());
    const sortedExistingTransactions = [...existingTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Mevcut işlemleri tarih ve tutar bazında grupla
    const existingTransactionMap = new Map<string, Set<number>>();
    
    for (const tx of sortedExistingTransactions) {
      const dateKey = new Date(tx.date).toISOString().split('T')[0];
      const amount = Math.abs(tx.amount || tx.credit || tx.debit || 0);
      
      if (!existingTransactionMap.has(dateKey)) {
        existingTransactionMap.set(dateKey, new Set());
      }
      existingTransactionMap.get(dateKey)!.add(amount);
    }
    
    // PDF işlemlerini kontrol et
    for (const pdfTx of sortedPdfTransactions) {
      const dateKey = pdfTx.date.toISOString().split('T')[0];
      const pdfAmount = Math.abs(pdfTx.credit || pdfTx.debit || 0);
      
      // Bu tarihte mevcut işlemler var mı?
      const existingAmounts = existingTransactionMap.get(dateKey);
      
      if (!existingAmounts) {
        // Bu tarihte hiç işlem yok, tamamen eksik
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
      
      // Bu tutarda işlem var mı? (1 TL tolerans)
      const foundAmount = Array.from(existingAmounts).find(amount => 
        Math.abs(amount - pdfAmount) <= 1
      );
      
      if (!foundAmount) {
        // Bu tutarda işlem yok, eksik
        console.log(`💰 ${dateKey} tarihinde ${pdfAmount} TL tutarında işlem eksik`);
        missingTransactions.push({
          date: pdfTx.date,
          estimatedAmount: pdfAmount,
          direction: pdfTx.credit > 0 ? 'IN' : 'OUT',
          confidence: 'Yüksek',
          description: pdfTx.description,
          type: 'MISSING_AMOUNT'
        });
      } else {
        console.log(`✅ ${dateKey} tarihinde ${pdfAmount} TL işlem mevcut`);
      }
    }
    
    // Bakiye tutarsızlıklarını da kontrol et
    if (sortedPdfTransactions.length > 1) {
      for (let i = 1; i < sortedPdfTransactions.length; i++) {
        const currentTx = sortedPdfTransactions[i];
        const previousTx = sortedPdfTransactions[i - 1];
        
        const expectedChange = currentTx.credit - currentTx.debit;
        const actualChange = currentTx.balance - previousTx.balance;
        const difference = Math.abs(expectedChange - actualChange);
        
        if (difference > 0.01) { // 1 kuruş tolerans
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
    
    // Özet bilgileri
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
  
  /**
   * Boşlukları tarihe göre gruplar
   */
  private groupGapsByDate(gaps: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    
    for (const gap of gaps) {
      const dateKey = gap.date.toISOString().split('T')[0];
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      
      grouped.get(dateKey)!.push(gap);
    }
    
    return grouped;
  }
  
  /**
   * Güven skorunu hesaplar
   */
  private calculateConfidence(difference: number, balance: number): string {
    const percentage = (difference / balance) * 100;
    
    if (percentage < 1) return 'Yüksek';
    if (percentage < 5) return 'Orta';
    return 'Düşük';
  }
  
  /**
   * Ortalama güven skorunu hesaplar
   */
  private calculateAverageConfidence(gaps: any[]): string {
    const confidences = gaps.map(gap => gap.confidence);
    const highCount = confidences.filter(c => c === 'Yüksek').length;
    const mediumCount = confidences.filter(c => c === 'Orta').length;
    
    if (highCount > mediumCount) return 'Yüksek';
    if (mediumCount > 0) return 'Orta';
    return 'Düşük';
  }
  
  /**
   * Severity seviyesini hesaplar
   */
  private calculateSeverity(totalDifference: number, criticalIssues: number, missingDays: number): string {
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

  /**
   * Yapı Kredi PDF'i olup olmadığını kontrol eder
   */
  private isYapiKrediPDF(lines: string[]): boolean {
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
  
  /**
   * Yapı Kredi PDF'ini parse eder
   */
  private parseYapiKrediPDF(lines: string[]): PDFParseResult {
    console.log('🏦 Yapı Kredi PDF parsing başlatılıyor...');
    
    // Hesap bilgilerini çıkar
    const accountInfo = this.extractYapiKrediAccountInfo(lines);
    
    // İşlemleri parse et
    const transactions = this.parseYapiKrediTransactions(lines);
    
    // İşlemleri tarihe göre sırala
    const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log(`📅 Yapı Kredi işlemleri sıralandı: ${sortedTransactions.length} işlem`);
    
    // Özet bilgileri hesapla
    const summary = this.calculateSummary(sortedTransactions);
    
    console.log(`✅ Yapı Kredi PDF parsing tamamlandı: ${sortedTransactions.length} işlem bulundu`);
    
    return {
      transactions: sortedTransactions,
      accountInfo,
      summary
    };
  }
  
  /**
   * Yapı Kredi hesap bilgilerini çıkarır
   */
  private extractYapiKrediAccountInfo(lines: string[]): PDFParseResult['accountInfo'] {
    const accountInfo: PDFParseResult['accountInfo'] = {};
    
    for (const line of lines) {
      // Müşteri adı
      if (line.includes('Müşteri Adı Soyadı:')) {
        const match = line.match(/Müşteri Adı Soyadı:(.+)/);
        if (match) {
          accountInfo.accountHolder = match[1].trim();
        }
      }
      
      // IBAN/Hesap No
      if (line.includes('IBAN/Hesap No:')) {
        const match = line.match(/IBAN\/Hesap No:(.+)/);
        if (match) {
          accountInfo.accountNumber = match[1].trim();
        }
      }
      
      // Tarih aralığı
      if (line.includes('Tarih Aralığı:')) {
        const match = line.match(/Tarih Aralığı:(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
        if (match) {
          accountInfo.startDate = this.parseDate(match[1]);
          accountInfo.endDate = this.parseDate(match[2]);
        }
      }
      
      // Kullanılabilir bakiye
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
  
  /**
   * Yapı Kredi işlemlerini parse eder
   */
  private parseYapiKrediTransactions(lines: string[]): PDFTransaction[] {
    const transactions: PDFTransaction[] = [];
    let inTransactionSection = false;
    
    console.log(`🔍 Yapı Kredi işlemleri analiz ediliyor...`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // İşlem başlığı satırını tespit et
      if (line.includes('TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye')) {
        console.log(`✅ Yapı Kredi işlem başlığı bulundu`);
        inTransactionSection = true;
        continue;
      }
      
      // İşlem bölümünde değilse atla
      if (!inTransactionSection) continue;
      
      // Sayfa numarası satırını atla
      if (line.match(/^\d+\/\d+$/)) continue;
      
      // Boş satırları atla
      if (!line) continue;
      
      // İşlem satırını parse et
      const transaction = this.parseYapiKrediTransactionLine(line);
      if (transaction) {
        console.log(`✅ Yapı Kredi işlem parse edildi: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
        transactions.push(transaction);
      }
    }
    
    console.log(`📊 Yapı Kredi toplam ${transactions.length} işlem bulundu`);
    return transactions;
  }
  
  /**
   * Yapı Kredi işlem satırını parse eder
   */
  private parseYapiKrediTransactionLine(line: string): PDFTransaction | null {
    try {
      // Yapı Kredi formatı: TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye
      // Örnek: 11/08/202517:39:14Fatura ÖdemesiDiğer53206575 ISKI  SU-14,00 TL499,40 TL
      
      // Tarih ve saat - AdvancedPDFParserService ile uyumlu
      const dateTimeMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})/);
      if (!dateTimeMatch) {
        console.log(`⚠️ Yapı Kredi tarih formatı bulunamadı: "${line}"`);
        return null;
      }
      
      const dateStr = dateTimeMatch[1];
      const timeStr = dateTimeMatch[2];
      const date = this.parseDate(dateStr);
      
      // Tarih ve saati satırdan çıkar
      let remainingLine = line.substring(dateTimeMatch[0].length);
      
      // Tutarları son iki "<miktar> <ccy>" olarak al - AdvancedPDFParserService ile uyumlu
      const amountCcyPattern = /-?(?:\d{1,3}(?:[.\u00a0\s]\d{3})+|\d+)(?:,\d{1,2})?\s+(?:TL|TRY|USD|EUR|GBP)/gi;
      const amountMatches = Array.from(remainingLine.matchAll(amountCcyPattern));
      
      let transactionAmount: number;
      let balance: number;
      let description: string;
      
      if (amountMatches.length < 2) {
        // Fallback: yalnız miktarları ara
        const onlyAmountPattern = /-?(?:\d{1,3}(?:[.\u00a0\s]\d{3})+|\d+)(?:,\d{1,2})?/g;
        const onlyAmounts = Array.from(remainingLine.matchAll(onlyAmountPattern)).map(m => m[0]);
        if (onlyAmounts.length < 2) {
          console.log(`⚠️ Yapı Kredi yeterli tutar bulunamadı: "${line}"`);
          return null;
        }
        transactionAmount = this.parseAmount(onlyAmounts[onlyAmounts.length - 2]);
        balance = this.parseAmount(onlyAmounts[onlyAmounts.length - 1]);
        description = remainingLine.slice(0, remainingLine.lastIndexOf(onlyAmounts[onlyAmounts.length - 2])).trim();
      } else {
        const last = amountMatches[amountMatches.length - 1];
        const prev = amountMatches[amountMatches.length - 2];
        
        const [balanceStr] = last[0].trim().split(/\s+(?=[A-Z]{2,3}|TL|TRY|USD|EUR|GBP$)/);
        const [amountStr] = prev[0].trim().split(/\s+(?=[A-Z]{2,3}|TL|TRY|USD|EUR|GBP$)/);
        
        transactionAmount = this.parseAmount(amountStr);
        balance = this.parseAmount(balanceStr);
        description = remainingLine.slice(0, prev.index as number).trim();
      }
      
      // Açıklama temizliği (AdvancedPDFParserService mantığına benzer)
      const rules: Array<{re: RegExp, to: string}> = [
        { re: /\bInternet\s*-\s*Mobil\b/gi, to: '' },
        { re: /\bDiğer\b/gi, to: '' },
        { re: /\bŞube\b/gi, to: '' },
        { re: /^(?:Para\s+Gönder|Diğer)\s*/i, to: '' },
        { re: /C\/H\s*MAHSUBEN/gi, to: '' },
        { re: /\.Ykb\s*den\s*gelen/gi, to: '' },
        { re: /\s*-\s*/g, to: ' - ' },
        { re: /\.{2,}/g, to: '.' },
      ];
      for (const {re, to} of rules) description = description.replace(re, to);
      
      // IBAN'ı koru, IBAN dışındaki uzun sayıları sadele
      const ibans: string[] = [];
      description = description.replace(/\bTR\d{24}\b/g, (m: string) => {
        ibans.push(m);
        return `__IBAN_${ibans.length - 1}__`;
      });
      description = description.replace(/\b\d{10,}\b/g, '');
      description = description.replace(/__IBAN_(\d+)__/g, (_: string, i: string) => ibans[Number(i)]);
      
      description = description.replace(/\s+/g, ' ').trim();
      
      // Çok kısa açıklamaları filtrele
      if (description.length < 3) {
        description = 'İşlem';
      }
      
      // Borç/Alacak belirleme
      let debit = 0;
      let credit = 0;
      
      if (transactionAmount > 0) {
        // Pozitif tutar genellikle alacak (gelen para)
        credit = transactionAmount;
      } else {
        // Negatif tutar genellikle borç (giden para)
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
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      console.log(`⚠️ Yapı Kredi işlem satırı parse edilemedi: ${line} - Hata: ${errorMessage}`);
      return null;
    }
  }
}
