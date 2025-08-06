import axios from 'axios'
import toast from 'react-hot-toast'

// Axios instance oluştur
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 dakika
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - token ekle
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - hata yönetimi
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Genel hata mesajları
    if (error.response?.status >= 500) {
      toast.error('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient 