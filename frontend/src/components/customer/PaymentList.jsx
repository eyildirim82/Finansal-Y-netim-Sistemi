import React, { useEffect, useState } from 'react';
import reportService from '../../services/reportService';
import { formatCurrency } from '../../utils/formatCurrency';
import { DollarSign } from 'lucide-react';

const PaymentList = ({ customerId }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!customerId) return;
      try {
        setLoading(true);
        const res = await reportService.getCustomerPayments(customerId);
        setPayments(res.data.data.payments);
      } catch (err) {
        console.error('Ödemeler yüklenirken hata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [customerId]);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR');

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title flex items-center">
          <DollarSign className="h-5 w-5 mr-2" />
          Ödeme Listesi
        </h3>
      </div>
      <div className="card-content">
        {loading ? (
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
  );
};

export default PaymentList;
