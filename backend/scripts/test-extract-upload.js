const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Test ekstre dosyası oluştur
async function createTestExtract() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Test Ekstre');

  // Müşteri başlığı
  worksheet.addRow(['Cari Kodu', 'CUST001']);
  worksheet.addRow(['Cari Adı', 'TEST ŞİRKETİ A.Ş.']);
  worksheet.addRow(['Telefon', '0212 555 1234']);
  worksheet.addRow(['Adres', 'İstanbul, Türkiye']);
  worksheet.addRow(['Hesap Türü', 'Alıcı']);
  worksheet.addRow(['Özel Kod(1)', 'TAG1']);
  worksheet.addRow(['Özel Kod(2)', 'TAG2']);
  worksheet.addRow(['Borç', '1000,00']);
  worksheet.addRow(['Alacak', '500,00']);
  worksheet.addRow(['Borç Bakiye', '500,00']);

  // Boş satır
  worksheet.addRow([]);

  // İşlem başlığı
  worksheet.addRow(['Belge Türü', 'Tarih', 'Evrak No', 'Açıklama', 'Borç Tutar', 'Alacak Tutar']);

  // Test işlemleri
  worksheet.addRow(['Fatura', '01.01.2024', 'F001', 'Test Faturası', '1000,00', '']);
  worksheet.addRow(['Tahsilat', '02.01.2024', 'T001', 'Test Tahsilat', '', '500,00']);
  worksheet.addRow(['Fatura', '03.01.2024', 'F002', 'İkinci Fatura', '750,00', '']);
  worksheet.addRow(['Tahsilat', '04.01.2024', 'T002', 'İkinci Tahsilat', '', '250,00']);

  // Dosyayı kaydet
  const filePath = path.join(__dirname, 'test-extract.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Test ekstre dosyası oluşturuldu: ${filePath}`);
  
  return filePath;
}

// Test kullanıcısı oluştur
async function createTestUser() {
  const existingUser = await prisma.user.findFirst({
    where: { username: 'testuser' }
  });

  if (existingUser) {
    console.log('✅ Test kullanıcısı zaten mevcut');
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'test123',
      role: 'USER'
    }
  });

  console.log('✅ Test kullanıcısı oluşturuldu:', user.id);
  return user;
}

// Ekstre yükleme simülasyonu
async function simulateExtractUpload(filePath, userId) {
  try {
    console.log('📤 Ekstre yükleme simülasyonu başlıyor...');
    
    // Excel dosyasını oku
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    // Ekstre kaydı oluştur
    const extract = await prisma.extract.create({
      data: {
        fileName: 'test-extract.xlsx',
        status: 'processing',
        totalRows: worksheet.rowCount - 1,
        userId
      }
    });

    console.log('✅ Ekstre kaydı oluşturuldu:', extract.id);

    // Müşteri oluştur
    const customer = await prisma.customer.create({
      data: {
        code: 'CUST001',
        name: 'TEST ŞİRKETİ A.Ş.',
        phone: '0212 555 1234',
        address: 'İstanbul, Türkiye',
        accountType: 'Alıcı',
        tag1: 'TAG1',
        tag2: 'TAG2',
        type: 'CORPORATE',
        userId
      }
    });

    console.log('✅ Müşteri oluşturuldu:', customer.id);

    // İşlemleri oluştur
    const transactions = [
      {
        extractId: extract.id,
        customerId: customer.id,
        date: new Date('2024-01-01'),
        description: 'Test Faturası',
        debit: 1000,
        credit: 0,
        documentType: 'Fatura',
        voucherNo: 'F001',
        sourceRow: 1
      },
      {
        extractId: extract.id,
        customerId: customer.id,
        date: new Date('2024-01-02'),
        description: 'Test Tahsilat',
        debit: 0,
        credit: 500,
        documentType: 'Tahsilat',
        voucherNo: 'T001',
        sourceRow: 2
      },
      {
        extractId: extract.id,
        customerId: customer.id,
        date: new Date('2024-01-03'),
        description: 'İkinci Fatura',
        debit: 750,
        credit: 0,
        documentType: 'Fatura',
        voucherNo: 'F002',
        sourceRow: 3
      },
      {
        extractId: extract.id,
        customerId: customer.id,
        date: new Date('2024-01-04'),
        description: 'İkinci Tahsilat',
        debit: 0,
        credit: 250,
        documentType: 'Tahsilat',
        voucherNo: 'T002',
        sourceRow: 4
      }
    ];

    await prisma.extractTransaction.createMany({
      data: transactions
    });

    console.log('✅ 4 işlem oluşturuldu');

    // Ekstre durumunu güncelle
    await prisma.extract.update({
      where: { id: extract.id },
      data: {
        status: 'completed',
        processedRows: 4,
        errorRows: 0
      }
    });

    console.log('✅ Ekstre durumu güncellendi');

    return { extract, customer };
  } catch (error) {
    console.error('❌ Ekstre yükleme hatası:', error);
    throw error;
  }
}

// Test işlemini çalıştır
async function runTest() {
  try {
    console.log('🧪 Test ekstre yükleme işlemi başlıyor...\n');
    
    // Test kullanıcısı oluştur
    const user = await createTestUser();
    
    // Test dosyası oluştur
    const filePath = await createTestExtract();
    
    // Ekstre yükleme simülasyonu
    const result = await simulateExtractUpload(filePath, user.id);
    
    console.log('\n✅ Test tamamlandı!');
    console.log(`📊 Ekstre ID: ${result.extract.id}`);
    console.log(`👤 Müşteri ID: ${result.customer.id}`);
    console.log(`📁 Dosya: ${filePath}`);
    
    // Temizlik
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Test dosyası silindi');
    }
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
