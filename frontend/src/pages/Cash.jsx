import React, { useEffect, useState } from 'react';
import cashService from '../services/cashService';

const Cash = () => {
  const [cashFlows, setCashFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [countAmount, setCountAmount] = useState('');
  const [countNotes, setCountNotes] = useState('');
  const [countMsg, setCountMsg] = useState('');
  const [countLoading, setCountLoading] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txMsg, setTxMsg] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [flows, bal] = await Promise.all([
      cashService.getCashFlows(),
      cashService.getCurrentBalance()
    ]);
    setCashFlows(flows.cashFlows || []);
    setBalance(bal);
    setLoading(false);
  };

  const handleCount = async (e) => {
    e.preventDefault();
    setCountLoading(true);
    setCountMsg('');
    try {
      const res = await cashService.countCash(countAmount, countNotes);
      setCountMsg('Kasa sayımı kaydedildi! Fark: ' + res.difference);
      fetchAll();
    } catch {
      setCountMsg('Kasa sayımı başarısız!');
    }
    setCountLoading(false);
  };

  const handleAddTx = async (e) => {
    e.preventDefault();
    setTxLoading(true);
    setTxMsg('');
    try {
      await cashService.addCashTransaction(txAmount, txDesc);
      setTxMsg('Kasa işlemi eklendi!');
      setTxAmount('');
      setTxDesc('');
      fetchAll();
    } catch {
      setTxMsg('Kasa işlemi eklenemedi!');
    }
    setTxLoading(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Kasa Akışları</h2>
      {balance && (
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <div><b>Bugünkü Kapanış:</b> {balance.today} TL</div>
          <div><b>Son Kayıtlı Kasa:</b> {balance.lastRecord} TL</div>
          <div><b>Bugünkü Gelir:</b> {balance.todayIncome} TL</div>
          <div><b>Bugünkü Gider:</b> {balance.todayExpense} TL</div>
          <div><b>Hesaplanan Kasa:</b> {balance.calculatedBalance} TL</div>
        </div>
      )}
      <form onSubmit={handleCount} className="mb-4 flex gap-2 items-end">
        <div>
          <label className="block text-xs">Kasa Sayımı (Gerçek Tutar)</label>
          <input type="number" value={countAmount} onChange={e => setCountAmount(e.target.value)} className="border px-2 py-1 w-32" required />
        </div>
        <div>
          <label className="block text-xs">Not</label>
          <input type="text" value={countNotes} onChange={e => setCountNotes(e.target.value)} className="border px-2 py-1 w-48" />
        </div>
        <button type="submit" disabled={countLoading} className="bg-primary-600 text-white px-4 py-2 rounded">
          {countLoading ? 'Kaydediliyor...' : 'Kasa Sayımı Kaydet'}
        </button>
      </form>
      {countMsg && <div className="mb-2 text-green-600">{countMsg}</div>}
      <form onSubmit={handleAddTx} className="mb-4 flex gap-2 items-end">
        <div>
          <label className="block text-xs">Tutar (+ gelir, - gider)</label>
          <input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} className="border px-2 py-1 w-32" required />
        </div>
        <div>
          <label className="block text-xs">Açıklama</label>
          <input type="text" value={txDesc} onChange={e => setTxDesc(e.target.value)} className="border px-2 py-1 w-48" required />
        </div>
        <button type="submit" disabled={txLoading} className="bg-primary-600 text-white px-4 py-2 rounded">
          {txLoading ? 'Ekleniyor...' : 'Kasa İşlemi Ekle'}
        </button>
      </form>
      {txMsg && <div className="mb-2 text-green-600">{txMsg}</div>}
      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <table className="min-w-full border text-xs">
          <thead>
            <tr>
              <th className="border px-2">Tarih</th>
              <th className="border px-2">Açılış</th>
              <th className="border px-2">Kapanış</th>
              <th className="border px-2">Gelir</th>
              <th className="border px-2">Gider</th>
              <th className="border px-2">Fark</th>
            </tr>
          </thead>
          <tbody>
            {cashFlows.map(flow => (
              <tr key={flow.id}>
                <td className="border px-2">{new Date(flow.date).toLocaleDateString()}</td>
                <td className="border px-2">{flow.openingBalance}</td>
                <td className="border px-2">{flow.closingBalance}</td>
                <td className="border px-2">{flow.totalIncome}</td>
                <td className="border px-2">{flow.totalExpense}</td>
                <td className="border px-2">{flow.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Cash;