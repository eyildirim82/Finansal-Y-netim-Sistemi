const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestPhones() {
  try {
    console.log('Test telefon bilgileri ekleniyor...\n');
    
    // İlk 5 müşteriye test telefon numaraları ekle
    const testPhones = [
      { name: 'MLK ISTANBUL ORTAK SAGLIK VE GÜVENLIK BIRIMI DANISMANLIK VE EGITIM HIZMETLERI İNŞAAT SANAYİ LİMİTED ŞİRKETİ', phone: '0216 123 45 67' },
      { name: 'İNNOVATİVE OTOMASYON ELEKTRİK MALZEMELERİ SANAYİ VE TİCARET LİMİTED ŞİRKETİ', phone: '0216 234 56 78' },
      { name: 'TEKNOSA İÇ VE DIŞ TİCARET ANONİM ŞİRKETİ', phone: '0216 345 67 89' },
      { name: 'SINIRLI SORUMLU MUTFAKÇILAR SANAYİ TOPLU İŞYERİ YAPI KOOPERATİFİ', phone: '0216 456 78 90' },
      { name: 'GPN BİLGİ TEKNOLOJİLERİ SANAYİ VE TİCARET ANONİM ŞİRKETİ', phone: '0216 567 89 01' }
    ];
    
    let updatedCount = 0;
    
    for (const testPhone of testPhones) {
      const customer = await prisma.customer.findFirst({
        where: {
          name: testPhone.name
        }
      });
      
      if (customer && !customer.phone) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { phone: testPhone.phone }
        });
        
        console.log(`✓ ${customer.name}`);
        console.log(`  Telefon: ${testPhone.phone}`);
        updatedCount++;
      } else if (customer && customer.phone) {
        console.log(`- ${customer.name} (zaten telefon var: ${customer.phone})`);
      } else {
        console.log(`- ${testPhone.name} (müşteri bulunamadı)`);
      }
    }
    
    console.log(`\nToplam ${updatedCount} müşterinin telefon bilgisi güncellendi`);
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPhones();
