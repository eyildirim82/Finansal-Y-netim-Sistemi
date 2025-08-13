const { PrismaClient } = require('@prisma/client');
const { YapiKrediFASTEmailService } = require('../src/modules/banking/emailService');
const { PaymentMatchingService } = require('../src/modules/banking/paymentMatchingService');

const prisma = new PrismaClient();
const emailService = new YapiKrediFASTEmailService();
const matchingService = new PaymentMatchingService();

async function processAugustEmails() {
  try {
    console.log('📧 Ağustos ayı e-postaları işleniyor...');
    
    // E-posta servisine bağlan
    await emailService.connect();
    
    // Ağustos ayının tarih aralığını hesapla
    const startDate = new Date(2025, 7, 1); // Ağustos 1
    const endDate = new Date(2025, 7, 31); // Ağustos 31
    
    console.log(`📅 Tarih aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`);
    
    // E-postaları çek
    const emails = await emailService.fetchEmailsBatch({
      since: startDate,
      before: endDate
    });
    
    console.log(`📧 Toplam ${emails.length} e-posta bulundu`);
    
    // Yapı Kredi e-postalarını filtrele
    const yapiKrediEmails = emails.filter(email => 
      email.email.from?.text?.includes('yapikredi') || 
      email.email.from?.text?.includes('Yapı Kredi')
    );
    
    console.log(`🏦 Yapı Kredi e-postaları: ${yapiKrediEmails.length}`);
    
    let processedCount = 0;
    let duplicateCount = 0;
    
    // Her e-postayı işle
    for (const emailData of yapiKrediEmails) {
      try {
        const transaction = emailData.transaction;
        
        if (!transaction) {
          console.log('❌ Transaction parse edilemedi:', emailData.email.subject);
          continue;
        }
        
        // Aynı işlemin daha önce eklenip eklenmediğini kontrol et
        const existingTransaction = await prisma.bankTransaction.findFirst({
          where: {
            messageId: transaction.messageId,
            bankCode: transaction.bankCode
          }
        });
        
        if (existingTransaction) {
          console.log(`⚠️ Duplikasyon: ${transaction.counterpartyName} - ${transaction.amount} TL`);
          duplicateCount++;
          continue;
        }
        
        // Yeni işlemi veritabanına ekle
        const newTransaction = await prisma.bankTransaction.create({
          data: {
            messageId: transaction.messageId,
            bankCode: transaction.bankCode,
            direction: transaction.direction,
            accountIban: transaction.accountIban,
            maskedAccount: transaction.maskedAccount,
            transactionDate: transaction.transactionDate,
            amount: transaction.amount,
            counterpartyName: transaction.counterpartyName,
            balanceAfter: transaction.balanceAfter,
            rawEmailData: transaction.rawEmailData,
            isMatched: false
          }
        });
        
        console.log(`✅ Eklendi: ${transaction.counterpartyName} - ${transaction.amount} TL`);
        processedCount++;
        
        // Otomatik eşleştirme dene
        await matchingService.matchTransaction(newTransaction.id);
        
      } catch (error) {
        console.error('❌ İşlem hatası:', error);
      }
    }
    
    console.log('\n📊 İşlem özeti:');
    console.log(`   İşlenen: ${processedCount}`);
    console.log(`   Duplikasyon: ${duplicateCount}`);
    console.log(`   Toplam: ${yapiKrediEmails.length}`);
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  processAugustEmails()
    .then(() => {
      console.log('✅ İşlem tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ İşlem hatası:', error);
      process.exit(1);
    });
}

module.exports = { processAugustEmails };
