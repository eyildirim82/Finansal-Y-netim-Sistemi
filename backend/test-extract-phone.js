const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Utility functions
const norm = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

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

// Gelişmiş telefon numarası doğrulama
const validatePhone = (phoneValue) => {
  if (!phoneValue || phoneValue === 'Telefon' || phoneValue.length < 5) {
    return null;
  }
  
  // Telefon numarası formatlarını kontrol et
  const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
  if (!phoneRegex.test(phoneValue)) {
    return null;
  }
  
  // Sadece rakamları say
  const digitCount = phoneValue.replace(/\D/g, '').length;
  if (digitCount < 10 || digitCount > 15) {
    return null;
  }
  
  // Türkiye telefon numarası formatlarını kontrol et
  const cleanPhone = phoneValue.replace(/\D/g, '');
  if (cleanPhone.startsWith('90') && cleanPhone.length === 12) {
    return phoneValue.trim();
  }
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    return phoneValue.trim();
  }
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    return phoneValue.trim();
  }
  
  return phoneValue.trim();
};

const findFieldValue = (ws, startRow, searchPatterns, excludePatterns = []) => {
  const maxSearchRows = Math.min(startRow + 20, ws.rowCount);
  const maxSearchCols = 10;

  for (let r = startRow; r <= maxSearchRows; r++) {
    try {
      const row = ws.getRow(r);
      if (!row || row.cellCount === 0) continue;

      for (let c = 1; c <= maxSearchCols; c++) {
        try {
          const cellVal = getText(row, c);
          if (!cellVal) continue;
          
          const cellNorm = norm(cellVal);
          
          const matchesPattern = searchPatterns.some(pattern => cellNorm.includes(pattern));
          const excludedByPattern = excludePatterns.some(pattern => cellNorm.includes(pattern));
          
          if (matchesPattern && !excludedByPattern) {
            // Telefon için özel işlem
            if (searchPatterns.some(pattern => pattern.includes('telefon') || pattern.includes('tel') || pattern.includes('gsm') || pattern.includes('cep'))) {
              // Önce sağdaki hücreyi kontrol et
              const rightVal = getText(row, c + 1);
              if (rightVal && rightVal.trim() && validatePhone(rightVal)) {
                return rightVal.trim();
              }
              
              // Sağdaki hücrede geçerli telefon yoksa, aynı satırda başka bir sütunda telefon numarası ara
              for (let searchCol = 1; searchCol <= Math.min(20, ws.columnCount); searchCol++) {
                if (searchCol === c || searchCol === c + 1) continue; // Zaten kontrol edilen sütunları atla
                
                const searchVal = getText(row, searchCol);
                if (searchVal && validatePhone(searchVal)) {
                  return searchVal.trim();
                }
              }
            } else {
              // Telefon dışındaki alanlar için normal işlem
              const rightVal = getText(row, c + 1);
              if (rightVal && rightVal.trim()) {
                return rightVal.trim();
              }
            }
          }
        } catch (cellError) {
          continue;
        }
      }
    } catch (rowError) {
      continue;
    }
  }
  return '';
};

async function testExtractFile() {
  try {
    console.log('Ekstre dosyası test ediliyor...\n');
    
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

    // İlk 20 satırı incele
    console.log('İlk 20 satır:');
    console.log('=============\n');
    
    for (let row = 1; row <= Math.min(20, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row);
      let rowText = '';
      
      for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
        const cellText = getText(rowData, col);
        if (cellText) {
          rowText += `[${col}:"${cellText}"] `;
        }
      }
      
      if (rowText.trim()) {
        console.log(`Satır ${row}: ${rowText}`);
      }
    }

    // Müşteri başlığını bul
    console.log('\nMüşteri bilgileri aranıyor...\n');
    
    let customerStartRow = 1;
    for (let row = 1; row <= Math.min(50, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row);
      const rowText = getText(rowData, 1) + ' ' + getText(rowData, 2) + ' ' + getText(rowData, 3);
      
      if (norm(rowText).includes('cari') || norm(rowText).includes('müşteri')) {
        customerStartRow = row;
        console.log(`Müşteri başlığı bulundu: Satır ${row}`);
        console.log(`Satır içeriği: "${rowText}"`);
        break;
      }
    }

    // Müşteri bilgilerini oku
    const customerName = findFieldValue(worksheet, customerStartRow, ['cari ad', 'müşteri ad', 'hesap ad', 'firma ad']);
    const phoneValue = findFieldValue(worksheet, customerStartRow, ['telefon', 'tel', 'gsm', 'cep']);
    const address = findFieldValue(worksheet, customerStartRow, ['adres', 'adres bilgisi']);

    console.log('\nBulunan bilgiler:');
    console.log('=================');
    console.log(`Müşteri adı: ${customerName || 'Bulunamadı'}`);
    console.log(`Telefon: ${phoneValue || 'Bulunamadı'}`);
    console.log(`Adres: ${address || 'Bulunamadı'}`);

    // Telefon numarası doğrulama testi
    if (phoneValue) {
      const validatedPhone = validatePhone(phoneValue);
      console.log(`Doğrulanmış telefon: ${validatedPhone || 'Geçersiz format'}`);
    }

  } catch (error) {
    console.error('Hata:', error);
  }
}

testExtractFile();
