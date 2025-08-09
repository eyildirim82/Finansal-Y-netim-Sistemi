const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Utility functions from extract controller
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
    
    if (typeof cell.value === 'string') return cell.value.trim();
    if (typeof cell.value === 'number') return String(cell.value);
    if (cell.value instanceof Date) return cell.value.toLocaleDateString('tr-TR');
    
    return String(cell.value).trim();
  } catch (error) {
    return '';
  }
};

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
          const rightVal = getText(row, c + 1);
          if (!cellVal) continue;
          
          const cellNorm = norm(cellVal);
          
          const matchesPattern = searchPatterns.some(pattern => cellNorm.includes(pattern));
          const excludedByPattern = excludePatterns.some(pattern => cellNorm.includes(pattern));
          
          if (matchesPattern && !excludedByPattern && rightVal && rightVal.trim()) {
            return rightVal.trim();
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

async function reprocessExtracts() {
  try {
    console.log('Ekstre dosyalarını yeniden işleme başlıyor...\n');
    
    // Tüm ekstreleri getir
    const extracts = await prisma.extract.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Toplam ${extracts.length} ekstre dosyası bulundu\n`);

    let updatedCustomers = 0;
    let totalCustomers = 0;

    for (const extract of extracts) {
      console.log(`İşleniyor: ${extract.fileName}`);
      
      try {
        const filePath = path.join(__dirname, 'uploads', extract.fileName);
        
        if (!fs.existsSync(filePath)) {
          console.log(`  Dosya bulunamadı: ${filePath}`);
          continue;
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          console.log(`  Çalışma sayfası bulunamadı`);
          continue;
        }

        // Müşteri başlığını bul
        let customerStartRow = 1;
        for (let row = 1; row <= Math.min(50, worksheet.rowCount); row++) {
          const rowData = worksheet.getRow(row);
          const rowText = getText(rowData, 1) + ' ' + getText(rowData, 2) + ' ' + getText(rowData, 3);
          
          if (norm(rowText).includes('cari') || norm(rowText).includes('müşteri')) {
            customerStartRow = row;
            break;
          }
        }

        // Müşteri bilgilerini oku
        const customerName = findFieldValue(worksheet, customerStartRow, ['cari ad', 'müşteri ad', 'hesap ad', 'firma ad']);
        const phoneValue = findFieldValue(worksheet, customerStartRow, ['telefon', 'tel', 'gsm', 'cep']);
        const phone = validatePhone(phoneValue);

        if (customerName && phone) {
          console.log(`  Müşteri: ${customerName}`);
          console.log(`  Telefon: ${phone}`);

          // Müşteriyi bul ve telefon bilgisini güncelle
          const customer = await prisma.customer.findFirst({
            where: {
              name: customerName,
              userId: extract.userId
            }
          });

          if (customer && !customer.phone) {
            await prisma.customer.update({
              where: { id: customer.id },
              data: { phone: phone }
            });
            
            console.log(`  ✓ Telefon bilgisi güncellendi`);
            updatedCustomers++;
          } else if (customer && customer.phone) {
            console.log(`  - Zaten telefon bilgisi var: ${customer.phone}`);
          } else {
            console.log(`  - Müşteri bulunamadı`);
          }
          
          totalCustomers++;
        } else {
          console.log(`  - Müşteri adı veya telefon bilgisi bulunamadı`);
        }

      } catch (error) {
        console.log(`  Hata: ${error.message}`);
      }
      
      console.log('');
    }

    console.log(`İşlem tamamlandı!`);
    console.log(`Toplam ${totalCustomers} müşteri kontrol edildi`);
    console.log(`${updatedCustomers} müşterinin telefon bilgisi güncellendi`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reprocessExtracts();
