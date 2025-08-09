const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCustomers() {
  try {
    console.log('🔍 Müşteri verileri kontrol ediliyor...\n');
    
    const customers = await prisma.customer.findMany({
      include: {
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            date: true
          }
        },
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

    console.log(`📊 Toplam ${customers.length} müşteri bulundu:\n`);

    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      
      // Ekstre işlemlerini de say
      const extractTransactionCount = await prisma.extractTransaction.count({
        where: { customerId: customer.id }
      });
      
      const totalTransactionCount = customer._count.transactions + extractTransactionCount;
      
      console.log(`${i + 1}. ${customer.name}`);
      console.log(`   📞 Telefon: ${customer.phone || 'Belirtilmemiş'}`);
      console.log(`   📍 Adres: ${customer.address || 'Belirtilmemiş'}`);
      console.log(`   🏢 Tip: ${customer.type}`);
      console.log(`   🏷️  Hesap Tipi: ${customer.accountType || 'Belirtilmemiş'}`);
      console.log(`   🏷️  Tag1: ${customer.tag1 || 'Belirtilmemiş'}`);
      console.log(`   🏷️  Tag2: ${customer.tag2 || 'Belirtilmemiş'}`);
      console.log(`   📊 İşlem Sayısı: ${totalTransactionCount} (${customer._count.transactions} manuel + ${extractTransactionCount} ekstre)`);
      console.log(`   💰 Toplam İşlem Tutarı: ${customer.transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} TL`);
      console.log(`   📅 Oluşturulma: ${customer.createdAt.toLocaleDateString('tr-TR')}`);
      console.log(`   🔄 Güncellenme: ${customer.updatedAt.toLocaleDateString('tr-TR')}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomers();
