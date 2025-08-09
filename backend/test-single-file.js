const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

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

async function testSingleFile() {
  try {
    console.log('Tek dosya test ediliyor...\n');
    
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

    let updatedCustomers = 0;
    let totalCustomers = 0;
    
    // İlk 1000 satırı tara (test için)
    for (let row = 1; row <= Math.min(1000, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row);
      const cellText = getText(rowData, 2);
      
      if (cellText === 'Cari Kodu') {
        const customerCode = getText(rowData, 3);
        
        // Müşteri adını al
        const nameRow = worksheet.getRow(row + 1);
        const customerName = getText(nameRow, 3);
        
        // Telefon numarasını al
        const phoneRow = worksheet.getRow(row + 2);
        const phoneNumber = getText(phoneRow, 8);
        
        if (customerName && phoneNumber && validatePhone(phoneNumber)) {
          console.log(`Müşteri: ${customerName}`);
          console.log(`Telefon: ${phoneNumber}`);
          
          // Müşteriyi bul ve telefon bilgisini güncelle
          const customer = await prisma.customer.findFirst({
            where: {
              name: customerName
            }
          });
          
          if (customer && !customer.phone) {
            await prisma.customer.update({
              where: { id: customer.id },
              data: { phone: phoneNumber }
            });
            
            console.log(`✓ Telefon bilgisi güncellendi`);
            updatedCustomers++;
          } else if (customer && customer.phone) {
            console.log(`- Zaten telefon bilgisi var: ${customer.phone}`);
          } else {
            console.log(`- Müşteri bulunamadı`);
          }
          
          totalCustomers++;
          console.log('');
        }
      }
    }
    
    console.log(`Test tamamlandı!`);
    console.log(`Toplam ${totalCustomers} müşteri kontrol edildi`);
    console.log(`${updatedCustomers} müşterinin telefon bilgisi güncellendi`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSingleFile();
