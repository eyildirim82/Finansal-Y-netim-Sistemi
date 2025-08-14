import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';

// API istemcisi
const apiClient = {
  get: async (url, config = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${url}`, {
      method: 'GET',
      headers,
      ...config,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  post: async (url, data, config = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...config,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  put: async (url, data, config = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${url}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...config,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  delete: async (url, config = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${url}`, {
      method: 'DELETE',
      headers,
      ...config,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },
};

// GET istekleri için hook
export const useApiQuery = (key, url, options = {}) => {
  return useQuery(
    key,
    () => apiClient.get(url),
    {
      retry: 3,
      refetchOnWindowFocus: false,
      ...options,
    }
  );
};

// POST istekleri için hook
export const useApiMutation = (url, options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data) => apiClient.post(url, data),
    {
      onSuccess: (data, variables, context) => {
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
        
        // Başarı mesajı göster
        if (options.showSuccessMessage !== false) {
          toast.success(options.successMessage || 'İşlem başarılı');
        }
        
        // Query cache'ini güncelle
        if (options.invalidateQueries) {
          queryClient.invalidateQueries(options.invalidateQueries);
        }
      },
      onError: (error, variables, context) => {
        if (options.onError) {
          options.onError(error, variables, context);
        }
        
        // Hata mesajı göster
        if (options.showErrorMessage !== false) {
          toast.error(options.errorMessage || 'Bir hata oluştu');
        }
      },
      ...options,
    }
  );
};

// PUT istekleri için hook
export const useApiUpdate = (url, options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    (data) => apiClient.put(url, data),
    {
      onSuccess: (data, variables, context) => {
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
        
        if (options.showSuccessMessage !== false) {
          toast.success(options.successMessage || 'Güncelleme başarılı');
        }
        
        if (options.invalidateQueries) {
          queryClient.invalidateQueries(options.invalidateQueries);
        }
      },
      onError: (error, variables, context) => {
        if (options.onError) {
          options.onError(error, variables, context);
        }
        
        if (options.showErrorMessage !== false) {
          toast.error(options.errorMessage || 'Güncelleme başarısız');
        }
      },
      ...options,
    }
  );
};

// DELETE istekleri için hook
export const useApiDelete = (url, options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    () => apiClient.delete(url),
    {
      onSuccess: (data, variables, context) => {
        if (options.onSuccess) {
          options.onSuccess(data, variables, context);
        }
        
        if (options.showSuccessMessage !== false) {
          toast.success(options.successMessage || 'Silme başarılı');
        }
        
        if (options.invalidateQueries) {
          queryClient.invalidateQueries(options.invalidateQueries);
        }
      },
      onError: (error, variables, context) => {
        if (options.onError) {
          options.onError(error, variables, context);
        }
        
        if (options.showErrorMessage !== false) {
          toast.error(options.errorMessage || 'Silme başarısız');
        }
      },
      ...options,
    }
  );
};

// Sayfalama için hook
export const usePaginatedQuery = (key, url, params = {}, options = {}) => {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const queryString = new URLSearchParams({
    ...pagination,
    ...params,
  }).toString();

  const query = useApiQuery(
    [...key, pagination, params],
    `${url}?${queryString}`,
    {
      keepPreviousData: true,
      ...options,
    }
  );

  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const handleSortChange = useCallback((sortBy, sortOrder) => {
    setPagination(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
  }, []);

  const handleLimitChange = useCallback((newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  return {
    ...query,
    pagination,
    handlePageChange,
    handleSortChange,
    handleLimitChange,
  };
};

export default apiClient;
