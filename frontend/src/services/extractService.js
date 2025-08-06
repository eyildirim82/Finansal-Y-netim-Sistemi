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
  getExtractDetail: async (id) => {
    const res = await apiClient.get(`/extracts/${id}`);
    return res.data;
  },
  // Diğer işlemler: doğrulama vs. eklenebilir
};

export default extractService;