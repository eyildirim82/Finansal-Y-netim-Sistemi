  import { logError } from '../../shared/logger';
  import * as fs from 'fs';
  import pdf from 'pdf-parse';
  import * as crypto from 'crypto';

  export interface AdvancedPDFTransaction {
    id?: string;
    date_time: Date;
    date_time_iso: string;
    description: string;
    debit: number;
    credit: number;
    amount: number;
    currency: string;
    balance: number;
    balance_currency: string;
    op?: string; // FAST/EFT/HAVALE/POS/Fatura
    channel?: string; // Internet - Mobil/Diğer/Şube
    direction?: string; // GELEN/GİDEN
    counterparty_name?: string;
    counterparty_iban?: string;
    category?: string; // fee/incoming/outgoing/pos/invoice/utility/other
    subcategory?: string; // fee_eft, incoming_fast, etc.
    hash: string;
    raw: string;
    confidence: number; // 0-1 arası güven skoru
    anomalies?: string[];
  }

  export interface AdvancedPDFParseResult {
    transactions: AdvancedPDFTransaction[];
    accountInfo: {
      accountNumber?: string;
      accountHolder?: string;
      startDate?: Date;
      endDate?: Date;
      startBalance?: number;
      endBalance?: number;
      iban?: string;
    };
    summary: {
      totalDebit: number;
      totalCredit: number;
      transactionCount: number;
      successRate: number;
      rejectedCount: number;
      anomalyCount: number;
      categoryDistribution: Record<string, number>;
    };
    quality: {
      balanceReconciliation: {
        anomalies: Array<{
          lineNumber: number;
          expectedBalance: number;
          actualBalance: number;
          difference: number;
        }>;
        totalAnomalies: number;
      };
      duplicates: {
        count: number;
        hashes: string[];
      };
      rejected: {
        count: number;
        lines: Array<{
          lineNumber: number;
          raw: string;
          reason: string;
        }>;
      };
    };
  }

  export class AdvancedPDFParserService {
    
    // "11/08/2025 17:39:14" veya "11/08/202517:39:14" ikisini de yakalar
    private static readonly DATETIME_HEAD = /^(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2}:\d{2})/;
    
    // TR miktar regex: 1+ sayı, opsiyonel binlik (. / NBSP / space), opsiyonel ,1-2 ondalık, opsiyonel negatif
    private static readonly TR_AMOUNT_RE = /-?(?:\d{1,3}(?:[.\u00a0\s]\d{3})+|\d+)(?:,\d{1,2})?/;
    // Para birimi: TL/TRY/EUR/USD/GBP (gerekirse ekle)
    private static readonly CCY_RE = /(?:TL|TRY|USD|EUR|GBP)/;
    // "<miktar> <ccy>" bloğu (global; soldan tüm eşleşmeleri toplarız)
    private static readonly AMT_CCY_G = new RegExp(`${AdvancedPDFParserService.TR_AMOUNT_RE.source}\\s+${AdvancedPDFParserService.CCY_RE.source}`, 'gi');
    
    /**
     * Ana pipeline: PDF'den gelişmiş işlem verilerini çıkarır
     */
    async parsePDF(filePath: string): Promise<AdvancedPDFParseResult> {
      try {
        console.log(`📄 Gelişmiş PDF parsing başlatılıyor: ${filePath}`);
        
        // 1. Metin Çıkarma ve Satırlaştırma
        const { text, lines } = await this.extractTextAndLines(filePath);
        
        // 2. Kayıt Sınırlarını Bulma (Durum Makinesi)
        const records = this.findRecordBoundaries(lines);
        
        // 3. Alan Ayrıştırma (Sol/Orta/Sağ Parçalama)
        const parsedRecords = this.parseRecordFields(records);
        
        // 4. Normalizasyon
        const normalizedRecords = this.normalizeRecords(parsedRecords);
        
        // 5. Zenginleştirme
        const enrichedRecords = this.enrichRecords(normalizedRecords);
        
        // 6. Kalite Kontrolleri
        const qualityCheckedRecords = this.performQualityChecks(enrichedRecords);
        
        // 7. Kalıcı Depolama Alan Eşlemesi
        const finalTransactions = this.mapToStorageFormat(qualityCheckedRecords);
        
        // 8. Hesap Bilgilerini Çıkar
        const accountInfo = this.extractAccountInfo(lines);
        
        // 9. Özet ve Kalite Raporu
        const summary = this.calculateSummary(finalTransactions);
        const quality = this.generateQualityReport(qualityCheckedRecords);
        
        console.log(`✅ Gelişmiş PDF parsing tamamlandı: ${finalTransactions.length} işlem`);
        
        return {
          transactions: finalTransactions,
          accountInfo,
          summary,
          quality
        };
        
      } catch (error) {
        logError('Gelişmiş PDF parsing hatası:', error);
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        throw new Error(`PDF parse edilemedi: ${errorMessage}`);
      }
    }
    
    /**
     * 1. Metin Çıkarma ve Satırlaştırma
     */
    private async extractTextAndLines(filePath: string): Promise<{ text: string; lines: string[] }> {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      
      console.log(`📄 PDF içeriği okundu, ${data.text.length} karakter`);
      
      // Metni satırlara böl ve temizle
      const lines = data.text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .map((line: string) => this.cleanLine(line));
      
      console.log(`📄 ${lines.length} satır temizlendi`);
      
      return { text: data.text, lines };
    }
    
    /**
     * Satır temizleme
     */
    private cleanLine(line: string): string {
      // Görsel gürültüyü temizle
      let cleaned = line;
      
      // Sayfa altlık numarası (örn. "1/3")
      cleaned = cleaned.replace(/^\d+\/\d+$/, '');
      
      // Gürültü başlıkları
      cleaned = cleaned.replace(/^(?:Tarih Aralığı|Müşteri Adı|Müşteri Numarası|Hesap Adı|IBAN\/Hesap No|Kullanılabilir Bakiye)\b.*$/, '');
      
      // Birden fazla boşluk tek boşluğa
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      // "kelime-\nler" -> "kelimeler"
      cleaned = cleaned.replace(/-\s+(\w)/g, '$1');
      
      return cleaned.trim();
    }
    
    /**
     * 2. Kayıt Sınırlarını Bulma (Durum Makinesi)
     */
    private findRecordBoundaries(lines: string[]): Array<{ startLine: number; lines: string[] }> {
      const records: Array<{ startLine: number; lines: string[] }> = [];
      let currentRecord: string[] = [];
      let currentStartLine = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Kayıt başlangıcı işareti: Satır başında tarih-saat
        if (this.isRecordStart(line)) {
          // Önceki kaydı kaydet
          if (currentRecord.length > 0) {
            records.push({
              startLine: currentStartLine,
              lines: currentRecord
            });
          }
          
          // Yeni kayıt başlat
          currentRecord = [line];
          currentStartLine = i;
        } else if (currentRecord.length > 0) {
          // Bu satır önceki kaydın devamı
          currentRecord.push(line);
        }
      }
      
      // Son kaydı ekle
      if (currentRecord.length > 0) {
        records.push({
          startLine: currentStartLine,
          lines: currentRecord
        });
      }
      
      console.log(`📋 ${records.length} kayıt sınırı bulundu`);
      return records;
    }
    
    /**
     * Kayıt başlangıcını tespit eder
     */
    private isRecordStart(line: string): boolean {
      return AdvancedPDFParserService.DATETIME_HEAD.test(line);
    }
    
    /**
     * 3. Alan Ayrıştırma (Sol/Orta/Sağ Parçalama)
     */
    private parseRecordFields(records: Array<{ startLine: number; lines: string[] }>): Array<{
      startLine: number;
      dateTime: string;
      description: string;
      amount: number;
      currency: string;
      balance: number;
      balanceCurrency: string;
      raw: string;
    }> {
      const parsedRecords: Array<{
        startLine: number;
        dateTime: string;
        description: string;
        amount: number;
        currency: string;
        balance: number;
        balanceCurrency: string;
        raw: string;
      }> = [];
      
      for (const record of records) {
        try {
          const recordText = record.lines.join(' ');
          
          // 3.1 Sol blok (tarih/saat)
          const dateTimeMatch = recordText.match(AdvancedPDFParserService.DATETIME_HEAD);
          if (!dateTimeMatch) continue;
          const dateTime = `${dateTimeMatch[1]} ${dateTimeMatch[2]}`;
          
          // 3.2 Sağ blok (finansal özet) - sağdan sola tarama
          const financialData = this.extractFinancialData(recordText);
          if (!financialData) continue;
          
          // 3.3 Orta blok (açıklama)
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
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
          console.log(`⚠️ Kayıt parse edilemedi (satır ${record.startLine}): ${errorMessage}`);
        }
      }
      
      console.log(`📊 ${parsedRecords.length} kayıt alan ayrıştırması tamamlandı`);
      return parsedRecords;
    }
    
    /**
     * Finansal verileri çıkarır (sağdan sola tarama)
     */
    private extractFinancialData(recordText: string): {
      amount: number;
      currency: string;
      balance: number;
      balanceCurrency: string;
      headBeforeAmount: string; // açıklama çıkarımı için
    } | null {
      const matches = Array.from(recordText.matchAll(AdvancedPDFParserService.AMT_CCY_G));
      if (matches.length >= 2) {
        const last = matches[matches.length - 1];
        const prev = matches[matches.length - 2];

        const [balanceStr, balanceCcy] = last[0].trim().split(/\s+/).slice(-2);
        const [amountStr, amountCcy]  = prev[0].trim().split(/\s+/).slice(-2);

        const amount = this.parseAmount(amountStr);
        const balance = this.parseAmount(balanceStr);

        return {
          amount,
          currency: amountCcy,
          balance,
          balanceCurrency: balanceCcy,
          headBeforeAmount: recordText.slice(0, prev.index as number).trim()
        };
      }

      // Fallback: yalnız miktarları ara; son iki sayıyı amount/balance varsay
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
    
    /**
     * Açıklama kısmını çıkarır
     */
    private extractDescription(recordText: string, dateTime: string, financialData: any): string {
      // 1) Head kullan: amount bloğundan SOL taraf (tarih + açıklama)
      let desc = (financialData.headBeforeAmount || recordText).trim();

      // 2) Tarih-saat başını sök (boşluk var/yok)
      desc = desc.replace(AdvancedPDFParserService.DATETIME_HEAD, '').trim();

      // 3) Banka boilerplate & kanal vb. temizliği (korunan anahtarlar: FAST/EFT/HAVALE/POS/IBAN)
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
      for (const {re, to} of rules) desc = desc.replace(re, to);

      // 4) IBAN'ı koru, IBAN dışındaki uzun sayıları sadele (ör. 10+ hane)
      // IBAN'ları işaretle
      const ibans: string[] = [];
      desc = desc.replace(/\bTR\d{24}\b/g, (m: string) => {
        ibans.push(m);
        return `__IBAN_${ibans.length - 1}__`;
      });
      // IBAN dışı uzun sayısal blokları kaldır (hesap no, referans gürültüsü)
      desc = desc.replace(/\b\d{10,}\b/g, '');
      // Yerine IBAN'ları geri koy
      desc = desc.replace(/__IBAN_(\d+)__/g, (_: string, i: string) => ibans[Number(i)]);

      // 5) Şekillendir
      desc = desc.replace(/\s+/g, ' ').trim();
      return desc || 'İşlem';
    }
    
    /**
     * 4. Normalizasyon
     */
    private normalizeRecords(records: any[]): any[] {
      return records.map(record => ({
        ...record,
        dateTime: this.normalizeDateTime(record.dateTime),
        amount: this.normalizeAmount(record.amount),
        balance: this.normalizeAmount(record.balance),
        description: this.normalizeText(record.description)
      }));
    }
    
    /**
     * Tarih-saat normalizasyonu
     */
    private normalizeDateTime(dateTimeStr: string): Date {
      const [datePart, timePart] = dateTimeStr.split(' ');
      const [day, month, year] = datePart.split('/');
      const [hour, minute, second] = timePart.split(':');
      
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
    }
    
    /**
     * Tutar normalizasyonu
     */
    private normalizeAmount(amount: number): number {
      // 2 ondalık basamağa yuvarla
      return Math.round(amount * 100) / 100;
    }
    
    /**
     * Metin normalizasyonu
     */
    private normalizeText(text: string): string {
      // Unicode boşlukları normalize et
      text = text.normalize('NFKC');
      
      // Çift boşlukları tekilleştir
      text = text.replace(/\s+/g, ' ');
      
      return text.trim();
    }
    
    /**
     * 5. Zenginleştirme
     */
    private enrichRecords(records: any[]): AdvancedPDFTransaction[] {
      return records.map(record => {
        const enriched: AdvancedPDFTransaction = {
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
          hash: '' // Geçici hash, sonra güncellenecek
        };
        
        // Kategori motoru
        const categoryInfo = this.categorizeTransaction(record.description);
        enriched.category = categoryInfo.category;
        enriched.subcategory = categoryInfo.subcategory;
        
        // İşlem türü ve kanal
        const operationInfo = this.extractOperationInfo(record.description);
        enriched.op = operationInfo.op;
        enriched.channel = operationInfo.channel;
        enriched.direction = operationInfo.direction;
        
        // Karşı taraf çıkarımı
        const counterpartyInfo = this.extractCounterparty(record.description);
        enriched.counterparty_name = counterpartyInfo.name;
        enriched.counterparty_iban = counterpartyInfo.iban;
        
        // Hash oluştur
        enriched.hash = this.generateHash(enriched);
        
        return enriched;
      });
    }
    
    /**
     * Kategori motoru
     */
    private categorizeTransaction(description: string): { category: string; subcategory: string } {
      const desc = description.toUpperCase();
      
      // BSMV ücreti
      if (/\bBSMV\b/.test(desc)) {
        return { category: 'fee', subcategory: 'fee_bsmv' };
      }
      
      // EFT ücreti
      if (/ELEKTRON[İI]K\s+FON\s+TRANSFER[İI].*ÜCRET[İI]/.test(desc)) {
        return { category: 'fee', subcategory: 'fee_eft' };
      }
      
      // Gelen transferler
      if (/\bGELEN\s+FAST\b/.test(desc) || /\bGELEN\s+EFT\b/.test(desc) || /\bGELEN\s+HAVALE\b/.test(desc)) {
        return { category: 'incoming', subcategory: 'incoming_transfer' };
      }
      
      // Giden transferler
      if (/\bG[İI]DEN\s+FAST\b/.test(desc) || /\bG[İI]DEN\s+EFT\b/.test(desc) || /\bG[İI]DEN\s+HAVALE\b/.test(desc)) {
        return { category: 'outgoing', subcategory: 'outgoing_transfer' };
      }
      
      // POS harcamaları
      if (/\bPOS\b/.test(desc)) {
        return { category: 'pos', subcategory: 'pos_purchase' };
      }
      
      // Fatura/kurum ödemeleri
      if (/Fatura|Elektrik|Do[gğ]algaz|Doğalgaz|Su|Telekom|İnternet/.test(desc)) {
        return { category: 'utility', subcategory: 'utility_bill' };
      }
      
      return { category: 'other', subcategory: 'other' };
    }
    
    /**
     * İşlem türü ve kanal çıkarımı
     */
    private extractOperationInfo(description: string): { op?: string; channel?: string; direction?: string } {
      const desc = description.toUpperCase();
      
      let op: string | undefined;
      let channel: string | undefined;
      let direction: string | undefined;
      
      // İşlem türü
      if (/\bFAST\b/.test(desc)) op = 'FAST';
      else if (/\bEFT\b/.test(desc)) op = 'EFT';
      else if (/\bHAVALE\b/.test(desc)) op = 'HAVALE';
      else if (/\bPOS\b/.test(desc)) op = 'POS';
      else if (/\bFatura\b/.test(desc)) op = 'Fatura';
      else if (/Para\s+Gönder/.test(desc)) op = 'Para Gönder';
      
      // Kanal
      if (/Internet\s*-\s*Mobil|Internet\s{2,}-\s*Mobil/.test(desc)) channel = 'Internet - Mobil';
      else if (/\bDiğer\b/.test(desc)) channel = 'Diğer';
      else if (/\bŞube\b/.test(desc)) channel = 'Şube';
      else channel = 'Diğer';
      
      // Yön
      if (/\bGELEN\b/.test(desc)) direction = 'GELEN';
      else if (/\bG[İI]DEN\b/.test(desc)) direction = 'GİDEN';
      
      return { op, channel, direction };
    }
    
    /**
     * Karşı taraf çıkarımı
     */
    private extractCounterparty(description: string): { name?: string; iban?: string } {
      const desc = description || '';
      const ibanMatch = desc.match(/\bTR\d{24}\b/);
      const iban = ibanMatch ? ibanMatch[0] : undefined;

      // "GELEN|GİDEN (FAST|EFT|HAVALE) - {AD} - ..." -> ilk tireye kadar olan {AD}
      const m = desc.match(/(G[İI]DEN|GELEN)\s+(FAST|EFT|HAVALE)\s*-\s*([^-]+)/i);
      let name: string | undefined = m ? m[3].trim() : undefined;

      // Fallback: tire böl
      if (!name) {
        const parts = desc.split(/\s*-\s*/).map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) name = parts[1];
      }
      if (name && name.length < 2) name = undefined;

      return { name, iban };
    }
    
    /**
     * Hash oluştur
     */
    private generateHash(transaction: AdvancedPDFTransaction): string {
      const hashString = `${transaction.date_time_iso}|${transaction.amount.toFixed(2)}|${transaction.balance.toFixed(2)}|${transaction.description.substring(0, 120)}`;
      return crypto.createHash('sha256').update(hashString).digest('hex');
    }
    
    /**
     * 6. Kalite Kontrolleri
     */
    private performQualityChecks(transactions: AdvancedPDFTransaction[]): AdvancedPDFTransaction[] {
      // 1) Stabil sıralama: date_time_iso, eşitse input sırasını koru
      const sorted = [...transactions].sort((a, b) => {
        const t = (a.date_time_iso || '').localeCompare(b.date_time_iso || '');
        return t !== 0 ? t : 0;
      });

      const anomalies: Array<{ lineNumber: number; expectedBalance: number; actualBalance: number; difference: number }> = [];
      const tol = 0.01; // 1 kuruş

      // 2) Mutabakat: prev.balance + (credit - debit) == curr.balance
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

      // 3) Dupe kontrolü (hash)
      const seen = new Set<string>();
      for (const tx of sorted) {
        if (!tx.hash) continue;
        if (seen.has(tx.hash)) {
          tx.confidence = Math.max(0, (tx.confidence || 1) * 0.5);
          tx.anomalies = [...(tx.anomalies || []), 'Tekrarlanan işlem'];
        } else {
          seen.add(tx.hash);
        }
      }

      // 4) Geri döndür: sıralı liste
      return sorted;
    }
    
    /**
     * 7. Kalıcı Depolama Alan Eşlemesi
     */
    private mapToStorageFormat(transactions: AdvancedPDFTransaction[]): AdvancedPDFTransaction[] {
      return transactions.map((transaction, index) => ({
        ...transaction,
        id: transaction.hash.substring(0, 16) // Hash'in ilk 16 karakteri
      }));
    }
    
    /**
     * Hesap bilgilerini çıkar
     */
    private extractAccountInfo(lines: string[]): AdvancedPDFParseResult['accountInfo'] {
      const accountInfo: AdvancedPDFParseResult['accountInfo'] = {};
      
      for (const line of lines) {
        // Müşteri adı
        if (line.includes('Müşteri Adı Soyadı:')) {
          const match = line.match(/Müşteri Adı Soyadı:(.+)/);
          if (match) accountInfo.accountHolder = match[1].trim();
        }
        
        // IBAN/Hesap No
        if (line.includes('IBAN/Hesap No:')) {
          const match = line.match(/IBAN\/Hesap No:(.+)/);
          if (match) {
            const iban = match[1].trim();
            accountInfo.iban = iban;
            accountInfo.accountNumber = iban;
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
      
      return accountInfo;
    }
    
    /**
     * Özet hesapla
     */
    private calculateSummary(transactions: AdvancedPDFTransaction[]): AdvancedPDFParseResult['summary'] {
      const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0);
      const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);
      
      // Kategori dağılımı
      const categoryDistribution: Record<string, number> = {};
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
    
    /**
     * Kalite raporu oluştur
     */
    private generateQualityReport(transactions: AdvancedPDFTransaction[]): AdvancedPDFParseResult['quality'] {
      const anomalies: Array<{ lineNumber: number; expectedBalance: number; actualBalance: number; difference: number }> = [];
      const duplicates: string[] = [];
      const rejected: Array<{ lineNumber: number; raw: string; reason: string }> = [];
      
      // Bakiye mutabakatı anomalileri - performQualityChecks ile aynı mantık
      const tol = 0.01; // 1 kuruş
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
      
      // Duplicate hash'ler
      const hashCounts = new Map<string, number>();
      transactions.forEach(tx => {
        hashCounts.set(tx.hash, (hashCounts.get(tx.hash) || 0) + 1);
      });
      
      hashCounts.forEach((count, hash) => {
        if (count > 1) duplicates.push(hash);
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
    
    /**
     * Tarih parse et
     */
    private parseDate(dateStr: string): Date {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    /**
     * Türkçe formatlı tutarı sayıya çevirir.
     * Destek: binlik (. veya NBSP/boşluk), ondalık (,1 | ,12), para sembolleri, negatif.
     * Örn: "2.365.792,5 TL" -> 2365792.50
     */
    private parseAmount(amountStr: string): number {
      if (!amountStr) return 0;
      let s = amountStr
        .replace(/\u00a0/g, ' ')          // NBSP -> space
        .replace(/[₺$€£]/g, '')          // para sembolleri
        .replace(/[^\d.,\- ]/g, '')       // kalan gürültü
        .trim();

      // Ondalık tek hane ise pad et (",5" -> ",50")
      s = s.replace(/,(\d)(?!\d)/g, ',$10');

      // Ondalık kısmı izole et, binlik ayraçları (., space) temizle
      let integer = s, dec = '';
      const m = s.match(/,(\d{1,2})$/);
      if (m) { integer = s.slice(0, m.index!); dec = m[1]; }
      integer = integer.replace(/[.\s]/g, '');

      // Negatif işaretini koru (başta ya da arada gelebilir)
      const sign = integer.includes('-') || s.trim().startsWith('-') ? -1 : 1;
      integer = integer.replace(/-/g, '');

      const normalized = dec ? `${integer}.${dec}` : integer;
      const num = Number(normalized);
      return Number.isFinite(num) ? sign * num : 0;
    }
  }
