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
};

export default bankingService;