const fs = require('fs');
const pdf = require('pdf-parse');

async function debugRecordBoundaries() {
  try {
    console.log('🔍 Kayıt sınırlarını debug ediyorum...');
    
    const dataBuffer = fs.readFileSync('./Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    const data = await pdf(dataBuffer);
    
    const lines = data.text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`📄 Toplam ${lines.length} satır`);
    
    // Tarih-saat pattern'ini test et
    const dateTimePattern = /^(\d{2}\/\d{2}\/\d{4})(\d{2}:\d{2}:\d{2})/;
    
    console.log('\n🔍 Tarih-saat pattern\'i test ediliyor...');
    
    let foundRecords = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (dateTimePattern.test(line)) {
        foundRecords++;
        console.log(`✅ Satır ${i + 1}: "${line}"`);
        
        // İlk 10 kaydı göster
        if (foundRecords <= 10) {
          const match = line.match(dateTimePattern);
          console.log(`   📅 Tarih: ${match[1]}`);
          console.log(`   🕐 Saat: ${match[2]}`);
        }
      }
    }
    
    console.log(`\n📊 Toplam ${foundRecords} kayıt bulundu`);
    
    // İlk 50 satırı göster
    console.log('\n📄 İlk 50 satır:');
    lines.slice(0, 50).forEach((line, index) => {
      const isRecord = dateTimePattern.test(line);
      console.log(`${index + 1}: ${isRecord ? '✅' : '❌'} "${line}"`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

debugRecordBoundaries();
