const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllCustomers() {
  try {
    // Toplam müşteri sayısını kontrol et
    const totalCustomers = await prisma.customer.count();
    console.log(`Toplam müşteri sayısı: ${totalCustomers}`);
    
    if (totalCustomers === 0) {
      console.log('Silinecek müşteri yok.');
      return;
    }
    
    // İlk 5 müşteriyi göster
    const sampleCustomers = await prisma.customer.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true
      }
    });
    
    console.log('Örnek müşteriler:');
    sampleCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.code})`);
    });
    
    if (totalCustomers > 5) {
      console.log(`... ve ${totalCustomers - 5} müşteri daha`);
    }
    
    // Onay kontrolü
    const shouldDelete = process.argv.includes('--confirm');
    
    if (shouldDelete) {
      console.log('\nTüm müşteriler siliniyor...');
      
      // Müşterileri sil
      const result = await prisma.customer.deleteMany({});
      
      console.log(`${result.count} müşteri başarıyla silindi`);
      
      // Kontrol et
      const remainingCount = await prisma.customer.count();
      console.log(`Kalan müşteri sayısı: ${remainingCount}`);
      
    } else {
      console.log('\n⚠️  DİKKAT: Bu işlem TÜM müşterileri silecek!');
      console.log('Onaylamak için --confirm parametresi ekleyin.');
      console.log('Örnek: node delete-all-customers.js --confirm');
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllCustomers();
