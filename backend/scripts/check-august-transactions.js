const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAugustTransactions() {
  try {
    console.log('🗄️ Ağustos ayı işlemleri kontrol ediliyor...');
    
    // Ağustos ayının tarih aralığını hesapla
    const startDate = new Date(2025, 7, 1); // Ağustos 1
    const endDate = new Date(2025, 7, 31); // Ağustos 31
    
    console.log(`📅 Tarih aralığı: ${startDate.toLocaleDateString('tr-TR')} - ${endDate.toLocaleDateString('tr-TR')}`);
    
    // Ağustos ayındaki tüm işlemleri getir
    const augustTransactions = await prisma.bankTransaction.findMany({
      where: {
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        transactionDate: 'desc'
      },
      include: {
        customer: true
      }
    });
    
    console.log(`📊 Ağustos ayında toplam ${augustTransactions.length} işlem bulundu`);
    
    if (augustTransactions.length > 0) {
      console.log('\n📋 Ağustos ayı işlemleri:');
      augustTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.counterpartyName} - ${tx.amount} TL`);
        console.log(`   Tarih: ${tx.transactionDate.toLocaleDateString('tr-TR')}`);
        console.log(`   Yön: ${tx.direction === 'IN' ? 'Gelen' : 'Giden'}`);
        console.log(`   Eşleşme: ${tx.isMatched ? '✅ Eşleşti' : '❓ Bekliyor'}`);
        if (tx.customer) {
          console.log(`   Müşteri: ${tx.customer.name}`);
        }
        console.log('');
      });
    }
    
    // Toplam istatistikler
    const totalIn = augustTransactions.filter(tx => tx.direction === 'IN').reduce((sum, tx) => sum + tx.amount, 0);
    const totalOut = augustTransactions.filter(tx => tx.direction === 'OUT').reduce((sum, tx) => sum + tx.amount, 0);
    const matchedCount = augustTransactions.filter(tx => tx.isMatched).length;
    
    console.log('📈 Ağustos ayı özeti:');
    console.log(`   Toplam Gelen: ${totalIn.toFixed(2)} TL`);
    console.log(`   Toplam Giden: ${totalOut.toFixed(2)} TL`);
    console.log(`   Net: ${(totalIn - totalOut).toFixed(2)} TL`);
    console.log(`   Eşleşen İşlemler: ${matchedCount}/${augustTransactions.length}`);
    
  } catch (error) {
    console.error('❌ Kontrol hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  checkAugustTransactions()
    .then(() => {
      console.log('✅ Kontrol tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Kontrol hatası:', error);
      process.exit(1);
    });
}

module.exports = { checkAugustTransactions };
