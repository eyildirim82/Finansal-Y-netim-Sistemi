const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixBalanceIssues() {
  try {
    console.log('🔧 Bakiye Sorunları Düzeltme Başlatılıyor...');
    
    // 1. Başlangıç bakiyesini hesapla
    console.log('\n📋 1. BAŞLANGIÇ BAKİYESİ HESAPLAMA');
    console.log('='.repeat(50));
    
    const firstTransaction = await prisma.bankTransaction.findFirst({
      orderBy: {
        transactionDate: 'asc'
      }
    });
    
    if (!firstTransaction || !firstTransaction.balanceAfter) {
      console.log('❌ İlk işlem bulunamadı veya bakiye bilgisi yok');
      return;
    }
    
    const startBalance = firstTransaction.balanceAfter - 
      (firstTransaction.direction === 'IN' ? firstTransaction.amount : -firstTransaction.amount);
    
    console.log(`İlk işlem: ${firstTransaction.counterpartyName}`);
    console.log(`İşlem tutarı: ${firstTransaction.amount} TL (${firstTransaction.direction === 'IN' ? 'Gelen' : 'Giden'})`);
    console.log(`İşlem sonrası bakiye: ${firstTransaction.balanceAfter} TL`);
    console.log(`Hesaplanan başlangıç bakiyesi: ${startBalance} TL`);
    
    // 2. Tüm işlemleri yeniden hesapla
    console.log('\n📋 2. İŞLEMLERİ YENİDEN HESAPLAMA');
    console.log('='.repeat(50));
    
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: {
        transactionDate: 'asc'
      }
    });
    
    let currentBalance = startBalance;
    let correctedCount = 0;
    let errorCount = 0;
    
    console.log(`Toplam ${transactions.length} işlem kontrol edilecek`);
    console.log(`Başlangıç bakiyesi: ${startBalance} TL`);
    
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
        const tolerance = 1.0; // 1 TL tolerans
        
        if (difference > tolerance) {
          console.log(`\n❌ İşlem ${i + 1}: ${tx.counterpartyName}`);
          console.log(`   Tarih: ${tx.transactionDate.toLocaleDateString('tr-TR')}`);
          console.log(`   İşlem: ${tx.direction === 'IN' ? '+' : '-'}${tx.amount} TL`);
          console.log(`   Önceki bakiye: ${prevBalance} TL`);
          console.log(`   Hesaplanan bakiye: ${currentBalance} TL`);
          console.log(`   Gerçek bakiye: ${tx.balanceAfter} TL`);
          console.log(`   Fark: ${difference} TL`);
          
          // Bakiye düzeltme seçeneği
          const shouldFix = difference > 100; // Sadece büyük farkları düzelt
          
          if (shouldFix) {
            console.log(`   🔧 Bakiye düzeltiliyor...`);
            
            try {
              await prisma.bankTransaction.update({
                where: { id: tx.id },
                data: {
                  balanceAfter: currentBalance,
                  parsedData: JSON.stringify({
                    ...JSON.parse(tx.parsedData || '{}'),
                    correctedBalance: true,
                    originalBalance: tx.balanceAfter,
                    correctionDate: new Date().toISOString()
                  })
                }
              });
              
              correctedCount++;
              console.log(`   ✅ Bakiye düzeltildi: ${currentBalance} TL`);
            } catch (error) {
              console.log(`   ❌ Düzeltme hatası: ${error.message}`);
              errorCount++;
            }
          } else {
            console.log(`   ⚠️  Fark küçük, düzeltilmedi`);
          }
        } else {
          console.log(`✅ İşlem ${i + 1}: ${tx.counterpartyName} - Doğru`);
        }
      } else {
        console.log(`⚠️  İşlem ${i + 1}: ${tx.counterpartyName} - Bakiye bilgisi yok`);
      }
    }
    
    // 3. Özet rapor
    console.log('\n📋 3. DÜZELTME ÖZETİ');
    console.log('='.repeat(50));
    console.log(`✅ Düzeltilen işlem: ${correctedCount}`);
    console.log(`❌ Düzeltme hatası: ${errorCount}`);
    console.log(`💰 Son hesaplanan bakiye: ${currentBalance} TL`);
    console.log(`📊 Başarı oranı: %${((correctedCount / (correctedCount + errorCount)) * 100).toFixed(1)}`);
    
    // 4. Doğrulama
    console.log('\n📋 4. DOĞRULAMA');
    console.log('='.repeat(50));
    
    const lastTransaction = transactions[transactions.length - 1];
    if (lastTransaction && lastTransaction.balanceAfter) {
      const finalDifference = Math.abs(currentBalance - lastTransaction.balanceAfter);
      console.log(`Son işlem bakiye farkı: ${finalDifference} TL`);
      
      if (finalDifference <= 1.0) {
        console.log('✅ Bakiye doğrulama başarılı!');
      } else {
        console.log('❌ Bakiye doğrulama başarısız!');
        console.log('💡 Daha fazla düzeltme gerekebilir');
      }
    }
    
    // 5. Öneriler
    console.log('\n💡 ÖNERİLER:');
    if (correctedCount > 0) {
      console.log('• Düzeltilen işlemlerin e-posta kaynaklarını kontrol edin');
      console.log('• Gelecekteki e-posta çekme işlemlerinde dikkatli olun');
      console.log('• Bakiye toleransını 1 TL olarak ayarlayın');
    } else {
      console.log('• Hiçbir işlem düzeltilmedi - manuel kontrol gerekebilir');
      console.log('• E-posta parse algoritmasını gözden geçirin');
      console.log('• Eksik işlemleri tespit edin');
    }
    
  } catch (error) {
    console.error('❌ Bakiye düzeltme hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  fixBalanceIssues()
    .then(() => {
      console.log('\n✅ Bakiye düzeltme tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Bakiye düzeltme hatası:', error);
      process.exit(1);
    });
}

module.exports = { fixBalanceIssues };
