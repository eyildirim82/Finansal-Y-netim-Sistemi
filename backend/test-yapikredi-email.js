const { YapiKrediFASTEmailService } = require('./dist/modules/banking/emailService');

async function testYapiKrediEmailService() {
  console.log('🧪 Yapıkredi Email Service Test Başlatılıyor...\n');

  const emailService = new YapiKrediFASTEmailService();

  try {
    // 1. Bağlantı testi
    console.log('1️⃣ Email bağlantısı test ediliyor...');
    const isConnected = await emailService.testConnection();
    console.log(`✅ Bağlantı durumu: ${isConnected ? 'Başarılı' : 'Başarısız'}\n`);

    if (!isConnected) {
      console.log('❌ Email bağlantısı başarısız. Environment variables kontrol edin:');
      console.log('- EMAIL_HOST');
      console.log('- EMAIL_PORT');
      console.log('- EMAIL_USER');
      console.log('- EMAIL_PASS');
      return;
    }

    // 2. Email istatistikleri
    console.log('2️⃣ Email istatistikleri alınıyor...');
    const stats = await emailService.getEmailStats();
    console.log('📊 Email İstatistikleri:');
    console.log(`   - Toplam Email: ${stats.totalMessages}`);
    console.log(`   - Okunmamış: ${stats.unseenMessages}`);
    console.log(`   - Bağlantı: ${stats.isConnected ? 'Aktif' : 'Kapalı'}`);
    console.log(`   - İşlenen Email: ${stats.metrics.processedEmails}`);
    console.log(`   - Başarısız: ${stats.metrics.failedEmails}`);
    console.log(`   - Ortalama Süre: ${stats.metrics.avgProcessingTime?.toFixed(2)}ms\n`);

    // 3. Email çekme testi
    console.log('3️⃣ Email çekme test ediliyor...');
    const emails = await emailService.fetchYapiKrediFASTEmails();
    console.log(`📧 ${emails.length} email bulundu\n`);

    if (emails.length > 0) {
      console.log('📋 İlk 3 email özeti:');
      emails.slice(0, 3).forEach((emailData, index) => {
        const tx = emailData.transaction;
        console.log(`   ${index + 1}. ${tx.transactionType} - ${tx.amount} TL - ${tx.counterpartyName}`);
      });
      console.log('');
    }

    // 4. Tarih aralığı testi (son 7 gün)
    console.log('4️⃣ Tarih aralığı email çekme test ediliyor...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dateRangeEmails = await emailService.fetchEmailsByDateRange(startDate, endDate);
    console.log(`📅 Son 7 günde ${dateRangeEmails.length} email bulundu\n`);

    // 5. Performance metrics
    console.log('5️⃣ Performance metrikleri:');
    const metrics = emailService.getMetrics();
    console.log(`   - Toplam İşlenen: ${metrics.totalEmails}`);
    console.log(`   - Başarılı: ${metrics.processedEmails}`);
    console.log(`   - Başarısız: ${metrics.failedEmails}`);
    console.log(`   - Toplam Süre: ${metrics.totalProcessingTime}ms`);
    console.log(`   - Email/Saniye: ${metrics.emailsPerSecond?.toFixed(2)}`);
    console.log(`   - Retry Sayısı: ${metrics.retryCount}\n`);

    console.log('✅ Tüm testler tamamlandı!');

  } catch (error) {
    console.error('❌ Test sırasında hata:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Bağlantıyı kapat
    await emailService.disconnect();
    console.log('🔌 Email bağlantısı kapatıldı');
  }
}

// Test email parsing (mock data ile)
async function testEmailParsing() {
  console.log('\n🧪 Email Parsing Test Başlatılıyor...\n');

  const emailService = new YapiKrediFASTEmailService();

  // Test email içerikleri - Email service regex pattern'lerine tam uygun
  const testEmails = [
    {
      subject: 'FAST Ödemesi',
      html: '1234XXXX5678 TL / TR123456789012345678901234 hesabınıza, 15/01/2025 14:30:25 tarihinde, Ahmet Yılmaz isimli kişiden  1.250,00 TL FAST ödemesi gelmiştir.',
      messageId: 'test-1',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    },
    {
      subject: 'HAVALE Çıkışı',
      html: '5678XXXX9012 TL / TR987654321098765432109876 hesabınızdan, 16/01/2025 09:15:10 tarihinde, Mehmet Demir isimli kişiye  500,00 TL HAVALE çıkışı gerçekleşmiştir.',
      messageId: 'test-2',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    },
    {
      subject: 'EFT Girişi',
      html: '1111XXXX2222 TL / TR111122223333444455556666 hesabınıza, 17/01/2025 16:45:30 tarihinde, Ayşe Kaya isimli kişiden  2.750,50 TL EFT girişi gerçekleşmiştir.',
      messageId: 'test-3',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    },
    {
      subject: 'FAST Ödemesi (Unvanlı)',
      html: '9999XXXX0000 TL / TR999900001111222233334444 hesabınıza, 18/01/2025 11:20:15 tarihinde, ABC Şirketi unvanlı kişiden  3.500,75 TL FAST ödemesi gelmiştir.',
      messageId: 'test-4',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    },
    {
      subject: 'HAVALE Çıkışı (Unvanlı)',
      html: '8888XXXX7777 TL / TR888877776666555544443333 hesabınızdan, 19/01/2025 13:45:20 tarihinde, XYZ Ltd. Şti. unvanlı kişiye  750,25 TL HAVALE ödemesi gönderilmiştir.',
      messageId: 'test-5',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    },
    {
      subject: 'HAVALE Çıkışı (Alternatif)',
      html: '7777XXXX6666 TL / TR777766665555444433332222 hesabınızdan, 20/01/2025 10:30:45 tarihinde, Test Şirketi isimli kişiye  1.000,00 TL HAVALE çıkışı.',
      messageId: 'test-6',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    },
    {
      subject: 'EFT Girişi (Alternatif)',
      html: '6666XXXX5555 TL / TR666655554444333322221111 hesabınıza, 21/01/2025 15:20:30 tarihinde, Demo Ltd. unvanlı kişiden  2.500,00 TL EFT ödemesi gelmiştir.',
      messageId: 'test-7',
      from: 'test@yapikredi.com.tr',
      date: new Date()
    }
  ];

  // Email service'in kendi regex pattern'lerini test et
  console.log('🔍 Email Service Regex Pattern Test:');
  const fastPatternComplex = /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınıza|ınızdan),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL FAST ödemesi (?:gelmiştir|gönderilmiştir)\./si;
  const havalePatternComplex = /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınızdan|ınıza),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL HAVALE (?:çıkışı gerçekleşmiştir|çıkışı|ödemesi gönderilmiştir|ödemesi gelmiştir|gönderilmiştir|gelmiştir)\./si;
  const eftPatternComplex = /(?<mask>\d+X+\d+) TL \/ (?<iban>TR[\dX]{24}) hesab(?:ınızdan|ınıza),\s*(?<dt>\d{2}\/\d{2}\/\d{4}(?:\s\d{2}:\d{2}(?::\d{2})?)?) tarihinde,\s*(?<party>.+?) isimli\/unvanlı kiş(?:iye|iden)\s*(?<amt>[\d\.]+,\d{2}) TL EFT (?:girişi gerçekleşmiştir|girişi|ödemesi gelmiştir|ödemesi gönderilmiştir)\./si;
  
  testEmails.forEach((email, index) => {
    console.log(`\n📧 Test ${index + 1} Email Service Regex:`);
    let match = email.html.match(fastPatternComplex);
    let type = 'FAST';
    
    if (!match) {
      match = email.html.match(havalePatternComplex);
      type = 'HAVALE';
    }
    
    if (!match) {
      match = email.html.match(eftPatternComplex);
      type = 'EFT';
    }
    
    if (match) {
      console.log(`✅ Email Service Regex Match Başarılı (${type}):`);
      console.log('   Groups:', match.groups);
    } else {
      console.log('❌ Email Service Regex Match Başarısız');
      console.log('   Content:', email.html);
    }
  });
  console.log('');

  for (const [index, email] of testEmails.entries()) {
    console.log(`📧 Test Email ${index + 1}:`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   Content: ${email.html}`);

    try {
      const transaction = await emailService.parseYapiKrediFASTEmail(email);
      if (transaction) {
        console.log(`   ✅ Parse Başarılı:`);
        console.log(`      - Tip: ${transaction.transactionType}`);
        console.log(`      - Tutar: ${transaction.amount} TL`);
        console.log(`      - Yön: ${transaction.direction}`);
        console.log(`      - Karşı Taraf: ${transaction.counterpartyName}`);
        console.log(`      - Tarih: ${transaction.transactionDate}`);
        console.log(`      - IBAN: ${transaction.accountIban}`);
        console.log(`      - Raw Data: ${transaction.parsedData}`);
      } else {
        console.log(`   ❌ Parse Başarısız`);
      }
    } catch (error) {
      console.log(`   ❌ Parse Hatası: ${error.message}`);
    }
    console.log('');
  }
}

// Ana test fonksiyonu
async function runTests() {
  console.log('🚀 Yapıkredi Email Service Test Suite\n');
  console.log('=' .repeat(50));
  
  // Önce parsing testi (bağlantı gerektirmez)
  await testEmailParsing();
  
  console.log('=' .repeat(50));
  
  // Environment variables varsa gerçek bağlantı testi
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    await testYapiKrediEmailService();
  } else {
    console.log('⚠️  Email bağlantı testi atlandı (environment variables eksik)');
    console.log('   EMAIL_HOST, EMAIL_USER, EMAIL_PASS gerekli');
  }
}

// Test çalıştır
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testYapiKrediEmailService, testEmailParsing };
