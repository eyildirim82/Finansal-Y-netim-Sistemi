import { useState, useEffect } from 'react'
import { BarChart3, Download, Calendar, TrendingUp, TrendingDown, DollarSign, Users } from 'lucide-react'
import reportService from '../services/reportService'
import toast from 'react-hot-toast'

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState('')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [overdueDays, setOverdueDays] = useState(30)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  const reports = [
    { id: 'dashboard', name: 'Dashboard Özeti', description: 'Genel finansal durum özeti' },
    { id: 'monthly-trend', name: 'Aylık Trend', description: 'Aylık gelir ve gider trendi' },
    { id: 'category', name: 'Kategori Raporu', description: 'Kategori bazlı analiz' },
    { id: 'customer', name: 'Müşteri Raporu', description: 'Müşteri bazlı işlem özeti' },
    { id: 'cash-flow', name: 'Nakit Akışı', description: 'Nakit giriş ve çıkış raporu' },
    { id: 'overdue-by-days', name: 'Gecikmiş Faturalar (Gün Bazlı)', description: 'Seçilen gün eşiğini aşan ödenmemiş faturaların müşteri bazlı toplamı' }
  ]

  // Rapor yükle
  const loadReport = async (reportId) => {
    try {
      setLoading(true)
      setReportData(null)
      
      const params = {}
      if (dateRange.startDate) params.startDate = dateRange.startDate
      if (dateRange.endDate) params.endDate = dateRange.endDate
      
      let response
      switch (reportId) {
        case 'dashboard':
          response = await reportService.getDashboardSummary(params)
          break
        case 'monthly-trend':
          response = await reportService.getMonthlyTrend(params)
          break
        case 'category':
          response = await reportService.getCategoryReport(params)
          break
        case 'customer':
          response = await reportService.getCustomerReport(params)
          break
        case 'cash-flow':
          response = await reportService.getCashFlowReport(params)
          break
        case 'overdue-by-days':
          response = await reportService.getOverdueByDays(overdueDays)
          break
        default:
          throw new Error('Geçersiz rapor türü')
      }
      
      setReportData(response.data.data)
    } catch (error) {
      console.error('Rapor yüklenirken hata:', error)
      toast.error('Rapor yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Rapor seç
  const handleReportSelect = (reportId) => {
    setSelectedReport(reportId)
    loadReport(reportId)
  }

  // Tarih değişikliği
  const handleDateChange = (key, value) => {
    setDateRange(prev => ({ ...prev, [key]: value }))
  }

  // Raporu yenile
  const refreshReport = () => {
    if (selectedReport) {
      loadReport(selectedReport)
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-600">Finansal durumunuzun detaylı analizleri</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input
              type="date"
              className="input"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              placeholder="Başlangıç tarihi"
            />
            <input
              type="date"
              className="input"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              placeholder="Bitiş tarihi"
            />
            {selectedReport === 'overdue-by-days' && (
              <input
                type="number"
                min={0}
                className="input w-40"
                value={overdueDays}
                onChange={(e) => setOverdueDays(Math.max(0, Number(e.target.value)))}
                placeholder="Gün (örn. 30)"
                title="Gün eşiği"
              />)
            }
          </div>
          <button 
            className="btn btn-secondary btn-md"
            onClick={refreshReport}
            disabled={!selectedReport}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Yenile
          </button>
          <button 
            className="btn btn-primary btn-md"
            disabled={!selectedReport || !reportData}
          >
            <Download className="h-4 w-4 mr-2" />
            Rapor İndir
          </button>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`card cursor-pointer transition-colors ${
              selectedReport === report.id ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
            }`}
            onClick={() => handleReportSelect(report.id)}
          >
            <div className="card-content">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-primary-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{report.name}</h3>
                  <p className="text-xs text-gray-500">{report.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Report Content */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {selectedReport ? reports.find(r => r.id === selectedReport)?.name : 'Rapor Seçin'}
          </h3>
          <p className="card-description">
            {selectedReport ? reports.find(r => r.id === selectedReport)?.description : 'Görüntülemek istediğiniz raporu seçin'}
          </p>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : !selectedReport ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Rapor seçilmedi</h3>
              <p className="text-gray-500">Yukarıdaki raporlardan birini seçerek başlayın</p>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Dashboard Summary */}
              {selectedReport === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card">
                    <div className="card-content">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-success-600" />
                        <div className="ml-4">
                          <p className="text-sm text-gray-500">Toplam Gelir</p>
                          <p className="text-lg font-semibold">{formatCurrency(reportData.totalIncome || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-content">
                      <div className="flex items-center">
                        <TrendingDown className="h-8 w-8 text-danger-600" />
                        <div className="ml-4">
                          <p className="text-sm text-gray-500">Toplam Gider</p>
                          <p className="text-lg font-semibold">{formatCurrency(reportData.totalExpense || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-content">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-primary-600" />
                        <div className="ml-4">
                          <p className="text-sm text-gray-500">Net Kar</p>
                          <p className="text-lg font-semibold">{formatCurrency((reportData.totalIncome || 0) - (reportData.totalExpense || 0))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-content">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-warning-600" />
                        <div className="ml-4">
                          <p className="text-sm text-gray-500">Toplam Müşteri</p>
                          <p className="text-lg font-semibold">{reportData.totalCustomers || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Trend */}
              {selectedReport === 'monthly-trend' && reportData.monthlyData && (
                <div>
                  <h4 className="text-lg font-medium mb-4">Aylık Trend</h4>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Ay</th>
                          <th className="table-header-cell">Gelir</th>
                          <th className="table-header-cell">Gider</th>
                          <th className="table-header-cell">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.monthlyData.map((month, index) => (
                          <tr key={index} className="table-row">
                            <td className="table-cell">{month.month}</td>
                            <td className="table-cell text-success-600">{formatCurrency(month.income)}</td>
                            <td className="table-cell text-danger-600">{formatCurrency(month.expense)}</td>
                            <td className="table-cell font-medium">{formatCurrency(month.income - month.expense)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Category Report */}
              {selectedReport === 'category' && reportData.categories && (
                <div>
                  <h4 className="text-lg font-medium mb-4">Kategori Analizi</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reportData.categories.map((category, index) => (
                      <div key={index} className="card">
                        <div className="card-content">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-medium">{category.name}</h5>
                              <p className="text-sm text-gray-500">{category.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">{formatCurrency(category.total)}</p>
                              <p className="text-sm text-gray-500">{category.count} işlem</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Report */}
              {selectedReport === 'customer' && reportData.customers && (
                <div>
                  <h4 className="text-lg font-medium mb-4">Müşteri Analizi</h4>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead className="table-header">
                        <tr>
                          <th className="table-header-cell">Müşteri</th>
                          <th className="table-header-cell">Toplam İşlem</th>
                          <th className="table-header-cell">Toplam Tutar</th>
                          <th className="table-header-cell">Son İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.customers.map((customer, index) => (
                          <tr key={index} className="table-row">
                            <td className="table-cell">{customer.name}</td>
                            <td className="table-cell">{customer.transactionCount}</td>
                            <td className="table-cell">{formatCurrency(customer.totalAmount)}</td>
                            <td className="table-cell">{formatDate(customer.lastTransaction)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Cash Flow Report */}
              {selectedReport === 'cash-flow' && reportData.cashFlow && (
                <div>
                  <h4 className="text-lg font-medium mb-4">Nakit Akışı</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                      <div className="card-content">
                        <h5 className="font-medium text-success-600">Nakit Giriş</h5>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.cashFlow.inflow)}</p>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-content">
                        <h5 className="font-medium text-danger-600">Nakit Çıkış</h5>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.cashFlow.outflow)}</p>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-content">
                        <h5 className="font-medium text-primary-600">Net Nakit</h5>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.cashFlow.netFlow)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Overdue By Days Report */}
              {selectedReport === 'overdue-by-days' && reportData.customers && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium">
                      {overdueDays}+ gün gecikmiş faturalar (Müşteri Bazlı)
                    </h4>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Toplam Müşteri</p>
                      <p className="text-lg font-semibold">{reportData.summary?.customerCount || reportData.customers.length}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <span className="text-sm text-gray-600">Toplam Gecikmiş Tutar: </span>
                    <span className="text-lg font-semibold">{formatCurrency(reportData.summary?.totalOverdueAmount || 0)}</span>
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
                        {reportData.customers.map((row, idx) => (
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
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Rapor verisi bulunamadı</h3>
              <p className="text-gray-500">Seçilen tarih aralığında veri bulunmuyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports 