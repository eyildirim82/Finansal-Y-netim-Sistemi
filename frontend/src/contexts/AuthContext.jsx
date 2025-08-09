import { createContext, useContext, useState, useEffect } from 'react'
import authService from '../services/authService'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Token'ı localStorage'dan al
  const getToken = () => {
    return localStorage.getItem('token')
  }

  // Token'ı localStorage'a kaydet
  const setToken = (token) => {
    if (token) {
      localStorage.setItem('token', token)
    } else {
      localStorage.removeItem('token')
    }
  }

  // Kullanıcı profilini al
  const loadUser = async () => {
    try {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }

      const response = await authService.getProfile()
      if (response.data && response.data.data && response.data.data.user) {
        setUser(response.data.data.user)
      } else {
        console.error('Invalid response format:', response.data)
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('Load user error:', error)
      // Token geçersizse sil
      if (error.response?.status === 401) {
        setToken(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  // Login
  const login = async (credentials) => {
    try {
      console.log('Login isteği gönderiliyor:', credentials)
      const response = await authService.login(credentials)
      console.log('Login response:', response.data)
      const { user, token } = response.data.data
      
      setUser(user)
      setToken(token)
      
      console.log('User state güncellendi:', user)
      toast.success('Başarıyla giriş yapıldı')
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      const message = error.response?.data?.error || 'Giriş yapılırken hata oluştu'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  // Register
  const register = async (userData) => {
    try {
      const response = await authService.register(userData)
      const { user, token } = response.data.data
      
      setUser(user)
      setToken(token)
      
      toast.success('Hesap başarıyla oluşturuldu')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Kayıt olurken hata oluştu'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  // Logout
  const logout = () => {
    setUser(null)
    setToken(null)
    toast.success('Başarıyla çıkış yapıldı')
  }

  // Şifre değiştir
  const changePassword = async (passwordData) => {
    try {
      await authService.changePassword(passwordData)
      toast.success('Şifre başarıyla değiştirildi')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Şifre değiştirilirken hata oluştu'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  // İlk yükleme - otomatik kullanıcı yükleme
  useEffect(() => {
    loadUser() // Otomatik kullanıcı yükleme aktif
  }, [])

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    changePassword,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 