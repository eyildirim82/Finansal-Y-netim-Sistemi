const axios = require('axios');

async function testAPIWithAuth() {
  try {
    console.log('🧪 API Testi Başlıyor...\n');
    
    // Önce login yap
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login başarılı, token alındı');
    
    // Token ile müşteri listesini al
    const customersResponse = await axios.get('http://localhost:3001/api/customers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Müşteri listesi alındı');
    console.log(`📊 Toplam müşteri sayısı: ${customersResponse.data.data.length}`);
    console.log(`📄 Sayfalama bilgisi:`, customersResponse.data.pagination);
    
    if (customersResponse.data.data.length > 0) {
      console.log('\n📋 İlk 5 müşteri:');
      customersResponse.data.data.slice(0, 5).forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} - ${customer.phone || 'Telefon yok'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
  }
}

testAPIWithAuth();
