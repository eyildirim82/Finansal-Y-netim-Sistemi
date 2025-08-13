const fs = require('fs');
const pdf = require('pdf-parse');

// Yapı Kredi PDF parser fonksiyonları
function isYapiKrediPDF(lines) {
  const yapiKrediIndicators = [
    'Yapı ve Kredi Bankası A.Ş.',
    'yapikredi.com.tr',
    'Müşteri Adı Soyadı:',
    'IBAN/Hesap No:',
    'TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye'
  ];
  
  const text = lines.join(' ');
  return yapiKrediIndicators.some(indicator => text.includes(indicator));
}

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

function parseAmount(amountStr) {
  return parseFloat(amountStr.replace(/[^\d.,]/g, '').replace(',', '.'));
}

function extractYapiKrediAccountInfo(lines) {
  const accountInfo = {};
  
  for (const line of lines) {
    // Müşteri adı
    if (line.includes('Müşteri Adı Soyadı:')) {
      const match = line.match(/Müşteri Adı Soyadı:(.+)/);
      if (match) {
        accountInfo.accountHolder = match[1].trim();
      }
    }
    
    // IBAN/Hesap No
    if (line.includes('IBAN/Hesap No:')) {
      const match = line.match(/IBAN\/Hesap No:(.+)/);
      if (match) {
        accountInfo.accountNumber = match[1].trim();
      }
    }
    
    // Tarih aralığı
    if (line.includes('Tarih Aralığı:')) {
      const match = line.match(/Tarih Aralığı:(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
      if (match) {
        accountInfo.startDate = parseDate(match[1]);
        accountInfo.endDate = parseDate(match[2]);
      }
    }
    
    // Kullanılabilir bakiye
    if (line.includes('Kullanılabilir Bakiye:')) {
      const match = line.match(/Kullanılabilir Bakiye:([\d\.,]+)\s*TL/);
      if (match) {
        accountInfo.endBalance = parseAmount(match[1]);
      }
    }
  }
  
  return accountInfo;
}

// Çok satırlı işlemleri birleştir
function mergeMultiLineTransactions(lines) {
  const mergedLines = [];
  let currentTransaction = '';
  let inTransactionSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // İşlem başlığı satırını tespit et
    if (line.includes('TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye')) {
      console.log(`✅ Yapı Kredi işlem başlığı bulundu`);
      inTransactionSection = true;
      mergedLines.push(line);
      continue;
    }
    
    // İşlem bölümünde değilse atla
    if (!inTransactionSection) {
      mergedLines.push(line);
      continue;
    }
    
    // Sayfa numarası satırını atla
    if (line.match(/^\d+\/\d+$/)) continue;
    
    // Boş satırları atla
    if (!line) continue;
    
    // Yeni işlem başlangıcı mı kontrol et (tarih ile başlayan satır)
    const isNewTransaction = /^\d{2}\/\d{2}\/\d{4}\d{2}:\d{2}:\d{2}/.test(line);
    
    if (isNewTransaction) {
      // Önceki işlemi kaydet
      if (currentTransaction) {
        mergedLines.push(currentTransaction);
      }
      // Yeni işlemi başlat
      currentTransaction = line;
    } else {
      // Mevcut işleme ekle
      if (currentTransaction) {
        currentTransaction += ' ' + line;
      }
    }
  }
  
  // Son işlemi ekle
  if (currentTransaction) {
    mergedLines.push(currentTransaction);
  }
  
  console.log(`🔗 ${mergedLines.length} satır birleştirildi`);
  return mergedLines;
}

function parseYapiKrediTransactionLine(line) {
  try {
    // Yapı Kredi formatı: TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye
    // Örnek: 11/08/202517:39:14Fatura ÖdemesiDiğer53206575 ISKI  SU-14,00 TL499,40 TL
    
    // Tarih ve saat
    const dateTimeMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})(\d{2}:\d{2}:\d{2})/);
    if (!dateTimeMatch) {
      console.log(`⚠️ Yapı Kredi tarih formatı bulunamadı: "${line}"`);
      return null;
    }
    
    const dateStr = dateTimeMatch[1];
    const timeStr = dateTimeMatch[2];
    const date = parseDate(dateStr);
    
    // Tarih ve saati satırdan çıkar
    let remainingLine = line.substring(dateTimeMatch[0].length);
    
    // Tutarları bul
    const amountMatches = remainingLine.match(/[\d\.,]+(?:\s*TL)?/g);
    if (!amountMatches || amountMatches.length < 2) {
      console.log(`⚠️ Yapı Kredi yeterli tutar bulunamadı: "${line}"`);
      return null;
    }
    
    // Son iki tutar: İşlem Tutarı ve Bakiye
    const transactionAmount = parseAmount(amountMatches[amountMatches.length - 2]);
    const balance = parseAmount(amountMatches[amountMatches.length - 1]);
    
    // Tutarları satırdan çıkar
    amountMatches.forEach(amount => {
      remainingLine = remainingLine.replace(amount, '');
    });
    
    // Açıklama kısmını temizle
    let description = remainingLine.trim();
    description = description.replace(/\s+/g, ' ').trim();
    
    // Çok kısa açıklamaları filtrele
    if (description.length < 3) {
      description = 'İşlem';
    }
    
    // Borç/Alacak belirleme
    let debit = 0;
    let credit = 0;
    
    if (transactionAmount > 0) {
      // Pozitif tutar genellikle alacak (gelen para)
      credit = transactionAmount;
    } else {
      // Negatif tutar genellikle borç (giden para)
      debit = Math.abs(transactionAmount);
    }
    
    return {
      date,
      description: description || 'İşlem',
      debit,
      credit,
      balance,
      time: timeStr
    };
    
  } catch (error) {
    console.log(`⚠️ Yapı Kredi işlem satırı parse edilemedi: ${line} - Hata: ${error.message}`);
    return null;
  }
}

