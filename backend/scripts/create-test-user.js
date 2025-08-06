const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      },
      create: {
        username: 'admin',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true
      }
    });
    
    console.log('✅ Test kullanıcısı başarıyla oluşturuldu:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Şifre: 123456`);
    console.log(`   Rol: ${user.role}`);
    
  } catch (error) {
    console.error('❌ Test kullanıcısı oluşturma hatası:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser(); 