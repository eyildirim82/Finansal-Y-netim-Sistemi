const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const prisma = new PrismaClient();

// Eski uygulamaların veritabanı yolları
const GELIR_GIDER_DB = path.join(__dirname, '../../../gelir - gider takibi/backend/database.sqlite');
const EKSTRE_DB = path.join(__dirname, '../../../Ekstre/prisma/app.db');

class DataMigrator {
  constructor() {
    this.gelirGiderDb = new sqlite3.Database(GELIR_GIDER_DB);
    this.ekstreDb = new sqlite3.Database(EKSTRE_DB);
  }

  // Promise wrapper for sqlite3
  query(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async migrateUsers() {
    console.log('👥 Kullanıcı verileri migrasyonu başlıyor...');
    
    try {
      // Gelir-gider uygulamasından kullanıcıları al
      const users = await this.query(this.gelirGiderDb, 'SELECT * FROM users');
      
      for (const user of users) {
        await prisma.user.upsert({
          where: { email: user.email || 'admin@example.com' },
          update: {
            username: user.username || user.email?.split('@')[0] || 'admin',
            password: user.password || '$2a$10$default.hash.for.migration',
            role: user.role || 'USER',
            isActive: user.is_active !== undefined ? user.is_active : true
          },
          create: {
            username: user.username || user.email?.split('@')[0] || 'admin',
            email: user.email || 'admin@example.com',
            password: user.password || '$2a$10$default.hash.for.migration',
            role: user.role || 'USER',
            isActive: user.is_active !== undefined ? user.is_active : true
          }
        });
      }
      
      console.log(`✅ ${users.length} kullanıcı başarıyla migre edildi`);
    } catch (error) {
      console.error('❌ Kullanıcı migrasyonu hatası:', error);
    }
  }

  async migrateCustomers() {
    console.log('👤 Müşteri verileri migrasyonu başlıyor...');
    
    try {
      // Ekstre uygulamasından müşterileri al
      const customers = await this.query(this.ekstreDb, 'SELECT * FROM Customer');
      
      for (const customer of customers) {
        await prisma.customer.upsert({
          where: { code: customer.code },
          update: {
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            type: customer.accountType || 'INDIVIDUAL',
            isActive: true
          },
          create: {
            code: customer.code,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            type: customer.accountType || 'INDIVIDUAL',
            isActive: true
          }
        });
      }
      
      console.log(`✅ ${customers.length} müşteri başarıyla migre edildi`);
    } catch (error) {
      console.error('❌ Müşteri migrasyonu hatası:', error);
    }
  }

  async migrateCategories() {
    console.log('📂 Kategori verileri migrasyonu başlıyor...');
    
    try {
      // Gelir-gider uygulamasından kategorileri al
      const categories = await this.query(this.gelirGiderDb, 'SELECT * FROM categories');
      
      for (const category of categories) {
        await prisma.category.upsert({
          where: { 
            name_type: {
              name: category.name,
              type: category.type || 'EXPENSE'
            }
          },
          update: {
            parentId: category.parent_id || null,
            userId: category.user_id || null
          },
          create: {
            name: category.name,
            type: category.type || 'EXPENSE',
            parentId: category.parent_id || null,
            userId: category.user_id || null
          }
        });
      }
      
      console.log(`✅ ${categories.length} kategori başarıyla migre edildi`);
    } catch (error) {
      console.error('❌ Kategori migrasyonu hatası:', error);
    }
  }

  async migrateTransactions() {
    console.log('💰 İşlem verileri migrasyonu başlıyor...');
    
    try {
      // Gelir-gider uygulamasından işlemleri al
      const gelirGiderTransactions = await this.query(this.gelirGiderDb, 'SELECT * FROM transactions');
      
      for (const txn of gelirGiderTransactions) {
        const user = await prisma.user.findFirst({
          where: { email: txn.user_email || 'admin@example.com' }
        });
        
        if (!user) continue;
        
        await prisma.transaction.create({
          data: {
            type: txn.type || 'EXPENSE',
            amount: parseFloat(txn.amount) || 0,
            currency: txn.currency || 'TRY',
            description: txn.description,
            date: new Date(txn.date || txn.created_at),
            categoryId: txn.category_id || null,
            customerId: null, // Gelir/gider işlemleri müşteri ile ilişkili değil
            userId: user.id,
            sourceFile: 'migration_gelir_gider',
            sourceRow: null,
            metadata: JSON.stringify({
              originalId: txn.id,
              originalType: 'gelir_gider'
            })
          }
        });
      }
      
      // Ekstre uygulamasından işlemleri al
      const ekstreTransactions = await this.query(this.ekstreDb, 'SELECT * FROM "Transaction"');
      
      for (const txn of ekstreTransactions) {
        const customer = await prisma.customer.findUnique({
          where: { code: String(txn.customerId) }
        });
        
        if (!customer) continue;
        
        // Varsayılan kullanıcı
        const user = await prisma.user.findFirst();
        if (!user) continue;
        
        await prisma.transaction.create({
          data: {
            type: 'CUSTOMER',
            amount: (txn.debitCents || 0) / 100, // Cents'i TL'ye çevir
            currency: txn.currency || 'TRY',
            description: txn.description,
            date: new Date(txn.txnDate),
            categoryId: null,
            customerId: customer.id,
            userId: user.id,
            sourceFile: 'migration_ekstre',
            sourceRow: null,
            metadata: JSON.stringify({
              originalId: txn.id,
              docType: txn.docType,
              voucherNo: txn.voucherNo,
              dueDate: txn.dueDate,
              debitCents: txn.debitCents,
              creditCents: txn.creditCents,
              originalType: 'ekstre'
            })
          }
        });
      }
      
      console.log(`✅ ${gelirGiderTransactions.length + ekstreTransactions.length} işlem başarıyla migre edildi`);
    } catch (error) {
      console.error('❌ İşlem migrasyonu hatası:', error);
    }
  }

  async migrateBalances() {
    console.log('💳 Bakiye verileri migrasyonu başlıyor...');
    
    try {
      // Ekstre uygulamasından bakiyeleri al
      const balances = await this.query(this.ekstreDb, 'SELECT * FROM CustomerBalanceSnapshot ORDER BY createdAt DESC');
      
      const processedCustomers = new Set();
      
      for (const balance of balances) {
        if (processedCustomers.has(balance.customerId)) continue;
        
        const customer = await prisma.customer.findUnique({
          where: { code: String(balance.customerId) }
        });
        
        if (!customer) continue;
        
        await prisma.balance.upsert({
          where: { customerId: customer.id },
          update: {
            totalDebit: (balance.calcTotalDebitCents || 0) / 100,
            totalCredit: (balance.calcTotalCreditCents || 0) / 100,
            netBalance: ((balance.calcTotalDebitCents || 0) - (balance.calcTotalCreditCents || 0)) / 100,
            lastUpdated: new Date(balance.createdAt)
          },
          create: {
            customerId: customer.id,
            totalDebit: (balance.calcTotalDebitCents || 0) / 100,
            totalCredit: (balance.calcTotalCreditCents || 0) / 100,
            netBalance: ((balance.calcTotalDebitCents || 0) - (balance.calcTotalCreditCents || 0)) / 100,
            lastUpdated: new Date(balance.createdAt)
          }
        });
        
        processedCustomers.add(balance.customerId);
      }
      
      console.log(`✅ ${processedCustomers.size} müşteri bakiyesi başarıyla migre edildi`);
    } catch (error) {
      console.error('❌ Bakiye migrasyonu hatası:', error);
    }
  }

  async runMigration() {
    console.log('🚀 Veri migrasyonu başlıyor...');
    console.log('📊 Kaynak veritabanları:');
    console.log(`   - Gelir-Gider: ${GELIR_GIDER_DB}`);
    console.log(`   - Ekstre: ${EKSTRE_DB}`);
    
    try {
      await this.migrateUsers();
      await this.migrateCustomers();
      await this.migrateCategories();
      await this.migrateTransactions();
      await this.migrateBalances();
      
      console.log('🎉 Veri migrasyonu başarıyla tamamlandı!');
    } catch (error) {
      console.error('❌ Migrasyon hatası:', error);
    } finally {
      this.gelirGiderDb.close();
      this.ekstreDb.close();
      await prisma.$disconnect();
    }
  }
}

// Script'i çalıştır
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.runMigration();
}

module.exports = DataMigrator; 