import React from 'react';

const TransactionTable = ({ 
  transactions, 
  deleteLoading, 
  onDeleteTransaction 
}) => {
  return (
    <table className="min-w-full border text-xs">
      <thead>
        <tr>
          <th className="border px-2">Tarih</th>
          <th className="border px-2">Tutar</th>
          <th className="border px-2">Yön</th>
          <th className="border px-2">Gönderen</th>
          <th className="border px-2">Alıcı</th>
          <th className="border px-2">Bakiye</th>
          <th className="border px-2">Durum</th>
          <th className="border px-2">İşlemler</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(tx => (
          <tr key={tx.id}>
            <td className="border px-2">{new Date(tx.transactionDate).toLocaleString()}</td>
            <td className="border px-2">{tx.amount} TL</td>
            <td className="border px-2">{tx.direction === 'IN' ? 'Gelen' : 'Giden'}</td>
            <td className="border px-2">{tx.senderName}</td>
            <td className="border px-2">{tx.counterpartyName}</td>
            <td className="border px-2">
              {tx.balanceAfter ? (
                <span className="font-semibold text-green-600">
                  {tx.balanceAfter.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </td>
            <td className="border px-2">{tx.isMatched ? 'Eşleşti' : 'Bekliyor'}</td>
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
  );
};

export default TransactionTable;
