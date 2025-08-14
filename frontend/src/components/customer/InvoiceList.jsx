import React, { useEffect, useState } from 'react';
import reportService from '../../services/reportService';
import { formatCurrency } from '../../utils/formatCurrency';
import { FileText, AlertTriangle, DollarSign, CheckCircle } from 'lucide-react';

const InvoiceList = ({ customerId, onSummaryLoaded }) => {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAllInvoices = async () => {
      if (!customerId) return;

      try {
        setLoading(true);

        const unpaidRes = await reportService.getCustomerUnpaidInvoicesSummary(customerId);
        const unpaidData = unpaidRes.data.data;

        const paidRes = await reportService.getCustomerPaidInvoicesSummary(customerId);
        const paidData = paidRes.data.data;

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

        allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
        setInvoices(allInvoices);

        const summaryData = {
          totalInvoices: allInvoices.length,
          unpaidInvoices: unpaidData.invoices.length,
          paidInvoices: paidData.payments.length,
          totalUnpaidAmount: unpaidData.summary.totalAmount,
          totalPaidAmount: paidData.summary.totalAmount,
          overdueInvoices: unpaidData.summary.overdueInvoices,
          overdueAmount: unpaidData.summary.overdueAmount,
          lastPaymentDate: paidData.summary.lastPaymentDate
        };

        setSummary(summaryData);
        if (onSummaryLoaded) {
          onSummaryLoaded(summaryData);
        }
      } catch (err) {
        console.error('Faturalar yüklenirken hata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllInvoices();
  }, [customerId, onSummaryLoaded]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR');

  const calculateDaysBetween = (startDateString, endDateInput) => {
    const start = new Date(startDateString).getTime();
    const end = endDateInput instanceof Date ? endDateInput.getTime() : new Date(endDateInput).getTime();
    const diffMs = Math.max(0, end - start);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const getElapsedDays = (invoice) => {
    const endDate = invoice.status === 'paid' && invoice.lastPaymentDate
      ? invoice.lastPaymentDate
      : new Date();
    return calculateDaysBetween(invoice.date, endDate);
  };

  const getStatusBadge = (invoice) => {
    if (invoice.documentType) {
      const docType = invoice.documentType.toLowerCase();

      if (docType.includes('iade') || docType.includes('return') || docType.includes('red')) {
        return <span className="badge badge-info">İade</span>;
      }

      if (docType.includes('devir') && docType.includes('fiş')) {
        if (invoice.status === 'paid') {
          return <span className="badge badge-success">Devir Fişi (Ödenmiş)</span>;
        } else if (invoice.isOverdue) {
          return <span className="badge badge-error">Devir Fişi ({invoice.overdueDays} gün gecikmiş)</span>;
        } else {
          return <span className="badge badge-warning">Devir Fişi (Ödenmemiş)</span>;
        }
      }

      if (docType.includes('satış') || docType.includes('sales')) {
        if (invoice.status === 'paid') {
          return <span className="badge badge-success">Satış Faturası (Ödenmiş)</span>;
        } else if (invoice.isOverdue) {
          return <span className="badge badge-error">Satış Faturası ({invoice.overdueDays} gün gecikmiş)</span>;
        } else {
          return <span className="badge badge-warning">Satış Faturası (Ödenmemiş)</span>;
        }
      }

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

    if (invoice.status === 'paid') {
      return <span className="badge badge-success">Ödenmiş</span>;
    } else if (invoice.isOverdue) {
      return <span className="badge badge-error">{invoice.overdueDays} gün gecikmiş</span>;
    } else {
      return <span className="badge badge-warning">Ödenmemiş</span>;
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Fatura Listesi
          </h3>
        </div>
        <div className="card-content">
          {loading ? (
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
                    <th>Geçen Gün</th>
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
                      <td>{getElapsedDays(invoice)} gün</td>
                      <td className="font-medium">{formatCurrency(invoice.amount)}</td>
                      <td>{getStatusBadge(invoice)}</td>
                      <td>
                        {invoice.status === 'paid' && invoice.lastPaymentDate
                          ? formatDate(invoice.lastPaymentDate)
                          : '-'}
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
    </div>
  );
};

export default InvoiceList;
