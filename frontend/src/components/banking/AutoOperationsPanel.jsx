import React from 'react';

const AutoOperationsPanel = ({
  emailLoading,
  autoMatchingLoading,
  isMonitoring,
  matchingStats,
  onFetchEmails,
  onShowDateRangeModal,
  onFetchLastWeekEmails,
  onToggleMonitoring,
  onTestConnection,
  onShowEmailSettings,
  onRunAutoMatching,
  onShowMissingTransactions,
  showMissingTransactions,
  selectedPdfFile,
  pdfLoading,
  onPdfFileSelect,
  onPdfUpload,
  onPdfETL,
  onShowBulkDeleteModal,
  onShowCleanupModal
}) => {
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">🔄 Otomatik İşlemler</h3>
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={onFetchEmails}
          disabled={emailLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {emailLoading ? '📧 Email Çekiliyor...' : '📧 Email Çek'}
        </button>
        
        <button 
          onClick={onShowDateRangeModal}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          📅 Tarih Aralığı Çek
        </button>
        
        <button 
          onClick={onFetchLastWeekEmails}
          disabled={emailLoading}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
        >
          {emailLoading ? '📧 Çekiliyor...' : '📅 Son 1 Hafta'}
        </button>
        
        <button 
          onClick={onToggleMonitoring}
          className={`px-4 py-2 text-white rounded ${
            isMonitoring ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isMonitoring ? '🛑 Monitoring Durdur' : '🔄 Monitoring Başlat'}
        </button>
        
        <button 
          onClick={onTestConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔗 Bağlantı Testi
        </button>
        
        <button 
          onClick={onShowEmailSettings}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          ⚙️ Email Ayarları
        </button>
        
        <button 
          onClick={onRunAutoMatching}
          disabled={autoMatchingLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {autoMatchingLoading ? '🤖 Eşleştiriliyor...' : '🤖 Otomatik Eşleştir'}
        </button>
        
        <button
          onClick={onShowMissingTransactions}
          className={`px-4 py-2 rounded ${
            showMissingTransactions 
              ? 'bg-gray-600 hover:bg-gray-700 text-white' 
              : 'bg-orange-600 hover:bg-orange-700 text-white'
          }`}
        >
          {showMissingTransactions ? '📊 İşlemleri Gizle' : '🔍 Eksik İşlemleri Göster'}
        </button>
        
        {/* PDF Yükleme Bölümü */}
        <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
          <input
            type="file"
            accept=".pdf"
            onChange={onPdfFileSelect}
            className="hidden"
            id="pdf-file-input"
          />
          <label
            htmlFor="pdf-file-input"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
          >
            📄 PDF Seç
          </label>
          {selectedPdfFile && (
            <>
              <button
                onClick={onPdfUpload}
                disabled={pdfLoading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {pdfLoading ? '📄 Parse Ediliyor...' : '📄 PDF Parse Et'}
              </button>
              <button
                onClick={onPdfETL}
                disabled={pdfLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {pdfLoading ? '⚡ ETL İşleniyor...' : '⚡ PDF ETL İşle'}
              </button>
            </>
          )}
        </div>

        {/* İşlem Silme Bölümü */}
        <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
          <button
            onClick={onShowBulkDeleteModal}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            🗑️ Toplu Sil
          </button>
          <button
            onClick={onShowCleanupModal}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            🧹 Eski İşlemleri Temizle
          </button>
        </div>
      </div>
      
      {/* İstatistikler */}
      {matchingStats && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded shadow">
            <div className="font-bold text-blue-600">Toplam İşlem</div>
            <div>{matchingStats.total}</div>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <div className="font-bold text-green-600">Eşleşen</div>
            <div>{matchingStats.matched}</div>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <div className="font-bold text-red-600">Eşleşmeyen</div>
            <div>{matchingStats.unmatched}</div>
          </div>
          <div className="bg-white p-3 rounded shadow">
            <div className="font-bold text-purple-600">Eşleşme Oranı</div>
            <div>%{matchingStats.matchRate?.toFixed(1)}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoOperationsPanel;
