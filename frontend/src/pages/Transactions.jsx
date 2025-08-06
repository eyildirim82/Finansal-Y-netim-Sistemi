import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react'
import transactionService from '../services/transactionService'
import categoryService from '../services/categoryService'
import customerService from '../services/customerService'
import Modal from '../components/Modal'
import TransactionForm from '../components/TransactionForm'
import toast from 'react-hot-toast'

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    categoryId: '',
    customerId: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [showForm, setShowForm] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  // İşlemleri yükle
  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...filters
      }
      
      const response = await transactionService.getAllTransactions(params)
      const { data, pagination: paginationData } = response.data
      
      setTransactions(data || [])
      setPagination(prev => ({
        ...prev,
        total: paginationData.total,
        pages: paginationData.pages
      }))
    } catch (error) {
      console.error('İşlemler yüklenirken hata:', error)
      toast.error('İşlemler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // İşlem sil
  const handleDeleteTransaction = async (id) => {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
      return
    }
    
    try {
      await transactionService.deleteTransaction(id)
      toast.success('İşlem başarıyla silindi')
      fetchTransactions()
    } catch (error) {
      console.error('İşlem silinirken hata:', error)
      toast.error('İşlem silinirken hata oluştu')
    }
  }

  // Form işlemleri
  const handleAddTransaction = () => {
    setSelectedTransaction(null)
    setShowForm(true)
  }

  const handleEditTransaction = (transaction) => {
    setSelectedTransaction(transaction)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    fetchTransactions()
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedTransaction(null)
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
    fetchTransactions()
  }

  useEffect(() => {
    fetchTransactions()
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
          <h1 className="text-2xl font-bold text-gray-900">İşlemler</h1>
          <p className="text-gray-600">Gelir, gider ve müşteri işlemlerinizi yönetin</p>
        </div>
        <button 
          className="btn btn-primary btn-md"
          onClick={handleAddTransaction}
        >
          <Plus className="h-4 w-4 mr-2" />
          Yeni İşlem
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="İşlem ara..."
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
              <option value="INCOME">Gelir</option>
              <option value="EXPENSE">Gider</option>
            </select>
            <input
              type="date"
              className="input"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              placeholder="Başlangıç tarihi"
            />
            <input
              type="date"
              className="input"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              placeholder="Bitiş tarihi"
            />
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
          <h3 className="card-title">İşlem Listesi</h3>
          <p className="card-description">Tüm işlemlerinizin detaylı listesi</p>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz işlem bulunmuyor</h3>
              <p className="text-gray-500 mb-6">İlk işleminizi ekleyerek başlayın</p>
              <button className="btn btn-primary btn-md">
                <Plus className="h-4 w-4 mr-2" />
                İlk İşlemi Ekle
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Tarih</th>
                      <th className="table-header-cell">Açıklama</th>
                      <th className="table-header-cell">Kategori</th>
                      <th className="table-header-cell">Müşteri</th>
                      <th className="table-header-cell">Tutar</th>
                      <th className="table-header-cell">Tür</th>
                      <th className="table-header-cell">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="table-row">
                        <td className="table-cell">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="table-cell">
                          {transaction.description}
                        </td>
                        <td className="table-cell">
                          <span 
                            className="badge"
                            style={{ backgroundColor: transaction.category?.color || '#6B7280' }}
                          >
                            {transaction.category?.name || '-'}
                          </span>
                        </td>
                        <td className="table-cell">
                          {transaction.customer?.name || '-'}
                        </td>
                        <td className="table-cell">
                          <span className={`font-medium ${
                            transaction.type === 'INCOME' ? 'text-success-600' :
                            transaction.type === 'EXPENSE' ? 'text-danger-600' :
                            'text-gray-900'
                          }`}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`badge ${
                            transaction.type === 'INCOME' ? 'badge-success' :
                            transaction.type === 'EXPENSE' ? 'badge-danger' :
                            'badge-primary'
                          }`}>
                            {transaction.type === 'INCOME' ? 'Gelir' :
                             transaction.type === 'EXPENSE' ? 'Gider' :
                             'Müşteri'}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary">
                              <Eye className="h-3 w-3" />
                            </button>
                                                             <button 
                                   className="btn btn-sm btn-primary"
                                   onClick={() => handleEditTransaction(transaction)}
                                 >
                                   <Edit className="h-3 w-3" />
                                 </button>
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteTransaction(transaction.id)}
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
                    Toplam {pagination.total} işlem, {pagination.pages} sayfa
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

      {/* Transaction Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={handleCloseForm}
        title={selectedTransaction ? 'İşlem Düzenle' : 'Yeni İşlem'}
        size="lg"
      >
        <TransactionForm
          transaction={selectedTransaction}
          onSuccess={handleFormSuccess}
          onClose={handleCloseForm}
        />
      </Modal>
    </div>
  )
}

export default Transactions 