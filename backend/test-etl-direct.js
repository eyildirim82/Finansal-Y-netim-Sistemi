const { processPDFToDatabase } = require('./src/modules/banking/etlService.ts');

async function testETLDirect() {
  try {
    const filePath = 'uploads/pdf-1755020185337-353467719.pdf';
    console.log('🔄 ETL service doğrudan test ediliyor...');
    
    const result = await processPDFToDatabase(filePath);
    
    console.log('✅ ETL service sonucu:', result);
    
  } catch (error) {
    console.error('❌ ETL service hatası:', error);
  }
}

testETLDirect();
