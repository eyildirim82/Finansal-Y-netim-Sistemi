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
    console.log('[DEBUG] API Request - Token:', token ? 'Token var' : 'Token yok')
    console.log('[DEBUG] API Request - URL:', config.url)
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[DEBUG] API Request - Authorization header eklendi')
    } else {
      console.log('[DEBUG] API Request - Token bulunamadı, Authorization header eklenmedi')
    }
    
    return config
  },
  (error) => {
    console.error('[DEBUG] API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - hata yönetimi
apiClient.interceptors.response.use(
  (response) => {
    console.log('[DEBUG] API Response - Status:', response.status, 'URL:', response.config.url)
    return response
  },
  (error) => {
    console.error('[DEBUG] API Response Error:', error.response?.status, error.response?.data)
    
    // Genel hata mesajları
    if (error.response?.status >= 500) {
      toast.error('Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient 