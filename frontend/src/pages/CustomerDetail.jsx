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
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [summary, setSummary] = useState(null);

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

  // Tüm faturaları yükle
  useEffect(() => {
    const fetchAllInvoices = async () => {
      if (!customer) return;
      
      try {
        setLoadingInvoices(true);
        
        // Ödenmemiş faturaları al
        const unpaidRes = await reportService.getCustomerUnpaidInvoicesSummary(id);
        const unpaidData = unpaidRes.data.data;
        
        // Ödenmiş faturaları al
        const paidRes = await reportService.getCustomerPaidInvoicesSummary(id);
        const paidData = paidRes.data.data;
        
        // Faturaları birleştir
        const allInvoices = [
          ...unpaidData.invoices.map(invoice => ({
            ...invoice,
            status: 'unpaid',
            isOverdue: invoice.isOverdue || false,
            overdueDays: invoice.overdueDays || 0
          })),
          ...paidData.payments.map(invoice => ({
            ...invoice,
            status: 'paid',
            lastPaymentDate: invoice.lastPaymentDate,
            paymentMethod: invoice.paymentMethod
          }))
        ];
        
        // Tarihe göre sırala (en yeni önce)
        allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setInvoices(allInvoices);
        
        // Özet bilgileri
        setSummary({
          totalInvoices: allInvoices.length,
          unpaidInvoices: unpaidData.invoices.length,
          paidInvoices: paidData.payments.length,
          totalUnpaidAmount: unpaidData.summary.totalAmount,
          totalPaidAmount: paidData.summary.totalAmount,
          overdueInvoices: unpaidData.summary.overdueInvoices,
          overdueAmount: unpaidData.summary.overdueAmount,
          lastPaymentDate: paidData.summary.lastPaymentDate
        });
        
      } catch (err) {
        console.error('Faturalar yüklenirken hata:', err);
      } finally {
        setLoadingInvoices(false);
      }
    };
    fetchAllInvoices();
  }, [id, customer]);

  // Ödemeleri yükle
  useEffect(() => {
    const fetchPayments = async () => {
      if (!customer) return;
      
      try {
        setLoadingPayments(true);
        const res = await reportService.getCustomerPayments(id);
        setPayments(res.data.data.payments);
      } catch (err) {
        console.error('Ödemeler yüklenirken hata:', err);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();
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

  const getStatusBadge = (invoice) => {
    // Belge türüne göre durum belirleme
    if (invoice.documentType) {
      const docType = invoice.documentType.toLowerCase();
      
      // İade faturası kontrolü
      if (docType.includes('iade') || docType.includes('return') || docType.includes('red')) {
        return <span className="badge badge-info">İade</span>;
      }
      
      // Devir fişi kontrolü
      if (docType.includes('devir') && docType.includes('fiş')) {
        if (invoice.status === 'paid') {
          return <span className="badge badge-success">Devir Fişi (Ödenmiş)</span>;
        } else if (invoice.isOverdue) {
          return <span className="badge badge-error">Devir Fişi ({invoice.overdueDays} gün gecikmiş)</span>;
        } else {
          return <span className="badge badge-warning">Devir Fişi (Ödenmemiş)</span>;
        }
      }
      
      // Satış faturası kontrolü
      if (docType.includes('satış') || docType.includes('sales')) {
        if (invoice.status === 'paid') {
          return <span className="badge badge-success">Satış Faturası (Ödenmiş)</span>;
        } else if (invoice.isOverdue) {
          return <span className="badge badge-error">Satış Faturası ({invoice.overdueDays} gün gecikmiş)</span>;
        } else {
          return <span className="badge badge-warning">Satış Faturası (Ödenmemiş)</span>;
        }
      }
      
      // Normal fatura kontrolü
      if (docType.includes('fatura') || docType.includes('invoice')) {
        if (invoice.status === 'paid') {
          return <span className="badge badge-success">Fatura (Ödenmiş)</span>;
        } else if (invoice.isOverdue) {
          return <span className="badge badge-error">Fatura ({invoice.overdueDays} gün gecikmiş)</span>;
        } else {
          return <span className="badge badge-warning">Fatura (Ödenmemiş)</span>;
        }
      }
    }
    
    // Genel durum kontrolü (belge türü belirsizse)
    if (invoice.status === 'paid') {
      return <span className="badge badge-success">Ödenmiş</span>;
    } else if (invoice.isOverdue) {
      return <span className="badge badge-error">{invoice.overdueDays} gün gecikmiş</span>;
    } else {
      return <span className="badge badge-warning">Ödenmemiş</span>;
    }
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

      {/* Fatura Özeti */}
      {summary && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Fatura Özeti
            </h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Toplam Fatura</p>
                    <p className="text-lg font-semibold">{summary.totalInvoices}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Ödenmiş</p>
                    <p className="text-lg font-semibold">{summary.paidInvoices}</p>
                  </div>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Ödenmemiş</p>
                    <p className="text-lg font-semibold">{summary.unpaidInvoices}</p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-600">Toplam Borç</p>
                    <p className="text-lg font-semibold">{formatCurrency(summary.totalUnpaidAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fatura Listesi */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Fatura Listesi
          </h3>
        </div>
        <div className="card-content">
          {loadingInvoices ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                                 <thead>
                   <tr>
                     <th>Fatura Tarihi</th>
                     <th>Vade Tarihi</th>
                     <th>Tutar</th>
                     <th>Durum</th>
                     <th>Son Ödeme</th>
                     <th>Ödeme Yöntemi</th>
                   </tr>
                 </thead>
                <tbody>
                                     {invoices.map((invoice) => (
                     <tr key={invoice.id}>
                       <td>{formatDate(invoice.date)}</td>
                       <td>{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</td>
                       <td className="font-medium">{formatCurrency(invoice.amount)}</td>
                       <td>{getStatusBadge(invoice)}</td>
                       <td>
                         {invoice.status === 'paid' && invoice.lastPaymentDate 
                           ? formatDate(invoice.lastPaymentDate) 
                           : '-'
                         }
                       </td>
                       <td>
                         {invoice.status === 'paid' && invoice.paymentMethod ? (
                           <span className="badge badge-success">{invoice.paymentMethod}</span>
                         ) : (
                           '-'
                         )}
                       </td>
                     </tr>
                   ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">Bu müşterinin faturası bulunmuyor</p>
            </div>
          )}
        </div>
      </div>

      {/* Ödeme Listesi */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Ödeme Listesi
          </h3>
        </div>
        <div className="card-content">
          {loadingPayments ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
            </div>
          ) : payments.length > 0 ? (
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
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.date)}</td>
                      <td className="font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                      <td>
                        <span className="badge badge-success">{payment.documentType}</span>
                      </td>
                      <td>{payment.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">Bu müşterinin ödemesi bulunmuyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
