import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import apiClient from '../../services/apiClient';

// API istemcisi (eski implementasyon - sadece geriye uyumluluk için)
const legacyApiClient = {
  get: async (url, config = {}) => {
    // URL'nin / ile başladığından emin ol
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${normalizedUrl}`, {
      method: 'GET',
      headers,
      ...config,
    });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    
    return response.json();
  },

  post: async (url, data, config = {}) => {
    // URL'nin / ile başladığından emin ol
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${normalizedUrl}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      ...config,
    });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    
    return response.json();
  },

  put: async (url, data, config = {}) => {
    // URL'nin / ile başladığından emin ol
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`/api${normalizedUrl}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      ...config,
    });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    
    return response.json();
  },

  delete: async (url, data = undefined, config = {}) => {
    // URL'nin / ile başladığından emin ol
    const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Debug: URL ve Authorization header'ını logla (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 DELETE Request Debug:');
      console.log('  - Original URL:', url);
      console.log('  - Normalized URL:', normalizedUrl);
      console.log('  - Final URL:', `/api${normalizedUrl}`);
      console.log('  - Token exists:', !!token);
      console.log('  - Authorization header:', headers['Authorization'] ? 'Bearer ***' : 'None');
      console.log('  - Data:', data);
    }
    
    const response = await fetch(`/api${normalizedUrl}`, {
      method: 'DELETE',
      headers,
      // bazı sunucular DELETE body kabul eder, bazıları etmez.
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      ...config,
    });
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    
    return response.json();
  },
};

// GET istekleri için hook
export const useApiQuery = (key, url, options = {}) => {
  return useQuery(
    key,
    async () => {
      try {
        const result = await apiClient.get(url);
        return result;
      } catch (error) {
        throw error;
      }
    },
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
        console.error('useApiMutation Error:', error);
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
        console.error('useApiUpdate Error:', error);
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
    // variables -> { id } veya { ids: [...] } gibi gelecek
    (variables) => {
      // Debug logları (sadece development'ta)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 useApiDelete Debug:');
        console.log('  - Base URL:', url);
        console.log('  - Variables:', variables);
      }
      
      // Senaryoya göre pattern'leri seç:
      // 1) /customers/:id
      if (variables?.id && typeof variables.id === 'string') {
        const finalUrl = `${url}/${variables.id}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('  - Pattern 1: ID-based delete');
          console.log('  - Final URL:', finalUrl);
        }
        return legacyApiClient.delete(finalUrl);
      }
      // 2) /customers/bulk + body (JSON body)
      if (variables?.body) {
        if (process.env.NODE_ENV === 'development') {
          console.log('  - Pattern 2: Body-based delete');
          console.log('  - Final URL:', url);
          console.log('  - Body:', variables.body);
        }
        return legacyApiClient.delete(url, variables.body);
      }
      // 3) Bulk delete için ids array'i body'de gönder (en yaygın kullanım)
      if (Array.isArray(variables?.ids) && variables.ids.length) {
        if (process.env.NODE_ENV === 'development') {
          console.log('  - Pattern 3: Bulk delete with body');
          console.log('  - Final URL:', url);
          console.log('  - Body:', { ids: variables.ids });
        }
        return legacyApiClient.delete(url, { ids: variables.ids });
      }
      // 4) /customers?ids=a,b,c (querystring - alternatif)
      if (variables?.queryString && Array.isArray(variables?.ids) && variables.ids.length) {
        const qs = new URLSearchParams({ ids: variables.ids.join(',') }).toString();
        const finalUrl = `${url}?${qs}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('  - Pattern 4: Query string delete');
          console.log('  - Final URL:', finalUrl);
        }
        return legacyApiClient.delete(finalUrl);
      }
      // fallback: gövdesiz
      if (process.env.NODE_ENV === 'development') {
        console.log('  - Pattern 5: Fallback (no variables)');
        console.log('  - Final URL:', url);
      }
      return legacyApiClient.delete(url);
    },
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
        console.error('useApiDelete Error:', error);
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
    limit: 25,
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
    console.log('🔍 Sıralama değişti:', { sortBy, sortOrder });
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

export default legacyApiClient;
