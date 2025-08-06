const ExcelJS = require('exceljs');

async function createTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ekstre');

  // Müşteri bilgileri
  worksheet.getCell('A1').value = 'Cari Kodu:';
  worksheet.getCell('B1').value = 'TEST001';
  worksheet.getCell('A2').value = 'Cari Adı:';
  worksheet.getCell('B2').value = 'ABC Şirketi A.Ş.';
  worksheet.getCell('A3').value = 'Telefon:';
  worksheet.getCell('B3').value = '0212 123 45 67';
  worksheet.getCell('A4').value = 'Adres:';
  worksheet.getCell('B4').value = 'İstanbul, Türkiye';
  worksheet.getCell('A5').value = 'Cari Hesap Türü:';
  worksheet.getCell('B5').value = 'Müşteri';
  worksheet.getCell('A6').value = 'Özel Kod(1):';
  worksheet.getCell('B6').value = 'A';
  worksheet.getCell('A7').value = 'Özel Kod(2):';
  worksheet.getCell('B7').value = 'B';
  worksheet.getCell('A8').value = 'Borç:';
  worksheet.getCell('B8').value = '0,00';
  worksheet.getCell('A9').value = 'Alacak:';
  worksheet.getCell('B9').value = '0,00';
  worksheet.getCell('A10').value = 'Borç Bakiye:';
  worksheet.getCell('B10').value = '0,00';
  worksheet.getCell('A11').value = 'Alacak Bakiye:';
  worksheet.getCell('B11').value = '0,00';

  // Boş satır
  worksheet.getCell('A13').value = '';

  // İşlem başlıkları
  const headers = [
    'Belge Türü', 'Tarih', 'Evrak No', 'Açıklama', 'Vade Tarihi', 
    'Matrah', 'İskonto', 'Net Matrah', 'KDV', 'Borç Tutar', 'Alacak Tutar'
  ];
  
  headers.forEach((header, index) => {
    worksheet.getCell(14, index + 1).value = header;
  });

  // İşlem verileri
  const transactions = [
    ['Fatura', '15.01.2024', 'INV-001', 'Ocak ayı mal satışı', '15.02.2024', '1000,00', '0,00', '1000,00', '180,00', '0,00', '1180,00'],
    ['Tahsilat', '20.01.2024', 'PAY-001', 'Ocak ödemesi', '20.01.2024', '0,00', '0,00', '0,00', '0,00', '1180,00', '0,00'],
    ['Fatura', '25.01.2024', 'INV-002', 'Şubat ayı mal satışı', '25.02.2024', '2000,00', '100,00', '1900,00', '342,00', '0,00', '2242,00']
  ];

  transactions.forEach((transaction, rowIndex) => {
    transaction.forEach((value, colIndex) => {
      worksheet.getCell(15 + rowIndex, colIndex + 1).value = value;
    });
  });

  // Dosyayı kaydet
  await workbook.xlsx.writeFile('test_extract_real.xlsx');
  console.log('Test Excel dosyası oluşturuldu: test_extract_real.xlsx');
}

createTestExcel().catch(console.error); 