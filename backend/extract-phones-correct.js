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

async function extractPhonesCorrect() {
  try {
    console.log('Telefon bilgileri çıkarılıyor (Telefon yazısından sonraki ikinci hücre)...\n');
    
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
      
      // Her sütunda 'Telefon' yazısını ara
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cellText = getText(rowData, col);
        
        if (cellText === 'Telefon') {
          // Telefon yazısından sonraki ikinci hücreyi kontrol et
          const phoneCell = getText(rowData, col + 2);
          
          if (phoneCell && validatePhone(phoneCell)) {
            console.log(`Satır ${row}, Sütun ${col}: Telefon bulundu - ${phoneCell}`);
            foundPhones++;
            
            // Bu satırdan önceki müşteri bilgilerini bul
            let customerName = '';
            let customerCode = '';
            
            // Geriye doğru müşteri bilgilerini ara
            for (let backRow = row - 1; backRow >= Math.max(1, row - 10); backRow--) {
              const backRowData = worksheet.getRow(backRow);
              
              // A sütununda 'Cari Kodu' ara
              const cariKoduText = getText(backRowData, 1);
              if (cariKoduText === 'Cari Kodu') {
                customerCode = getText(backRowData, 2); // B sütunu
                const nameRow = worksheet.getRow(backRow + 1);
                customerName = getText(nameRow, 2); // B sütunu
                break;
              }
            }
            
            if (customerName && customerCode) {
              console.log(`  Müşteri: ${customerName} (${customerCode})`);
              
              // Müşteriyi bul ve telefon bilgisini güncelle
              const customer = await prisma.customer.findFirst({
                where: {
                  name: customerName
                }
              });
              
              if (customer && !customer.phone) {
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: { phone: phoneCell }
                });
                
                console.log(`  ✓ Telefon bilgisi güncellendi: ${phoneCell}`);
                updatedCustomers++;
              } else if (customer && customer.phone) {
                console.log(`  - Zaten telefon bilgisi var: ${customer.phone}`);
              } else {
                console.log(`  - Müşteri bulunamadı: ${customerName}`);
              }
              
              totalCustomers++;
            }
            
            // Bu satırda telefon bulduk, diğer sütunları kontrol etmeye gerek yok
            break;
          }
        }
      }
    }
    
    console.log(`\nİşlem tamamlandı!`);
    console.log(`Toplam ${foundPhones} telefon bilgisi bulundu`);
    console.log(`Toplam ${totalCustomers} müşteri kontrol edildi`);
    console.log(`${updatedCustomers} müşterinin telefon bilgisi güncellendi`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractPhonesCorrect();
