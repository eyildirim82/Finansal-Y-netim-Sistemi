const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTransactions() {
  try {
    console.log('🔍 Transaction Debug Başlıyor...\n');

    // 1. Veritabanı bağlantısını test et
    console.log('1️⃣ Veritabanı bağlantısı test ediliyor...');
    await prisma.$connect();
    console.log('✅ Veritabanı bağlantısı başarılı\n');

    // 2. Transaction sayısını kontrol et
    console.log('2️⃣ Transaction sayısı kontrol ediliyor...');
    const transactionCount = await prisma.transaction.count();
    console.log(`✅ Toplam transaction sayısı: ${transactionCount}\n`);

    // 3. İlk birkaç transaction'ı getir
    console.log('3️⃣ İlk 5 transaction getiriliyor...');
    const transactions = await prisma.transaction.findMany({
      take: 5,
      include: {
        customer: true,
        category: true,
        user: true
      },
      orderBy: { date: 'desc' }
    });

    console.log(`✅ ${transactions.length} transaction bulundu:`);
    transactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.type} - ${txn.amount} ${txn.currency} - ${txn.description}`);
      console.log(`      Tarih: ${txn.date}`);
      console.log(`      Kullanıcı: ${txn.user?.username || 'N/A'}`);
      console.log(`      Müşteri: ${txn.customer?.name || 'N/A'}`);
      console.log(`      Kategori: ${txn.category?.name || 'N/A'}`);
      console.log('');
    });

    // 4. Transaction türlerine göre dağılım
    console.log('4️⃣ Transaction türleri dağılımı:');
    const typeStats = await prisma.transaction.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });

    typeStats.forEach(stat => {
      console.log(`   ${stat.type}: ${stat._count.type}`);
    });

    console.log('\n🎉 Debug tamamlandı!');

  } catch (error) {
    console.error('❌ Debug hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTransactions(); 