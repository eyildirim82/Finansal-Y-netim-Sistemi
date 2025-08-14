const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCustomerUserIds() {
  try {
    console.log('🔍 Müşteri userId değerleri kontrol ediliyor...\n');
    
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        userId: true
      }
    });

    console.log(`📊 Toplam müşteri sayısı: ${customers.length}`);
    
    const nullUserIdCount = customers.filter(c => !c.userId).length;
    console.log(`❌ userId null olan müşteri sayısı: ${nullUserIdCount}`);
    
    const uniqueUserIds = [...new Set(customers.map(c => c.userId).filter(id => id))];
    console.log(`👥 Benzersiz userId sayısı: ${uniqueUserIds.length}`);
    
    if (uniqueUserIds.length > 0) {
      console.log(`📋 userId değerleri: ${uniqueUserIds.join(', ')}`);
    }
    
    console.log('\n📋 İlk 10 müşteri:');
    customers.slice(0, 10).forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} - userId: ${customer.userId || 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomerUserIds();
