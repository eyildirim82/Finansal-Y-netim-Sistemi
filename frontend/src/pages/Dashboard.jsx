import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard } from 'lucide-react'
import reportService from '../services/reportService'
import transactionService from '../services/transactionService'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    totalCustomers: 0,
    totalTransactions: 0
  })

  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Dashboard özet verilerini al
        const dashboardResponse = await reportService.getDashboardSummary()
        const dashboardData = dashboardResponse.data
        
        // Son işlemleri al
        const transactionsResponse = await transactionService.getAllTransactions({
          limit: 5,
          sortBy: 'date',
          sortOrder: 'desc'
        })
        const transactionsData = transactionsResponse.data.transactions
        
        setStats({
          totalIncome: dashboardData.totalIncome || 0,
          totalExpense: dashboardData.totalExpense || 0,
          totalCustomers: dashboardData.customerCount || 0,
          totalTransactions: dashboardData.totalTransactions || 0
        })
        
        setRecentTransactions(transactionsData || [])
      } catch (error) {
        console.error('Dashboard verileri alınırken hata:', error)
        toast.error('Dashboard verileri alınırken hata oluştu')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Finansal durumunuzun genel özeti</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Gelir
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalIncome)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-8 w-8 text-danger-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Gider
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(stats.totalExpense)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Müşteri
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalCustomers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam İşlem
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalTransactions}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Son İşlemler</h3>
          <p className="card-description">Son 5 işleminizin listesi</p>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Tarih</th>
                  <th className="table-header-cell">Açıklama</th>
                  <th className="table-header-cell">Müşteri</th>
                  <th className="table-header-cell">Tutar</th>
                  <th className="table-header-cell">Tür</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="table-row">
                    <td className="table-cell">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="table-cell">
                      {transaction.description}
                    </td>
                    <td className="table-cell">
                      {transaction.customer || '-'}
                    </td>
                    <td className="table-cell">
                      <span className={`font-medium ${
                        transaction.type === 'income' ? 'text-success-600' :
                        transaction.type === 'expense' ? 'text-danger-600' :
                        'text-gray-900'
                      }`}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${
                        transaction.type === 'income' ? 'badge-success' :
                        transaction.type === 'expense' ? 'badge-danger' :
                        'badge-primary'
                      }`}>
                        {transaction.type === 'income' ? 'Gelir' :
                         transaction.type === 'expense' ? 'Gider' :
                         'Müşteri'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 