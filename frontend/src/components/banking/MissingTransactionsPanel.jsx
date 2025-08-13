import React from 'react';

const MissingTransactionsPanel = ({ 
  showMissingTransactions,
  missingTransactions,
  missingTransactionsSummary,
  getSeverityColor,
  getSeverityIcon
}) => {
  if (!showMissingTransactions) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">🔍 Eksik İşlem Analizi</h2>
      
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Toplam Fark</p>
              <p className="text-2xl font-bold text-red-600">
                {missingTransactionsSummary.totalDifference?.toLocaleString('tr-TR')} TL
              </p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kritik Sorunlar</p>
              <p className="text-2xl font-bold text-red-600">
                {missingTransactionsSummary.criticalIssues || 0}
              </p>
            </div>
            <span className="text-3xl">⚠️</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eksik Günler</p>
              <p className="text-2xl font-bold text-orange-600">
                {missingTransactionsSummary.missingTransactionsCount || 0}
              </p>
            </div>
            <span className="text-3xl">📅</span>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Durum</p>
              <p className={`text-lg font-bold ${getSeverityColor(missingTransactionsSummary.severity)}`}>
                {getSeverityIcon(missingTransactionsSummary.severity)} {missingTransactionsSummary.severity}
              </p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
      </div>

      {/* Eksik İşlem Detayları */}
      {missingTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Günlük Eksik İşlem Detayları</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tarih</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tahmini Eksik Tutar</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Yön</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Güven</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Kritik Sorunlar</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Toplam Fark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {missingTransactions.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">
                      {item.estimatedAmount.toLocaleString('tr-TR')} TL
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.direction === 'IN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.direction === 'IN' ? 'Gelen' : 'Giden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.confidence > 0.8 
                          ? 'bg-green-100 text-green-800' 
                          : item.confidence > 0.5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        %{(item.confidence * 100).toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {item.criticalIssues || 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">
                      {item.totalDifference?.toLocaleString('tr-TR')} TL
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissingTransactionsPanel;
