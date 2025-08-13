const { PDFParserService } = require('./src/modules/banking/pdfParserService');

async function testParser() {
  try {
    const parser = new PDFParserService();
    const result = await parser.parsePDF('Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    
    console.log('📊 Parse Sonucu:');
    console.log('='.repeat(50));
    
    console.log('\n🏦 Hesap Bilgileri:');
    console.log('Müşteri:', result.accountInfo.accountHolder);
    console.log('IBAN:', result.accountInfo.accountNumber);
    console.log('Başlangıç Tarihi:', result.accountInfo.startDate);
    console.log('Bitiş Tarihi:', result.accountInfo.endDate);
    console.log('Başlangıç Bakiyesi:', result.accountInfo.startBalance);
    console.log('Bitiş Bakiyesi:', result.accountInfo.endBalance);
    
    console.log('\n📈 Özet:');
    console.log('Toplam İşlem:', result.summary.transactionCount);
    console.log('Toplam Borç:', result.summary.totalDebit);
    console.log('Toplam Alacak:', result.summary.totalCredit);
    
    console.log('\n💳 İlk 10 İşlem:');
    result.transactions.slice(0, 10).forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.date.toLocaleDateString('tr-TR')} - ${tx.description}`);
      console.log(`   ${tx.debit > 0 ? 'Borç:' + tx.debit : 'Alacak:' + tx.credit} - Bakiye: ${tx.balance}`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testParser();
