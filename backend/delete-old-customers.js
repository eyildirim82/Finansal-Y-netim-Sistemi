const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteOldCustomers() {
  try {
    // 1 ay öncesinden önceki müşterileri sil
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    console.log('1 ay öncesi tarih:', oneMonthAgo.toISOString());
    
    // Önce silinecek müşteri sayısını kontrol et
    const customersToDelete = await prisma.customer.findMany({
      where: {
        createdAt: {
          lt: oneMonthAgo
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true
      }
    });
    
    console.log(`Silinecek müşteri sayısı: ${customersToDelete.length}`);
    
    if (customersToDelete.length > 0) {
      console.log('Silinecek müşteriler:');
      customersToDelete.slice(0, 10).forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} (${customer.code}) - ${customer.createdAt.toISOString()}`);
      });
      
      if (customersToDelete.length > 10) {
        console.log(`... ve ${customersToDelete.length - 10} müşteri daha`);
      }
      
      // Onay iste
      console.log('\nBu müşterileri silmek istediğinizden emin misiniz? (y/N)');
      
      // Basit onay - gerçek uygulamada readline kullanılabilir
      const shouldDelete = process.argv.includes('--confirm');
      
      if (shouldDelete) {
        // Müşterileri sil
        const result = await prisma.customer.deleteMany({
          where: {
            createdAt: {
              lt: oneMonthAgo
            }
          }
        });
        
        console.log(`${result.count} müşteri başarıyla silindi`);
      } else {
        console.log('Silme işlemi iptal edildi. Onaylamak için --confirm parametresi ekleyin.');
        console.log('Örnek: node delete-old-customers.js --confirm');
      }
    } else {
      console.log('Silinecek müşteri bulunamadı.');
    }
    
    // Kalan müşteri sayısını kontrol et
    const remainingCount = await prisma.customer.count();
    console.log(`Kalan müşteri sayısı: ${remainingCount}`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldCustomers();
