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

async function checkPhoneColumns() {
  try {
    console.log('Telefon sütunları kontrol ediliyor...\n');
    
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

    // İlk 5 müşteri bloğunu kontrol et
    let customerCount = 0;
    
    for (let row = 1; row <= worksheet.rowCount && customerCount < 5; row++) {
      const rowData = worksheet.getRow(row);
      const cellText = getText(rowData, 2);
      
      if (cellText === 'Cari Kodu') {
        const customerCode = getText(rowData, 3);
        const customerName = getText(worksheet.getRow(row + 1), 3);
        
        console.log(`\nMüşteri ${customerCount + 1}: ${customerName} (${customerCode})`);
        console.log(`Satır ${row}: Cari Kodu`);
        
        // Telefon satırını kontrol et (satır + 2)
        const phoneRow = worksheet.getRow(row + 2);
        console.log(`Satır ${row + 2}: Telefon satırı`);
        
        // Tüm sütunları kontrol et
        for (let col = 1; col <= 19; col++) {
          const cellValue = getText(phoneRow, col);
          if (cellValue && cellValue !== 'Telefon') {
            console.log(`  Sütun ${col}: "${cellValue}"`);
          }
        }
        
        customerCount++;
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  }
}

checkPhoneColumns();
