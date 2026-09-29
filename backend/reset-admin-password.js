const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdminPassword() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const newPassword = process.env.ADMIN_PASSWORD;

  if (!newPassword) {
    throw new Error('ADMIN_PASSWORD environment variable is required.');
  }

  try {
    console.log('🔐 Admin şifresi sıfırlanıyor...\n');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { username },
      data: { password: hashedPassword }
    });

    console.log('✅ Admin şifresi başarıyla sıfırlandı!');
    console.log(`👤 Kullanıcı: ${updatedUser.username}`);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
