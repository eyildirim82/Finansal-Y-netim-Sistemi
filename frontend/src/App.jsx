import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Categories from './pages/Categories'
import Reports from './pages/Reports'
import UnpaidInvoices from './pages/UnpaidInvoices'
import PaidInvoices from './pages/PaidInvoices'
import DebugFifo from './pages/DebugFifo'
import Import from './pages/Import'
import Extracts from './pages/Extracts'
import Banking from './pages/Banking'
import Cash from './pages/Cash'
import ExtractDetail from './pages/ExtractDetail'
import CustomerPaymentPerformance from './pages/reports/CustomerPaymentPerformance'

// Protected Route bileşeni
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  console.log('ProtectedRoute - user:', user, 'loading:', loading)
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  if (!user) {
    console.log('Kullanıcı yok, login sayfasına yönlendiriliyor')
    return <Navigate to="/login" replace />
  }
  
  console.log('Kullanıcı var, içerik gösteriliyor')
  return children
}

// Ana uygulama bileşeni
const AppContent = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="categories" element={<Categories />} />
        <Route path="extracts" element={<Extracts />} />
        <Route path="extracts/:id" element={<ExtractDetail />} />
        <Route path="import" element={<Import />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/customer-payment-performance" element={<CustomerPaymentPerformance />} />
        <Route path="unpaid-invoices" element={<UnpaidInvoices />} />
        <Route path="paid-invoices" element={<PaidInvoices />} />
        <Route path="debug-fifo" element={<DebugFifo />} />
        <Route path="cash" element={<Cash />} />
        <Route path="banking" element={<Banking />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Ana App bileşeni
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App 