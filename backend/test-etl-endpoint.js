const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testETLEndpoint() {
  try {
    const filePath = 'uploads/pdf-1755020185337-353467719.pdf';
    
    if (!fs.existsSync(filePath)) {
      console.error('PDF dosyası bulunamadı:', filePath);
      return;
    }

    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(filePath));

    console.log('🔄 ETL endpoint test ediliyor...');
    
    const response = await axios.post('http://localhost:3001/api/banking/test-process-pdf-etl', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ ETL endpoint başarılı!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ ETL endpoint hatası:', error.response?.data || error.message);
  }
}

testETLEndpoint();
