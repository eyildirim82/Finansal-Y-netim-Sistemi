import React, { useEffect, useState } from 'react';
import bankingService from '../services/bankingService';
import customerService from '../services/customerService';
import { getMissingTransactions } from '../services/bankingService';

// Modüler bileşenler
import {
  AutoOperationsPanel,
  EmailStatsPanel,
  CriticalWarningAlert,
  TabNavigation,
  TransactionTable,
  UnmatchedTransactionsTable,
  PdfTransactionsTable,
  MissingTransactionsPanel
} from '../components/banking';

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
  }, []); // Sadece component mount olduğunda çalışsın

  useEffect(() => {
    fetchEmailStats();
  }, []); // Email stats ayrı useEffect'te

  useEffect(() => {
    fetchEmailSettings();
  }, []); // Email settings ayrı useEffect'te

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

  // PDF işlemleri
  const handlePdfFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedPdfFile(file);
    } else {
      alert('Lütfen geçerli bir PDF dosyası seçin');
    }
  };

  const handlePdfUpload = async () => {
    if (!selectedPdfFile) {
      alert('Lütfen bir PDF dosyası seçin');
      return;
    }

    try {
      setPdfLoading(true);
      const result = await bankingService.parsePDF(selectedPdfFile);
      
      if (result.success) {
        setPdfData(result.data);
        setShowPdfModal(true);
        console.log('📄 PDF parse edildi:', result.data);
      } else {
        alert(`❌ PDF parse edilemedi: ${result.message}`);
      }
    } catch (error) {
      console.error('PDF parsing hatası:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Bilinmeyen hata';
      alert(`❌ PDF parse edilirken hata oluştu: ${errorMessage}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSavePdfTransactions = async () => {
    if (!pdfData) return;

    try {
      setPdfLoading(true);
      const result = await bankingService.savePDFTransactions(
        pdfData.transactions,
        pdfData.accountInfo
      );
      
      alert(`✅ ${result.data.saved} işlem kaydedildi, ${result.data.duplicates} duplikasyon`);
      
      // Verileri yenile
      await fetchData();
      setShowPdfModal(false);
      setPdfData(null);
      setSelectedPdfFile(null);
    } catch (error) {
      console.error('PDF işlem kaydetme hatası:', error);
      alert('❌ İşlemler kaydedilirken hata oluştu');
    } finally {
      setPdfLoading(false);
    }
  };

  // Yeni ETL PDF işleme fonksiyonu
  const handlePdfETL = async () => {
    if (!selectedPdfFile) {
      alert('Lütfen bir PDF dosyası seçin');
      return;
    }

    try {
      setPdfLoading(true);
      const result = await bankingService.processPDFETL(selectedPdfFile);
      
      alert(`✅ ${result.data.processedCount} işlem başarıyla işlendi ve kaydedildi`);
      
      // Verileri yenile
      await fetchData();
      setSelectedPdfFile(null);
    } catch (error) {
      console.error('PDF ETL işleme hatası:', error);
      alert(`❌ PDF ETL işleme hatası: ${error.response?.data?.message || error.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const openMatchModal = (tx) => {
    setSelectedTx(tx);
    setCustomerId('');
    setAmount(tx.amount);
    setShowModal(true);
    setMatchMsg('');
  };

  const handleMatch = async (e) => {
    e.preventDefault();
    if (!selectedTx || !customerId) return;
    try {
      await bankingService.matchPayment({ transactionId: selectedTx.id, customerId, amount });
      setMatchMsg('Eşleştirme başarılı!');
      setShowModal(false);
      fetchUnmatched();
      fetchData();
    } catch {
      setMatchMsg('Eşleştirme başarısız!');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'LOW': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'CRITICAL': return '🔴';
      case 'HIGH': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };

  // İşlem silme fonksiyonları
  const handleDeleteTransaction = async (transactionId) => {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setDeleteLoading(true);
      await bankingService.deleteTransaction(transactionId);
      alert('✅ İşlem başarıyla silindi');
      await fetchData();
    } catch (error) {
      console.error('İşlem silme hatası:', error);
      alert('❌ İşlem silinirken hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDelete = async (filters) => {
    if (!confirm('Seçili işlemleri silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const result = await bankingService.deleteTransactions(filters);
      alert(`✅ ${result.data.deletedCount} işlem başarıyla silindi`);
      await fetchData();
      setShowBulkDeleteModal(false);
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      alert('❌ İşlemler silinirken hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCleanupOldTransactions = async () => {
    if (!cleanupDate) {
      alert('Lütfen bir tarih seçin');
      return;
    }

    try {
      setDeleteLoading(true);
      const result = await bankingService.cleanupOldTransactions(cleanupDate, cleanupDryRun);
      
      if (cleanupDryRun) {
        alert(`DRY RUN: ${result.data.deletedCount} işlem silinecek (${result.data.totalAmount.toLocaleString('tr-TR')} TL)`);
      } else {
        alert(`✅ ${result.data.deletedCount} eski işlem başarıyla silindi`);
        await fetchData();
        setShowCleanupModal(false);
      }
    } catch (error) {
      console.error('Eski işlem temizleme hatası:', error);
      alert('❌ Eski işlemler silinirken hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Banka İşlemleri</h2>
      
      {/* Kritik Uyarı */}
      <CriticalWarningAlert missingTransactionsSummary={missingTransactionsSummary} />

      {/* Otomatik İşlemler Paneli */}
      <AutoOperationsPanel
        emailLoading={emailLoading}
        autoMatchingLoading={autoMatchingLoading}
        isMonitoring={isMonitoring}
        matchingStats={matchingStats}
        onFetchEmails={handleFetchEmails}
        onShowDateRangeModal={() => setShowDateRangeModal(true)}
        onFetchLastWeekEmails={handleFetchLastWeekEmails}
        onToggleMonitoring={handleToggleMonitoring}
        onTestConnection={handleTestConnection}
        onShowEmailSettings={() => setShowEmailSettings(true)}
        onRunAutoMatching={handleRunAutoMatching}
        onShowMissingTransactions={() => setShowMissingTransactions(!showMissingTransactions)}
        showMissingTransactions={showMissingTransactions}
        selectedPdfFile={selectedPdfFile}
        pdfLoading={pdfLoading}
        onPdfFileSelect={handlePdfFileSelect}
        onPdfUpload={handlePdfUpload}
        onPdfETL={handlePdfETL}
        onShowBulkDeleteModal={() => setShowBulkDeleteModal(true)}
        onShowCleanupModal={() => setShowCleanupModal(true)}
      />

      {/* Email İstatistikleri */}
      <EmailStatsPanel emailStats={emailStats} />

      {/* Tab Navigasyonu */}
      <TabNavigation
        tab={tab}
        pdfTransactions={pdfTransactions}
        onTabChange={setTab}
        onFetchData={fetchData}
        onFetchUnmatched={fetchUnmatched}
      />
      
      {/* İçerik Tablosu */}
      {loading ? (
        <div>Yükleniyor...</div>
      ) : tab === 'all' ? (
        <TransactionTable
          transactions={transactions}
          deleteLoading={deleteLoading}
          onDeleteTransaction={handleDeleteTransaction}
        />
      ) : tab === 'unmatched' ? (
        <UnmatchedTransactionsTable
          unmatched={unmatched}
          deleteLoading={deleteLoading}
          onDeleteTransaction={handleDeleteTransaction}
          onOpenMatchModal={openMatchModal}
        />
      ) : tab === 'pdf' ? (
        <PdfTransactionsTable
          pdfTransactions={pdfTransactions}
          deleteLoading={deleteLoading}
          onDeleteTransaction={handleDeleteTransaction}
        />
      ) : null}

      {/* Eksik İşlemler Paneli */}
      <MissingTransactionsPanel
        showMissingTransactions={showMissingTransactions}
        missingTransactions={missingTransactions}
        missingTransactionsSummary={missingTransactionsSummary}
        getSeverityColor={getSeverityColor}
        getSeverityIcon={getSeverityIcon}
      />

      {/* Eşleştirme Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-4">İşlem Eşleştir</h3>
            <form onSubmit={handleMatch}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Müşteri</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Müşteri seçin</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tutar</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              {matchMsg && <p className="text-sm mb-4">{matchMsg}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Eşleştir
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banking;