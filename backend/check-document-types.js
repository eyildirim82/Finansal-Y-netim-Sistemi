const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDocumentTypes() {
  try {
    console.log('Belge tiplerini kontrol ediliyor...');
    
    const documentTypes = await prisma.extractTransaction.groupBy({
      by: ['documentType'],
      _count: {
        documentType: true
      }
    });
    
    console.log('Mevcut belge tipleri:');
    documentTypes.forEach(dt => {
      console.log(`- ${dt.documentType || 'NULL'}: ${dt._count.documentType} adet`);
    });
    
    // Örnek faturaları göster
    console.log('\nÖrnek faturalar:');
    const sampleInvoices = await prisma.extractTransaction.findMany({
      where: {
        debit: { gt: 0 }
      },
      select: {
        id: true,
        documentType: true,
        description: true,
        debit: true,
        date: true,
        customer: {
          select: {
            name: true,
            code: true
          }
        }
      },
      take: 5
    });
    
    sampleInvoices.forEach(invoice => {
      console.log(`- ID: ${invoice.id}, Belge: ${invoice.documentType}, Açıklama: ${invoice.description}, Tutar: ${invoice.debit}, Müşteri: ${invoice.customer?.name}`);
    });
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocumentTypes();
