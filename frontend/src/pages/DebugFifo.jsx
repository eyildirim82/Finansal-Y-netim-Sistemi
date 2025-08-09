import { useState, useEffect } from 'react'
import { Bug, Eye, DollarSign, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import reportService from '../services/reportService'

const DebugFifo = () => {
  const [debugData, setDebugData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('')

  useEffect(() => {
    loadDebugData()
  }, [])

  const loadDebugData = async () => {
    try {
      setLoading(true)
      const response = await reportService.getDebugFifo()
      
      if (response.data.success) {
        setDebugData(response.data.data)
      }
    } catch (error) {
      console.error('Debug verisi yüklenirken hata:', error)
      toast.error('Debug verisi yüklenirken hata oluştu')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!debugData) {
    return (
      <div className="text-center py-12">
        <Bug className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Debug verisi bulunamadı</h3>
        <p className="text-gray-500">FIFO hesaplaması debug verisi yüklenemedi</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FIFO Debug</h1>
          <p className="text-gray-600">FIFO hesaplamasının detaylı analizi</p>
        </div>
        <button 
          className="btn btn-secondary btn-md"
          onClick={loadDebugData}
          disabled={loading}
        >
          <Bug className="h-4 w-4 mr-2" />
          Yenile
        </button>
      </div>

      {/* Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Özet</h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Eye className="h-6 w-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Toplam Müşteri</p>
                  <p className="text-lg font-semibold">{debugData.summary.totalCustomers}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Toplam Fatura</p>
                  <p className="text-lg font-semibold">{debugData.summary.totalInvoices}</p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-gray-600">Toplam Ödeme</p>
                  <p className="text-lg font-semibold">{debugData.summary.totalPayments}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Filter */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Müşteri Filtresi</h3>
        </div>
        <div className="card-content">
          <select 
            className="input w-full md:w-64"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">Tüm Müşteriler</option>
            {debugData.debugResults.map((result, index) => (
              <option key={index} value={index}>
                {result.customer?.name || 'Bilinmeyen Müşteri'} ({result.customer?.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Debug Results */}
      {debugData.debugResults.map((result, customerIndex) => {
        if (selectedCustomer !== '' && parseInt(selectedCustomer) !== customerIndex) {
          return null
        }

        return (
          <div key={customerIndex} className="card">
            <div className="card-header">
              <h3 className="card-title">
                {result.customer?.name || 'Bilinmeyen Müşteri'} ({result.customer?.code})
              </h3>
              <p className="card-description">
                {result.invoices.length} fatura, {result.payments.length} ödeme
              </p>
            </div>
            <div className="card-content">
              <div className="space-y-6">
                {/* Faturalar */}
                <div>
                  <h4 className="text-lg font-medium mb-3">Faturalar</h4>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Tutar</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>{formatDate(invoice.date)}</td>
                            <td className="font-medium">{formatCurrency(invoice.debit)}</td>
                            <td>{invoice.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ödemeler */}
                <div>
                  <h4 className="text-lg font-medium mb-3">Ödemeler</h4>
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Tarih</th>
                          <th>Tutar</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.date)}</td>
                            <td className="font-medium text-success-600">{formatCurrency(payment.credit)}</td>
                            <td>{payment.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* FIFO Hesaplaması */}
                <div>
                  <h4 className="text-lg font-medium mb-3">FIFO Hesaplaması</h4>
                  <div className="space-y-4">
                    {result.fifoCalculation.map((calc, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-medium">
                              Fatura #{index + 1} - {formatDate(calc.invoiceDate)}
                            </h5>
                            <p className="text-sm text-gray-600">{formatCurrency(calc.invoiceAmount)}</p>
                          </div>
                          <div className="text-right">
                            <span className={`badge ${calc.isFullyPaid ? 'badge-success' : 'badge-warning'}`}>
                              {calc.isFullyPaid ? 'Tamamen Ödendi' : 'Kısmen Ödendi'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Ödenen Tutar</p>
                            <p className="font-medium text-success-600">{formatCurrency(calc.totalPaid)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Kalan Tutar</p>
                            <p className="font-medium text-danger-600">{formatCurrency(calc.remainingAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Ödeme Sayısı</p>
                            <p className="font-medium">{calc.payments.length}</p>
                          </div>
                        </div>

                        {calc.payments.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Kullanılan Ödemeler:</p>
                            <div className="space-y-2">
                              {calc.payments.map((payment, pIndex) => (
                                <div key={pIndex} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                  <div>
                                    <span className="font-medium">{formatDate(payment.paymentDate)}</span>
                                    <span className="text-gray-600 ml-2">- {payment.description}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-success-600 font-medium">
                                      {formatCurrency(payment.paymentAmount)}
                                    </span>
                                    <span className="text-gray-500 ml-1">
                                      / {formatCurrency(payment.originalPaymentAmount)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DebugFifo
