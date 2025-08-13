const fs = require('fs');
const pdf = require('pdf-parse');

async function testPDFParser() {
  try {
    console.log('📄 PDF parsing test başlatılıyor...');
    
    // PDF dosyasını oku
    const dataBuffer = fs.readFileSync('./Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    const data = await pdf(dataBuffer);
    
    console.log(`📄 PDF içeriği okundu, ${data.text.length} karakter`);
    console.log('\n📄 İlk 1000 karakter:');
    console.log(data.text.substring(0, 1000));
    
    // Metni satırlara böl
    const lines = data.text.split('\n').filter(line => line.trim());
    
    console.log(`\n📄 Toplam ${lines.length} satır bulundu`);
    console.log('\n📄 İlk 20 satır:');
    lines.slice(0, 20).forEach((line, index) => {
      console.log(`${index + 1}: "${line}"`);
    });
    
    // Yapı Kredi göstergelerini kontrol et
    const yapiKrediIndicators = [
      'Yapı ve Kredi Bankası A.Ş.',
      'yapikredi.com.tr',
      'Müşteri Adı Soyadı:',
      'IBAN/Hesap No:',
      'TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye'
    ];
    
    const text = lines.join(' ');
    console.log('\n🏦 Yapı Kredi göstergeleri:');
    yapiKrediIndicators.forEach(indicator => {
      const found = text.includes(indicator);
      console.log(`${indicator}: ${found ? '✅' : '❌'}`);
    });
    
    // Tarih formatlarını ara
    console.log('\n📅 Tarih formatları:');
    const datePatterns = [
      /(\d{2}[\/\.]\d{2}[\/\.]\d{4})/g,
      /(\d{4}-\d{2}-\d{2})/g,
      /(\d{2}-\d{2}-\d{4})/g
    ];
    
    datePatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`Pattern ${index + 1}: ${matches.slice(0, 5).join(', ')}`);
      }
    });
    
    // Tutar formatlarını ara
    console.log('\n💰 Tutar formatları:');
    const amountPatterns = [
      /[\d\.,]+(?:\s*TL)?/g,
      /[\d\s\.,]+(?:\s*TL)?/g
    ];
    
    amountPatterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        console.log(`Pattern ${index + 1}: ${matches.slice(0, 10).join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testPDFParser();
