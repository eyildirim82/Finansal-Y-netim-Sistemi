const { PrismaClient } = require('@prisma/client');
const { YapiKrediFASTEmailService } = require('../src/modules/banking/emailService');

const prisma = new PrismaClient();
const emailService = new YapiKrediFASTEmailService();

async function testEmailSearch() {
  try {
    console.log('📧 E-posta arama testi başlatılıyor...');
    
    // E-posta servisine bağlan
    await emailService.connect();
    
    // Son 3 ayın e-postalarını ara
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    console.log(`📅 Tarih aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`);
    
    // Önce tüm e-postaları say
    const allEmails = await emailService.fetchEmailsBatch({
      since: startDate,
      before: endDate
    });
    
    console.log(`📧 Toplam ${allEmails.length} e-posta bulundu`);
    
    // İlk 5 e-postayı göster
    if (allEmails.length > 0) {
      console.log('\n📋 İlk 5 e-posta:');
      allEmails.slice(0, 5).forEach((email, index) => {
        console.log(`${index + 1}. Konu: ${email.email.subject}`);
        console.log(`   Gönderen: ${email.email.from?.text || 'Bilinmiyor'}`);
        console.log(`   Tarih: ${email.email.date?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}`);
        console.log(`   Parse: ${email.transaction ? '✅ Başarılı' : '❌ Başarısız'}`);
        if (email.transaction) {
          console.log(`   İşlem: ${email.transaction.counterpartyName} - ${email.transaction.amount} TL`);
        }
        console.log('');
      });
    }
    
    // Yapı Kredi e-postalarını ara
    const yapiKrediEmails = await emailService.fetchEmailsBatch({
      since: startDate,
      before: endDate,
      from: 'yapikredi@iletisim.yapikredi.com.tr'
    });
    
    console.log(`🏦 Yapı Kredi e-postaları: ${yapiKrediEmails.length}`);
    
    if (yapiKrediEmails.length > 0) {
      console.log('\n📋 Yapı Kredi e-postaları:');
      yapiKrediEmails.slice(0, 5).forEach((email, index) => {
        console.log(`${index + 1}. Konu: ${email.email.subject}`);
        console.log(`   Tarih: ${email.email.date?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}`);
        console.log(`   Parse: ${email.transaction ? '✅ Başarılı' : '❌ Başarısız'}`);
        if (email.transaction) {
          console.log(`   İşlem: ${email.transaction.counterpartyName} - ${email.transaction.amount} TL`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  testEmailSearch()
    .then(() => {
      console.log('✅ Test tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test hatası:', error);
      process.exit(1);
    });
}

module.exports = { testEmailSearch };
