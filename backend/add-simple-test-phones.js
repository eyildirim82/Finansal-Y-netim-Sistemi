const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSimpleTestPhones() {
  try {
    console.log('Basit test telefon bilgileri ekleniyor...\n');
    
    // İlk 3 müşteriye telefon ekle
    const customers = await prisma.customer.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    
    const testPhones = ['0216 111 11 11', '0216 222 22 22', '0216 333 33 33'];
    
    for (let i = 0; i < customers.length; i++) {
      const customer = customers[i];
      const phone = testPhones[i];
      
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phone: phone }
      });
      
      console.log(`✓ ${customer.name}`);
      console.log(`  Telefon: ${phone}`);
    }
    
    console.log(`\nToplam ${customers.length} müşterinin telefon bilgisi eklendi`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSimpleTestPhones();
