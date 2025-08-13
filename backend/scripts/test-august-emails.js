const { PrismaClient } = require('@prisma/client');
const { YapiKrediFASTEmailService } = require('../src/modules/banking/emailService');

const prisma = new PrismaClient();
const emailService = new YapiKrediFASTEmailService();

async function testAugustEmails() {
  try {
    console.log('📧 Ağustos ayı e-posta kontrolü başlatılıyor...');
    
    // E-posta servisine bağlan
    await emailService.connect();
    
    // Ağustos ayının tarih aralığını hesapla
    const startDate = new Date(2025, 7, 1); // Ağustos 1
    const endDate = new Date(2025, 7, 31); // Ağustos 31
    
    console.log(`📅 Tarih aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`);
    
    // Ağustos ayındaki tüm e-postaları ara
    const augustEmails = await emailService.fetchEmailsBatch({
      since: startDate,
      before: endDate
    });
    
    console.log(`📧 Ağustos ayında toplam ${augustEmails.length} e-posta bulundu`);
    
    // Yapı Kredi e-postalarını filtrele
    const yapiKrediEmails = augustEmails.filter(email => 
      email.email.from?.text?.includes('yapikredi') || 
      email.email.from?.text?.includes('Yapı Kredi')
    );
    
    console.log(`🏦 Ağustos ayında Yapı Kredi e-postaları: ${yapiKrediEmails.length}`);
    
    if (yapiKrediEmails.length > 0) {
      console.log('\n📋 Ağustos ayı Yapı Kredi e-postaları:');
      yapiKrediEmails.forEach((email, index) => {
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
    
    // Tüm e-postaları da göster
    if (augustEmails.length > 0) {
      console.log('\n📋 Ağustos ayı tüm e-postalar (ilk 10):');
      augustEmails.slice(0, 10).forEach((email, index) => {
        console.log(`${index + 1}. Konu: ${email.email.subject}`);
        console.log(`   Gönderen: ${email.email.from?.text || 'Bilinmiyor'}`);
        console.log(`   Tarih: ${email.email.date?.toLocaleDateString('tr-TR') || 'Bilinmiyor'}`);
        console.log('');
      });
    }
    
    // Veritabanındaki ağustos ayı işlemlerini kontrol et
    console.log('\n🗄️ Veritabanındaki ağustos ayı işlemleri:');
    const augustTransactions = await prisma.bankTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });
    
    console.log(`📊 Veritabanında ağustos ayında ${augustTransactions.length} işlem var`);
    
    if (augustTransactions.length > 0) {
      console.log('\n📋 Veritabanındaki ağustos ayı işlemleri:');
      augustTransactions.slice(0, 10).forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.counterpartyName} - ${tx.amount} TL`);
        console.log(`   Tarih: ${tx.transactionDate.toLocaleDateString('tr-TR')}`);
        console.log(`   Yön: ${tx.direction === 'IN' ? 'Gelen' : 'Giden'}`);
        console.log(`   Eşleşme: ${tx.isMatched ? '✅ Eşleşti' : '❓ Bekliyor'}`);
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
  testAugustEmails()
    .then(() => {
      console.log('✅ Test tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test hatası:', error);
      process.exit(1);
    });
}

module.exports = { testAugustEmails };
