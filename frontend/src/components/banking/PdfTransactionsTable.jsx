import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';

const PdfTransactionsTable = ({ 
  pdfTransactions, 
  deleteLoading, 
  onDeleteTransaction 
}) => {
  return (
    <div>
      <table className="min-w-full border text-xs">
        <thead>
          <tr>
            <th className="border px-2">Tarih</th>
            <th className="border px-2">Açıklama</th>
            <th className="border px-2">Borç</th>
            <th className="border px-2">Alacak</th>
            <th className="border px-2">Bakiye</th>
            <th className="border px-2">Kategori</th>
            <th className="border px-2">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {pdfTransactions.map(tx => (
            <tr key={tx.id}>
              <td className="border px-2">{new Date(tx.dateTimeIso).toLocaleString()}</td>
              <td className="border px-2 max-w-xs truncate">{tx.description}</td>
              <td className="border px-2">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
              <td className="border px-2">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
              <td className="border px-2 font-medium">{formatCurrency(tx.balance)}</td>
              <td className="border px-2">
                <span
                  className={`px-1 py-0.5 rounded text-xs ${
                    tx.category === 'invoice'
                      ? 'bg-red-100 text-red-800'
                      : tx.category === 'incoming'
                      ? 'bg-green-100 text-green-800'
                      : tx.category === 'outgoing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {tx.category || 'Diğer'}
                </span>
              </td>
              <td className="border px-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => onDeleteTransaction(tx.id)}
                    disabled={deleteLoading}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50"
                    title="İşlemi Sil"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PdfTransactionsTable;
