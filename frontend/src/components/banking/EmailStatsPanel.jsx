import React from 'react';

const EmailStatsPanel = ({ emailStats }) => {
  if (!emailStats) return null;

  return (
    <div className="mb-4 p-3 bg-green-50 rounded border">
      <h4 className="font-semibold text-green-800">📧 Email Durumu</h4>
      <div className="text-sm text-green-700 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>Toplam Email: {emailStats.totalMessages}</div>
        <div>Okunmamış: {emailStats.unseenMessages}</div>
        <div>Bağlantı: {emailStats.isConnected ? '✅ Aktif' : '❌ Kapalı'}</div>
        <div>Ortalama: {emailStats.metrics?.avgProcessingTime?.toFixed(2)}ms</div>
      </div>
    </div>
  );
};

export default EmailStatsPanel;
