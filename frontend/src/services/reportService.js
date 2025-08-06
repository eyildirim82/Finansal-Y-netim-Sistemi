import apiClient from './apiClient'

const reportService = {
  // Dashboard özet raporu
  getDashboardSummary: (params = {}) => {
    return apiClient.get('/reports/dashboard', { params })
  },

  // Aylık trend raporu
  getMonthlyTrend: (params = {}) => {
    return apiClient.get('/reports/monthly-trend', { params })
  },

  // Günlük trend raporu
  getDailyTrend: (params = {}) => {
    return apiClient.get('/reports/daily-trend', { params })
  },

  // Kategori raporu
  getCategoryReport: (params = {}) => {
    return apiClient.get('/reports/category', { params })
  },

  // Müşteri raporu
  getCustomerReport: (params = {}) => {
    return apiClient.get('/reports/customer', { params })
  },

  // Nakit akışı raporu
  getCashFlowReport: (params = {}) => {
    return apiClient.get('/reports/cash-flow', { params })
  }
}

export default reportService; 