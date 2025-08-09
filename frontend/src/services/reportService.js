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
  },

  // Ödenmemiş faturalar raporu
  getUnpaidInvoices: (params = '') => {
    return apiClient.get(`/reports/unpaid-invoices?${params}`)
  },

  // Müşteri bazında ödenmemiş faturalar özeti
  getCustomerUnpaidInvoicesSummary: (customerId) => {
    return apiClient.get(`/reports/customer/${customerId}/unpaid-invoices`)
  },

  // Ödenmiş faturalar raporu
  getPaidInvoices: (params = '') => {
    return apiClient.get(`/reports/paid-invoices?${params}`)
  },

  // Müşteri bazında ödenmiş faturalar özeti
  getCustomerPaidInvoicesSummary: (customerId) => {
    return apiClient.get(`/reports/customer/${customerId}/paid-invoices`)
  }
}

export default reportService; 