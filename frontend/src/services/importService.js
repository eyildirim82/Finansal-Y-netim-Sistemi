import apiClient from './apiClient'

const importService = {
  // Excel dosyası yükle
  importExcel: (file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiClient.post('/imports/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    })
  },

  // CSV dosyası yükle
  importCSV: (file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiClient.post('/imports/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    })
  },

  // Müşteri dosyası yükle
  importCustomers: (file, onUploadProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return apiClient.post('/imports/customers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress
    })
  },

  // Template indir
  downloadTemplate: (type = 'transactions') => {
    return apiClient.get(`/imports/template?type=${type}`, {
      responseType: 'blob'
    })
  }
}

export default importService; 