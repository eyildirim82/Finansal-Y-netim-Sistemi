const axios = require('axios');

async function testPDFTransactionsEndpoint() {
  try {
    console.log('🔍 PDF Transactions endpoint test başlatılıyor...');
    
    const response = await axios.get('http://localhost:3000/api/banking/pdf-transactions');
    
    console.log('✅ Endpoint çalışıyor!');
    console.log('📊 Response:', {
      success: response.data.success,
      totalTransactions: response.data.data?.transactions?.length || 0,
      pagination: response.data.data?.pagination
    });
    
    if (response.data.data?.transactions?.length > 0) {
      console.log('📋 İlk işlem örneği:');
      const firstTx = response.data.data.transactions[0];
      console.log({
        id: firstTx.id,
        dateTimeIso: firstTx.dateTimeIso,
        description: firstTx.description?.substring(0, 50) + '...',
        debit: firstTx.debit,
        credit: firstTx.credit,
        balance: firstTx.balance,
        category: firstTx.category
      });
    }
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testPDFTransactionsEndpoint();
