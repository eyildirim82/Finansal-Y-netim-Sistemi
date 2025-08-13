const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('👤 Test kullanıcısı oluşturuluyor...');
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Test kullanıcısını oluştur
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        isActive: true
      }
    });
    
    console.log('✅ Test kullanıcısı oluşturuldu:');
    console.log(`   Username: ${testUser.username}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Şifre: test123`);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ Test kullanıcısı zaten mevcut');
    } else {
      console.error('❌ Test kullanıcısı oluşturma hatası:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('✅ Test kullanıcısı işlemi tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test kullanıcısı hatası:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser }; 