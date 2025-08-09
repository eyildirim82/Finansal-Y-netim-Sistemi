import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, Calendar, Filter, Download, Eye, Phone, DollarSign } from 'lucide-react'
import reportService from '../services/reportService'
import toast from 'react-hot-toast'

const UnpaidInvoices = () => {
  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    customerId: '',
    startDate: '',
    endDate: '',
    overdueOnly: false,
    sortBy: 'dueDate',
    sortOrder: 'asc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  })
  const [customers, setCustomers] = useState([])

  // Müşterileri yükle
  useEffect(() => {
    loadCustomers()
  }, [])

  // Faturaları yükle
  useEffect(() => {
    loadInvoices()
  }, [filters, pagination.page])

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=1000')
      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error)
    }
  }

  const loadInvoices = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        overdueOnly: filters.overdueOnly.toString()
      })

      if (filters.customerId) params.append('customerId', filters.customerId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await reportService.getUnpaidInvoices(params.toString())
      
      if (response.data.success) {
        setInvoices(response.data.data.invoices)
        setSummary(response.data.data.summary)
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          pages: response.data.data.pagination.pages
        }))
      }
    } catch (error) {
      console.error('Faturalar yüklenirken hata:', error)
      toast.error('Faturalar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Filtre değişince ilk sayfaya dön
  }

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR')
  }

  const getOverdueBadge = (invoice) => {
    if (!invoice.isOverdue) {
      return <span className="badge badge-success">Güncel</span>
    }
    
    if (invoice.overdueDays <= 30) {
      return <span className="badge badge-warning">{invoice.overdueDays} gün gecikmiş</span>
    } else if (invoice.overdueDays <= 60) {
      return <span className="badge badge-orange">{invoice.overdueDays} gün gecikmiş</span>
    } else {
      return <span className="badge badge-danger">{invoice.overdueDays} gün gecikmiş</span>
    }
  }

  const getOverdueCategoryColor = (category) => {
    switch (category) {
      case 'current': return 'text-success-600'
      case 'days30': return 'text-warning-600'
      case 'days60': return 'text-orange-600'
      case 'days90': return 'text-danger-600'
      case 'days90plus': return 'text-red-800'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ödenmemiş Faturalar</h1>
          <p className="text-gray-600">Müşterilerin ödenmemiş faturalarının detaylı listesi</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary btn-md"
            onClick={loadInvoices}
            disabled={loading}
          >
            <Filter className="h-4 w-4 mr-2" />
            Yenile
          </button>
          <button 
            className="btn btn-primary btn-md"
            disabled={!invoices.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-primary-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Toplam Fatura</p>
                  <p className="text-lg font-semibold">{summary.totalInvoices}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-success-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Toplam Tutar</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.totalAmount)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-danger-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Vadesi Geçmiş</p>
                  <p className="text-lg font-semibold">{summary.overdueInvoices}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-danger-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Gecikmiş Tutar</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.overdueAmount)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-warning-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Güncel</p>
                  <p className="text-lg font-semibold">{summary.overdueCategories.current}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Filtreler</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Müşteri</label>
              <select 
                className="input"
                value={filters.customerId}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
              >
                <option value="">Tüm Müşteriler</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Başlangıç Tarihi</label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Bitiş Tarihi</label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Sıralama</label>
              <select 
                className="input"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="dueDate">Vade Tarihi</option>
                <option value="date">Fatura Tarihi</option>
                <option value="amount">Tutar</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="checkbox"
                checked={filters.overdueOnly}
                onChange={(e) => handleFilterChange('overdueOnly', e.target.checked)}
              />
              <span className="ml-2">Sadece vadesi geçmiş faturalar</span>
            </label>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Fatura Listesi</h3>
          <p className="card-description">
            {pagination.total} fatura bulundu
          </p>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Müşteri</th>
                    <th className="table-header-cell">Fatura Tarihi</th>
                    <th className="table-header-cell">Vade Tarihi</th>
                    <th className="table-header-cell">Tutar</th>
                    <th className="table-header-cell">Durum</th>
                    <th className="table-header-cell">Açıklama</th>
                    <th className="table-header-cell">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium">{invoice.customer?.name || 'Bilinmeyen Müşteri'}</div>
                          {invoice.customer?.phone && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {invoice.customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">{formatDate(invoice.date)}</td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}
                        </div>
                      </td>
                      <td className="table-cell font-medium">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="table-cell">
                        {getOverdueBadge(invoice)}
                      </td>
                      <td className="table-cell">
                        <div className="max-w-xs truncate" title={invoice.description}>
                          {invoice.description}
                        </div>
                        {invoice.voucherNo && (
                          <div className="text-sm text-gray-500">
                            Evrak: {invoice.voucherNo}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-sm btn-outline"
                            title="Detayları Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {invoice.customer?.phone && (
                            <a 
                              href={`tel:${invoice.customer.phone}`}
                              className="btn btn-sm btn-outline"
                              title="Ara"
                            >
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FileText className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Fatura bulunamadı</h3>
              <p className="text-gray-500">Seçilen kriterlere uygun ödenmemiş fatura bulunmuyor</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Önceki
                </button>
                
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <button
                      key={page}
                      className={`btn btn-sm ${pagination.page === page ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  )
                })}
                
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UnpaidInvoices
