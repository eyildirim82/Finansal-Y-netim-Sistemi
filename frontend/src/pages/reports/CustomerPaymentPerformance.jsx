import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import reportService from '../../services/reportService'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CustomerPaymentPerformance = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await reportService.getCustomerPaymentPerformance()
      if (response.data.success) {
        setData(response.data.data)
      }
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatNumber = (num) => Number(num).toFixed(2)

  const chartData = data.map(item => ({
    name: item.customer.name,
    late: item.lateInvoicePercentage
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Müşteri Ödeme Performansı</h1>
          <p className="text-gray-600">Müşterilerin ödeme süreleri ve gecikme oranları</p>
        </div>
        <button className="btn btn-secondary btn-md" onClick={loadData} disabled={loading}>
          Yenile
        </button>
      </div>

      <div className="card">
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-left">
                  <thead>
                    <tr>
                      <th className="px-4 py-2">Müşteri</th>
                      <th className="px-4 py-2">Toplam Fatura</th>
                      <th className="px-4 py-2">Ödenen Fatura</th>
                      <th className="px-4 py-2">Ort. Ödeme Günü</th>
                      <th className="px-4 py-2">Gecikme %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(item => (
                      <tr key={item.customer.id} className="border-t">
                        <td className="px-4 py-2">{item.customer.name}</td>
                        <td className="px-4 py-2">{item.totalInvoices}</td>
                        <td className="px-4 py-2">{item.paidInvoices}</td>
                        <td className="px-4 py-2">{formatNumber(item.averagePaymentDays)}</td>
                        <td className="px-4 py-2">{formatNumber(item.lateInvoicePercentage)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.length > 0 && (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" interval={0} angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip formatter={(value) => `${formatNumber(value)}%`} />
                      <Bar dataKey="late" fill="#f87171" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerPaymentPerformance

