const axios = require('axios');

async function testAPIDetailed() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  const username = process.env.TEST_USERNAME || 'admin';
  const password = process.env.TEST_PASSWORD;

  if (!password) {
    throw new Error('TEST_PASSWORD environment variable is required.');
  }

  try {
    console.log('🧪 Detaylı API Testi Başlıyor...\n');

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

    console.log('\n✅ Müşteri listesi alındı');
    console.log('📋 Müşteri yanıtı:', JSON.stringify(customersResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
    if (error.response) {
      console.error('📋 Hata yanıtı:', JSON.stringify(error.response.data, null, 2));
    }
    process.exitCode = 1;
  }
}

testAPIDetailed();
