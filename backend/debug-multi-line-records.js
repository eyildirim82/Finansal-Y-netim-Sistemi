const fs = require('fs');
const pdf = require('pdf-parse');

async function debugMultiLineRecords() {
  try {
    console.log('🔍 Çok satırlı kayıtları debug ediyorum...');
    
    const dataBuffer = fs.readFileSync('./Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    const data = await pdf(dataBuffer);
    
    const lines = data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Tarih-saat pattern'i
    const dateTimePattern = /^(\d{2}\/\d{2}\/\d{4})(\d{2}:\d{2}:\d{2})/;
    
    console.log('\n🔍 İlk 5 işlem kaydını detaylı analiz ediyorum:');
    
    let foundRecords = 0;
    let currentRecord = [];
    let currentStartLine = 0;
    
    for (let i = 0; i < lines.length && foundRecords < 5; i++) {
      const line = lines[i];
      
      if (dateTimePattern.test(line)) {
        // Önceki kaydı analiz et
        if (currentRecord.length > 0) {
          foundRecords++;
          console.log(`\n${foundRecords}. KAYIT (${currentRecord.length} satır):`);
          console.log(`   Başlangıç satırı: ${currentStartLine + 1}`);
          currentRecord.forEach((recordLine, index) => {
            console.log(`   Satır ${index + 1}: "${recordLine}"`);
          });
          
          // Birleştirilmiş metin
          const combinedText = currentRecord.join(' ');
          console.log(`   🔗 Birleştirilmiş: "${combinedText}"`);
          
          // TL pattern'lerini test et
          const tlPatterns = [
            /([-\d\.,]+)\s*TL.*?([\d\.,]+)\s*TL/,
            /([-\d\.,]+)\s*TL/,
            /([\d\.,]+)\s*TL/
          ];
          
          tlPatterns.forEach((pattern, index) => {
            const match = combinedText.match(pattern);
            if (match) {
              console.log(`   💰 Pattern ${index + 1}: ${match.slice(1).join(', ')}`);
            }
          });
          
          // Sayıları bul
          const numbers = combinedText.match(/[\d\.,]+/g);
          if (numbers) {
            console.log(`   🔢 Bulunan sayılar: ${numbers.join(', ')}`);
          }
        }
        
        // Yeni kayıt başlat
        currentRecord = [line];
        currentStartLine = i;
      } else if (currentRecord.length > 0) {
        // Bu satır önceki kaydın devamı
        currentRecord.push(line);
      }
    }
    
    // Son kaydı da analiz et
    if (currentRecord.length > 0 && foundRecords < 5) {
      foundRecords++;
      console.log(`\n${foundRecords}. KAYIT (${currentRecord.length} satır):`);
      console.log(`   Başlangıç satırı: ${currentStartLine + 1}`);
      currentRecord.forEach((recordLine, index) => {
        console.log(`   Satır ${index + 1}: "${recordLine}"`);
      });
      
      // Birleştirilmiş metin
      const combinedText = currentRecord.join(' ');
      console.log(`   🔗 Birleştirilmiş: "${combinedText}"`);
      
      // TL pattern'lerini test et
      const tlPatterns = [
        /([-\d\.,]+)\s*TL.*?([\d\.,]+)\s*TL/,
        /([-\d\.,]+)\s*TL/,
        /([\d\.,]+)\s*TL/
      ];
      
      tlPatterns.forEach((pattern, index) => {
        const match = combinedText.match(pattern);
        if (match) {
          console.log(`   💰 Pattern ${index + 1}: ${match.slice(1).join(', ')}`);
        }
      });
      
      // Sayıları bul
      const numbers = combinedText.match(/[\d\.,]+/g);
      if (numbers) {
        console.log(`   🔢 Bulunan sayılar: ${numbers.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

debugMultiLineRecords();
