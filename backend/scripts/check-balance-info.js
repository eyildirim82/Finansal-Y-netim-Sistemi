const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBalanceInfo() {
  try {
    console.log('💰 Bakiye bilgisi kontrol ediliyor...');
    
    // Tüm işlemleri getir
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: {
        transactionDate: 'desc'
      },
      take: 10
    });
    
    console.log(`📊 Toplam ${transactions.length} işlem kontrol edildi`);
    
    let withBalance = 0;
    let withoutBalance = 0;
    
    console.log('\n📋 İşlem Detayları:');
    transactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. ${tx.counterpartyName}`);
      console.log(`   Tarih: ${tx.transactionDate.toLocaleDateString('tr-TR')}`);
      console.log(`   Tutar: ${tx.amount} TL`);
      console.log(`   Yön: ${tx.direction === 'IN' ? 'Gelen' : 'Giden'}`);
      
      if (tx.balanceAfter) {
        console.log(`   💰 Bakiye: ${tx.balanceAfter.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        withBalance++;
      } else {
        console.log(`   ❌ Bakiye: Yok`);
        withoutBalance++;
      }
    });
    
    console.log(`\n📈 Özet:`);
    console.log(`   ✅ Bakiye bilgisi olan: ${withBalance}`);
    console.log(`   ❌ Bakiye bilgisi olmayan: ${withoutBalance}`);
    console.log(`   📊 Oran: %${((withBalance / transactions.length) * 100).toFixed(1)}`);
    
    if (withoutBalance > 0) {
      console.log('\n⚠️  Bazı işlemlerde bakiye bilgisi yok. Bu işlemler eski e-postalardan olabilir.');
    }
    
  } catch (error) {
    console.error('❌ Bakiye kontrol hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  checkBalanceInfo()
    .then(() => {
      console.log('✅ Bakiye kontrolü tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bakiye kontrolü hatası:', error);
      process.exit(1);
    });
}

module.exports = { checkBalanceInfo };
