# 🏦 Banka Modülü - Yapıkredi Email Parse Sistemi

Bu modül, Yapıkredi bankasından gelen FAST, HAVALE ve EFT email bildirimlerini otomatik olarak parse eder ve finansal yönetim sistemine entegre eder.

## 🚀 Özellikler

### 📧 Email İşleme
- **Yapıkredi FAST/HAVALE/EFT** email parsing
- **Otomatik direction tespiti** (Gelen/Giden)
- **IMAP bağlantısı** ile email çekme
- **Batch processing** ile performans optimizasyonu
- **Duplikasyon kontrolü** ile tekrar işleme önleme

### 🔄 Otomatik İşlemler
- **Realtime monitoring** ile anlık email takibi
- **Otomatik eşleştirme** ile müşteri ödemelerini eşleştirme
- **Tarih aralığı email çekme** ile geçmiş verileri alma
- **Email istatistikleri** ile performans takibi

### ⚙️ Yönetim
- **Email ayarları** yönetimi
- **Bağlantı testi** ile sistem kontrolü
- **Performance metrics** ile sistem performansı
- **Hata loglama** ile sorun tespiti

## 📋 Kurulum

### 1. Environment Variables

`.env` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# Email Ayarları
EMAIL_HOST=imap.yapikredi.com.tr
EMAIL_PORT=993
EMAIL_USER=your-email@yapikredi.com.tr
EMAIL_PASS=your-email-password

# Email İşleme Ayarları
EMAIL_BATCH_SIZE=10
EMAIL_CONCURRENCY_LIMIT=5
EMAIL_TIMEOUT=5000
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=1000
```

### 2. Bağımlılıklar

```bash
npm install imapflow mailparser libmime
```

### 3. Database Schema

Prisma schema'da `BankTransaction` modeli gerekli:

```prisma
model BankTransaction {
  id                String   @id @default(cuid())
  messageId         String   @unique
  bankCode          String   // YAPIKREDI
  source            String   // email
  direction         String   // IN/OUT
  accountIban       String
  maskedAccount     String
  transactionDate   DateTime
  amount            Float
  counterpartyName  String
  balanceAfter      Float?
  rawEmailData      String
  parsedData        String
  createdAt         DateTime @default(now())
  isMatched         Boolean  @default(false)
  transactionType   String   // FAST/HAVALE/EFT
}
```

## 🔧 Kullanım

### Backend API Endpoints

```javascript
// Email işlemleri
POST /api/banking/fetch-emails                    // Otomatik email çekme
POST /api/banking/fetch-emails-by-date            // Tarih aralığında email çekme
GET  /api/banking/email-stats                     // Email istatistikleri
POST /api/banking/test-connection                 // Bağlantı testi
PUT  /api/banking/email-settings                  // Email ayarlarını güncelle

// Realtime monitoring
POST /api/banking/start-monitoring                // Monitoring başlat
POST /api/banking/stop-monitoring                 // Monitoring durdur

// İşlem yönetimi
GET  /api/banking/transactions                    // Tüm işlemler
GET  /api/banking/unmatched                       // Eşleşmeyen ödemeler
POST /api/banking/match                           // Manuel eşleştirme
POST /api/banking/run-auto-matching               // Otomatik eşleştirme
GET  /api/banking/matching-stats                  // Eşleştirme istatistikleri
```

### Frontend Kullanımı

```javascript
import bankingService from '../services/bankingService';

// Email çekme
const result = await bankingService.fetchEmails();

// Tarih aralığında email çekme
const result = await bankingService.fetchEmailsByDateRange('2025-01-01', '2025-01-31');

// Email istatistikleri
const stats = await bankingService.getEmailStats();

// Realtime monitoring
await bankingService.startRealtimeMonitoring();
await bankingService.stopRealtimeMonitoring();
```

## 🧪 Test

### Test Dosyası Çalıştırma

```bash
cd backend
node test-yapikredi-email.js
```

### Test Senaryoları

1. **Email Parsing Test**: Mock email verileri ile parsing testi
2. **Bağlantı Testi**: IMAP bağlantısı kontrolü
3. **Email Çekme Testi**: Gerçek email çekme işlemi
4. **Tarih Aralığı Testi**: Belirli tarih aralığında email çekme
5. **Performance Test**: Sistem performans metrikleri

## 📊 Email Formatları

### FAST Ödemesi
```
1234XXXX5678 TL / TR123456789012345678901234 hesabınıza, 
15/01/2025 14:30:25 tarihinde, Ahmet Yılmaz isimli kişiden 
1.250,00 TL FAST ödemesi gelmiştir.
```

### HAVALE Çıkışı
```
5678XXXX9012 TL / TR987654321098765432109876 hesabınızdan, 
16/01/2025 09:15:10 tarihinde, Mehmet Demir isimli kişiye 
500,00 TL HAVALE çıkışı gerçekleşmiştir.
```

### EFT Girişi
```
1111XXXX2222 TL / TR111122223333444455556666 hesabınıza, 
17/01/2025 16:45:30 tarihinde, Ayşe Kaya isimli kişiden 
2.750,50 TL EFT girişi gerçekleşmiştir.
```

## 🔍 Hata Ayıklama

### Log Dosyaları

- `logs/failed-fast-emails.log`: Parse edilemeyen emailler
- Console logları: Sistem durumu ve hatalar

### Yaygın Sorunlar

1. **Bağlantı Hatası**: Email ayarlarını kontrol edin
2. **Parse Hatası**: Email formatını kontrol edin
3. **Duplikasyon**: MessageId kontrolü yapın
4. **Performance**: Batch size ayarlarını optimize edin

## 📈 Performance Optimizasyonu

### Ayarlar

```javascript
// Email batch processing
EMAIL_BATCH_SIZE=10              // Bir seferde işlenecek email sayısı
EMAIL_CONCURRENCY_LIMIT=5        // Eşzamanlı işlem sayısı
EMAIL_TIMEOUT=5000              // Timeout süresi (ms)
EMAIL_MAX_RETRIES=3             // Maksimum retry sayısı
EMAIL_RETRY_DELAY=1000          // Retry aralığı (ms)
```

### Monitoring

- **Email/Saniye**: İşlenen email hızı
- **Ortalama Süre**: Email başına işlem süresi
- **Başarı Oranı**: Başarılı/başarısız oranı
- **Retry Sayısı**: Yeniden deneme sayısı

## 🔐 Güvenlik

### Email Güvenliği

- **SSL/TLS** bağlantısı zorunlu
- **Şifre** environment variable'da saklanır
- **IMAP** bağlantısı güvenli port (993) kullanır

### Veri Güvenliği

- **MessageId** ile duplikasyon kontrolü
- **Raw email data** şifrelenmiş saklanır
- **Parsed data** JSON formatında güvenli

## 🚀 Gelecek Özellikler

- [ ] **WebSocket** ile realtime bildirimler
- [ ] **Diğer bankalar** için genişletme
- [ ] **AI tabanlı** eşleştirme
- [ ] **Mobile push** bildirimleri
- [ ] **Advanced analytics** ve raporlama

## 📞 Destek

Herhangi bir sorun yaşarsanız:

1. **Log dosyalarını** kontrol edin
2. **Test dosyasını** çalıştırın
3. **Environment variables** kontrol edin
4. **Email ayarlarını** doğrulayın

---

**Not**: Bu sistem Yapıkredi bankası ile entegre çalışır. Diğer bankalar için benzer yapı kullanılabilir.
