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

async function updatePhonesFromExtracts() {
  try {
    console.log('Ekstre dosyalarından telefon bilgileri güncelleniyor...\n');
    
    // Uploads klasöründeki tüm Excel dosyalarını al
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(file => file.endsWith('.xlsx'));
    
    console.log(`Toplam ${files.length} Excel dosyası bulundu\n`);
    
    let totalCustomers = 0;
    let updatedCustomers = 0;
    let processedFiles = 0;
    
    for (const fileName of files) {
      console.log(`İşleniyor: ${fileName}`);
      
      try {
        const filePath = path.join(uploadsDir, fileName);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
          console.log(`  Çalışma sayfası bulunamadı`);
          continue;
        }
        
        // Her müşteri bloğunu işle
        let currentRow = 1;
        let fileCustomers = 0;
        
        while (currentRow < worksheet.rowCount) {
          // Müşteri başlığını bul
          let customerStartRow = -1;
          let customerName = '';
          let phoneNumber = '';
          let customerCode = '';
          
          // Cari Kodu satırını bul
          for (let row = currentRow; row <= Math.min(currentRow + 50, worksheet.rowCount); row++) {
            const rowData = worksheet.getRow(row);
            const cellText = getText(rowData, 2);
            
            if (cellText === 'Cari Kodu') {
              customerStartRow = row;
              customerCode = getText(rowData, 3);
              break;
            }
          }
          
          if (customerStartRow === -1) {
            // Bu dosyada daha fazla müşteri yok
            break;
          }
          
          // Müşteri adını al
          const nameRow = worksheet.getRow(customerStartRow + 1);
          if (getText(nameRow, 2) === 'Cari Adı') {
            customerName = getText(nameRow, 3);
          }
          
          // Telefon numarasını al
          const phoneRow = worksheet.getRow(customerStartRow + 2);
          if (getText(phoneRow, 6) === 'Telefon') {
            phoneNumber = getText(phoneRow, 8);
          }
          
          if (customerName && phoneNumber && validatePhone(phoneNumber)) {
            console.log(`  Müşteri: ${customerName}`);
            console.log(`  Telefon: ${phoneNumber}`);
            
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
              
              console.log(`  ✓ Telefon bilgisi güncellendi`);
              updatedCustomers++;
            } else if (customer && customer.phone) {
              console.log(`  - Zaten telefon bilgisi var: ${customer.phone}`);
            } else {
              console.log(`  - Müşteri bulunamadı`);
            }
            
            totalCustomers++;
            fileCustomers++;
          }
          
          // Sonraki müşteri bloğuna geç
          currentRow = customerStartRow + 50; // Yaklaşık 50 satır sonraki müşteri
        }
        
        if (fileCustomers > 0) {
          console.log(`  ${fileCustomers} müşteri işlendi`);
          processedFiles++;
        }
        
      } catch (error) {
        console.log(`  Hata: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log(`İşlem tamamlandı!`);
    console.log(`İşlenen dosya sayısı: ${processedFiles}`);
    console.log(`Toplam ${totalCustomers} müşteri kontrol edildi`);
    console.log(`${updatedCustomers} müşterinin telefon bilgisi güncellendi`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePhonesFromExtracts();
