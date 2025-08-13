import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, Calendar, Filter, Download, DollarSign, Users } from 'lucide-react'
import reportService from '../services/reportService'
import toast from 'react-hot-toast'

const UnpaidInvoices = () => {
  const [invoices, setInvoices] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    customerId: '',
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
  const [overdueDays, setOverdueDays] = useState(30)
  const [loadingOverdue, setLoadingOverdue] = useState(false)
  const [overdueSummary, setOverdueSummary] = useState(null)
  const [overdueCustomers, setOverdueCustomers] = useState([])

  // Müşterileri yükle
  useEffect(() => {
    loadCustomers()
  }, [])

  // Faturaları yükle
  useEffect(() => {
    loadInvoices()
  }, [filters, pagination.page])

  // Gün bazlı gecikmiş müşteri özetini yükle
  useEffect(() => {
    loadOverdueByDays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const loadOverdueByDays = async () => {
    try {
      setLoadingOverdue(true)
      const res = await reportService.getOverdueByDays(overdueDays)
      if (res.data.success) {
        setOverdueSummary(res.data.data.summary)
        setOverdueCustomers(res.data.data.customers)
      }
    } catch (error) {
      console.error('Gün bazlı gecikmiş müşteri özeti yüklenirken hata:', error)
      toast.error('Gün bazlı gecikmiş müşteri özeti yüklenirken hata oluştu')
    } finally {
      setLoadingOverdue(false)
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

  //

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div>
              <label className="label">Gün (Müşteri Özeti)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={overdueDays}
                  onChange={(e) => setOverdueDays(Math.max(0, Number(e.target.value)))}
                  placeholder="Örn. 30"
                />
                <button
                  className="btn btn-outline"
                  onClick={loadOverdueByDays}
                  disabled={loadingOverdue}
                >
                  {loadingOverdue ? 'Yükleniyor...' : 'Uygula'}
                </button>
              </div>
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

      {/* Gün Bazlı Gecikmiş Müşteri Özeti */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {overdueDays}+ Gün Gecikmiş (Müşteri Bazlı)
          </h3>
        </div>
        <div className="card-content">
          {loadingOverdue ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
          ) : overdueCustomers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Müşteri Sayısı</p>
                      <p className="text-lg font-semibold">{overdueSummary?.customerCount || overdueCustomers.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <DollarSign className="h-6 w-6 text-orange-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Toplam Gecikmiş Tutar</p>
                      <p className="text-lg font-semibold">{formatCurrency(overdueSummary?.totalOverdueAmount || 0)}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Gün Eşiği</p>
                      <p className="text-lg font-semibold">{overdueDays} gün</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Müşteri</th>
                      <th className="table-header-cell">Kod</th>
                      <th className="table-header-cell">Gecikmiş Fatura Adedi</th>
                      <th className="table-header-cell">Maks. Gecikme (gün)</th>
                      <th className="table-header-cell">Gecikmiş Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueCustomers.map((row, idx) => (
                      <tr key={idx} className="table-row">
                        <td className="table-cell">{row.customer?.name}</td>
                        <td className="table-cell">{row.customer?.code}</td>
                        <td className="table-cell">{row.overdueInvoiceCount}</td>
                        <td className="table-cell">{row.maxOverdueDays}</td>
                        <td className="table-cell font-medium">{formatCurrency(row.overdueAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">Seçilen gün eşiğine göre gecikmiş müşteri bulunmuyor</p>
            </div>
          )}
        </div>
      </div>

      {/* Fatura Listesi kaldırıldı */}
    </div>
  )
}

export default UnpaidInvoices
