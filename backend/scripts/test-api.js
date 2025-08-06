const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Test kullanıcı bilgileri
const TEST_USER = {
  username: 'admin',
  password: '123456'
};

let authToken = null;

async function testAPI() {
  console.log('🧪 API Entegrasyon Testi Başlıyor...\n');

  try {
    // 1. Health Check
    console.log('1️⃣ Health Check Testi...');
    const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log(`✅ Health Check: ${healthResponse.data.status}`);
    console.log(`   Version: ${healthResponse.data.version}\n`);

    // 2. Login Testi
    console.log('2️⃣ Login Testi...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    authToken = loginResponse.data.data.token;
    console.log(`✅ Login başarılı: ${loginResponse.data.data.user.username}`);
    console.log(`   Token: ${authToken.substring(0, 20)}...\n`);

    // Auth header'ı ayarla
    const authHeaders = {
      'Authorization': `Bearer ${authToken}`
    };

    // 3. Kullanıcı Profili Testi
    console.log('3️⃣ Kullanıcı Profili Testi...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, { headers: authHeaders });
    console.log(`✅ Profil: ${profileResponse.data.username} (${profileResponse.data.email})\n`);

    // 4. İşlemler Testi
    console.log('4️⃣ İşlemler Testi...');
    const transactionsResponse = await axios.get(`${API_BASE_URL}/transactions`, { 
      headers: authHeaders,
      params: { limit: 5 }
    });
    console.log(`✅ İşlemler: ${transactionsResponse.data.transactions.length} kayıt bulundu`);
    console.log(`   Toplam: ${transactionsResponse.data.total} işlem\n`);

    // 5. Müşteriler Testi
    console.log('5️⃣ Müşteriler Testi...');
    const customersResponse = await axios.get(`${API_BASE_URL}/customers`, { 
      headers: authHeaders,
      params: { limit: 5 }
    });
    console.log(`✅ Müşteriler: ${customersResponse.data.customers.length} kayıt bulundu`);
    console.log(`   Toplam: ${customersResponse.data.total} müşteri\n`);

    // 6. Kategoriler Testi
    console.log('6️⃣ Kategoriler Testi...');
    const categoriesResponse = await axios.get(`${API_BASE_URL}/categories`, { headers: authHeaders });
    console.log(`✅ Kategoriler: ${categoriesResponse.data.length} kategori bulundu\n`);

    // 7. Raporlar Testi
    console.log('7️⃣ Raporlar Testi...');
    const reportsResponse = await axios.get(`${API_BASE_URL}/reports/dashboard`, { headers: authHeaders });
    console.log(`✅ Dashboard raporu: ${reportsResponse.data.totalTransactions} işlem`);
    console.log(`   Gelir: ${reportsResponse.data.totalIncome} TL`);
    console.log(`   Gider: ${reportsResponse.data.totalExpense} TL\n`);

    // 8. Yeni İşlem Oluşturma Testi
    console.log('8️⃣ Yeni İşlem Oluşturma Testi...');
    const newTransaction = {
      type: 'EXPENSE',
      amount: 100.50,
      currency: 'TRY',
      description: 'API Test İşlemi',
      date: new Date().toISOString(),
      categoryId: categoriesResponse.data[0]?.id || null
    };

    const createResponse = await axios.post(`${API_BASE_URL}/transactions`, newTransaction, { headers: authHeaders });
    console.log(`✅ Yeni işlem oluşturuldu: ${createResponse.data.id}`);
    console.log(`   Tutar: ${createResponse.data.amount} ${createResponse.data.currency}\n`);

    // 9. İşlem Silme Testi
    console.log('9️⃣ İşlem Silme Testi...');
    await axios.delete(`${API_BASE_URL}/transactions/${createResponse.data.id}`, { headers: authHeaders });
    console.log(`✅ Test işlemi silindi\n`);

    console.log('🎉 Tüm API testleri başarıyla tamamlandı!');
    console.log('✅ Backend-Frontend entegrasyonu hazır!');

  } catch (error) {
    console.error('❌ API Test Hatası:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 Öneri: Kullanıcı girişi yapılamadı. Test kullanıcısı oluşturulmalı.');
    }
    
    if (error.response?.status === 500) {
      console.log('💡 Öneri: Backend sunucusu çalışmıyor olabilir.');
    }
  }
}

// Test'i çalıştır
testAPI(); 