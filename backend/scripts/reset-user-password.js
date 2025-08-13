const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetUserPassword() {
  try {
    console.log('🔐 Kullanıcı şifresi sıfırlanıyor...');
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Test kullanıcısının şifresini güncelle
    const updatedUser = await prisma.user.update({
      where: {
        username: 'testuser'
      },
      data: {
        password: hashedPassword
      }
    });
    
    console.log('✅ Kullanıcı şifresi güncellendi:');
    console.log(`   Username: ${updatedUser.username}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Yeni şifre: test123`);
    
  } catch (error) {
    console.error('❌ Şifre sıfırlama hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  resetUserPassword()
    .then(() => {
      console.log('✅ Şifre sıfırlama tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Şifre sıfırlama hatası:', error);
      process.exit(1);
    });
}

module.exports = { resetUserPassword };
