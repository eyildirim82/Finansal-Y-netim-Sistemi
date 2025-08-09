const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCustomerData() {
  try {
    // Admin kullanıcısını bul
    const user = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    });
    
    if (!user) {
      console.log('Admin kullanıcısı bulunamadı!');
      return;
    }
    
    console.log('Admin kullanıcısı bulundu:', user.email);
    
    // Tüm müşterileri admin kullanıcısına ata
    const result = await prisma.customer.updateMany({
      data: { userId: user.id }
    });
    
    console.log(`${result.count} müşteri güncellendi`);
    
    // Kontrol et
    const totalCustomers = await prisma.customer.count();
    const userCustomers = await prisma.customer.count({
      where: { userId: user.id }
    });
    
    console.log(`Toplam müşteri: ${totalCustomers}`);
    console.log(`Admin kullanıcısına ait müşteri: ${userCustomers}`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomerData();
