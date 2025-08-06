import apiClient from './apiClient';

const cashService = {
  getCashFlows: async () => {
    const res = await apiClient.get('/cash/flows');
    return res.data;
  },
  getCurrentBalance: async () => {
    const res = await apiClient.get('/cash/balance');
    return res.data;
  },
  countCash: async (actualAmount, notes) => {
    const res = await apiClient.post('/cash/count', { actualAmount, notes });
    return res.data;
  },
  addCashTransaction: async (amount, description, categoryId, date) => {
    const res = await apiClient.post('/cash/transactions', { amount, description, categoryId, date });
    return res.data;
  },
};

export default cashService;