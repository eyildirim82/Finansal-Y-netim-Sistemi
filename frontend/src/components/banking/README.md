# Banking Modülü

Bu klasör, Banking sayfasının modüler bileşenlerini içerir. Her bileşen belirli bir işlevselliği yerine getirir ve yeniden kullanılabilir şekilde tasarlanmıştır.

## Bileşenler

### AutoOperationsPanel
Otomatik işlemler paneli - Email çekme, PDF işleme, monitoring gibi otomatik işlemleri yönetir.

**Props:**
- `emailLoading`: Email yükleme durumu
- `autoMatchingLoading`: Otomatik eşleştirme durumu
- `isMonitoring`: Monitoring durumu
- `matchingStats`: Eşleştirme istatistikleri
- `onFetchEmails`: Email çekme fonksiyonu
- `onShowDateRangeModal`: Tarih aralığı modal gösterme
- `onFetchLastWeekEmails`: Son 1 hafta email çekme
- `onToggleMonitoring`: Monitoring başlat/durdur
- `onTestConnection`: Bağlantı testi
- `onShowEmailSettings`: Email ayarları modal gösterme
- `onRunAutoMatching`: Otomatik eşleştirme çalıştırma
- `onShowMissingTransactions`: Eksik işlemleri gösterme/gizleme
- `showMissingTransactions`: Eksik işlemler görünürlüğü
- `selectedPdfFile`: Seçili PDF dosyası
- `pdfLoading`: PDF yükleme durumu
- `onPdfFileSelect`: PDF dosya seçimi
- `onPdfUpload`: PDF yükleme
- `onPdfETL`: PDF ETL işleme
- `onShowBulkDeleteModal`: Toplu silme modal gösterme
- `onShowCleanupModal`: Temizleme modal gösterme

### EmailStatsPanel
Email istatistikleri paneli - Email durumu ve metriklerini gösterir.

**Props:**
- `emailStats`: Email istatistikleri verisi

### CriticalWarningAlert
Kritik uyarı bileşeni - Kritik eksik işlem uyarılarını gösterir.

**Props:**
- `missingTransactionsSummary`: Eksik işlem özeti

### TabNavigation
Tab navigasyon bileşeni - Farklı işlem görünümleri arasında geçiş sağlar.

**Props:**
- `tab`: Aktif tab
- `pdfTransactions`: PDF işlemleri sayısı
- `onTabChange`: Tab değiştirme fonksiyonu
- `onFetchData`: Veri yenileme fonksiyonu
- `onFetchUnmatched`: Eşleşmeyen işlemleri yenileme

### TransactionTable
Genel işlem tablosu - Tüm işlemleri listeler.

**Props:**
- `transactions`: İşlem listesi
- `deleteLoading`: Silme işlemi durumu
- `onDeleteTransaction`: İşlem silme fonksiyonu

### UnmatchedTransactionsTable
Eşleşmeyen işlemler tablosu - Eşleşmeyen ödemeleri listeler.

**Props:**
- `unmatched`: Eşleşmeyen işlemler listesi
- `deleteLoading`: Silme işlemi durumu
- `onDeleteTransaction`: İşlem silme fonksiyonu
- `onOpenMatchModal`: Eşleştirme modal açma

### PdfTransactionsTable
PDF işlemleri tablosu - PDF'den çıkarılan işlemleri listeler.

**Props:**
- `pdfTransactions`: PDF işlemleri listesi
- `deleteLoading`: Silme işlemi durumu
- `onDeleteTransaction`: İşlem silme fonksiyonu

### MissingTransactionsPanel
Eksik işlemler paneli - Eksik işlem analizini gösterir.

**Props:**
- `showMissingTransactions`: Görünürlük durumu
- `missingTransactions`: Eksik işlemler listesi
- `missingTransactionsSummary`: Eksik işlem özeti
- `getSeverityColor`: Önem derecesi renk fonksiyonu
- `getSeverityIcon`: Önem derecesi ikon fonksiyonu

## Kullanım

```jsx
import {
  AutoOperationsPanel,
  EmailStatsPanel,
  CriticalWarningAlert,
  TabNavigation,
  TransactionTable,
  UnmatchedTransactionsTable,
  PdfTransactionsTable,
  MissingTransactionsPanel
} from '../components/banking';

// Ana bileşende kullanım
<AutoOperationsPanel
  emailLoading={emailLoading}
  onFetchEmails={handleFetchEmails}
  // ... diğer props
/>
```

## Avantajlar

1. **Modülerlik**: Her bileşen tek bir sorumluluğa sahip
2. **Yeniden Kullanılabilirlik**: Bileşenler başka yerlerde de kullanılabilir
3. **Bakım Kolaylığı**: Her bileşen ayrı ayrı test edilebilir ve güncellenebilir
4. **Kod Okunabilirliği**: Ana bileşen daha temiz ve anlaşılır
5. **Performans**: Gereksiz re-render'lar önlenebilir
