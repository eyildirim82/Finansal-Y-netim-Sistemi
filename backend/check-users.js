const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        username: true, 
        role: true,
        isActive: true 
      }
    });
    
    console.log('Mevcut kullanıcılar:');
    console.log(JSON.stringify(users, null, 2));
    
    if (users.length === 0) {
      console.log('Hiç kullanıcı yok! Test kullanıcısı oluşturuluyor...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const newUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@test.com',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true
        }
      });
      
      console.log('Test kullanıcısı oluşturuldu:', newUser.email);
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
