const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('👥 Kullanıcılar kontrol ediliyor...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Toplam ${users.length} kullanıcı bulundu`);
    
    if (users.length > 0) {
      console.log('\n📋 Kullanıcılar:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.username} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Aktif: ${user.isActive ? '✅' : '❌'}`);
        console.log(`   Oluşturulma: ${user.createdAt.toLocaleDateString('tr-TR')}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Kullanıcı kontrol hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  checkUsers()
    .then(() => {
      console.log('✅ Kullanıcı kontrolü tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Kullanıcı kontrolü hatası:', error);
      process.exit(1);
    });
}

module.exports = { checkUsers };
