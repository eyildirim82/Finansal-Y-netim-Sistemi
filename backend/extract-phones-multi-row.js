const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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

async function extractPhonesMultiRow() {
  try {
    console.log('Telefon bilgileri çıkarılıyor (çoklu satır mantığı ile)...\n');
    
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

    let totalCustomers = 0;
    let updatedCustomers = 0;
    let foundPhones = 0;
    
    // Tüm satırları tara
    for (let row = 1; row <= worksheet.rowCount; row++) {
      const rowData = worksheet.getRow(row);
      
      // Bu satırda 'Cari Kodu' var mı kontrol et
      const customerCode = getPairRightOf(rowData, 'Cari Kodu');
      
      if (customerCode) {
        totalCustomers++;
        console.log(`\nSatır ${row}: Müşteri bulundu - ${customerCode}`);
        
        // Müşteri adını al
        const customerName = getPairRightOf(rowData, 'Cari Adı');
        if (customerName) {
          console.log(`  Müşteri Adı: ${customerName}`);
        }
        
        // Bu müşteri bloğundaki telefon bilgisini ara
        let phoneNumber = '';
        
        // Sonraki 10 satırda telefon bilgisini ara
        for (let searchRow = row; searchRow <= Math.min(row + 10, worksheet.rowCount); searchRow++) {
          const searchRowData = worksheet.getRow(searchRow);
          
          // Yeni bir müşteri bloğu başladı mı kontrol et
          const newCustomerCode = getPairRightOf(searchRowData, 'Cari Kodu');
          if (newCustomerCode && newCustomerCode !== customerCode) {
            break; // Yeni müşteri bloğu başladı
          }
          
          // Bu satırda telefon bilgisi var mı kontrol et
          const phone = getPairRightOf(searchRowData, 'Telefon');
          if (phone && validatePhone(phone)) {
            phoneNumber = phone;
            console.log(`  Telefon bulundu (satır ${searchRow}): ${phoneNumber}`);
            foundPhones++;
            break;
          }
        }
        
        if (phoneNumber) {
          // Müşteriyi bul ve telefon bilgisini güncelle
          let customer = null;
          
          // Önce müşteri adı ile ara
          if (customerName) {
            customer = await prisma.customer.findFirst({
              where: {
                name: customerName
              }
            });
          }
          
          // Müşteri adı ile bulunamazsa, müşteri kodu ile ara
          if (!customer && customerCode) {
            customer = await prisma.customer.findFirst({
              where: {
                code: customerCode
              }
            });
          }
          
          if (customer && !customer.phone) {
            await prisma.customer.update({
              where: { id: customer.id },
              data: { phone: phoneNumber }
            });
            
            console.log(`  ✓ Telefon bilgisi güncellendi: ${phoneNumber}`);
            updatedCustomers++;
          } else if (customer && customer.phone) {
            console.log(`  - Zaten telefon bilgisi var: ${customer.phone}`);
          } else {
            console.log(`  - Müşteri bulunamadı: ${customerName || customerCode}`);
          }
        } else {
          console.log(`  - Telefon bilgisi bulunamadı`);
        }
      }
    }
    
    console.log(`\nİşlem tamamlandı!`);
    console.log(`Toplam ${totalCustomers} müşteri bulundu`);
    console.log(`Toplam ${foundPhones} telefon bilgisi bulundu`);
    console.log(`${updatedCustomers} müşterinin telefon bilgisi güncellendi`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractPhonesMultiRow();
