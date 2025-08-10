const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCustomerDetail() {
  try {
    console.log('Müşteri detay sayfası fatura testi başlıyor...\n');
    
    // İlk müşteriyi al
    const customer = await prisma.customer.findFirst({
      where: {
        code: {
          not: {
            startsWith: 'MH'
          }
        }
      }
    });
    
    if (!customer) {
      console.log('Test için müşteri bulunamadı');
      return;
    }
    
    console.log(`Test müşterisi: ${customer.name} (${customer.code})\n`);
    
    // 1. Ödenmemiş faturalar (reportService.getCustomerUnpaidInvoicesSummary)
    console.log('1. Ödenmemiş Faturalar (reportService):');
    const unpaidInvoices = await prisma.extractTransaction.findMany({
      where: {
        customerId: customer.id,
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura', 'Satış Faturası', 'SATIŞ FATURASI', 'satış faturası']
        }
      },
      orderBy: { date: 'desc' }
    });
    console.log(`Bulunan ödenmemiş fatura sayısı: ${unpaidInvoices.length}`);
    
    // 2. Ödenmiş faturalar (reportService.getCustomerPaidInvoicesSummary)
    console.log('\n2. Ödenmiş Faturalar (reportService):');
    const paidInvoices = await prisma.extractTransaction.findMany({
      where: {
        customerId: customer.id,
        debit: { gt: 0 },
        documentType: {
          in: ['Fatura', 'FATURA', 'fatura', 'Satış Faturası', 'SATIŞ FATURASI', 'satış faturası']
        }
      },
      orderBy: { date: 'desc' }
    });
    console.log(`Bulunan ödenmiş fatura sayısı: ${paidInvoices.length}`);
    
    // 3. Tüm işlemler (customerService.getCustomer)
    console.log('\n3. Tüm İşlemler (customerService):');
    const allTransactions = await prisma.extractTransaction.findMany({
      where: {
        customerId: customer.id
      },
      orderBy: { date: 'desc' }
    });
    console.log(`Bulunan toplam işlem sayısı: ${allTransactions.length}`);
    
    // 4. Fatura olmayan işlemler
    console.log('\n4. Fatura Olmayan İşlemler:');
    const nonInvoiceTransactions = await prisma.extractTransaction.findMany({
      where: {
        customerId: customer.id,
        documentType: {
          notIn: ['Fatura', 'FATURA', 'fatura', 'Satış Faturası', 'SATIŞ FATURASI', 'satış faturası']
        }
      },
      orderBy: { date: 'desc' }
    });
    console.log(`Fatura olmayan işlem sayısı: ${nonInvoiceTransactions.length}`);
    
    // 5. Belge tiplerini listele
    console.log('\n5. Bu müşterinin belge tipleri:');
    const documentTypes = await prisma.extractTransaction.groupBy({
      by: ['documentType'],
      where: {
        customerId: customer.id
      },
      _count: {
        documentType: true
      }
    });
    
    documentTypes.forEach(dt => {
      console.log(`- ${dt.documentType || 'NULL'}: ${dt._count.documentType} adet`);
    });
    
    // 6. Örnek işlemler
    console.log('\n6. Son 5 işlem örneği:');
    const sampleTransactions = await prisma.extractTransaction.findMany({
      where: {
        customerId: customer.id
      },
      select: {
        id: true,
        date: true,
        description: true,
        debit: true,
        credit: true,
        documentType: true,
        voucherNo: true
      },
      orderBy: { date: 'desc' },
      take: 5
    });
    
    sampleTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.date} - ${tx.description}`);
      console.log(`   Belge: ${tx.documentType || 'NULL'}, Evrak: ${tx.voucherNo || 'NULL'}`);
      console.log(`   Debit: ${tx.debit}, Credit: ${tx.credit}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCustomerDetail();