function parseYapiKrediTransactions(lines) {
  const transactions = [];
  let inTransactionSection = false;
  
  console.log(`🔍 Yapı Kredi işlemleri analiz ediliyor...`);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // İşlem başlığı satırını tespit et
    if (line.includes('TarihSaatİşlemKanalAçıklamaİşlem TutarıBakiye')) {
      console.log(`✅ Yapı Kredi işlem başlığı bulundu`);
      inTransactionSection = true;
      continue;
    }
    
    // İşlem bölümünde değilse atla
    if (!inTransactionSection) continue;
    
    // Sayfa numarası satırını atla
    if (line.match(/^\d+\/\d+$/)) continue;
    
    // Boş satırları atla
    if (!line) continue;
    
    // İşlem satırını parse et
    const transaction = parseYapiKrediTransactionLine(line);
    if (transaction) {
      console.log(`✅ Yapı Kredi işlem parse edildi: ${transaction.date.toLocaleDateString()} - ${transaction.description}`);
      transactions.push(transaction);
    }
  }
  
  return transactions;
}

async function testYapiKrediParser() {
  try {
    // PDF dosyasını oku
    const dataBuffer = fs.readFileSync('Hesap_Hareketleri_CAFER_ACAR_20250812_170538628.pdf');
    const data = await pdf(dataBuffer);
    
    // Metni satırlara böl
    const lines = data.text.split('\n').filter(line => line.trim());
    
    console.log('📄 PDF içeriği okundu');
    
    // Yapı Kredi PDF'i mi kontrol et
    if (!isYapiKrediPDF(lines)) {
      console.log('❌ Bu Yapı Kredi PDF değil');
      return;
    }
    
    console.log('🏦 Yapı Kredi PDF formatı tespit edildi');
    
    // Hesap bilgilerini çıkar
    const accountInfo = extractYapiKrediAccountInfo(lines);
    console.log('\n🏦 Hesap Bilgileri:');
    console.log('Müşteri:', accountInfo.accountHolder);
    console.log('IBAN:', accountInfo.accountNumber);
    console.log('Başlangıç Tarihi:', accountInfo.startDate);
    console.log('Bitiş Tarihi:', accountInfo.endDate);
    console.log('Bitiş Bakiyesi:', accountInfo.endBalance);
    
    // Çok satırlı işlemleri birleştir
    const mergedLines = mergeMultiLineTransactions(lines);
    
    // İşlemleri parse et
    const transactions = parseYapiKrediTransactions(mergedLines);
    
    // İşlemleri tarihe göre sırala
    const sortedTransactions = transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log(`\n📊 Toplam ${sortedTransactions.length} işlem bulundu`);
    
    console.log('\n💳 İlk 10 İşlem:');
    sortedTransactions.slice(0, 10).forEach((tx, index) => {
      console.log(`${index + 1}. ${tx.date.toLocaleDateString('tr-TR')} ${tx.time} - ${tx.description}`);
      console.log(`   ${tx.debit > 0 ? 'Borç:' + tx.debit.toLocaleString('tr-TR') : 'Alacak:' + tx.credit.toLocaleString('tr-TR')} - Bakiye: ${tx.balance.toLocaleString('tr-TR')} TL`);
    });
    
    // Özet hesapla
    const totalDebit = sortedTransactions.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = sortedTransactions.reduce((sum, tx) => sum + tx.credit, 0);
    
    console.log('\n📈 Özet:');
    console.log('Toplam Borç:', totalDebit.toLocaleString('tr-TR'), 'TL');
    console.log('Toplam Alacak:', totalCredit.toLocaleString('tr-TR'), 'TL');
    console.log('Net:', (totalCredit - totalDebit).toLocaleString('tr-TR'), 'TL');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testYapiKrediParser();
