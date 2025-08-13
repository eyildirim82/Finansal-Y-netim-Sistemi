const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function validateBalances() {
  try {
    console.log('🔍 Bakiye doğrulama başlatılıyor...');
    
    // Tüm işlemleri tarih sırasına göre getir
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: {
        transactionDate: 'asc'
      }
    });
    
    console.log(`📊 Toplam ${transactions.length} işlem kontrol edilecek`);
    
    let currentBalance = 0;
    let errors = [];
    let warnings = [];
    let validTransactions = 0;
    
    console.log('\n📋 Bakiye Doğrulama Raporu:');
    console.log('=' .repeat(80));
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const prevBalance = currentBalance;
      
      // İşlem tutarını hesapla
      if (tx.direction === 'IN') {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      
      // Bakiye kontrolü
      if (tx.balanceAfter !== null && tx.balanceAfter !== undefined) {
        const difference = Math.abs(currentBalance - tx.balanceAfter);
        const tolerance = 0.01; // 1 kuruş tolerans
        
        if (difference > tolerance) {
          errors.push({
            transaction: tx,
            expectedBalance: currentBalance,
            actualBalance: tx.balanceAfter,
            difference: difference,
            index: i
          });
        } else {
          validTransactions++;
        }
      } else {
        warnings.push({
          transaction: tx,
          calculatedBalance: currentBalance,
          index: i
        });
      }
      
      // İlk 10 işlemi detaylı göster
      if (i < 10) {
        console.log(`\n${i + 1}. ${tx.counterpartyName}`);
        console.log(`   Tarih: ${tx.transactionDate.toLocaleDateString('tr-TR')} ${tx.transactionDate.toLocaleTimeString('tr-TR')}`);
        console.log(`   İşlem: ${tx.direction === 'IN' ? '+' : '-'}${tx.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        console.log(`   Önceki Bakiye: ${prevBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        console.log(`   Hesaplanan Bakiye: ${currentBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        
        if (tx.balanceAfter !== null && tx.balanceAfter !== undefined) {
          console.log(`   Gerçek Bakiye: ${tx.balanceAfter.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
          const diff = Math.abs(currentBalance - tx.balanceAfter);
          if (diff > 0.01) {
            console.log(`   ❌ Fark: ${diff.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
          } else {
            console.log(`   ✅ Doğru`);
          }
        } else {
          console.log(`   ⚠️  Bakiye bilgisi yok`);
        }
      }
    }
    
    // Özet rapor
    console.log('\n' + '='.repeat(80));
    console.log('📈 DOĞRULAMA ÖZETİ');
    console.log('='.repeat(80));
    console.log(`✅ Doğru işlemler: ${validTransactions}`);
    console.log(`❌ Hatalı işlemler: ${errors.length}`);
    console.log(`⚠️  Bakiye bilgisi olmayan: ${warnings.length}`);
    console.log(`📊 Doğruluk oranı: %${((validTransactions / (validTransactions + errors.length)) * 100).toFixed(1)}`);
    console.log(`💰 Son hesaplanan bakiye: ${currentBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
    
    // Hataları göster
    if (errors.length > 0) {
      console.log('\n❌ HATALI İŞLEMLER:');
      console.log('-'.repeat(50));
      errors.slice(0, 5).forEach((error, index) => {
        const tx = error.transaction;
        console.log(`${index + 1}. ${tx.counterpartyName} (${tx.transactionDate.toLocaleDateString('tr-TR')})`);
        console.log(`   Beklenen: ${error.expectedBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        console.log(`   Gerçek: ${error.actualBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        console.log(`   Fark: ${error.difference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
      });
      
      if (errors.length > 5) {
        console.log(`   ... ve ${errors.length - 5} işlem daha`);
      }
    }
    
    // Uyarıları göster
    if (warnings.length > 0) {
      console.log('\n⚠️  BAKİYE BİLGİSİ OLMAYAN İŞLEMLER:');
      console.log('-'.repeat(50));
      warnings.slice(0, 3).forEach((warning, index) => {
        const tx = warning.transaction;
        console.log(`${index + 1}. ${tx.counterpartyName} (${tx.transactionDate.toLocaleDateString('tr-TR')})`);
        console.log(`   Hesaplanan Bakiye: ${warning.calculatedBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
      });
      
      if (warnings.length > 3) {
        console.log(`   ... ve ${warnings.length - 3} işlem daha`);
      }
    }
    
    // Öneriler
    console.log('\n💡 ÖNERİLER:');
    if (errors.length > 0) {
      console.log('• Hatalı işlemlerin e-posta kaynaklarını kontrol edin');
      console.log('• Bakiye hesaplama algoritmasını gözden geçirin');
      console.log('• Eksik işlemler olup olmadığını kontrol edin');
    }
    if (warnings.length > 0) {
      console.log('• Bakiye bilgisi olmayan işlemlerin e-postalarını kontrol edin');
      console.log('• E-posta parse algoritmasını iyileştirin');
    }
    
  } catch (error) {
    console.error('❌ Bakiye doğrulama hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  validateBalances()
    .then(() => {
      console.log('\n✅ Bakiye doğrulama tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bakiye doğrulama hatası:', error);
      process.exit(1);
    });
}

module.exports = { validateBalances };
