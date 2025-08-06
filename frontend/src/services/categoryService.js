import apiClient from './apiClient'

const categoryService = {
  // Tüm kategorileri getir
  getAllCategories: (params = {}) => {
    return apiClient.get('/categories', { params })
  },

  // Kategori arama
  searchCategories: (params = {}) => {
    return apiClient.get('/categories/search', { params })
  },

  // Tek kategori getir
  getCategory: (id) => {
    return apiClient.get(`/categories/${id}`)
  },

  // Kategori istatistikleri
  getCategoryStats: (categoryId) => {
    return apiClient.get(`/categories/${categoryId}/stats`)
  },

  // Yeni kategori oluştur
  createCategory: (categoryData) => {
    return apiClient.post('/categories', categoryData)
  },

  // Kategori güncelle
  updateCategory: (id, categoryData) => {
    return apiClient.put(`/categories/${id}`, categoryData)
  },

  // Kategori sil
  deleteCategory: (id) => {
    return apiClient.delete(`/categories/${id}`)
  }
}

export default categoryService; 