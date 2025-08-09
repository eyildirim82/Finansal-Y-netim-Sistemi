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

async function debugCustomerMatching() {
  try {
    console.log('Müşteri eşleştirme debug ediliyor...\n');
    
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

    let customerBlocks = 0;
    
    // İlk 5 müşteri bloğunu detaylı incele
    for (let row = 1; row <= Math.min(100, worksheet.rowCount); row++) {
      const rowData = worksheet.getRow(row);
      
      // A sütununda 'Cari Kodu' ara
      const cariKoduText = getText(rowData, 1);
      
      if (cariKoduText === 'Cari Kodu') {
        customerBlocks++;
        console.log(`\n=== MÜŞTERİ BLOĞU ${customerBlocks} ===`);
        console.log(`Satır ${row}: Cari Kodu bulundu`);
        
        // Cari Kodu değeri
        const customerCode = getText(rowData, 2);
        console.log(`Cari Kodu: ${customerCode}`);
        
        // Sonraki satırda müşteri adı
        const nameRow = worksheet.getRow(row + 1);
        const customerName = getText(nameRow, 2);
        console.log(`Müşteri Adı: ${customerName}`);
        
        // Bu müşteri bloğundaki tüm satırları incele
        console.log('Bu bloktaki tüm satırlar:');
        for (let blockRow = row; blockRow <= Math.min(row + 20, worksheet.rowCount); blockRow++) {
          const blockRowData = worksheet.getRow(blockRow);
          
          // A sütununda yeni bir 'Cari Kodu' var mı kontrol et
          const newCariKodu = getText(blockRowData, 1);
          if (newCariKodu === 'Cari Kodu' && blockRow !== row) {
            console.log(`  Satır ${blockRow}: Yeni müşteri bloğu başladı, bu blok bitti`);
            break;
          }
          
          // Telefon bilgisi var mı kontrol et
          for (let col = 1; col <= worksheet.columnCount; col++) {
            const cellText = getText(blockRowData, col);
            if (cellText === 'Telefon') {
              const phoneValue = getText(blockRowData, col + 2);
              console.log(`  Satır ${blockRow}, Sütun ${col}: Telefon = ${phoneValue}`);
            }
          }
          
          // A sütunundaki değerleri göster
          const aValue = getText(blockRowData, 1);
          const bValue = getText(blockRowData, 2);
          if (aValue || bValue) {
            console.log(`  Satır ${blockRow}: A="${aValue}" B="${bValue}"`);
          }
        }
        
        // Veritabanında bu müşteriyi ara
        if (customerName) {
          const customer = await prisma.customer.findFirst({
            where: {
              name: customerName
            }
          });
          
          if (customer) {
            console.log(`✓ Veritabanında bulundu: ID=${customer.id}, Telefon=${customer.phone || 'Yok'}`);
          } else {
            console.log(`✗ Veritabanında bulunamadı: ${customerName}`);
            
            // Benzer isimleri ara
            const similarCustomers = await prisma.customer.findMany({
              where: {
                name: {
                  contains: customerName.substring(0, 10)
                }
              },
              take: 3
            });
            
            if (similarCustomers.length > 0) {
              console.log(`  Benzer isimler:`);
              similarCustomers.forEach(c => {
                console.log(`    - ${c.name} (ID: ${c.id})`);
              });
            }
          }
        }
        
        if (customerBlocks >= 5) {
          console.log('\nİlk 5 müşteri bloğu incelendi. Devam etmek istiyor musunuz?');
          break;
        }
      }
    }
    
    console.log(`\nToplam ${customerBlocks} müşteri bloğu incelendi`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCustomerMatching();
