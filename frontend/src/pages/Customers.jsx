import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { usePaginatedQuery, useApiDelete } from '../shared/hooks/useApi';
import DataTable from '../shared/components/DataTable';
import Modal from '../components/Modal';
import CustomerForm from '../components/CustomerForm';
import { formatCurrency } from '../utils/formatCurrency';

const Customers = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Müşteri listesi
  const {
    data: customersData,
    isLoading,
    pagination,
    handlePageChange,
    handleSortChange,
  } = usePaginatedQuery(
    ['customers'],
    '/customers',
    { search: searchTerm },
    {
      enabled: true,
    }
  );

  // Müşteri silme
  const deleteMutation = useApiDelete('', {
    invalidateQueries: ['customers'],
    successMessage: 'Müşteri başarıyla silindi',
    errorMessage: 'Müşteri silinirken hata oluştu',
  });

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
      render: (value) => value || '-',
    },
    {
      key: 'type',
      label: 'Tür',
      render: (value) => value === 'INDIVIDUAL' ? 'Bireysel' : 'Kurumsal',
    },
    {
      key: 'balance',
      label: 'Bakiye',
      sortable: true,
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
      deleteMutation.mutate(`/customers/${customerId}`);
    }
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

  // İstatistik hesaplamaları
  const calculateStats = () => {
    if (!customersData?.data?.data) return { total: 0, active: 0, debt: 0, avgBalance: 0 };
    
    const customers = customersData.data.data;
    const total = customers.length;
    const active = customers.filter(c => c.isActive).length;
    const debt = customers.filter(c => c.balance && c.balance.netBalance < 0).length;
    const avgBalance = customers.reduce((sum, c) => sum + (c.balance?.netBalance || 0), 0) / total;
    
    return { total, active, debt, avgBalance };
  };

  const stats = calculateStats();

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
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
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
          
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Yeni Müşteri
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
        data={customersData?.data?.data || []}
        columns={columns}
        pagination={customersData?.data?.pagination}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
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