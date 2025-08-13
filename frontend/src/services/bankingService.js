import apiClient from './apiClient';

const bankingService = {
  // Otomatik email çekme
  fetchEmails: async () => {
    const res = await apiClient.post('/banking/fetch-emails');
    return res.data;
  },

  // Email bağlantı testi
  testEmailConnection: async () => {
    const res = await apiClient.post('/banking/test-connection');
    return res.data;
  },

  // Eşleştirme istatistikleri
  getMatchingStats: async () => {
    const res = await apiClient.get('/banking/matching-stats');
    return res.data;
  },

  // Otomatik eşleştirme çalıştır
  runAutoMatching: async (limit = 100) => {
    const res = await apiClient.post('/banking/run-auto-matching', { limit });
    return res.data;
  },

  // Banka işlemleri
  getTransactions: async () => {
    const res = await apiClient.get('/banking/transactions');
    return res.data;
  },

  // PDF işlemleri
  getPDFTransactions: async () => {
    const res = await apiClient.get('/banking/pdf-transactions');
    return res.data;
  },

  // Eşleşmeyen ödemeler
  getUnmatchedPayments: async () => {
    const res = await apiClient.get('/banking/unmatched');
    return res.data;
  },

  // Manuel eşleştirme
  matchPayment: async ({ transactionId, customerId, amount }) => {
    const res = await apiClient.post('/banking/match', { transactionId, customerId, amount });
    return res.data;
  },

  // Yeni endpoint'ler
  // Email istatistikleri
  getEmailStats: async () => {
    const res = await apiClient.get('/banking/email-stats');
    return res.data;
  },

  // Tarih aralığında email çekme
  fetchEmailsByDateRange: async (startDate, endDate) => {
    const res = await apiClient.post('/banking/fetch-emails-by-date', { startDate, endDate });
    return res.data;
  },

  // Realtime monitoring
  startRealtimeMonitoring: async () => {
    const res = await apiClient.post('/banking/start-monitoring');
    return res.data;
  },

  stopRealtimeMonitoring: async () => {
    const res = await apiClient.post('/banking/stop-monitoring');
    return res.data;
  },

  // Email ayarlarını güncelle
  updateEmailSettings: async (settings) => {
    const res = await apiClient.put('/banking/email-settings', settings);
    return res.data;
  },

  // Email ayarlarını getir
  getEmailSettings: async () => {
    const res = await apiClient.get('/banking/email-settings');
    return res.data;
  },

  // PDF işlemleri
  // PDF hesap hareketlerini parse et
  parsePDF: async (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const res = await apiClient.post('/banking/parse-pdf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  // PDF'den çıkarılan işlemleri kaydet
  savePDFTransactions: async (transactions, accountInfo) => {
    const res = await apiClient.post('/banking/save-pdf-transactions', {
      transactions,
      accountInfo
    });
    return res.data;
  },

  // İşlem silme işlemleri
  // Tek işlem sil
  deleteTransaction: async (transactionId) => {
    const res = await apiClient.delete(`/banking/transactions/${transactionId}`);
    return res.data;
  },

  // Toplu işlem silme
  deleteTransactions: async (filters) => {
    const res = await apiClient.delete('/banking/transactions', { data: filters });
    return res.data;
  },

  // Eski işlemleri temizle
  cleanupOldTransactions: async (beforeDate, dryRun = false) => {
    const res = await apiClient.post('/banking/cleanup-old-transactions', {
      beforeDate,
      dryRun
    });
    return res.data;
  },

  // Yeni ETL PDF işleme
  processPDFETL: async (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const res = await apiClient.post('/banking/process-pdf-etl', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

// Eksik işlemleri getir
export const getMissingTransactions = async () => {
  try {
    const response = await apiClient.get('/banking/missing-transactions');
    return response.data;
  } catch (error) {
    console.error('Eksik işlemler getirilirken hata:', error);
    throw error;
  }
};

export default bankingService;