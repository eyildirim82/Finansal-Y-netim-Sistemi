import React, { useEffect, useState } from 'react';
import bankingService from '../services/bankingService';
import customerService from '../services/customerService';

const Banking = () => {
  const [transactions, setTransactions] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [matchMsg, setMatchMsg] = useState('');
  const [emailStats, setEmailStats] = useState(null);
  const [matchingStats, setMatchingStats] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [autoMatchingLoading, setAutoMatchingLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, unmatchedRes, customersRes, matchingStatsRes] = await Promise.all([
        bankingService.getTransactions(),
        bankingService.getUnmatchedPayments(),
        customerService.getCustomers(),
        bankingService.getMatchingStats()
      ]);

      setTransactions(transactionsRes.transactions || []);
      setUnmatched(unmatchedRes.data || []);
      setCustomers(customersRes.data || []);
      setMatchingStats(matchingStatsRes.data);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
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
      
      alert(`✅ ${result.data.processed} email işlendi, ${result.data.duplicates} duplikasyon`);
    } catch (error) {
      console.error('Email çekme hatası:', error);
      alert('❌ Email çekme sırasında hata oluştu');
    } finally {
      setEmailLoading(false);
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

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Banka İşlemleri</h2>
      
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
            onClick={handleTestConnection}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔗 Bağlantı Testi
          </button>
          
          <button 
            onClick={handleRunAutoMatching}
            disabled={autoMatchingLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {autoMatchingLoading ? '🤖 Eşleştiriliyor...' : '🤖 Otomatik Eşleştir'}
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
          <h4 className="font-semibold text-green-800">📧 Son Email İşleme</h4>
          <div className="text-sm text-green-700">
            İşlenen: {emailStats.processed} | Duplikasyon: {emailStats.duplicates} | 
            Ortalama Süre: {emailStats.metrics?.avgProcessingTime?.toFixed(2)}ms
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button onClick={() => { setTab('all'); fetchData(); }} className={tab==='all' ? 'font-bold underline' : ''}>Tüm İşlemler</button>
        <button onClick={() => { setTab('unmatched'); fetchUnmatched(); }} className={tab==='unmatched' ? 'font-bold underline' : ''}>Eşleşmeyen Ödemeler</button>
      </div>
      
      {loading ? <div>Yükleniyor...</div> : (
        tab === 'all' ? (
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                <th className="border px-2">Tarih</th>
                <th className="border px-2">Tutar</th>
                <th className="border px-2">Yön</th>
                <th className="border px-2">Gönderen</th>
                <th className="border px-2">Alıcı</th>
                <th className="border px-2">Durum</th>
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
                  <td className="border px-2">{tx.isMatched ? 'Eşleşti' : 'Bekliyor'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                <th className="border px-2">Tarih</th>
                <th className="border px-2">Tutar</th>
                <th className="border px-2">Gönderen</th>
                <th className="border px-2">Açıklama</th>
                <th className="border px-2">Eşleştir</th>
              </tr>
            </thead>
            <tbody>
              {unmatched.map(tx => (
                <tr key={tx.id}>
                  <td className="border px-2">{new Date(tx.transactionDate).toLocaleString()}</td>
                  <td className="border px-2">{tx.amount} TL</td>
                  <td className="border px-2">{tx.counterpartyName}</td>
                  <td className="border px-2">{tx.rawEmailData}</td>
                  <td className="border px-2">
                    <button onClick={() => openMatchModal(tx)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                      Eşleştir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Eşleştirme Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Manuel Eşleştirme</h3>
            <form onSubmit={handleMatch}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Müşteri Seçin:</label>
                <select 
                  value={customerId} 
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Müşteri seçin...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tutar:</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  step="0.01"
                  required
                />
              </div>
              {matchMsg && (
                <div className={`mb-4 p-2 rounded ${matchMsg.includes('başarılı') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {matchMsg}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  Eşleştir
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
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