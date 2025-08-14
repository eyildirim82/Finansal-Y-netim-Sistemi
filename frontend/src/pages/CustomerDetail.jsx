import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import customerService from '../services/customerService';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import InvoiceList from '../components/customer/InvoiceList';
import PaymentList from '../components/customer/PaymentList';
import { formatCurrency } from '../utils/formatCurrency';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices');

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const res = await customerService.getCustomer(id);
        setCustomer(res.data.data);
      } catch (err) {
        setError('Müşteri bulunamadı veya yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <AlertTriangle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Hata</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/customers')}
            className="btn btn-outline btn-sm mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">Müşteri Detayları</p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Müşteri Bilgileri</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Müşteri Kodu</label>
                <p className="text-lg">{customer.code}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Telefon</label>
                <p className="text-lg">{customer.phone || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Adres</label>
                <p className="text-lg">{customer.address || 'Belirtilmemiş'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Vade Günü</label>
                <p className="text-lg">{customer.dueDays ? `${customer.dueDays} gün` : 'Belirtilmemiş'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">İstatistikler</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Kayıt Tarihi</span>
                <span className="font-medium">{formatDate(customer.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Son Güncelleme</span>
                <span className="font-medium">{formatDate(customer.updatedAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Durum</span>
                <span className={`badge ${customer.isActive ? 'badge-success' : 'badge-error'}`}>
                  {customer.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              {summary && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-600 font-medium">Ödenmemiş Fatura Toplamı</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(summary.totalUnpaidAmount)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed">
        <a
          role="tab"
          className={`tab ${activeTab === 'invoices' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          Faturalar
        </a>
        <a
          role="tab"
          className={`tab ${activeTab === 'payments' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Ödemeler
        </a>
      </div>

      {activeTab === 'invoices' && (
        <InvoiceList customerId={id} onSummaryLoaded={setSummary} />
      )}
      {activeTab === 'payments' && <PaymentList customerId={id} />}
    </div>
  );
};

export default CustomerDetail;
