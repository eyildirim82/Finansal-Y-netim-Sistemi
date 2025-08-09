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

async function checkFirstRows() {
  try {
    console.log('İlk satırları kontrol ediliyor...\n');
    
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

    // İlk 20 satırı kontrol et
    for (let row = 1; row <= Math.min(20, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row);
      console.log(`\n--- Satır ${row} ---`);
      
      // Tüm sütunları kontrol et
      for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
        const cellText = getText(rowData, col);
        if (cellText) {
          console.log(`  Sütun ${col}: "${cellText}"`);
        }
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  }
}

checkFirstRows();
