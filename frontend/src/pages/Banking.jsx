import React, { useEffect, useState } from 'react';
import bankingService from '../services/bankingService';
import customerService from '../services/customerService';
import { getMissingTransactions } from '../services/bankingService';
import { formatCurrency } from '../utils/formatCurrency';

const Banking = () => {
  const [transactions, setTransactions] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [pdfTransactions, setPdfTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [matchMsg, setMatchMsg] = useState('');
  const [emailStats, setEmailStats] = useState(null);
  const [matchingStats, setMatchingStats] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [autoMatchingLoading, setAutoMatchingLoading] = useState(false);
  
  // Yeni state'ler
  const [emailSettings, setEmailSettings] = useState(null);
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [dateRangeLoading, setDateRangeLoading] = useState(false);
  const [missingTransactions, setMissingTransactions] = useState([]);
  const [missingTransactionsSummary, setMissingTransactionsSummary] = useState({});
  const [showMissingTransactions, setShowMissingTransactions] = useState(false);
  
  // PDF işlemleri için state'ler
  const [pdfData, setPdfData] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);

  // İşlem silme için state'ler
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [cleanupDate, setCleanupDate] = useState('');
  const [cleanupDryRun, setCleanupDryRun] = useState(true);

  useEffect(() => {
    fetchData();
    fetchEmailStats();
    fetchEmailSettings();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Veri yükleniyor...');
      const [
        transactionsRes,
        unmatchedRes,
        customersRes,
        matchingStatsRes,
        emailStatsRes,
        missingTransactionsRes,
        pdfTransactionsRes
      ] = await Promise.all([
        bankingService.getTransactions(),
        bankingService.getUnmatchedPayments(),
        customerService.getCustomers(),
        bankingService.getMatchingStats(),
        bankingService.getEmailStats(),
        getMissingTransactions(),
        bankingService.getPDFTransactions()
      ]);

      console.log('📊 Transactions Response:', transactionsRes);
      console.log('📊 Unmatched Response:', unmatchedRes);
      console.log('📊 Customers Response:', customersRes);
      console.log('📊 Matching Stats Response:', matchingStatsRes);
      console.log('📊 Email Stats Response:', emailStatsRes);
      console.log('📊 Missing Transactions Response:', missingTransactionsRes);

      // Response yapısını düzgün parse et
      const transactions = transactionsRes.data?.transactions || transactionsRes.transactions || transactionsRes || [];
      const unmatched = unmatchedRes.data || unmatchedRes || [];
      const customers = customersRes.data || customersRes || [];
      
      console.log(`📈 Transactions count: ${transactions.length}`);
      console.log(`📈 Unmatched count: ${unmatched.length}`);
      console.log(`📈 Customers count: ${customers.length}`);

      setTransactions(transactions);
      setUnmatched(unmatched);
      setCustomers(customers);
      setMatchingStats(matchingStatsRes.data || matchingStatsRes);
      setEmailStats(emailStatsRes.data || emailStatsRes);
      
      if (missingTransactionsRes.data) {
        setMissingTransactions(missingTransactionsRes.data.missingTransactions || []);
        setMissingTransactionsSummary(missingTransactionsRes.data.summary || {});
      } else if (missingTransactionsRes.missingTransactions) {
        setMissingTransactions(missingTransactionsRes.missingTransactions || []);
        setMissingTransactionsSummary(missingTransactionsRes.summary || {});
      }

      if (pdfTransactionsRes.data) {
        setPdfTransactions(pdfTransactionsRes.data.transactions || []);
      } else if (pdfTransactionsRes.transactions) {
        setPdfTransactions(pdfTransactionsRes.transactions || []);
      }

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailStats = async () => {
    try {
      const stats = await bankingService.getEmailStats();
      setEmailStats(stats.data);
    } catch (error) {
      console.error('Email istatistikleri yükleme hatası:', error);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const settings = await bankingService.getEmailSettings();
      setEmailSettings(settings.data);
    } catch (error) {
      console.error('Email ayarları yükleme hatası:', error);
    }
  };

  const fetchUnmatched = async () => {
    setLoading(true);
    const data = await bankingService.getUnmatchedPayments();
    setUnmatched(data.data || []);
    setLoading(false);
  };

  // Otomatik email çekme
  const handleFetchEmails = async () => {
    try {
      setEmailLoading(true);
      const result = await bankingService.fetchEmails();
      setEmailStats(result.data);
      
      // Verileri yenile
      await fetchData();
      await fetchEmailStats();
      
      alert(`✅ ${result.data.processed} email işlendi, ${result.data.duplicates} duplikasyon`);
    } catch (error) {
      console.error('Email çekme hatası:', error);
      alert('❌ Email çekme sırasında hata oluştu');
    } finally {
      setEmailLoading(false);
    }
  };

  // Tarih aralığında email çekme
  const handleFetchEmailsByDateRange = async () => {
    if (!startDate || !endDate) {
      alert('Lütfen başlangıç ve bitiş tarihi seçin');
      return;
    }

    try {
      setDateRangeLoading(true);
      const result = await bankingService.fetchEmailsByDateRange(startDate, endDate);
      
      // Verileri yenile
      await fetchData();
      await fetchEmailStats();
      
      setShowDateRangeModal(false);
      alert(`✅ ${result.data.processed} email işlendi, ${result.data.duplicates} duplikasyon`);
    } catch (error) {
      console.error('Tarih aralığı email çekme hatası:', error);
      alert('❌ Tarih aralığında email çekme sırasında hata oluştu');
    } finally {
      setDateRangeLoading(false);
    }
  };

  // Son 1 haftanın e-postalarını çek
  const handleFetchLastWeekEmails = async () => {
    try {
      setEmailLoading(true);
      
      // Son 1 haftanın tarih aralığını hesapla
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      const result = await bankingService.fetchEmailsByDateRange(startDateStr, endDate);
      
      // Verileri yenile
      await fetchData();
      await fetchEmailStats();
      
      alert(`✅ Son 1 hafta: ${result.data.processed} email işlendi, ${result.data.duplicates} duplikasyon`);
    } catch (error) {
      console.error('Son 1 hafta email çekme hatası:', error);
      alert('❌ Son 1 haftanın e-postaları çekilirken hata oluştu');
    } finally {
      setEmailLoading(false);
    }
  };

  // Realtime monitoring başlat/durdur
  const handleToggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await bankingService.stopRealtimeMonitoring();
        setIsMonitoring(false);
        alert('🛑 Realtime monitoring durduruldu');
      } else {
        await bankingService.startRealtimeMonitoring();
        setIsMonitoring(true);
        alert('🔄 Realtime monitoring başlatıldı');
      }
    } catch (error) {
      console.error('Monitoring hatası:', error);
      alert('❌ Monitoring işlemi başarısız');
    }
  };

  // Email ayarlarını güncelle
  const handleUpdateEmailSettings = async (formData) => {
    try {
      await bankingService.updateEmailSettings(formData);
      await fetchEmailSettings();
      setShowEmailSettings(false);
      alert('✅ Email ayarları güncellendi');
    } catch (error) {
      console.error('Email ayarları güncelleme hatası:', error);
      alert('❌ Email ayarları güncellenemedi');
    }
  };

  // Email bağlantı testi
  const handleTestConnection = async () => {
    try {
      const result = await bankingService.testEmailConnection();
      if (result.data.connected) {
        alert('✅ Email bağlantısı başarılı!');
      } else {
        alert('❌ Email bağlantısı başarısız');
      }
    } catch (error) {
      console.error('Bağlantı testi hatası:', error);
      alert('❌ Email bağlantı testi başarısız');
    }
  };

  // Otomatik eşleştirme
  const handleRunAutoMatching = async () => {
    try {
      setAutoMatchingLoading(true);
      const result = await bankingService.runAutoMatching();
      
      // Verileri yenile
      await fetchData();
      
      alert(`✅ ${result.data.matched} işlem eşleştirildi`);
    } catch (error) {
      console.error('Otomatik eşleştirme hatası:', error);
      alert('❌ Otomatik eşleştirme sırasında hata oluştu');
    } finally {
      setAutoMatchingLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Banka İşlemleri</h2>
      
      {/* Eksik İşlem Uyarısı */}
      {missingTransactionsSummary.severity === 'CRITICAL' && (
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
      )}

      {/* Otomatik İşlemler Bölümü */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">🔄 Otomatik İşlemler</h3>
        <div className="flex flex-wrap gap-3">
                     <button 
             onClick={handleFetchEmails} 
             disabled={emailLoading} 
             className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
           >
             {emailLoading ? '📧 Email Çekiliyor...' : '📧 Email Çek'}
           </button>
          <button 
            onClick={() => setShowDateRangeModal(true)} 
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            📅 Tarih Aralığı Çek
          </button>
                     <button 
             onClick={handleFetchLastWeekEmails} 
             disabled={emailLoading} 
             className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
           >
             {emailLoading ? '📧 Çekiliyor...' : '📅 Son 1 Hafta'}
           </button>
                     <button 
             onClick={handleToggleMonitoring} 
             className={`px-4 py-2 text-white rounded ${
               isMonitoring ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
             }`}
           >
             {isMonitoring ? '🛑 Monitoring Durdur' : '🔄 Monitoring Başlat'}
           </button>
                     <button 
             onClick={handleTestConnection} 
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
           >
             🔗 Bağlantı Testi
           </button>
          <button 
            onClick={() => setShowEmailSettings(true)} 
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ⚙️ Email Ayarları
          </button>
                     <button 
             onClick={handleRunAutoMatching} 
             disabled={autoMatchingLoading} 
             className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
           >
             {autoMatchingLoading ? '🤖 Eşleştiriliyor...' : '🤖 Otomatik Eşleştir'}
           </button>
          <button 
            onClick={() => setShowMissingTransactions(!showMissingTransactions)} 
            className={`px-4 py-2 rounded ${
              showMissingTransactions 
                ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            {showMissingTransactions ? '📊 İşlemleri Gizle' : '🔍 Eksik İşlemleri Göster'}
          </button>
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

      {/* Email İstatistikleri */}
      {emailStats && (
        <div className="mb-4 p-3 bg-green-50 rounded border">
          <h4 className="font-semibold text-green-800">📧 Email Durumu</h4>
          <div className="text-sm text-green-700 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>Toplam Email: {emailStats.totalMessages}</div>
            <div>Okunmamış: {emailStats.unseenMessages}</div>
            <div>Bağlantı: {emailStats.isConnected ? '✅ Aktif' : '❌ Kapalı'}</div>
            <div>Ortalama: {emailStats.metrics?.avgProcessingTime?.toFixed(2)}ms</div>
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button 
          onClick={() => { setTab('all'); fetchData(); }} 
          className={tab === 'all' ? 'font-bold underline' : ''}
        >
          Tüm İşlemler
        </button>
        <button 
          onClick={() => { setTab('unmatched'); fetchUnmatched(); }} 
          className={tab === 'unmatched' ? 'font-bold underline' : ''}
        >
          Eşleşmeyen Ödemeler
        </button>
        <button 
          onClick={() => { setTab('pdf'); }} 
          className={tab === 'pdf' ? 'font-bold underline' : ''}
        >
          PDF İşlemleri ({pdfTransactions.length})
        </button>
      </div>

      {loading ? (
        <div>Yükleniyor...</div>
      ) : tab === 'all' ? (
        <div>
          <h3>Tüm İşlemler ({transactions.length})</h3>
          <p>İşlem listesi burada görüntülenecek...</p>
        </div>
      ) : tab === 'unmatched' ? (
        <div>
          <h3>Eşleşmeyen Ödemeler ({unmatched.length})</h3>
          <p>Eşleşmeyen ödemeler burada görüntülenecek...</p>
        </div>
      ) : tab === 'pdf' ? (
        <div>
          <h3>PDF İşlemleri ({pdfTransactions.length})</h3>
          <p>PDF işlemleri burada görüntülenecek...</p>
        </div>
             ) : null}

       {/* Eksik İşlemler Bölümü */}
       {showMissingTransactions && (
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
                   <p className={`text-lg font-bold ${
                     missingTransactionsSummary.severity === 'CRITICAL' ? 'text-red-600' :
                     missingTransactionsSummary.severity === 'HIGH' ? 'text-orange-600' :
                     missingTransactionsSummary.severity === 'LOW' ? 'text-yellow-600' : 'text-gray-600'
                   }`}>
                     {missingTransactionsSummary.severity === 'CRITICAL' ? '🔴' :
                      missingTransactionsSummary.severity === 'HIGH' ? '🟡' :
                      missingTransactionsSummary.severity === 'LOW' ? '🟢' : '⚪'} {missingTransactionsSummary.severity}
                   </p>
                 </div>
                 <span className="text-3xl">📊</span>
               </div>
             </div>
           </div>

           {/* Eksik İşlem Detayları */}
           {missingTransactions.length > 0 ? (
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
                             item.direction === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                           }`}>
                             {item.direction === 'IN' ? '📥 Gelen' : '📤 Giden'}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-sm">
                           <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             {item.confidence}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-sm text-red-600 font-semibold">
                           {item.criticalGaps}
                         </td>
                         <td className="px-4 py-3 text-sm text-gray-600">
                           {item.totalGaps}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           ) : (
             <div className="bg-green-50 border border-green-200 rounded-lg p-4">
               <div className="flex items-center">
                 <span className="text-2xl mr-2">✅</span>
                 <div>
                   <h3 className="text-green-800 font-semibold">Eksik İşlem Tespit Edilmedi</h3>
                   <p className="text-green-700">Tüm işlemler doğru şekilde kaydedilmiş görünüyor.</p>
                 </div>
               </div>
             </div>
           )}
         </div>
       )}

       {/* Email Ayarları Modal */}
       {showEmailSettings && emailSettings && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
           <div className="bg-white p-6 rounded-lg w-96">
             <h3 className="text-lg font-bold mb-4">Email Ayarları</h3>
             <form onSubmit={(e) => {
               e.preventDefault();
               const formData = new FormData(e.target);
               const settings = {
                 host: formData.get('host'),
                 port: parseInt(formData.get('port')),
                 user: formData.get('user'),
                 pass: formData.get('pass'),
                 secure: true
               };
               handleUpdateEmailSettings(settings);
             }}>
               <div className="mb-4">
                 <label className="block text-sm font-medium mb-2">Host</label>
                 <input 
                   name="host" 
                   type="text" 
                   defaultValue={emailSettings.host} 
                   className="w-full p-2 border rounded" 
                   placeholder="imap.yapikredi.com.tr" 
                   required 
                 />
               </div>
               <div className="mb-4">
                 <label className="block text-sm font-medium mb-2">Port</label>
                 <input 
                   name="port" 
                   type="number" 
                   defaultValue={emailSettings.port} 
                   className="w-full p-2 border rounded" 
                   placeholder="993" 
                   required 
                 />
               </div>
               <div className="mb-4">
                 <label className="block text-sm font-medium mb-2">Kullanıcı Adı</label>
                 <input 
                   name="user" 
                   type="text" 
                   defaultValue={emailSettings.user} 
                   className="w-full p-2 border rounded" 
                   placeholder="email@yapikredi.com.tr" 
                   required 
                 />
               </div>
               <div className="mb-4">
                 <label className="block text-sm font-medium mb-2">Şifre</label>
                 <input 
                   name="pass" 
                   type="password" 
                   defaultValue={emailSettings.pass} 
                   className="w-full p-2 border rounded" 
                   placeholder="Email şifresi" 
                   required 
                 />
               </div>
               <div className="flex gap-2">
                 <button 
                   type="submit" 
                   className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                 >
                   Kaydet
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setShowEmailSettings(false)} 
                   className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                 >
                   İptal
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Tarih Aralığı Modal */}
       {showDateRangeModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
           <div className="bg-white p-6 rounded-lg w-96">
             <h3 className="text-lg font-bold mb-4">Tarih Aralığında Email Çek</h3>
             <div className="mb-4">
               <label className="block text-sm font-medium mb-2">Başlangıç Tarihi</label>
               <input 
                 type="date" 
                 value={startDate} 
                 onChange={(e) => setStartDate(e.target.value)} 
                 className="w-full p-2 border rounded" 
                 required 
               />
             </div>
             <div className="mb-4">
               <label className="block text-sm font-medium mb-2">Bitiş Tarihi</label>
               <input 
                 type="date" 
                 value={endDate} 
                 onChange={(e) => setEndDate(e.target.value)} 
                 className="w-full p-2 border rounded" 
                 required 
               />
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={handleFetchEmailsByDateRange} 
                 disabled={dateRangeLoading} 
                 className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
               >
                 {dateRangeLoading ? 'Çekiliyor...' : 'Email Çek'}
               </button>
               <button 
                 onClick={() => setShowDateRangeModal(false)} 
                 className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
               >
                 İptal
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default Banking;