import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { usePaginatedQuery, useApiDelete, useApiQuery } from '../shared/hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../shared/components/DataTable';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import { formatCurrency } from '../utils/formatCurrency';

const Customers = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    address: '',
    accountType: '',
    tag1: '',
    tag2: '',
    isActive: '',
    type: '',
    hasDebt: ''
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Authentication kontrolü
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Eğer authentication yükleniyorsa veya kullanıcı giriş yapmamışsa loading göster
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-lg">Yükleniyor...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // navigate zaten çalışacak
  }



  // Müşteri listesi
  const {
    data: customersData,
    isLoading,
    error: customersError,
    pagination,
    handlePageChange,
    handleSortChange,
    handleLimitChange,
  } = usePaginatedQuery(
    ['customers'],
    '/customers',
    { search: searchTerm, ...filters },
    {
      enabled: true,
    }
  );



  // Müşteri istatistikleri - tüm müşterileri dahil eder
  const queryString = new URLSearchParams(filters).toString();
  const { data: statsData, error: statsError } = useApiQuery(
    ['customer-stats', filters],
    `/customers/stats?${queryString}`,
    {
      enabled: true,
    }
  );



  // Müşteri silme
  const deleteMutation = useApiDelete('/customers', {
    invalidateQueries: ['customers', 'customer-stats'],
    successMessage: 'Müşteri başarıyla silindi',
    errorMessage: 'Müşteri silinirken hata oluştu',
  });

  // Tüm müşterileri silme
  const deleteAllMutation = useApiDelete('/customers/all', {
    invalidateQueries: ['customers', 'customer-stats'],
    successMessage: 'Tüm müşteriler başarıyla silindi',
    errorMessage: 'Tüm müşteriler silinirken hata oluştu',
  });

  // Bulk delete için (gelecekte kullanılabilir)
  const bulkDeleteMutation = useApiDelete('/customers/bulk', {
    invalidateQueries: ['customers', 'customer-stats'],
    successMessage: 'Seçili müşteriler başarıyla silindi',
    errorMessage: 'Seçili müşteriler silinirken hata oluştu',
  });

  // Tüm müşterileri silme işlemi
  const handleDeleteAll = () => {
    const customerCount = stats.total || 0;
    
    // Eğer müşteri sayısı 0 ise uyarı ver ama işlemi engelleme
    if (customerCount === 0) {
      const confirmEmpty = window.confirm('Müşteri sayısı 0 görünüyor. Yine de tüm müşterileri silme işlemini başlatmak istiyor musunuz?');
      if (!confirmEmpty) {
        return;
      }
    }

    const confirmMessage = `DİKKAT! Bu işlem geri alınamaz!\n\n${customerCount} müşteriyi silmek istediğinizden emin misiniz?\n\nBu işlem şunları silecek:\n- Tüm müşteri kayıtları\n- Müşteri bakiyeleri\n- İlişkili tüm veriler\n\nDevam etmek için "TÜMÜNÜ SİL" yazın:`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === 'TÜMÜNÜ SİL') {
      // Tüm müşterileri silmek için gövdesiz DELETE isteği
      // Backend hiç parametre almıyor, sadece kullanıcı ID'sini kullanıyor
      deleteAllMutation.mutate();
    } else {
      alert('İşlem iptal edildi.');
    }
  };

  // Tablo sütunları
  const columns = [
    {
      key: 'name',
      label: 'Müşteri Adı',
      sortable: true,
      render: (value, record) => (
        <Link
          to={`/customers/${record.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {value}
        </Link>
      ),
    },
    {
      key: 'phone',
      label: 'Telefon',
      sortable: true,
      render: (value) => value || '-',
    },
    {
      key: 'type',
      label: 'Tür',
      sortable: true,
      render: (value) => value === 'INDIVIDUAL' ? 'Bireysel' : 'Kurumsal',
    },
    {
      key: 'address',
      label: 'Adres',
      sortable: true,
      render: (value) => value || '-',
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'accountType',
      label: 'Hesap Tipi',
      sortable: true,
      render: (value) => value || '-',
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'tag1',
      label: 'Etiket 1',
      sortable: true,
      render: (value) => value || '-',
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'tag2',
      label: 'Etiket 2',
      sortable: true,
      render: (value) => value || '-',
      filterable: true,
      filterType: 'text',
    },
    {
      key: 'isActive',
      label: 'Aktif',
      sortable: true,
      render: (value) => (value ? 'Evet' : 'Hayır'),
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Evet' },
        { value: 'false', label: 'Hayır' },
      ],
    },
    {
      key: 'balance',
      label: 'Bakiye',
      sortable: true, // Backend'de balance.netBalance'a göre sıralama eklendi
      render: (value) => {
        if (!value) return '-';
        return (
          <span className={value.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(value.netBalance)}
          </span>
        );
      },
    },
    {
      key: 'dueDays',
      label: 'Vade Günü',
      sortable: true,
      render: (value) => value ? `${value} gün` : '-',
    },
    {
      key: 'actions',
      label: 'İşlemler',
      render: (value, record) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(record)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Düzenle
          </button>
          <button
            onClick={() => handleDelete(record.id)}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Sil
          </button>
        </div>
      ),
    },
  ];

  // Müşteri düzenleme
  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowModal(true);
  };

  // Müşteri silme
  const handleDelete = (customerId) => {
    if (window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate({ id: customerId });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Modal kapatma
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  // Yeni müşteri ekleme
  const handleAddNew = () => {
    setEditingCustomer(null);
    setShowModal(true);
  };

  // İstatistik hesaplamaları - tüm müşterileri dahil eder
  const stats = statsData?.data?.data || { total: 0, active: 0, debt: 0, avgBalance: 0 };



  return (
    <div className="space-y-6">


      {/* Başlık ve Arama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="mt-1 text-sm text-gray-500">
            Müşteri bilgilerini yönetin ve takip edin
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3 items-center">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Müşteri ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50"
            >
              <FilterIcon className="w-4 h-4" />
            </button>

            {showFilterPanel && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-10">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Müşteri Türü</label>
                  <select
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300"
                  >
                    <option value="">Tümü</option>
                    <option value="INDIVIDUAL">Bireysel</option>
                    <option value="COMPANY">Kurumsal</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Aktiflik</label>
                  <select
                    value={filters.isActive}
                    onChange={(e) => handleFilterChange('isActive', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300"
                  >
                    <option value="">Tümü</option>
                    <option value="true">Aktif</option>
                    <option value="false">Pasif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Borç Durumu</label>
                  <select
                    value={filters.hasDebt}
                    onChange={(e) => handleFilterChange('hasDebt', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300"
                  >
                    <option value="">Tümü</option>
                    <option value="true">Borçlu</option>
                    <option value="false">Borcu Yok</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Yeni Müşteri
          </button>
          
          <button
            onClick={handleDeleteAll}
            disabled={deleteAllMutation.isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Müşteri sayısı: ${stats.total}, Loading: ${deleteAllMutation.isLoading}`}
          >
            {deleteAllMutation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Siliniyor...
              </>
            ) : (
              <>
                🗑️ Tümünü Sil ({stats.total})
              </>
            )}
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Toplam Müşteri</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.total}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Aktif Müşteri</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.active}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Borçlu Müşteri</div>
          <div className="text-2xl font-bold text-red-600">
            {stats.debt}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm font-medium text-gray-500">Ortalama Bakiye</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats.avgBalance)}
          </div>
        </div>
      </div>

      

             {/* Müşteri Tablosu */}
       <DataTable
         data={Array.isArray(customersData?.data?.data?.data) ? customersData.data.data.data : []}
         columns={columns}
         pagination={{
           ...customersData?.data?.data?.pagination,
           sortBy: pagination?.sortBy || 'createdAt',
           sortOrder: pagination?.sortOrder || 'desc'
         }}
         onPageChange={handlePageChange}
         onSortChange={handleSortChange}
         onLimitChange={handleLimitChange}
         filters={filters}
         onFilterChange={handleFilterChange}
         loading={isLoading}
         emptyMessage="Müşteri bulunamadı"
       />

      {/* Müşteri Ekleme/Düzenleme Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
        size="lg"
      >
        <CustomerForm
          customer={editingCustomer}
          onSuccess={handleCloseModal}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
};

export default Customers; 