import apiClient from './apiClient'

const transactionService = {
  // Tüm işlemleri getir
  getAllTransactions: (params = {}) => {
    return apiClient.get('/transactions', { params })
  },

  // Tek işlem getir
  getTransaction: (id) => {
    return apiClient.get(`/transactions/${id}`)
  },

  // Yeni işlem oluştur
  createTransaction: (transactionData) => {
    return apiClient.post('/transactions', transactionData)
  },

  // İşlem güncelle
  updateTransaction: (id, transactionData) => {
    return apiClient.put(`/transactions/${id}`, transactionData)
  },

  // İşlem sil
  deleteTransaction: (id) => {
    return apiClient.delete(`/transactions/${id}`)
  },

  // Çoklu işlem sil
  deleteMultipleTransactions: (ids) => {
    return apiClient.delete('/transactions/bulk', { data: { ids } })
  },

  // İşlem istatistikleri
  getTransactionStats: (params = {}) => {
    return apiClient.get('/transactions/stats', { params })
  }
}

export default transactionService; 