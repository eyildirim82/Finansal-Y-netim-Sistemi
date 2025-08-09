const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTransactions() {
  try {
    console.log('🔍 İşlem verileri kontrol ediliyor...\n');
    
    // Tüm işlemleri say
    const totalTransactions = await prisma.transaction.count();
    console.log(`📊 Toplam işlem sayısı: ${totalTransactions}`);
    
    // Ekstre işlemlerini say
    const totalExtractTransactions = await prisma.extractTransaction.count();
    console.log(`📊 Toplam ekstre işlem sayısı: ${totalExtractTransactions}`);
    
    // Müşteri sayısı
    const totalCustomers = await prisma.customer.count();
    console.log(`📊 Toplam müşteri sayısı: ${totalCustomers}`);
    
    // Ekstre sayısı
    const totalExtracts = await prisma.extract.count();
    console.log(`📊 Toplam ekstre sayısı: ${totalExtracts}\n`);
    
    if (totalExtractTransactions > 0) {
      console.log('📋 Son 5 ekstre işlemi:');
      const recentTransactions = await prisma.extractTransaction.findMany({
        take: 5,
        include: {
          customer: true,
          extract: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      recentTransactions.forEach((tx, index) => {
        console.log(`${index + 1}. ${tx.customer?.name || 'Bilinmeyen'} - ${tx.debit || 0} / ${tx.credit || 0} - ${tx.date}`);
      });
    }
    
    if (totalExtracts > 0) {
      console.log('\n📋 Ekstreler:');
      const extracts = await prisma.extract.findMany({
        take: 5,
        include: {
          _count: {
            select: {
              transactions: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      extracts.forEach((extract, index) => {
        console.log(`${index + 1}. ${extract.fileName} - ${extract.status} - ${extract._count.transactions} işlem`);
      });
    }
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransactions();
