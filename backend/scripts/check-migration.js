const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMigration() {
  try {
    console.log('📊 Migrasyon Sonuçları Kontrolü\n');
    
    // Kullanıcı sayısı
    const userCount = await prisma.user.count();
    console.log(`👥 Kullanıcılar: ${userCount}`);
    
    // Müşteri sayısı
    const customerCount = await prisma.customer.count();
    console.log(`👤 Müşteriler: ${customerCount}`);
    
    // Kategori sayısı
    const categoryCount = await prisma.category.count();
    console.log(`📂 Kategoriler: ${categoryCount}`);
    
    // İşlem sayısı
    const transactionCount = await prisma.transaction.count();
    console.log(`💰 İşlemler: ${transactionCount}`);
    
    // Bakiye sayısı
    const balanceCount = await prisma.balance.count();
    console.log(`💳 Bakiyeler: ${balanceCount}`);
    
    // İşlem türlerine göre dağılım
    const transactionTypes = await prisma.transaction.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });
    
    console.log('\n📈 İşlem Türleri Dağılımı:');
    transactionTypes.forEach(type => {
      console.log(`   ${type.type}: ${type._count.type}`);
    });
    
    // Örnek veriler
    console.log('\n🔍 Örnek Veriler:');
    
    const sampleUser = await prisma.user.findFirst();
    if (sampleUser) {
      console.log(`   Kullanıcı: ${sampleUser.username} (${sampleUser.email})`);
    }
    
    const sampleCustomer = await prisma.customer.findFirst();
    if (sampleCustomer) {
      console.log(`   Müşteri: ${sampleCustomer.name} (${sampleCustomer.code})`);
    }
    
    const sampleTransaction = await prisma.transaction.findFirst({
      include: {
        customer: true,
        category: true,
        user: true
      }
    });
    if (sampleTransaction) {
      console.log(`   İşlem: ${sampleTransaction.type} - ${sampleTransaction.amount} ${sampleTransaction.currency}`);
      if (sampleTransaction.customer) {
        console.log(`   Müşteri: ${sampleTransaction.customer.name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Kontrol hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigration(); 