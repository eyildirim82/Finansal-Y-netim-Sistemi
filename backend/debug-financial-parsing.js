const fs = require('fs');
const pdf = require('pdf-parse');

async function debugFinancialParsing() {
  try {
    console.log('🔍 Finansal veri parsing debug başlatılıyor...');
    
    const dataBuffer = fs.readFileSync('./Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    const data = await pdf(dataBuffer);
    
    const lines = data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Tarih-saat pattern'i
    const dateTimePattern = /^(\d{2}\/\d{2}\/\d{4})(\d{2}:\d{2}:\d{2})/;
    
    console.log('\n🔍 İlk 10 işlem satırını analiz ediyorum:');
    
    let foundRecords = 0;
    
    for (let i = 0; i < lines.length && foundRecords < 10; i++) {
      const line = lines[i];
      
      if (dateTimePattern.test(line)) {
        foundRecords++;
        console.log(`\n${foundRecords}. Satır: "${line}"`);
        
        // Tarih-saati çıkar
        const dateTimeMatch = line.match(dateTimePattern);
        const dateTime = dateTimeMatch[1] + ' ' + dateTimeMatch[2];
        console.log(`   📅 Tarih: ${dateTime}`);
        
        // Finansal verileri analiz et
        const remainingText = line.replace(dateTimePattern, '');
        console.log(`   📝 Kalan metin: "${remainingText}"`);
        
        // TL pattern'lerini test et
        const tlPatterns = [
          /([-\d\.,]+)\s*TL.*?([\d\.,]+)\s*TL/,
          /([-\d\.,]+)\s*TL/,
          /([\d\.,]+)\s*TL/
        ];
        
        tlPatterns.forEach((pattern, index) => {
          const match = remainingText.match(pattern);
          if (match) {
            console.log(`   💰 Pattern ${index + 1}: ${match.slice(1).join(', ')}`);
          }
        });
        
        // Sağdan sola sayıları bul
        const numbers = remainingText.match(/[\d\.,]+/g);
        if (numbers) {
          console.log(`   🔢 Bulunan sayılar: ${numbers.join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

debugFinancialParsing();
