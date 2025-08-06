import apiClient from './apiClient'

const customerService = {
  // Tüm müşterileri getir
  getAllCustomers: (params = {}) => {
    return apiClient.get('/customers', { params })
  },

  // Tüm müşterileri getir (alias)
  getCustomers: (params = {}) => {
    return apiClient.get('/customers', { params })
  },

  // Tek müşteri getir
  getCustomer: (id) => {
    return apiClient.get(`/customers/${id}`)
  },

  // Yeni müşteri oluştur
  createCustomer: (customerData) => {
    return apiClient.post('/customers', customerData)
  },

  // Müşteri güncelle
  updateCustomer: (id, customerData) => {
    return apiClient.put(`/customers/${id}`, customerData)
  },

  // Müşteri sil
  deleteCustomer: (id) => {
    return apiClient.delete(`/customers/${id}`)
  },

  // Çoklu müşteri sil
  deleteMultipleCustomers: (ids) => {
    return apiClient.delete('/customers/bulk', { data: { ids } })
  },

  // Müşteri istatistikleri
  getCustomerStats: (customerId) => {
    return apiClient.get(`/customers/${customerId}/stats`)
  },

  // Müşteri arama
  searchCustomers: (params = {}) => {
    return apiClient.get('/customers/search', { params })
  }
}

export default customerService; 