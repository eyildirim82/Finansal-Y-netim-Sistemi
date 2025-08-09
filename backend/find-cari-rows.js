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

async function findCariRows() {
  try {
    console.log('Cari Kodu satırları aranıyor...\n');
    
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

    let cariRows = [];
    
    // Tüm satırları tara
    for (let row = 1; row <= worksheet.rowCount; row++) {
      const rowData = worksheet.getRow(row);
      
      // Sütun 2'de "Cari Kodu" var mı kontrol et
      const cellText = getText(rowData, 2);
      if (cellText === 'Cari Kodu') {
        const customerCode = getText(rowData, 3);
        const customerName = getText(worksheet.getRow(row + 1), 3);
        const phoneNumber = getText(worksheet.getRow(row + 2), 8);
        
        cariRows.push({
          row: row,
          code: customerCode,
          name: customerName,
          phone: phoneNumber
        });
        
        console.log(`Satır ${row}: ${customerCode} - ${customerName} - ${phoneNumber}`);
      }
    }
    
    console.log(`\nToplam ${cariRows.length} Cari Kodu satırı bulundu`);

  } catch (error) {
    console.error('Hata:', error);
  }
}

findCariRows();
