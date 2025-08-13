const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function detectMissingTransactions() {
  try {
    console.log('🔍 Eksik İşlem Tespiti Başlatılıyor...');
    
    // Tüm işlemleri getir
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: {
        transactionDate: 'asc'
      }
    });
    
    console.log(`📊 Toplam ${transactions.length} işlem analiz edilecek`);
    
    // 1. Başlangıç bakiyesini hesapla
    const firstTransaction = transactions[0];
    const startBalance = firstTransaction.balanceAfter - 
      (firstTransaction.direction === 'IN' ? firstTransaction.amount : -firstTransaction.amount);
    
    console.log(`\n💰 Başlangıç bakiyesi: ${startBalance} TL`);
    
    // 2. Her işlem için bakiye farkını hesapla
    let currentBalance = startBalance;
    const balanceGaps = [];
    
    console.log('\n📋 BAKİYE FARKLARI ANALİZİ');
    console.log('='.repeat(80));
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const prevBalance = currentBalance;
      
      // İşlem tutarını hesapla
      if (tx.direction === 'IN') {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      
      // Bakiye farkını hesapla
      if (tx.balanceAfter) {
        const difference = tx.balanceAfter - currentBalance;
        
        if (Math.abs(difference) > 1.0) { // 1 TL'den fazla fark
          balanceGaps.push({
            index: i,
            transaction: tx,
            expectedBalance: currentBalance,
            actualBalance: tx.balanceAfter,
            difference: difference,
            missingAmount: Math.abs(difference)
          });
          
          console.log(`\n❌ İşlem ${i + 1}: ${tx.counterpartyName}`);
          console.log(`   Tarih: ${tx.transactionDate.toLocaleDateString('tr-TR')} ${tx.transactionDate.toLocaleTimeString('tr-TR')}`);
          console.log(`   İşlem: ${tx.direction === 'IN' ? '+' : '-'}${tx.amount} TL`);
          console.log(`   Önceki bakiye: ${prevBalance} TL`);
          console.log(`   Hesaplanan bakiye: ${currentBalance} TL`);
          console.log(`   Gerçek bakiye: ${tx.balanceAfter} TL`);
          console.log(`   Fark: ${difference} TL`);
          
          // Eksik işlem tahmini
          if (Math.abs(difference) > 100) {
            console.log(`   🔍 Eksik işlem olabilir!`);
            console.log(`   💡 Tahmini eksik tutar: ${Math.abs(difference)} TL`);
            
            if (difference > 0) {
              console.log(`   📥 Eksik gelen işlem olabilir`);
            } else {
              console.log(`   📤 Eksik giden işlem olabilir`);
            }
          }
        }
      }
    }
    
    // 3. Eksik işlem analizi
    console.log('\n📋 EKSİK İŞLEM ANALİZİ');
    console.log('='.repeat(80));
    
    if (balanceGaps.length === 0) {
      console.log('✅ Hiç eksik işlem tespit edilmedi!');
      return;
    }
    
    // En büyük farkları analiz et
    const significantGaps = balanceGaps.filter(gap => Math.abs(gap.difference) > 100);
    
    console.log(`🔍 ${significantGaps.length} adet önemli bakiye farkı tespit edildi`);
    
    // Günlük analiz
    const dailyGaps = {};
    significantGaps.forEach(gap => {
      const date = gap.transaction.transactionDate.toISOString().split('T')[0];
      if (!dailyGaps[date]) {
        dailyGaps[date] = {
          gaps: [],
          totalDifference: 0,
          transactions: []
        };
      }
      dailyGaps[date].gaps.push(gap);
      dailyGaps[date].totalDifference += gap.difference;
    });
    
    console.log('\n📅 GÜNLÜK EKSİK İŞLEM ANALİZİ:');
    Object.keys(dailyGaps).forEach(date => {
      const day = dailyGaps[date];
      console.log(`\n📅 ${date}:`);
      console.log(`   Toplam fark: ${day.totalDifference} TL`);
      console.log(`   Fark sayısı: ${day.gaps.length}`);
      
      if (Math.abs(day.totalDifference) > 1000) {
        console.log(`   🔴 YÜKSEK ÖNCELİK: Bu günde ciddi eksiklik var!`);
        
        // Eksik işlem tahmini
        if (day.totalDifference > 0) {
          console.log(`   💡 Tahmini eksik gelen işlem: ${day.totalDifference} TL`);
        } else {
          console.log(`   💡 Tahmini eksik giden işlem: ${Math.abs(day.totalDifference)} TL`);
        }
      }
    });
    
    // 4. Eksik işlem tespiti
    console.log('\n📋 EKSİK İŞLEM TESPİTİ');
    console.log('='.repeat(80));
    
    const missingTransactions = [];
    
    for (let i = 0; i < significantGaps.length; i++) {
      const gap = significantGaps[i];
      const nextGap = significantGaps[i + 1];
      
      // Eğer bu fark bir sonraki işlemde düzeldiyse, aradaki işlemler eksik
      if (nextGap && Math.abs(gap.difference + nextGap.difference) < 100) {
        const missingAmount = gap.difference;
        const missingDirection = missingAmount > 0 ? 'IN' : 'OUT';
        
        missingTransactions.push({
          estimatedDate: gap.transaction.transactionDate,
          amount: Math.abs(missingAmount),
          direction: missingDirection,
          reason: 'Bakiye farkı düzeldi',
          confidence: 'Yüksek'
        });
        
        console.log(`\n🔍 Eksik işlem tespit edildi:`);
        console.log(`   Tarih: ${gap.transaction.transactionDate.toLocaleDateString('tr-TR')}`);
        console.log(`   Tutar: ${Math.abs(missingAmount)} TL`);
        console.log(`   Yön: ${missingDirection === 'IN' ? 'Gelen' : 'Giden'}`);
        console.log(`   Güven: Yüksek`);
      }
    }
    
    // 5. Öneriler
    console.log('\n📋 ÇÖZÜM ÖNERİLERİ');
    console.log('='.repeat(80));
    
    if (missingTransactions.length > 0) {
      console.log(`🔍 ${missingTransactions.length} eksik işlem tespit edildi`);
      
      console.log('\n💡 YAPILACAKLAR:');
      console.log('1. E-posta arşivini kontrol edin');
      console.log('2. Farklı e-posta klasörlerini kontrol edin');
      console.log('3. E-posta filtrelerini kontrol edin');
      console.log('4. Manuel olarak eksik işlemleri ekleyin');
      
      console.log('\n📧 E-POSTA KONTROL LİSTESİ:');
      console.log('• Spam klasörü');
      console.log('• Arşiv klasörü');
      console.log('• Silinen öğeler');
      console.log('• Farklı e-posta hesapları');
      console.log('• E-posta filtreleri');
      
    } else {
      console.log('⚠️  Eksik işlem tespit edilemedi');
      console.log('💡 Diğer olası nedenler:');
      console.log('• E-posta parse hatası');
      console.log('• Bakiye hesaplama hatası');
      console.log('• İşlem sırası karışıklığı');
      console.log('• Komisyon/havale ücretleri');
    }
    
    // 6. Detaylı rapor
    console.log('\n📋 DETAYLI RAPOR');
    console.log('='.repeat(80));
    
    const totalDifference = balanceGaps.reduce((sum, gap) => sum + Math.abs(gap.difference), 0);
    const avgDifference = totalDifference / balanceGaps.length;
    
    console.log(`Toplam bakiye farkı: ${totalDifference} TL`);
    console.log(`Ortalama fark: ${avgDifference} TL`);
    console.log(`En büyük fark: ${Math.max(...balanceGaps.map(g => Math.abs(g.difference)))} TL`);
    console.log(`En küçük fark: ${Math.min(...balanceGaps.map(g => Math.abs(g.difference)))} TL`);
    
    if (totalDifference > 10000) {
      console.log('\n🔴 KRİTİK: Toplam fark çok yüksek!');
      console.log('💡 Acil e-posta arşivi kontrolü gerekli');
    } else if (totalDifference > 1000) {
      console.log('\n🟡 UYARI: Toplam fark yüksek');
      console.log('💡 E-posta kontrolü önerilir');
    } else {
      console.log('\n🟢 NORMAL: Toplam fark kabul edilebilir');
      console.log('💡 Küçük yuvarlama farkları olabilir');
    }
    
  } catch (error) {
    console.error('❌ Eksik işlem tespiti hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  detectMissingTransactions()
    .then(() => {
      console.log('\n✅ Eksik işlem tespiti tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Eksik işlem tespiti hatası:', error);
      process.exit(1);
    });
}

module.exports = { detectMissingTransactions };
