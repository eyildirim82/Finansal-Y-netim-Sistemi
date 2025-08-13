const fs = require('fs');
const pdf = require('pdf-parse');

async function testPDF() {
  try {
    // PDF dosyasını oku
    const dataBuffer = fs.readFileSync('Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    const data = await pdf(dataBuffer);
    
    console.log('📄 PDF içeriği:');
    console.log('='.repeat(50));
    console.log(data.text);
    console.log('='.repeat(50));
    
    // İlk 20 satırı göster
    const lines = data.text.split('\n').filter(line => line.trim());
    console.log('\n📋 İlk 20 satır:');
    lines.slice(0, 20).forEach((line, index) => {
      console.log(`${index + 1}: ${line}`);
    });
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testPDF();
