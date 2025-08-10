import { useState, useEffect } from 'react'
import { FileText, CheckCircle, Calendar, Filter, Download, Eye, Phone, DollarSign, CreditCard } from 'lucide-react'
import reportService from '../services/reportService'
import toast from 'react-hot-toast'

const PaidInvoices = () => {
  const [paidInvoices, setPaidInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    customerId: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc'
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

  // Ödenmiş faturaları yükle
  useEffect(() => {
    loadPaidInvoices()
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

  const loadPaidInvoices = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      })

      if (filters.customerId) params.append('customerId', filters.customerId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await reportService.getPaidInvoices(params.toString())
      
      if (response.data.success) {
        setPaidInvoices(response.data.data.payments)
        setSummary(response.data.data.summary)
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination.total,
          pages: response.data.data.pagination.pages
        }))
      }
    } catch (error) {
      console.error('Ödenmiş faturalar yüklenirken hata:', error)
      toast.error('Ödenmiş faturalar yüklenirken hata oluştu')
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

  const getPaymentMethodBadge = (method) => {
    const methodMap = {
      'Nakit': { color: 'badge-success', icon: '💵' },
      'Banka': { color: 'badge-primary', icon: '🏦' },
      'Çek': { color: 'badge-warning', icon: '📄' }
    }
    
    const config = methodMap[method] || { color: 'badge-secondary', icon: '💳' }
    
    return (
      <span className={`badge ${config.color}`}>
        {config.icon} {method}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ödenmiş Faturalar</h1>
          <p className="text-gray-600">FIFO mantığı ile hesaplanan tamamen ödenmiş faturalar</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary btn-md"
            onClick={loadPaidInvoices}
            disabled={loading}
          >
            <Filter className="h-4 w-4 mr-2" />
            Yenile
          </button>
          <button 
            className="btn btn-primary btn-md"
            disabled={!paidInvoices.length}
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
                <CheckCircle className="h-8 w-8 text-success-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Ödenmiş Fatura</p>
                  <p className="text-lg font-semibold">{summary.totalPaidInvoices}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-primary-600" />
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
                <DollarSign className="h-8 w-8 text-info-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Ortalama Fatura</p>
                  <p className="text-lg font-semibold">{formatCurrency(summary.averagePayment)}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-warning-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Banka Ödemeleri</p>
                  <p className="text-lg font-semibold">{summary.paymentMethods.bank}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-success-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500">Nakit Ödemeler</p>
                  <p className="text-lg font-semibold">{summary.paymentMethods.cash}</p>
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
                <option value="date">Son Ödeme Tarihi</option>
                <option value="amount">Fatura Tutarı</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Paid Invoices Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Ödenmiş Fatura Listesi</h3>
          <p className="card-description">
            {pagination.total} ödenmiş fatura bulundu (FIFO mantığı ile hesaplanmıştır)
          </p>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : paidInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Müşteri</th>
                    <th className="table-header-cell">Fatura Tarihi</th>
                    <th className="table-header-cell">Son Ödeme Tarihi</th>
                    <th className="table-header-cell">Fatura Tutarı</th>
                    <th className="table-header-cell">Ödeme Yöntemi</th>
                    <th className="table-header-cell">Açıklama</th>
                    <th className="table-header-cell">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {paidInvoices.map((invoice) => (
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
                      <td className="table-cell">{formatDate(invoice.lastPaymentDate)}</td>
                      <td className="table-cell font-medium text-success-600">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="table-cell">
                        {getPaymentMethodBadge(invoice.paymentMethod)}
                      </td>
                      <td className="table-cell">
                        <div className="max-w-xs truncate" title={invoice.description}>
                          {invoice.description || 'Açıklama yok'}
                        </div>
                        {invoice.payments?.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={invoice.payments[invoice.payments.length - 1]?.description}>
                            Son ödeme: {invoice.payments[invoice.payments.length - 1]?.description || '-'}
                          </div>
                        )}
                        {invoice.voucherNo && (
                          <div className="text-sm text-gray-500">
                            Evrak: {invoice.voucherNo}
                          </div>
                        )}
                        <div className="text-xs text-green-600 mt-1">
                          {invoice.payments?.length || 0} ödeme ile tamamlandı
                        </div>
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
                <CheckCircle className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ödenmiş fatura bulunamadı</h3>
              <p className="text-gray-500">Seçilen kriterlere uygun tamamen ödenmiş fatura bulunmuyor</p>
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

export default PaidInvoices
