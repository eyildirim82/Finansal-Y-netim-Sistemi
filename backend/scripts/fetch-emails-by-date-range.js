const { PrismaClient } = require('@prisma/client');
const { YapiKrediFASTEmailService } = require('../src/modules/banking/emailService');
const { PaymentMatchingService } = require('../src/modules/banking/paymentMatchingService');

const prisma = new PrismaClient();
const emailService = new YapiKrediFASTEmailService();
const matchingService = new PaymentMatchingService();

/**
 * Belirli tarih aralığında e-postaları çek ve işlem olarak ekle
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @param {boolean} dryRun - Sadece test et, kaydetme
 */
async function fetchEmailsByDateRange(startDate, endDate, dryRun = false) {
  try {
    console.log('📧 E-postalar çekiliyor...');
    console.log(`📅 Tarih aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`);
    console.log(`🔍 Mod: ${dryRun ? 'Test (Kaydetme)' : 'Gerçek İşlem'}`);
    
    // E-postaları çek
    const emails = await emailService.fetchEmailsByDateRange(startDate, endDate);
    
    if (emails.length === 0) {
      console.log('✅ Belirtilen tarih aralığında e-posta bulunamadı');
      return {
        processed: 0,
        duplicates: 0,
        errors: 0,
        matched: 0,
        unmatched: 0
      };
    }
    
    console.log(`📧 ${emails.length} e-posta bulundu`);
    
    const processedTransactions = [];
    let duplicateCount = 0;
    let errorCount = 0;
    
    // Her e-postayı işle
    for (const emailData of emails) {
      try {
        // Duplikasyon kontrolü
        const existingTransaction = await prisma.bankTransaction.findFirst({
          where: { messageId: emailData.transaction.messageId }
        });
        
        if (existingTransaction) {
          console.log(`⚠️ Duplikasyon: ${emailData.transaction.counterpartyName} - ${emailData.transaction.amount} TL`);
          duplicateCount++;
          continue;
        }
        
        if (dryRun) {
          console.log(`🔍 Test: ${emailData.transaction.counterpartyName} - ${emailData.transaction.amount} TL`);
          processedTransactions.push({
            transaction: emailData.transaction,
            matchResult: { matched: false, confidence: 0 }
          });
          continue;
        }
        
        // İşlemi kaydet
        const savedTransaction = await prisma.bankTransaction.create({
          data: emailData.transaction
        });
        
        console.log(`✅ İşlem kaydedildi: ${savedTransaction.counterpartyName} - ${savedTransaction.amount} TL`);
        
        // Otomatik eşleştirme
        const matchResult = await matchingService.matchTransaction(savedTransaction);
        await matchingService.saveMatchResult(savedTransaction.id, matchResult);
        
        if (matchResult.matched) {
          console.log(`🎯 Eşleştirme başarılı: ${matchResult.customer?.name} (${(matchResult.confidence * 100).toFixed(1)}%)`);
        } else {
          console.log(`❓ Eşleştirme bulunamadı: ${savedTransaction.counterpartyName}`);
        }
        
        processedTransactions.push({
          transaction: savedTransaction,
          matchResult
        });
        
      } catch (error) {
        console.error(`❌ E-posta işleme hatası:`, error);
        errorCount++;
      }
    }
    
    // Sonuçları raporla
    const matchedCount = processedTransactions.filter(t => t.matchResult.matched).length;
    const unmatchedCount = processedTransactions.filter(t => !t.matchResult.matched).length;
    
    console.log('\n📊 İşlem Özeti:');
    console.log(`✅ İşlenen: ${processedTransactions.length}`);
    console.log(`⚠️ Duplikasyon: ${duplicateCount}`);
    console.log(`❌ Hata: ${errorCount}`);
    console.log(`🎯 Eşleşen: ${matchedCount}`);
    console.log(`❓ Eşleşmeyen: ${unmatchedCount}`);
    
    // Eşleşmeyen işlemleri listele
    const unmatched = processedTransactions.filter(t => !t.matchResult.matched);
    if (unmatched.length > 0) {
      console.log('\n❓ Eşleşmeyen İşlemler:');
      unmatched.forEach(t => {
        const date = t.transaction.transactionDate ? 
          new Date(t.transaction.transactionDate).toLocaleDateString('tr-TR') : 
          'Tarih bilgisi yok';
        console.log(`  - ${t.transaction.counterpartyName} (${t.transaction.amount} TL) - ${date}`);
      });
    }
    
    return {
      processed: processedTransactions.length,
      duplicates: duplicateCount,
      errors: errorCount,
      matched: matchedCount,
      unmatched: unmatchedCount
    };
    
  } catch (error) {
    console.error('❌ Script hatası:', error);
    throw error;
  }
}

/**
 * Son N günün e-postalarını çek
 * @param {number} days - Kaç gün geriye gidilecek
 * @param {boolean} dryRun - Sadece test et
 */
async function fetchLastNDaysEmails(days = 7, dryRun = false) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  console.log(`📧 Son ${days} günün e-postaları çekiliyor...`);
  return await fetchEmailsByDateRange(startDate, endDate, dryRun);
}

/**
 * Bu ayın e-postalarını çek
 * @param {boolean} dryRun - Sadece test et
 */
async function fetchThisMonthEmails(dryRun = false) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date();
  
  console.log('📧 Bu ayın e-postaları çekiliyor...');
  return await fetchEmailsByDateRange(startDate, endDate, dryRun);
}

// Komut satırı argümanlarını işle
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    days: null,
    startDate: null,
    endDate: null,
    dryRun: false,
    thisMonth: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--days':
        options.days = parseInt(args[++i]);
        break;
      case '--start':
        options.startDate = new Date(args[++i]);
        break;
      case '--end':
        options.endDate = new Date(args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--this-month':
        options.thisMonth = true;
        break;
      case '--help':
        console.log(`
Kullanım:
  node fetch-emails-by-date-range.js [seçenekler]

Seçenekler:
  --days <sayı>           Son N günün e-postalarını çek
  --start <tarih>         Başlangıç tarihi (YYYY-MM-DD)
  --end <tarih>           Bitiş tarihi (YYYY-MM-DD)
  --this-month            Bu ayın e-postalarını çek
  --dry-run               Sadece test et, kaydetme
  --help                  Bu yardımı göster

Örnekler:
  node fetch-emails-by-date-range.js --days 7
  node fetch-emails-by-date-range.js --start 2024-01-01 --end 2024-01-31
  node fetch-emails-by-date-range.js --this-month --dry-run
        `);
        process.exit(0);
    }
  }
  
  return options;
}

// Ana fonksiyon
async function main() {
  try {
    const options = parseArguments();
    
    if (options.thisMonth) {
      await fetchThisMonthEmails(options.dryRun);
    } else if (options.days) {
      await fetchLastNDaysEmails(options.days, options.dryRun);
    } else if (options.startDate && options.endDate) {
      await fetchEmailsByDateRange(options.startDate, options.endDate, options.dryRun);
    } else {
      // Varsayılan: son 7 gün
      await fetchLastNDaysEmails(7, options.dryRun);
    }
    
  } catch (error) {
    console.error('❌ Ana fonksiyon hatası:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Script tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script hatası:', error);
      process.exit(1);
    });
}

module.exports = { 
  fetchEmailsByDateRange, 
  fetchLastNDaysEmails, 
  fetchThisMonthEmails 
};
