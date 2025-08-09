const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Utility functions
const norm = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

function cellToString(v) {
  if (v == null || v === undefined) return '';
  if (typeof v === 'object') {
    if ('richText' in v && Array.isArray(v.richText)) {
      return v.richText.map((p) => p.text).join('');
    }
    if ('text' in v && typeof v.text === 'string') {
      return String(v.text);
    }
    if (v instanceof Date) return formatYMD(v);
    if ('result' in v) return String(v.result ?? '');
    if ('formula' in v) return String(v.formula ?? '');
    if ('value' in v) return String(v.value ?? '');
  }
  return String(v);
}

function formatYMD(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function getText(row, col) {
  if (!col) return '';
  
  try {
    const cell = row.getCell(col);
    
    if (cell.value != null) {
      return cellToString(cell.value).trim();
    }
    
    try {
      const text = cell.text;
      if (text != null) {
        return cellToString(text).trim();
      }
    } catch (textError) {
      console.warn(`Warning: Could not read text from cell at column ${col}:`, textError.message);
    }
    
    return '';
  } catch (error) {
    console.warn(`Warning: Could not read cell at column ${col}:`, error.message);
    return '';
  }
}

// Label:Value çifti gibi duran satırlarda, "Label"i bulup sağındaki hücreyi döndür
function getPairRightOf(row, label) {
  const cells = Array.isArray(row.values) ? row.values : [];
  const labelNorm = norm(label);
  for (let c = 1; c < cells.length; c++) {
    const left = cellToString(cells[c]);
    if (norm(left) === labelNorm) {
      return cellToString(cells[c + 1]).trim();
    }
  }
  return '';
}

const validatePhone = (phoneValue) => {
  if (!phoneValue || phoneValue === 'Telefon' || phoneValue.length < 5) {
    return null;
  }
  
  const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
  if (!phoneRegex.test(phoneValue)) {
    return null;
  }
  
  const digitCount = phoneValue.replace(/\D/g, '').length;
  if (digitCount < 10 || digitCount > 15) {
    return null;
  }
  
  return phoneValue.trim();
};

async function findPhoneNumbers() {
  try {
    console.log('Telefon numaraları aranıyor...\n');
    
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

    let phoneCount = 0;
    let customerCount = 0;
    
    // İlk 100 satırı detaylı incele
    for (let row = 1; row <= Math.min(100, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row);
      
      // Bu satırda müşteri kodu var mı kontrol et
      const customerCode = getPairRightOf(rowData, 'Cari Kodu');
      if (customerCode) {
        customerCount++;
        console.log(`\n--- Müşteri ${customerCount}: ${customerCode} (Satır ${row}) ---`);
        
        // Bu satırda telefon var mı kontrol et
        const phone = getPairRightOf(rowData, 'Telefon');
        if (phone && validatePhone(phone)) {
          phoneCount++;
          console.log(`  ✓ Telefon bulundu: ${phone}`);
        } else if (phone) {
          console.log(`  - Geçersiz telefon: ${phone}`);
        } else {
          console.log(`  - Telefon yok`);
        }
        
        // Bu satırın tüm hücrelerini göster
        console.log(`  Satır içeriği:`);
        for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
          const cellText = getText(rowData, col);
          if (cellText) {
            console.log(`    Sütun ${col}: "${cellText}"`);
          }
        }
        
        // Sonraki 5 satırı da kontrol et
        for (let nextRow = row + 1; nextRow <= Math.min(row + 5, worksheet.rowCount); nextRow++) {
          const nextRowData = worksheet.getRow(nextRow);
          
          // Yeni müşteri başladı mı kontrol et
          const newCustomerCode = getPairRightOf(nextRowData, 'Cari Kodu');
          if (newCustomerCode) {
            console.log(`    Satır ${nextRow}: Yeni müşteri başladı (${newCustomerCode})`);
            break;
          }
          
          // Bu satırda telefon var mı kontrol et
          const nextPhone = getPairRightOf(nextRowData, 'Telefon');
          if (nextPhone && validatePhone(nextPhone)) {
            phoneCount++;
            console.log(`    Satır ${nextRow}: ✓ Telefon bulundu: ${nextPhone}`);
          } else if (nextPhone) {
            console.log(`    Satır ${nextRow}: - Geçersiz telefon: ${nextPhone}`);
          }
          
          // Bu satırın tüm hücrelerini göster
          let hasContent = false;
          for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
            const cellText = getText(nextRowData, col);
            if (cellText) {
              if (!hasContent) {
                console.log(`    Satır ${nextRow} içeriği:`);
                hasContent = true;
              }
              console.log(`      Sütun ${col}: "${cellText}"`);
            }
          }
        }
      }
    }
    
    console.log(`\nİşlem tamamlandı!`);
    console.log(`Toplam ${customerCount} müşteri incelendi`);
    console.log(`Toplam ${phoneCount} telefon numarası bulundu`);

  } catch (error) {
    console.error('Hata:', error);
  }
}

findPhoneNumbers();
