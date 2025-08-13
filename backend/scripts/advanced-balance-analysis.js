const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function advancedBalanceAnalysis() {
  try {
    console.log('🔍 Gelişmiş Bakiye Analizi Başlatılıyor...');
    
    // Tüm işlemleri getir
    const transactions = await prisma.bankTransaction.findMany({
      orderBy: {
        transactionDate: 'asc'
      }
    });
    
    console.log(`📊 Toplam ${transactions.length} işlem analiz edilecek`);
    
    // 1. Başlangıç bakiyesi analizi
    console.log('\n📋 1. BAŞLANGIÇ BAKİYESİ ANALİZİ');
    console.log('='.repeat(60));
    
    const firstTransaction = transactions[0];
    if (firstTransaction && firstTransaction.balanceAfter) {
      const expectedStartBalance = firstTransaction.balanceAfter - 
        (firstTransaction.direction === 'IN' ? firstTransaction.amount : -firstTransaction.amount);
      
      console.log(`İlk işlem: ${firstTransaction.counterpartyName}`);
      console.log(`İşlem tutarı: ${firstTransaction.amount} TL (${firstTransaction.direction === 'IN' ? 'Gelen' : 'Giden'})`);
      console.log(`İşlem sonrası bakiye: ${firstTransaction.balanceAfter} TL`);
      console.log(`Hesaplanan başlangıç bakiyesi: ${expectedStartBalance} TL`);
      console.log(`Sistem başlangıç bakiyesi: 0 TL`);
      console.log(`Fark: ${expectedStartBalance} TL`);
    }
    
    // 2. Günlük analiz
    console.log('\n📋 2. GÜNLÜK ANALİZ');
    console.log('='.repeat(60));
    
    const dailyAnalysis = {};
    transactions.forEach(tx => {
      const date = tx.transactionDate.toISOString().split('T')[0];
      if (!dailyAnalysis[date]) {
        dailyAnalysis[date] = {
          transactions: [],
          totalIn: 0,
          totalOut: 0,
          startBalance: null,
          endBalance: null
        };
      }
      
      dailyAnalysis[date].transactions.push(tx);
      if (tx.direction === 'IN') {
        dailyAnalysis[date].totalIn += tx.amount;
      } else {
        dailyAnalysis[date].totalOut += tx.amount;
      }
      
      if (!dailyAnalysis[date].startBalance) {
        dailyAnalysis[date].startBalance = tx.balanceAfter - 
          (tx.direction === 'IN' ? tx.amount : -tx.amount);
      }
      dailyAnalysis[date].endBalance = tx.balanceAfter;
    });
    
    Object.keys(dailyAnalysis).slice(0, 5).forEach(date => {
      const day = dailyAnalysis[date];
      console.log(`\n📅 ${date}:`);
      console.log(`   İşlem sayısı: ${day.transactions.length}`);
      console.log(`   Toplam gelen: ${day.totalIn} TL`);
      console.log(`   Toplam giden: ${day.totalOut} TL`);
      console.log(`   Net: ${day.totalIn - day.totalOut} TL`);
      console.log(`   Başlangıç bakiyesi: ${day.startBalance} TL`);
      console.log(`   Bitiş bakiyesi: ${day.endBalance} TL`);
      console.log(`   Hesaplanan değişim: ${day.endBalance - day.startBalance} TL`);
      console.log(`   Gerçek değişim: ${day.totalIn - day.totalOut} TL`);
      
      const diff = Math.abs((day.endBalance - day.startBalance) - (day.totalIn - day.totalOut));
      if (diff > 0.01) {
        console.log(`   ❌ Fark: ${diff} TL`);
      } else {
        console.log(`   ✅ Doğru`);
      }
    });
    
    // 3. Bakiye farklarının analizi
    console.log('\n📋 3. BAKİYE FARKLARININ ANALİZİ');
    console.log('='.repeat(60));
    
    let currentBalance = 0;
    const differences = [];
    
    transactions.forEach((tx, index) => {
      if (tx.direction === 'IN') {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      
      if (tx.balanceAfter) {
        const diff = tx.balanceAfter - currentBalance;
        differences.push({
          index,
          transaction: tx,
          difference: diff,
          percentage: Math.abs(diff / tx.balanceAfter * 100)
        });
      }
    });
    
    // Farkları analiz et
    const avgDifference = differences.reduce((sum, d) => sum + Math.abs(d.difference), 0) / differences.length;
    const maxDifference = Math.max(...differences.map(d => Math.abs(d.difference)));
    const minDifference = Math.min(...differences.map(d => Math.abs(d.difference)));
    
    console.log(`Ortalama fark: ${avgDifference.toFixed(2)} TL`);
    console.log(`En büyük fark: ${maxDifference.toFixed(2)} TL`);
    console.log(`En küçük fark: ${minDifference.toFixed(2)} TL`);
    
    // En büyük farkları göster
    console.log('\nEn büyük farklar:');
    differences
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 5)
      .forEach((diff, index) => {
        console.log(`${index + 1}. ${diff.transaction.counterpartyName} (${diff.transaction.transactionDate.toLocaleDateString('tr-TR')})`);
        console.log(`   Fark: ${diff.difference.toFixed(2)} TL (%${diff.percentage.toFixed(2)})`);
      });
    
    // 4. Öneriler
    console.log('\n📋 4. ÇÖZÜM ÖNERİLERİ');
    console.log('='.repeat(60));
    
    if (avgDifference > 100) {
      console.log('🔴 YÜKSEK ÖNCELİK:');
      console.log('• Başlangıç bakiyesi yanlış - düzeltilmeli');
      console.log('• Eksik işlemler olabilir - e-posta arşivi kontrol edilmeli');
      console.log('• İşlem sırası karışmış olabilir - tarih/saat kontrol edilmeli');
    } else if (avgDifference > 10) {
      console.log('🟡 ORTA ÖNCELİK:');
      console.log('• Küçük tutarsızlıklar var - tolerans artırılabilir');
      console.log('• Komisyon/havale ücretleri eksik olabilir');
    } else {
      console.log('🟢 DÜŞÜK ÖNCELİK:');
      console.log('• Sistem genel olarak doğru çalışıyor');
      console.log('• Küçük yuvarlama farkları normal');
    }
    
    console.log('\n💡 GENEL ÖNERİLER:');
    console.log('• Başlangıç bakiyesini doğru ayarlayın');
    console.log('• E-posta çekme sırasını kontrol edin');
    console.log('• Eksik işlemleri tespit edin');
    console.log('• Bakiye toleransını artırın (örn: 1 TL)');
    
  } catch (error) {
    console.error('❌ Gelişmiş analiz hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  advancedBalanceAnalysis()
    .then(() => {
      console.log('\n✅ Gelişmiş analiz tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Gelişmiş analiz hatası:', error);
      process.exit(1);
    });
}

module.exports = { advancedBalanceAnalysis };
