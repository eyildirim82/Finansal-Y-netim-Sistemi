const ExcelJS = require('exceljs');
const path = require('path');

async function createTestExtract() {
  try {
    console.log('📄 Test ekstre dosyası oluşturuluyor...');
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ekstre');
    
    // Başlık satırları
    worksheet.addRow(['Cari Kodu', 'Cari Adı', 'Telefon', 'Adres']);
    worksheet.addRow(['CUST001', 'TEST ŞİRKETİ A.Ş.', '0212 555 1234', 'İstanbul, Türkiye']);
    worksheet.addRow([]);
    
    // İşlem başlıkları
    worksheet.addRow(['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Evrak No', 'Vade Tarihi']);
    
    // Test işlemleri
    worksheet.addRow(['01.01.2024', 'Test Faturası 1', '1000,00', '', 'F001', '31.01.2024']);
    worksheet.addRow(['02.01.2024', 'Test Tahsilat 1', '', '500,00', 'T001', '']);
    worksheet.addRow(['03.01.2024', 'Test Faturası 2', '750,00', '', 'F002', '28.02.2024']);
    worksheet.addRow(['04.01.2024', 'Test Tahsilat 2', '', '250,00', 'T002', '']);
    worksheet.addRow(['05.01.2024', 'Test Faturası 3', '1200,00', '', 'F003', '31.03.2024']);
    
    // İkinci müşteri
    worksheet.addRow([]);
    worksheet.addRow(['Cari Kodu', 'Cari Adı', 'Telefon', 'Adres']);
    worksheet.addRow(['CUST002', 'İKİNCİ ŞİRKET LTD.ŞTİ.', '0216 444 5678', 'Ankara, Türkiye']);
    worksheet.addRow([]);
    worksheet.addRow(['Tarih', 'Açıklama', 'Borç', 'Alacak', 'Evrak No', 'Vade Tarihi']);
    worksheet.addRow(['10.01.2024', 'İkinci Şirket Faturası', '2000,00', '', 'F004', '30.01.2024']);
    worksheet.addRow(['15.01.2024', 'İkinci Şirket Tahsilat', '', '1500,00', 'T003', '']);
    
    // Dosyayı kaydet
    const filePath = path.join(__dirname, 'test-extract.xlsx');
    await workbook.xlsx.writeFile(filePath);
    
    console.log(`✅ Test ekstre dosyası oluşturuldu: ${filePath}`);
    console.log('📊 Dosya içeriği:');
    console.log('- 2 müşteri');
    console.log('- 7 işlem');
    console.log('- Toplam borç: 4950 TL');
    console.log('- Toplam alacak: 2250 TL');
    console.log('- Net bakiye: -2700 TL (borç)');
    
  } catch (error) {
    console.error('❌ Test ekstre dosyası oluşturma hatası:', error);
  }
}

createTestExtract();
