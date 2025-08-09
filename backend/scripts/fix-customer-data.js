const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Şirket anahtar kelimeleri
const companyKeywords = [
  'A.Ş.', 'ANONİM ŞİRKETİ', 'LTD.ŞTİ.', 'LİMİTED ŞİRKETİ', 
  'SAN.', 'SANAYİ', 'TİC.', 'TİCARET', 'ŞİRKETİ', 'ŞTİ.',
  'A.Ş', 'LTD', 'LİMİTED', 'SAN', 'TİC'
];

// Müşteri tipini belirle
function determineCustomerType(name) {
  if (!name) return 'INDIVIDUAL';
  
  const nameUpper = name.toUpperCase();
  return companyKeywords.some(keyword => nameUpper.includes(keyword)) 
    ? 'CORPORATE' 
    : 'INDIVIDUAL';
}

// Telefon numarasını temizle
function cleanPhone(phone) {
  if (!phone || phone === 'Telefon' || phone.length < 5) {
    return null;
  }
  return phone.trim();
}

async function fixCustomerData() {
  try {
    console.log('🔧 Müşteri verileri düzeltiliyor...\n');
    
    const customers = await prisma.customer.findMany();
    console.log(`📊 Toplam ${customers.length} müşteri bulundu\n`);

    let updatedCount = 0;
    let phoneFixedCount = 0;
    let typeFixedCount = 0;

    for (const customer of customers) {
      let needsUpdate = false;
      const updateData = {};

      // Telefon numarasını düzelt
      const cleanPhoneNumber = cleanPhone(customer.phone);
      if (cleanPhoneNumber !== customer.phone) {
        updateData.phone = cleanPhoneNumber;
        phoneFixedCount++;
        needsUpdate = true;
      }

      // Müşteri tipini düzelt
      const correctType = determineCustomerType(customer.name);
      if (correctType !== customer.type) {
        updateData.type = correctType;
        typeFixedCount++;
        needsUpdate = true;
      }

      // Güncelleme yap
      if (needsUpdate) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: updateData
        });
        updatedCount++;
        
        console.log(`✅ ${customer.name}`);
        if (updateData.phone !== undefined) {
          console.log(`   📞 Telefon: "${customer.phone}" → "${updateData.phone}"`);
        }
        if (updateData.type !== undefined) {
          console.log(`   🏢 Tip: "${customer.type}" → "${updateData.type}"`);
        }
        console.log('');
      }
    }

    console.log('📊 Düzeltme Özeti:');
    console.log(`   🔧 Toplam güncellenen müşteri: ${updatedCount}`);
    console.log(`   📞 Telefon düzeltilen: ${phoneFixedCount}`);
    console.log(`   🏢 Tip düzeltilen: ${typeFixedCount}`);
    console.log('\n✅ Müşteri verileri düzeltme işlemi tamamlandı!');

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCustomerData();
