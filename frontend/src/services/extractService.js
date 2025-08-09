import apiClient from './apiClient';

const extractService = {
  getExtracts: async () => {
    const res = await apiClient.get('/extracts');
    return res.data;
  },
  uploadExtract: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post('/extracts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // Ekstre detayını getir
  async getExtractDetail(id) {
    return apiClient.get(`/extracts/${id}`);
  },

  // Eski ekstreleri sil
  async deleteOldExtracts(beforeDate = null, deleteAll = false) {
    return apiClient.delete('/extracts/delete-old', {
      data: { beforeDate, deleteAll }
    });
  },

  // Belirli bir ekstreyi sil
  async deleteExtract(id) {
    return apiClient.delete(`/extracts/${id}`);
  }
};

export default extractService;