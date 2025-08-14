const axios = require('axios');

async function testAPIDetailed() {
  try {
    console.log('🧪 Detaylı API Testi Başlıyor...\n');
    
    // Önce login yap
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login başarılı, token alındı');
    console.log('📋 Login yanıtı:', JSON.stringify(loginResponse.data, null, 2));
    
    // Token ile müşteri listesini al
    const customersResponse = await axios.get('http://localhost:3001/api/customers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Müşteri listesi alındı');
    console.log('📋 Müşteri yanıtı:', JSON.stringify(customersResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
    if (error.response) {
      console.error('📋 Hata yanıtı:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPIDetailed();
