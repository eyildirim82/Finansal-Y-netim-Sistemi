import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import customerService from '../services/customerService';
import reportService from '../services/reportService';
import { ArrowLeft, FileText, AlertTriangle, DollarSign, CheckCircle, Calendar } from 'lucide-react';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState(null);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [paidInvoices, setPaidInvoices] = useState(null);
  const [loadingPaidInvoices, setLoadingPaidInvoices] = useState(false);

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

  // Ödenmemiş faturaları yükle
  useEffect(() => {
    const fetchUnpaidInvoices = async () => {
      if (!customer) return;
      
      try {
        setLoadingInvoices(true);
        const res = await reportService.getCustomerUnpaidInvoicesSummary(id);
        setUnpaidInvoices(res.data.data);
      } catch (err) {
        console.error('Ödenmemiş faturalar yüklenirken hata:', err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchUnpaidInvoices();
  }, [id, customer]);

  // Ödenmiş faturaları yükle
  useEffect(() => {
    const fetchPaidInvoices = async () => {
      if (!customer) return;
      
      try {
        setLoadingPaidInvoices(true);
        const res = await reportService.getCustomerPaidInvoicesSummary(id);
        setPaidInvoices(res.data.data);
      } catch (err) {
        console.error('Ödenmiş faturalar yüklenirken hata:', err);
      } finally {
        setLoadingPaidInvoices(false);
      }
    };
    fetchPaidInvoices();
  }, [id, customer]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

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
            </div>
          </div>
        </div>
      </div>

      {/* Ödenmemiş Faturalar Özeti */}
      {unpaidInvoices && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Ödenmemiş Faturalar
            </h3>
          </div>
          <div className="card-content">
            {loadingInvoices ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Özet Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Toplam Fatura</p>
                        <p className="text-lg font-semibold">{unpaidInvoices.summary.totalInvoices}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Toplam Tutar</p>
                        <p className="text-lg font-semibold">{formatCurrency(unpaidInvoices.summary.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Vadesi Geçmiş</p>
                        <p className="text-lg font-semibold">{unpaidInvoices.summary.overdueInvoices}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 text-orange-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Gecikmiş Tutar</p>
                        <p className="text-lg font-semibold">{formatCurrency(unpaidInvoices.summary.overdueAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fatura Listesi */}
                {unpaidInvoices.invoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Fatura Tarihi</th>
                          <th>Vade Tarihi</th>
                          <th>Tutar</th>
                          <th>Durum</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unpaidInvoices.invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td>{formatDate(invoice.date)}</td>
                            <td>{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                            <td className="font-medium">{formatCurrency(invoice.amount)}</td>
                            <td>
                              {invoice.isOverdue ? (
                                <span className="badge badge-error">{invoice.overdueDays} gün gecikmiş</span>
                              ) : (
                                <span className="badge badge-success">Güncel</span>
                              )}
                            </td>
                            <td>
                              <div className="max-w-xs truncate" title={invoice.description}>
                                {invoice.description}
                              </div>
                              {invoice.voucherNo && (
                                <div className="text-xs text-gray-500">Evrak: {invoice.voucherNo}</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                    <p className="text-gray-500">Bu müşterinin ödenmemiş faturası bulunmuyor</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ödenmiş Faturalar Özeti */}
      {paidInvoices && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Ödenmiş Faturalar
            </h3>
          </div>
          <div className="card-content">
            {loadingPaidInvoices ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Özet Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Toplam Ödeme</p>
                        <p className="text-lg font-semibold">{paidInvoices.summary.totalPayments}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Toplam Tutar</p>
                        <p className="text-lg font-semibold">{formatCurrency(paidInvoices.summary.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Ortalama Ödeme</p>
                        <p className="text-lg font-semibold">{formatCurrency(paidInvoices.summary.averagePayment)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Calendar className="h-6 w-6 text-yellow-600 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Son Ödeme</p>
                        <p className="text-lg font-semibold">
                          {paidInvoices.summary.lastPaymentDate ? formatDate(paidInvoices.summary.lastPaymentDate) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ödeme Listesi */}
                {paidInvoices.payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Ödeme Tarihi</th>
                          <th>Tutar</th>
                          <th>Ödeme Yöntemi</th>
                          <th>Açıklama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paidInvoices.payments.slice(0, 10).map((payment) => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.paymentDate)}</td>
                            <td className="font-medium text-success-600">{formatCurrency(payment.amount)}</td>
                            <td>
                              <span className="badge badge-success">{payment.paymentMethod}</span>
                            </td>
                            <td>
                              <div className="max-w-xs truncate" title={payment.description}>
                                {payment.description}
                              </div>
                              {payment.voucherNo && (
                                <div className="text-xs text-gray-500">Evrak: {payment.voucherNo}</div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {paidInvoices.payments.length > 10 && (
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-500">
                          Son 10 ödeme gösteriliyor. Toplam {paidInvoices.payments.length} ödeme var.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-gray-500">Bu müşterinin ödeme işlemi bulunmuyor</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
