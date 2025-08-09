import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Users, Edit, Trash2, Eye, Phone, Mail, MapPin } from 'lucide-react'
import customerService from '../services/customerService'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    sortBy: 'name',
    sortOrder: 'asc',
    hideFactoring: true // FAKTORİNG müşterilerini varsayılan olarak gizle
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const navigate = useNavigate()

  // Müşterileri yükle
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        hideFactoring: filters.hideFactoring, // FAKTORİNG filtresi ekle
        type: filters.type,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      }
      
             const response = await customerService.getAllCustomers(params)
       console.log('[DEBUG] Customers API Response:', response.data)
       
      
      const { customers, pagination: paginationData } = response.data
      
      setCustomers(customers || [])
      setPagination(prev => ({
        ...prev,
        total: paginationData.total,
        pages: paginationData.pages
      }))
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error)
      toast.error('Müşteriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Müşteri sil
  const handleDeleteCustomer = async (id) => {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
      return
    }
    
    try {
      await customerService.deleteCustomer(id)
      toast.success('Müşteri başarıyla silindi')
      fetchCustomers()
    } catch (error) {
      console.error('Müşteri silinirken hata:', error)
      toast.error('Müşteri silinirken hata oluştu')
    }
  }

  // Eski müşterileri sil
  const handleDeleteOldCustomers = async (deleteAll = false, force = false) => {
    let message = deleteAll ? 
      'TÜM müşterileri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!' :
      'Belirli tarihten önceki müşterileri silmek istediğinizden emin misiniz?'
    
    if (force) {
      message += ' İşlemi olan müşteriler de zorla silinecek!'
    }
    
    if (!confirm(message)) {
      return
    }
    
    try {
      const params = { deleteAll, force }
      if (!deleteAll) {
        const beforeDate = prompt('Hangi tarihten önceki müşteriler silinsin? (YYYY-MM-DD formatında)')
        if (!beforeDate) return
        params.beforeDate = beforeDate
      }
      
      const response = await customerService.deleteOldCustomers(params)
      toast.success(response.data.message)
      fetchCustomers()
    } catch (error) {
      console.error('Eski müşteriler silinirken hata:', error)
      if (error.response?.data?.customersWithTransactions) {
        const customers = error.response.data.customersWithTransactions
        const message = `${customers.length} müşterinin işlemi var. Zorla silmek için tekrar deneyin.`
        toast.error(message)
      } else {
        toast.error('Eski müşteriler silinirken hata oluştu')
      }
    }
  }

  // Sayfa değiştir
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Filtreleri uygula
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Arama yap
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchCustomers()
  }

  useEffect(() => {
    fetchCustomers()
  }, [pagination.page, pagination.limit])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-600">Cari hesap müşterilerinizi yönetin</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-danger btn-md"
            onClick={() => handleDeleteOldCustomers(true, true)}
            title="Tüm müşterileri zorla sil (işlemleri olanlar dahil)"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Tümünü Zorla Sil
          </button>
          <button 
            className="btn btn-danger btn-md"
            onClick={() => handleDeleteOldCustomers(true, false)}
            title="Tüm müşterileri sil"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Tümünü Sil
          </button>
          <button 
            className="btn btn-warning btn-md"
            onClick={() => handleDeleteOldCustomers(false, false)}
            title="Belirli tarihten önceki müşterileri sil"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eskileri Sil
          </button>
          <button className="btn btn-primary btn-md">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Müşteri
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Müşteri ara..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">Tüm Türler</option>
              <option value="INDIVIDUAL">Bireysel</option>
              <option value="CORPORATE">Kurumsal</option>
            </select>
            <select
              className="input"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="name">İsme Göre</option>
              <option value="createdAt">Tarihe Göre</option>
              <option value="balance">Bakiyeye Göre</option>
            </select>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-primary-600 rounded"
                  checked={filters.hideFactoring}
                  onChange={(e) => handleFilterChange('hideFactoring', e.target.checked)}
                />
                <span className="ml-2 text-sm text-gray-700">FAKTORİNG Gizle</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button 
              className="btn btn-secondary btn-md"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              Ara
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Müşteri Listesi</h3>
          <p className="card-description">Tüm müşterilerinizin detaylı listesi</p>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz müşteri bulunmuyor</h3>
              <p className="text-gray-500 mb-6">İlk müşterinizi ekleyerek başlayın</p>
              <button className="btn btn-primary btn-md">
                <Plus className="h-4 w-4 mr-2" />
                İlk Müşteriyi Ekle
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Müşteri</th>
                      <th className="table-header-cell">Telefon</th>
                                              <th className="table-header-cell">Vade Günü</th>
                      <th className="table-header-cell">Bakiye</th>
                      <th className="table-header-cell">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="table-row">
                                                 <td className="table-cell">
                           <div>
                             <div className="font-medium text-gray-900">
                               <button
                                 className="text-primary-600 hover:underline"
                                 onClick={() => navigate(`/customers/${customer.id}`)}
                               >
                                 {customer.name}
                               </button>
                             </div>
                             <div className="text-sm text-gray-500">{customer.code}</div>
                           </div>
                         </td>
                                                 <td className="table-cell">
                           <div className="flex items-center text-sm">
                             <Phone className="h-3 w-3 mr-1" />
                             {customer.phone ? customer.phone : <span className="text-gray-400 italic">Telefon bilgisi yok</span>}
                           </div>
                         </td>
                        <td className="table-cell">
                          <select
                            value={customer.dueDays || ''}
                            onChange={async (e) => {
                              try {
                                const newDueDays = e.target.value;
                                await customerService.updateCustomerDueDays(customer.id, newDueDays ? parseInt(newDueDays) : null);
                                toast.success('Vade günü güncellendi');
                                fetchCustomers(); // Tabloyu yenile
                              } catch (error) {
                                console.error('Vade günü güncellenirken hata:', error);
                                toast.error('Vade günü güncellenirken hata oluştu');
                              }
                            }}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Vade günü seçin...</option>
                            <option value="7">7 gün</option>
                            <option value="15">15 gün</option>
                            <option value="30">30 gün</option>
                            <option value="45">45 gün</option>
                            <option value="60">60 gün</option>
                            <option value="90">90 gün</option>
                            <option value="120">120 gün</option>
                            <option value="180">180 gün</option>
                          </select>
                        </td>
                        <td className="table-cell">
                          <span className={`font-medium ${
                            customer.balance > 0 ? 'text-success-600' :
                            customer.balance < 0 ? 'text-danger-600' :
                            'text-gray-900'
                          }`}>
                            {formatCurrency(customer.balance || 0)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary">
                              <Eye className="h-3 w-3" />
                            </button>
                            <button className="btn btn-sm btn-primary">
                              <Edit className="h-3 w-3" />
                            </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-700">
                    Toplam {pagination.total} müşteri, {pagination.pages} sayfa
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-sm btn-secondary"
                      disabled={pagination.page === 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      Önceki
                    </button>
                    <span className="px-3 py-2 text-sm">
                      Sayfa {pagination.page} / {pagination.pages}
                    </span>
                    <button
                      className="btn btn-sm btn-secondary"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Customers 