const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCustomers() {
  try {
    console.log('Müşteri verilerini kontrol ediliyor...\n');
    
    // Tüm müşterileri getir
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        address: true,
        type: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`Toplam ${customers.length} müşteri bulundu:\n`);
    
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}`);
      console.log(`   Kod: ${customer.code}`);
      console.log(`   Telefon: ${customer.phone || 'Yok'}`);
      console.log(`   Adres: ${customer.address || 'Yok'}`);
      console.log(`   Tür: ${customer.type}`);
      console.log(`   Oluşturulma: ${customer.createdAt}`);
      console.log('');
    });

    // Telefon bilgisi olan müşterileri say
    const customersWithPhone = customers.filter(c => c.phone);
    console.log(`Telefon bilgisi olan müşteri sayısı: ${customersWithPhone.length}/${customers.length}`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomers();
