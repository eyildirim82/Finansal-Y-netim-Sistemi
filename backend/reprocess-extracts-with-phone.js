const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reprocessExtractsWithPhone() {
  try {
    console.log('Ekstre dosyalarını telefon numarası ile yeniden işleme başlıyor...\n');
    
    // Tüm ekstre işlemlerini getir
    const extractTransactions = await prisma.extractTransaction.findMany({
      where: {
        customerId: {
          not: null
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            code: true
          }
        },
        extract: {
          select: {
            id: true,
            fileName: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Toplam ${extractTransactions.length} ekstre işlemi bulundu\n`);

    // Müşteri bazında telefon bilgilerini topla
    const customerPhoneMap = new Map();
    const extractPhoneMap = new Map();

    for (const transaction of extractTransactions) {
      if (!transaction.customer) continue;

      const customerId = transaction.customer.id;
      const extractId = transaction.extract.id;
      
      // Müşteri bilgilerini kaydet
      if (!customerPhoneMap.has(customerId)) {
        customerPhoneMap.set(customerId, {
          id: customerId,
          name: transaction.customer.name,
          code: transaction.customer.code,
          currentPhone: transaction.customer.phone,
          extractCount: 0,
          extracts: new Set()
        });
      }
      
      const customerInfo = customerPhoneMap.get(customerId);
      customerInfo.extractCount++;
      customerInfo.extracts.add(extractId);
      
      // Ekstre bazında telefon bilgilerini kaydet
      if (!extractPhoneMap.has(extractId)) {
        extractPhoneMap.set(extractId, {
          id: extractId,
          fileName: transaction.extract.fileName,
          createdAt: transaction.extract.createdAt,
          customers: new Set()
        });
      }
      
      extractPhoneMap.get(extractId).customers.add(customerId);
    }

    console.log('Telefon bilgisi olmayan müşteriler:');
    console.log('=====================================\n');
    
    let customersWithoutPhone = 0;
    for (const [customerId, customerInfo] of customerPhoneMap) {
      if (!customerInfo.currentPhone) {
        customersWithoutPhone++;
        console.log(`${customersWithoutPhone}. Müşteri: ${customerInfo.name} (${customerInfo.code})`);
        console.log(`   Ekstre sayısı: ${customerInfo.extractCount}`);
        console.log(`   Ekstre ID'leri: ${Array.from(customerInfo.extracts).join(', ')}`);
        console.log('');
      }
    }

    console.log(`\nToplam ${customersWithoutPhone} müşterinin telefon bilgisi yok.`);
    console.log(`Toplam ${extractPhoneMap.size} ekstre dosyası var.`);
    
    console.log('\nEkstre dosyaları:');
    console.log('=================\n');
    
    for (const [extractId, extractInfo] of extractPhoneMap) {
      console.log(`Ekstre ID: ${extractId}`);
      console.log(`Dosya adı: ${extractInfo.fileName}`);
      console.log(`Tarih: ${extractInfo.createdAt.toLocaleDateString('tr-TR')}`);
      console.log(`Müşteri sayısı: ${extractInfo.customers.size}`);
      console.log('');
    }

    console.log('Not: Bu script sadece analiz yapar. Telefon numaralarını güncellemek için');
    console.log('ekstre dosyalarını yeniden yüklemeniz veya manuel olarak telefon bilgilerini');
    console.log('girmeniz gerekiyor.');

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reprocessExtractsWithPhone();
