# Finansal Yönetim Sistemi

Gelir-gider takibi ve ekstre uygulamalarını birleştiren kapsamlı finansal yönetim sistemi.

## 🚀 Özellikler

### ✅ Tamamlanan Özellikler
- **Kullanıcı Yönetimi**: JWT tabanlı kimlik doğrulama
- **Modern UI**: React + Tailwind CSS ile responsive tasarım
- **Dashboard**: Genel finansal özet ve istatistikler
- **Temel Sayfalar**: İşlemler, Müşteriler, Raporlar, Import
- **Backend Altyapısı**: Express + TypeScript + Prisma
- **Veritabanı Şeması**: Birleştirilmiş veri modeli

### 🔄 Geliştirilmekte Olan Özellikler
- **İşlem Yönetimi**: Gelir/gider/müşteri işlemleri CRUD
- **Müşteri Yönetimi**: Cari hesap takibi
- **Import/Export**: Excel ve CSV dosya işlemleri
- **Raporlama**: Detaylı finansal raporlar
- **API Entegrasyonu**: Backend-frontend bağlantısı

## 🛠️ Teknoloji Stack

### Backend
- **Node.js** + **Express**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **JWT Authentication**
- **Multer** (file upload)

### Frontend
- **React 18**
- **Vite**
- **Tailwind CSS**
- **React Router**
- **React Query**
- **Lucide React** (icons)
- **React Hook Form**

## 📁 Proje Yapısı

```
Finansal Yönetim Sistemi/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # Kullanıcı yönetimi
│   │   │   ├── transactions/  # İşlem yönetimi
│   │   │   ├── customers/     # Müşteri yönetimi
│   │   │   ├── reports/       # Raporlama
│   │   │   └── imports/       # Dosya import
│   │   ├── shared/
│   │   │   └── middleware/    # Ortak middleware'ler
│   │   └── index.ts          # Ana sunucu dosyası
│   ├── prisma/
│   │   └── schema.prisma     # Veritabanı şeması
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/       # UI bileşenleri
│   │   ├── pages/           # Sayfa bileşenleri
│   │   ├── contexts/        # React context'leri
│   │   ├── services/        # API servisleri
│   │   └── main.jsx         # Ana uygulama
│   └── package.json
└── shared/                  # Ortak tip tanımları
```

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL 12+
- npm veya yarn

### Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# Environment dosyasını oluştur
cp .env.example .env

# Veritabanı bağlantısını yapılandır
# .env dosyasında DATABASE_URL'yi güncelle

# Prisma migration'larını çalıştır
npm run prisma:migrate

# Prisma client'ı oluştur
npm run prisma:generate

# Geliştirme sunucusunu başlat
npm run dev
```

### Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

## 🔧 Yapılandırma

### Environment Variables

Backend için `.env` dosyası:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/finansal_yonetim"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# Server
PORT=3001
NODE_ENV=development

# Frontend URL (CORS)
FRONTEND_URL="http://localhost:3000"
```

## 🌐 Localization

Backend responses are localized using a simple message catalog. The system
currently supports Turkish and English. The preferred language can be
specified via the `Accept-Language` header (`tr` or `en`). To add or edit
translations, update `backend/src/utils/i18n.ts`.

## 📊 Veritabanı Şeması

### Ana Tablolar
- **users**: Kullanıcı bilgileri
- **customers**: Müşteri/cari hesap bilgileri
- **transactions**: İşlem kayıtları (gelir/gider/müşteri)
- **categories**: İşlem kategorileri
- **balances**: Müşteri bakiyeleri

### İşlem Türleri
- **INCOME**: Gelir işlemleri
- **EXPENSE**: Gider işlemleri
- **CUSTOMER**: Müşteri işlemleri

## 🔐 Güvenlik

- JWT tabanlı kimlik doğrulama
- Şifre hash'leme (bcrypt)
- Rate limiting
- Input validation
- CORS yapılandırması
- Helmet güvenlik middleware'i

## 📱 Kullanıcı Arayüzü

### Ana Sayfalar
1. **Login/Register**: Kullanıcı girişi ve kayıt
2. **Dashboard**: Genel özet ve istatistikler
3. **Transactions**: İşlem listesi ve yönetimi
4. **Customers**: Müşteri yönetimi
5. **Reports**: Raporlama sayfaları
6. **Import**: Dosya yükleme

### Tasarım Özellikleri
- Responsive tasarım
- Modern ve temiz arayüz
- Dark/Light mode desteği (gelecek)
- Mobil uyumlu
- Erişilebilirlik standartları

## 🔄 API Endpoints

### Auth
- `POST /api/auth/login` - Giriş
- `POST /api/auth/register` - Kayıt
- `GET /api/auth/profile` - Profil bilgileri
- `PUT /api/auth/change-password` - Şifre değiştirme

### Transactions
- `GET /api/transactions` - İşlem listesi
- `POST /api/transactions` - Yeni işlem
- `PUT /api/transactions/:id` - İşlem güncelleme
- `DELETE /api/transactions/:id` - İşlem silme

### Customers
- `GET /api/customers` - Müşteri listesi
- `POST /api/customers` - Yeni müşteri
- `GET /api/customers/:id/transactions` - Müşteri işlemleri
- `GET /api/customers/:id/balance` - Müşteri bakiyesi

### Reports
- `GET /api/reports/dashboard` - Dashboard verileri
- `GET /api/reports/income-expense` - Gelir/gider raporu
- `GET /api/reports/customers` - Müşteri raporu
- `GET /api/reports/aging` - Yaşlandırma raporu

### Import
- `POST /api/imports/excel` - Excel dosya import
- `POST /api/imports/csv` - CSV dosya import

## 🧪 Test

```bash
# Backend testleri
cd backend
npm test

# Frontend testleri
cd frontend
npm test
```

## 📦 Production Build

```bash
# Backend build
cd backend
npm run build

# Frontend build
cd frontend
npm run build
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📞 İletişim

Proje hakkında sorularınız için issue açabilirsiniz.

---

**Not**: Bu proje geliştirme aşamasındadır. Bazı özellikler henüz tamamlanmamıştır. 
