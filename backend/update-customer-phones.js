const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateCustomerPhones() {
  try {
    console.log('Müşteri telefon bilgilerini güncelleme işlemi başlıyor...\n');
    
    // Tüm ekstre işlemlerini getir ve müşteri bazında grupla
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
            phone: true
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

    for (const transaction of extractTransactions) {
      if (!transaction.customer) continue;

      const customerId = transaction.customer.id;
      
      // Eğer müşterinin zaten telefon bilgisi varsa, atla
      if (transaction.customer.phone) continue;

      // Ekstre dosyasından telefon bilgisini al
      // Bu bilgi genellikle ekstre işlemlerinde saklanmıyor
      // Bu yüzden ekstre dosyalarını yeniden parse etmemiz gerekebilir
      
      // Şimdilik sadece telefon bilgisi olmayan müşterileri listele
      if (!customerPhoneMap.has(customerId)) {
        customerPhoneMap.set(customerId, {
          id: customerId,
          name: transaction.customer.name,
          currentPhone: transaction.customer.phone,
          extractCount: 0
        });
      }
      
      const customerInfo = customerPhoneMap.get(customerId);
      customerInfo.extractCount++;
    }

    console.log('Telefon bilgisi olmayan müşteriler:');
    console.log('=====================================\n');

    const customersWithoutPhone = Array.from(customerPhoneMap.values())
      .filter(customer => !customer.currentPhone)
      .sort((a, b) => b.extractCount - a.extractCount);

    customersWithoutPhone.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}`);
      console.log(`   ID: ${customer.id}`);
      console.log(`   Ekstre sayısı: ${customer.extractCount}`);
      console.log(`   Mevcut telefon: ${customer.currentPhone || 'Yok'}`);
      console.log('');
    });

    console.log(`Toplam ${customersWithoutPhone.length} müşterinin telefon bilgisi yok\n`);

    // Öneri: Ekstre dosyalarını yeniden yükleyerek telefon bilgilerini güncelle
    console.log('ÖNERİ:');
    console.log('1. Ekstre dosyalarını yeniden yükleyin');
    console.log('2. Veya manuel olarak müşteri düzenleme formundan telefon bilgilerini ekleyin');
    console.log('3. Veya veritabanına doğrudan telefon bilgilerini ekleyin\n');

    // Test için bir müşteriye telefon bilgisi ekle
    if (customersWithoutPhone.length > 0) {
      const testCustomer = customersWithoutPhone[0];
      console.log(`Test: ${testCustomer.name} müşterisine telefon bilgisi ekleniyor...`);
      
      try {
        await prisma.customer.update({
          where: { id: testCustomer.id },
          data: { phone: '555-123-4567' }
        });
        console.log('Test telefon bilgisi eklendi: 555-123-4567');
      } catch (error) {
        console.error('Test telefon bilgisi eklenirken hata:', error.message);
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCustomerPhones();
