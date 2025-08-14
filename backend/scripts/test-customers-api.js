const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCustomersAPI() {
  try {
    console.log('🧪 Müşteri API Testi Başlıyor...\n');
    
    // Test kullanıcısını bul
    const user = await prisma.user.findFirst({
      where: { username: 'admin' }
    });
    
    if (!user) {
      console.log('❌ Test kullanıcısı bulunamadı');
      return;
    }
    
    console.log(`✅ Test kullanıcısı: ${user.username} (${user.id})`);
    
    // Müşteri sayısını kontrol et
    const customerCount = await prisma.customer.count({
      where: { userId: user.id }
    });
    
    console.log(`📊 Toplam müşteri sayısı: ${customerCount}`);
    
    // Müşteri listesi sorgusu (API'deki gibi)
    const customers = await prisma.customer.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: {
            transactions: true
          }
        },
        transactions: {
          select: {
            id: true,
            type: true,
            amount: true,
            date: true
          },
          orderBy: { date: 'desc' },
          take: 5
        }
      },
      orderBy: { name: 'asc' },
      skip: 0,
      take: 10
    });
    
    console.log(`✅ ${customers.length} müşteri bulundu`);
    
    // Her müşteri için ekstre işlem sayısını hesapla
    for (const customer of customers) {
      const extractTransactionCount = await prisma.extractTransaction.count({
        where: { customerId: customer.id }
      });
      
      const totalTransactionCount = customer._count.transactions + extractTransactionCount;
      
      console.log(`\n👤 ${customer.name}`);
      console.log(`   📊 İşlem sayısı: ${totalTransactionCount} (${customer._count.transactions} manuel + ${extractTransactionCount} ekstre)`);
      console.log(`   📅 Son işlem: ${customer.transactions.length > 0 ? customer.transactions[0].date : 'Yok'}`);
    }
    
    console.log('\n✅ Müşteri API testi tamamlandı!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomersAPI();
