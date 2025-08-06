const ExcelJS = require('exceljs');

async function createSmallTestExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Ekstre');

  // Doğru müşteri bilgileri
  worksheet.getCell('A1').value = 'Cari Kodu:';
  worksheet.getCell('B1').value = 'TEST001';
  worksheet.getCell('A2').value = 'Cari Adı:';
  worksheet.getCell('B2').value = 'Test Şirketi';

  // Boş satır (3. satır)
  worksheet.getCell('A3').value = '';

  // İşlem başlıkları (4. satır)
  const headers = ['Belge Türü', 'Tarih', 'Açıklama', 'Borç Tutar', 'Alacak Tutar'];
  headers.forEach((header, index) => {
    worksheet.getCell(4, index + 1).value = header;
  });

  // Sadece 1 işlem (5. satır)
  const transaction = ['Fatura', '15.01.2024', 'Test işlemi', '0,00', '1000,00'];
  transaction.forEach((value, colIndex) => {
    worksheet.getCell(5, colIndex + 1).value = value;
  });

  // Dosyayı kaydet
  await workbook.xlsx.writeFile('small_test.xlsx');
  console.log('Küçük test Excel dosyası oluşturuldu: small_test.xlsx');
}

createSmallTestExcel().catch(console.error); 