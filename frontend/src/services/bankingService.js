import apiClient from './apiClient';

const bankingService = {
  // Temel işlemler
  getTransactions: () => apiClient.get('/banking/transactions'),
  getUnmatchedPayments: () => apiClient.get('/banking/unmatched'),
  getMatchingStats: () => apiClient.get('/banking/matching-stats'),
  getEmailStats: () => apiClient.get('/banking/email-stats'),
  getPDFTransactions: () => apiClient.get('/banking/pdf-transactions'),
  
  // Email işlemleri
  fetchEmails: () => apiClient.post('/banking/fetch-emails'),
  fetchEmailsByDateRange: (startDate, endDate) => 
    apiClient.post('/banking/fetch-emails-by-date', { startDate, endDate }),
  getEmailSettings: () => apiClient.get('/banking/email-settings'),
  updateEmailSettings: (settings) => apiClient.put('/banking/email-settings', settings),
  testEmailConnection: () => apiClient.post('/banking/test-connection'),
  startRealtimeMonitoring: () => apiClient.post('/banking/start-monitoring'),
  stopRealtimeMonitoring: () => apiClient.post('/banking/stop-monitoring'),
  
  // Eşleştirme işlemleri
  runAutoMatching: () => apiClient.post('/banking/auto-matching'),
  matchPayment: (data) => apiClient.post('/banking/match-payment', data),
  
  // PDF işlemleri
  parsePDF: (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return apiClient.post('/banking/parse-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  savePDFTransactions: (transactions, accountInfo) => 
    apiClient.post('/banking/save-pdf-transactions', { transactions, accountInfo }),
  processPDFETL: (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return apiClient.post('/banking/process-pdf-etl', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // İşlem silme
  deleteTransaction: (id) => apiClient.delete(`/banking/transactions/${id}`),
  deleteTransactions: (filters) => apiClient.post('/banking/delete-transactions', filters),
  cleanupOldTransactions: (date, dryRun = true) => 
    apiClient.post('/banking/cleanup-transactions', { date, dryRun }),
  
  // Eksik işlem analizi
  getMissingTransactions: () => apiClient.get('/banking/missing-transactions')
};

export default bankingService;

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