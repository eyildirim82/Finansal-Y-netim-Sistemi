const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simpleTest() {
  try {
    console.log('Basit test başlıyor...');
    
    // Eski filtreleme
    const oldCount = await prisma.extractTransaction.count({
      where: {
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura']
        }
      }
    });
    
    // Yeni filtreleme
    const newCount = await prisma.extractTransaction.count({
      where: {
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura', 'Satış Faturası', 'SATIŞ FATURASI', 'satış faturası']
        }
      }
    });
    
    console.log(`Eski filtreleme: ${oldCount} fatura`);
    console.log(`Yeni filtreleme: ${newCount} fatura`);
    console.log(`Fark: ${newCount - oldCount} fatura daha bulundu`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simpleTest();
