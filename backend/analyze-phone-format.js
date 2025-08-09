const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Utility functions
const getText = (row, col) => {
  if (!row || !col) return '';
  try {
    const cell = row.getCell(col);
    if (!cell || !cell.value) return '';
    
    // Rich text kontrolü
    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
      try {
        return cell.value.richText
          .map((rt) => (rt && typeof rt === 'object' && rt.text != null ? String(rt.text) : ''))
          .join('')
          .trim();
      } catch {
        return '';
      }
    }
    
    if (typeof cell.value === 'string') return cell.value.trim();
    if (typeof cell.value === 'number') return String(cell.value);
    if (cell.value instanceof Date) return cell.value.toLocaleDateString('tr-TR');
    
    return String(cell.value).trim();
  } catch (error) {
    return '';
  }
};

async function analyzePhoneFormat() {
  try {
    console.log('Telefon formatı analiz ediliyor...\n');
    
    const fileName = 'file-1754404787001-239857836.xlsx';
    const filePath = path.join(__dirname, 'uploads', fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`Dosya bulunamadı: ${filePath}`);
      return;
    }

    console.log(`Dosya okunuyor: ${fileName}`);
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      console.log('Çalışma sayfası bulunamadı');
      return;
    }

    console.log(`Satır sayısı: ${worksheet.rowCount}`);
    console.log(`Sütun sayısı: ${worksheet.columnCount}\n`);

    // İlk 3 müşteri bloğunu detaylı analiz et
    let customerCount = 0;
    
    for (let row = 1; row <= worksheet.rowCount && customerCount < 3; row++) {
      const rowData = worksheet.getRow(row);
      const cellText = getText(rowData, 2);
      
      if (cellText === 'Cari Kodu') {
        const customerCode = getText(rowData, 3);
        const customerName = getText(worksheet.getRow(row + 1), 3);
        
        console.log(`\n=== MÜŞTERİ ${customerCount + 1} ===`);
        console.log(`Müşteri: ${customerName}`);
        console.log(`Kod: ${customerCode}`);
        console.log(`Cari Kodu satırı: ${row}`);
        
        // Telefon satırını detaylı analiz et
        const phoneRow = worksheet.getRow(row + 2);
        console.log(`Telefon satırı: ${row + 2}`);
        
        // Tüm sütunları kontrol et
        console.log('Telefon satırındaki tüm değerler:');
        for (let col = 1; col <= 19; col++) {
          const cellValue = getText(phoneRow, col);
          if (cellValue) {
            console.log(`  Sütun ${col}: "${cellValue}"`);
          }
        }
        
        // Telefon satırından sonraki birkaç satırı da kontrol et
        console.log('\nTelefon satırından sonraki satırlar:');
        for (let offset = 1; offset <= 5; offset++) {
          const nextRow = worksheet.getRow(row + 2 + offset);
          console.log(`Satır ${row + 2 + offset}:`);
          for (let col = 1; col <= 19; col++) {
            const cellValue = getText(nextRow, col);
            if (cellValue && cellValue.length > 0) {
              console.log(`  Sütun ${col}: "${cellValue}"`);
            }
          }
        }
        
        customerCount++;
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  }
}

analyzePhoneFormat();
