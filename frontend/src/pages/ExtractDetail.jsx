import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import extractService from '../services/extractService';

const ExtractDetail = () => {
  const { id } = useParams();
  const [extract, setExtract] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const data = await extractService.getExtractDetail(id);
        setExtract(data.extract);
        setTransactions(data.transactions || []);
      } catch (e) {
        setError('Detaylar yüklenemedi');
      }
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!extract) return <div className="p-4">Kayıt bulunamadı</div>;

  return (
    <div className="p-4">
      <Link to="/extracts" className="text-primary-600 underline mb-2 inline-block">&larr; Geri</Link>
      <h2 className="text-xl font-bold mb-2">Ekstre Detayı</h2>
      <div className="mb-4">
        <div><b>Dosya Adı:</b> {extract.fileName}</div>
        <div><b>Yükleme Tarihi:</b> {new Date(extract.uploadDate).toLocaleString()}</div>
        <div><b>Durum:</b> {extract.status}</div>
        <div><b>Toplam Satır:</b> {extract.totalRows}</div>
        <div><b>İşlenen Satır:</b> {extract.processedRows}</div>
        <div><b>Hata Satırı:</b> {extract.errorRows}</div>
      </div>
      <h3 className="font-semibold mb-2">İşlem Satırları</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-xs">
          <thead>
            <tr>
              <th className="border px-2">Tarih</th>
              <th className="border px-2">Açıklama</th>
              <th className="border px-2">Borç</th>
              <th className="border px-2">Alacak</th>
              <th className="border px-2">Müşteri</th>
              <th className="border px-2">Belge Tipi</th>
              <th className="border px-2">Satır</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td className="border px-2">{new Date(tx.date).toLocaleDateString()}</td>
                <td className="border px-2">{tx.description}</td>
                <td className="border px-2">{tx.debit}</td>
                <td className="border px-2">{tx.credit}</td>
                <td className="border px-2">{tx.customer?.name || '-'}</td>
                <td className="border px-2">{tx.documentType || '-'}</td>
                <td className="border px-2">{tx.sourceRow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExtractDetail;