const { PrismaClient } = require('@prisma/client');
const { YapiKrediFASTEmailService } = require('../src/modules/banking/emailService');
const { PaymentMatchingService } = require('../src/modules/banking/paymentMatchingService');

const prisma = new PrismaClient();
const emailService = new YapiKrediFASTEmailService();
const matchingService = new PaymentMatchingService();

async function fetchLastWeekEmails() {
  try {
    console.log('📧 Son 1 haftanın e-postaları çekiliyor...');
    
    // Son 1 haftanın tarih aralığını hesapla
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    console.log(`📅 Tarih aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`);
    
    // E-postaları çek
    const emails = await emailService.fetchEmailsByDateRange(startDate, endDate);
    
    if (emails.length === 0) {
      console.log('✅ Yeni e-posta bulunamadı');
      return;
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
    console.log('\n📊 İşlem Özeti:');
    console.log(`✅ İşlenen: ${processedTransactions.length}`);
    console.log(`⚠️ Duplikasyon: ${duplicateCount}`);
    console.log(`❌ Hata: ${errorCount}`);
    console.log(`🎯 Eşleşen: ${processedTransactions.filter(t => t.matchResult.matched).length}`);
    console.log(`❓ Eşleşmeyen: ${processedTransactions.filter(t => !t.matchResult.matched).length}`);
    
    // Eşleşmeyen işlemleri listele
    const unmatched = processedTransactions.filter(t => !t.matchResult.matched);
    if (unmatched.length > 0) {
      console.log('\n❓ Eşleşmeyen İşlemler:');
      unmatched.forEach(t => {
        console.log(`  - ${t.transaction.counterpartyName} (${t.transaction.amount} TL) - ${t.transaction.transactionDate.toLocaleDateString('tr-TR')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  fetchLastWeekEmails()
    .then(() => {
      console.log('✅ Script tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script hatası:', error);
      process.exit(1);
    });
}

module.exports = { fetchLastWeekEmails };
