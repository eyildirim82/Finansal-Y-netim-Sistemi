const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('👤 Admin kullanıcısı oluşturuluyor...');
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Admin kullanıcısını oluştur
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@finansal.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
    
    console.log('✅ Admin kullanıcısı oluşturuldu:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Şifre: admin123`);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ Admin kullanıcısı zaten mevcut');
      
      // Mevcut admin kullanıcısını güncelle
      const updatedUser = await prisma.user.update({
        where: { username: 'admin' },
        data: {
          password: await bcrypt.hash('admin123', 10),
          role: 'ADMIN',
          isActive: true
        }
      });
      
      console.log('✅ Admin kullanıcısı güncellendi:');
      console.log(`   Username: ${updatedUser.username}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Yeni şifre: admin123`);
      
    } else {
      console.error('❌ Admin kullanıcısı oluşturma hatası:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Script'i çalıştır
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Admin kullanıcısı işlemi tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin kullanıcısı hatası:', error);
      process.exit(1);
    });
}

module.exports = { createAdminUser };
