const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required.');
  }

  try {
    console.log('👤 Admin kullanıcısı oluşturuluyor...');

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await prisma.user.create({
      data: {
        username,
        email,
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
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️ Admin kullanıcısı zaten mevcut');

      const updatedUser = await prisma.user.update({
        where: { username },
        data: {
          password: await bcrypt.hash(password, 10),
          role: 'ADMIN',
          isActive: true
        }
      });

      console.log('✅ Admin kullanıcısı güncellendi:');
      console.log(`   Username: ${updatedUser.username}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Role: ${updatedUser.role}`);
    } else {
      console.error('❌ Admin kullanıcısı oluşturma hatası:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Admin kullanıcısı işlemi tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin kullanıcısı hatası:', error.message);
      process.exit(1);
    });
}

module.exports = { createAdminUser };
