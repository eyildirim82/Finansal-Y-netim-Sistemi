const axios = require('axios');

async function testAPIWithAuth() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  const username = process.env.TEST_USERNAME || 'admin';
  const password = process.env.TEST_PASSWORD;

  if (!password) {
    throw new Error('TEST_PASSWORD environment variable is required.');
  }

  try {
    console.log('🧪 API Testi Başlıyor...\n');

    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      username,
      password
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login başarılı, token alındı');

    const customersResponse = await axios.get(`${baseUrl}/api/customers`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Müşteri listesi alındı');
    console.log(`📊 Toplam müşteri sayısı: ${customersResponse.data.data.length}`);
    console.log('📄 Sayfalama bilgisi:', customersResponse.data.pagination);

    if (customersResponse.data.data.length > 0) {
      console.log('\n📋 İlk 5 müşteri:');
      customersResponse.data.data.slice(0, 5).forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} - ${customer.phone || 'Telefon yok'}`);
      });
    }
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
    process.exitCode = 1;
  }
}

testAPIWithAuth();
