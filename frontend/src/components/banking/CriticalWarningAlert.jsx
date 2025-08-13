import React from 'react';

const CriticalWarningAlert = ({ missingTransactionsSummary }) => {
  if (missingTransactionsSummary.severity !== 'CRITICAL') return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center">
        <span className="text-2xl mr-2">🔴</span>
        <div>
          <h3 className="text-red-800 font-semibold">Kritik Eksik İşlem Uyarısı!</h3>
          <p className="text-red-700">
            Toplam {missingTransactionsSummary.totalDifference?.toLocaleString('tr-TR')} TL bakiye farkı tespit edildi. 
            {missingTransactionsSummary.missingTransactionsCount} günde eksik işlem bulunuyor.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CriticalWarningAlert;
