# 🏗️ Modüler Mimari Dokümantasyonu

## 📋 Genel Bakış

Bu dokümantasyon, Finansal Yönetim Sistemi'nin modüler mimari yapısını açıklar. Sistem, katmanlı mimari (Layered Architecture) prensiplerine dayalı olarak tasarlanmıştır.

## 🏛️ Mimari Katmanlar

### 1. **Presentation Layer (Sunum Katmanı)**
- **Frontend**: React.js tabanlı kullanıcı arayüzü
- **API Gateway**: Nginx reverse proxy
- **Responsive Design**: Tailwind CSS ile modern UI

### 2. **Application Layer (Uygulama Katmanı)**
- **Controllers**: HTTP isteklerini yönetir
- **Services**: İş mantığını içerir
- **Validators**: Veri doğrulama
- **Middleware**: Kimlik doğrulama, hata yönetimi

### 3. **Domain Layer (İş Mantığı Katmanı)**
- **Business Logic**: Temel iş kuralları
- **Entities**: Veri modelleri
- **Repositories**: Veri erişim soyutlaması

### 4. **Infrastructure Layer (Altyapı Katmanı)**
- **Database**: PostgreSQL
- **Cache**: Redis
- **File Storage**: Dosya yükleme sistemi
- **External APIs**: Email, PDF parsing

## 📁 Proje Yapısı

```
finansal-yonetim-sistemi/
├── backend/
│   ├── src/
│   │   ├── modules/           # İş modülleri
│   │   │   ├── auth/         # Kimlik doğrulama
│   │   │   ├── customers/    # Müşteri yönetimi
│   │   │   ├── transactions/ # İşlem yönetimi
│   │   │   ├── categories/   # Kategori yönetimi
│   │   │   ├── banking/      # Banka işlemleri
│   │   │   └── reports/      # Raporlama
│   │   ├── shared/           # Ortak bileşenler
│   │   │   ├── services/     # Temel servisler
│   │   │   ├── middleware/   # Ortak middleware
│   │   │   ├── types/        # Tip tanımları
│   │   │   └── utils/        # Yardımcı fonksiyonlar
│   │   └── index.ts          # Ana uygulama
│   ├── prisma/               # Veritabanı şeması
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Yeniden kullanılabilir bileşenler
│   │   ├── pages/           # Sayfa bileşenleri
│   │   ├── services/        # API servisleri
│   │   ├── hooks/           # Özel React hooks
│   │   ├── shared/          # Ortak bileşenler
│   │   └── utils/           # Yardımcı fonksiyonlar
│   └── Dockerfile
└── docker-compose.yml
```

## 🔧 Modül Yapısı

### Backend Modül Yapısı

Her modül aşağıdaki dosyaları içerir:

```
modules/customers/
├── controller.ts    # HTTP isteklerini yönetir
├── service.ts       # İş mantığını içerir
├── routes.ts        # Route tanımları
└── types.ts         # Modül özel tipleri
```

### Frontend Modül Yapısı

```
components/customers/
├── CustomerList.jsx     # Müşteri listesi
├── CustomerForm.jsx     # Müşteri formu
├── CustomerDetail.jsx   # Müşteri detayı
└── index.js            # Export dosyası
```

## 🛠️ Temel Bileşenler

### 1. **BaseService**
Tüm servisler için temel sınıf:

```typescript
export abstract class BaseService {
  protected prisma: PrismaClient;
  
  protected createSuccessResponse<T>(data: T, message: string): ApiResponse<T>
  protected createErrorResponse(message: string, error?: any): ApiResponse
  protected validatePaginationParams(params: PaginationParams)
  protected createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number)
  protected async safeDatabaseOperation<T>(operation: () => Promise<T>, errorMessage: string)
}
```

### 2. **DataTable**
Yeniden kullanılabilir tablo bileşeni:

```jsx
<DataTable
  data={customers}
  columns={columns}
  pagination={pagination}
  onPageChange={handlePageChange}
  onSortChange={handleSortChange}
  loading={isLoading}
/>
```

### 3. **FormBuilder**
Dinamik form oluşturucu:

```jsx
<FormBuilder
  fields={formFields}
  onSubmit={handleSubmit}
  defaultValues={defaultValues}
  loading={isLoading}
/>
```

### 4. **API Hooks**
React Query tabanlı API hooks:

```javascript
// GET istekleri
const { data, isLoading } = useApiQuery(['customers'], '/customers');

// POST istekleri
const createMutation = useApiMutation('/customers', {
  invalidateQueries: ['customers'],
  successMessage: 'Müşteri oluşturuldu'
});

// PUT istekleri
const updateMutation = useApiUpdate('/customers', {
  invalidateQueries: ['customers']
});

// DELETE istekleri
const deleteMutation = useApiDelete('/customers', {
  invalidateQueries: ['customers']
});
```

## 🔐 Güvenlik

### 1. **Authentication**
- JWT tabanlı kimlik doğrulama
- Role-based access control (RBAC)
- Token refresh mekanizması

### 2. **Validation**
- Input validation (express-validator)
- SQL injection koruması (Prisma ORM)
- XSS koruması (helmet.js)

### 3. **Rate Limiting**
- IP bazlı rate limiting
- API endpoint koruması

## 📊 Monitoring ve Logging

### 1. **Application Monitoring**
- Prometheus metrics
- Grafana dashboards
- Health checks

### 2. **Logging**
- Structured logging (Pino)
- Log levels (error, warn, info, debug)
- Log rotation

### 3. **Error Handling**
- Global error handler
- Custom error types
- Error reporting

## 🚀 Deployment

### Docker Compose ile Çalıştırma

```bash
# Tüm servisleri başlat
docker-compose up -d

# Sadece belirli servisleri başlat
docker-compose up -d backend frontend

# Logları görüntüle
docker-compose logs -f backend

# Servisleri durdur
docker-compose down
```

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=3001

# Frontend
VITE_API_URL=http://localhost:3001/api
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Server
        run: |
          docker-compose pull
          docker-compose up -d
```

## 📈 Performance Optimizations

### 1. **Database**
- Connection pooling
- Query optimization
- Indexing strategy

### 2. **Caching**
- Redis cache layer
- API response caching
- Static asset caching

### 3. **Frontend**
- Code splitting
- Lazy loading
- Bundle optimization

## 🧪 Testing Strategy

### 1. **Unit Tests**
- Jest framework
- Service layer testing
- Component testing

### 2. **Integration Tests**
- API endpoint testing
- Database integration
- External service mocking

### 3. **E2E Tests**
- Cypress framework
- User workflow testing
- Cross-browser testing

## 📚 Best Practices

### 1. **Code Organization**
- Single Responsibility Principle
- Dependency Injection
- Interface segregation

### 2. **Error Handling**
- Consistent error responses
- Proper error logging
- User-friendly error messages

### 3. **Security**
- Input sanitization
- Authentication middleware
- HTTPS enforcement

### 4. **Performance**
- Database query optimization
- Caching strategies
- Lazy loading

## 🔧 Development Workflow

### 1. **Local Development**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### 2. **Database Migrations**
```bash
# Migration oluştur
npx prisma migrate dev --name add_customer_fields

# Migration uygula
npx prisma migrate deploy

# Prisma client güncelle
npx prisma generate
```

### 3. **Code Quality**
```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking
npm run type-check
```

## 📞 Support

Modüler mimari ile ilgili sorularınız için:
- GitHub Issues
- Documentation Wiki
- Team Slack Channel

---

Bu dokümantasyon sürekli güncellenmektedir. Son değişiklikler için GitHub repository'sini kontrol edin.
