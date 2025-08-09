const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

// Test ekstre dosyası oluştur
async function createTestExtract() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Ekstre');

  // Müşteri başlığı
  worksheet.addRow(['Cari Kodu', 'CUST001']);
  worksheet.addRow(['Cari Adı', 'TEST ŞİRKETİ A.Ş.']);
  worksheet.addRow(['Telefon', '0212 555 1234']);
  worksheet.addRow(['Adres', 'İstanbul, Türkiye']);
  worksheet.addRow(['Hesap Türü', 'Alıcı']);
  worksheet.addRow(['Özel Kod(1)', 'TAG1']);
  worksheet.addRow(['Özel Kod(2)', 'TAG2']);
  worksheet.addRow(['Borç', '1000,00']);
  worksheet.addRow(['Alacak', '500,00']);
  worksheet.addRow(['Borç Bakiye', '500,00']);

  // Boş satır
  worksheet.addRow([]);

  // İşlem başlığı
  worksheet.addRow(['Belge Türü', 'Tarih', 'Evrak No', 'Açıklama', 'Borç Tutar', 'Alacak Tutar']);

  // Test işlemleri
  worksheet.addRow(['Fatura', '01.01.2024', 'F001', 'Test Faturası', '1000,00', '']);
  worksheet.addRow(['Tahsilat', '02.01.2024', 'T001', 'Test Tahsilat', '', '500,00']);

  // Dosyayı kaydet
  const filePath = path.join(__dirname, 'test-extract.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Test ekstre dosyası oluşturuldu: ${filePath}`);
  
  return filePath;
}

// Parser'ı test et
async function testParser() {
  try {
    console.log('🧪 Yeni parser test ediliyor...\n');
    
    // Test dosyası oluştur
    const filePath = await createTestExtract();
    
    // Excel dosyasını oku
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    
    console.log('📊 Excel dosyası okundu');
    console.log(`📋 Toplam satır: ${worksheet.rowCount}`);
    console.log(`📋 Toplam sütun: ${worksheet.columnCount}\n`);
    
    // İlk birkaç satırı göster
    console.log('📝 İlk 10 satır:');
    for (let i = 1; i <= Math.min(10, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const values = row.values || [];
      console.log(`Satır ${i}:`, values.slice(0, 5));
    }
    
    console.log('\n✅ Parser test tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testParser();
