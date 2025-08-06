import apiClient from './apiClient'

const authService = {
  // Login
  login: (credentials) => {
    return apiClient.post('/auth/login', credentials)
  },

  // Register
  register: (userData) => {
    return apiClient.post('/auth/register', userData)
  },

  // Get profile
  getProfile: () => {
    return apiClient.get('/auth/profile')
  },

  // Change password
  changePassword: (passwordData) => {
    return apiClient.put('/auth/change-password', passwordData)
  }
}

export default authService; 