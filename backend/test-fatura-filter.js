const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFaturaFilter() {
  try {
    console.log('Fatura filtreleme testi...\n');
    
    // Eski filtreleme (sadece 'Fatura')
    console.log('1. Eski filtreleme (sadece "Fatura"):');
    const oldFilter = await prisma.extractTransaction.findMany({
      where: {
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura']
        }
      },
      select: {
        id: true,
        documentType: true,
        description: true,
        debit: true,
        customer: {
          select: {
            name: true
          }
        }
      },
      take: 5
    });
    
    console.log(`Bulunan fatura sayısı: ${oldFilter.length}`);
    oldFilter.forEach(f => {
      console.log(`- ${f.documentType}: ${f.description} (${f.debit}) - ${f.customer?.name}`);
    });
    
    console.log('\n2. Yeni filtreleme ("Satış Faturası" dahil):');
    const newFilter = await prisma.extractTransaction.findMany({
      where: {
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura', 'Satış Faturası', 'SATIŞ FATURASI', 'satış faturası']
        }
      },
      select: {
        id: true,
        documentType: true,
        description: true,
        debit: true,
        customer: {
          select: {
            name: true
          }
        }
      },
      take: 5
    });
    
    console.log(`Bulunan fatura sayısı: ${newFilter.length}`);
    newFilter.forEach(f => {
      console.log(`- ${f.documentType}: ${f.description} (${f.debit}) - ${f.customer?.name}`);
    });
    
    // Toplam sayıları karşılaştır
    const oldCount = await prisma.extractTransaction.count({
      where: {
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura']
        }
      }
    });
    
    const newCount = await prisma.extractTransaction.count({
      where: {
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura', 'Satış Faturası', 'SATIŞ FATURASI', 'satış faturası']
        }
      }
    });
    
    console.log(`\n3. Toplam sayılar:`);
    console.log(`Eski filtreleme: ${oldCount} fatura`);
    console.log(`Yeni filtreleme: ${newCount} fatura`);
    console.log(`Fark: ${newCount - oldCount} fatura daha bulundu`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFaturaFilter();
