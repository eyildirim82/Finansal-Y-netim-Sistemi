const axios = require('axios');

async function testAPI() {
  try {
    console.log('🔍 API test ediliyor...');
    
    // Önce login olalım
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'testuser',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login başarılı');
    
    // Eksik işlemler API'sini test et
    console.log('\n🔍 Eksik işlemler API test ediliyor...');
    const missingTransactionsResponse = await axios.get('http://localhost:3001/api/banking/missing-transactions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Missing Transactions Response:', JSON.stringify(missingTransactionsResponse.data, null, 2));
    
    const missingData = missingTransactionsResponse.data.data;
    if (missingData) {
      console.log(`\n📈 Özet:`);
      console.log(`   Toplam fark: ${missingData.summary?.totalDifference?.toLocaleString('tr-TR')} TL`);
      console.log(`   Kritik sorunlar: ${missingData.summary?.criticalIssues || 0}`);
      console.log(`   Eksik günler: ${missingData.summary?.missingTransactionsCount || 0}`);
      console.log(`   Durum: ${missingData.summary?.severity || 'Bilinmiyor'}`);
      
      if (missingData.missingTransactions && missingData.missingTransactions.length > 0) {
        console.log(`\n📅 Eksik İşlem Detayları:`);
        missingData.missingTransactions.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.date}: ${item.estimatedAmount.toLocaleString('tr-TR')} TL (${item.direction === 'IN' ? 'Gelen' : 'Giden'})`);
        });
      }
    }
    
    // Transactions API'sini de test et
    console.log('\n🔍 Transactions API test ediliyor...');
    const transactionsResponse = await axios.get('http://localhost:3001/api/banking/transactions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const transactions = transactionsResponse.data.data?.transactions || [];
    console.log(`📊 Toplam işlem sayısı: ${transactions.length}`);
    
    // Ağustos ayı işlemlerini filtrele
    const augustTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate.getMonth() === 7 && txDate.getFullYear() === 2025; // Ağustos 2025
    });
    
    console.log(`📅 Ağustos ayı işlem sayısı: ${augustTransactions.length}`);
    
    if (augustTransactions.length > 0) {
      console.log('\n📋 Ağustos İşlemleri:');
      augustTransactions.slice(0, 5).forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.counterpartyName} - ${tx.amount} TL (${tx.direction === 'IN' ? 'Gelen' : 'Giden'})`);
        if (tx.balanceAfter) {
          console.log(`      Bakiye: ${tx.balanceAfter.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ API test hatası:', error.response?.data || error.message);
  }
}

// Test'i çalıştır
testAPI()
  .then(() => {
    console.log('\n✅ API test tamamlandı');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ API test hatası:', error);
    process.exit(1);
  }); 