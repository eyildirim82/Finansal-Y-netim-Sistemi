import React, { useEffect, useState } from 'react';
import extractService from '../services/extractService';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Extracts = () => {
  const [extracts, setExtracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExtracts();
  }, []);

  const fetchExtracts = async () => {
    setLoading(true);
    try {
      const data = await extractService.getExtracts();
      setExtracts(data);
    } catch (e) {
      setError('Ekstreler yüklenemedi');
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(''); // Dosya seçildiğinde hata mesajını temizle
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      console.log('Ekstre yüklenecek dosya:', file.name, 'Boyut:', file.size, 'Tip:', file.type);
      await extractService.uploadExtract(file);
      setFile(null);
      // Dosya input'unu temizle
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      await fetchExtracts();
      toast.success('Ekstre başarıyla yüklendi!');
    } catch (e) {
      console.error('Ekstre yükleme hatası:', e);
      console.error('Error response:', e.response?.data);
      setError(e.response?.data?.error || e.response?.data?.message || 'Yükleme başarısız!');
    }
    setUploading(false);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Ekstre Yüklemeleri</h2>
      <form onSubmit={handleUpload} className="mb-4 flex gap-2 items-center">
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <button type="submit" disabled={uploading || !file} className="bg-primary-600 text-white px-4 py-2 rounded">
          {uploading ? 'Yükleniyor...' : 'Yükle'}
        </button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading ? (
        <div>Yükleniyor...</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-2">Dosya Adı</th>
              <th className="border px-2">Yükleme Tarihi</th>
              <th className="border px-2">Durum</th>
              <th className="border px-2">Toplam Satır</th>
              <th className="border px-2">İşlenen Satır</th>
              <th className="border px-2">Hata Satırı</th>
              <th className="border px-2">Detay</th>
            </tr>
          </thead>
          <tbody>
            {extracts.map(extract => (
              <tr key={extract.id}>
                <td className="border px-2">{extract.fileName}</td>
                <td className="border px-2">{new Date(extract.uploadDate).toLocaleString()}</td>
                <td className="border px-2">{extract.status}</td>
                <td className="border px-2">{extract.totalRows}</td>
                <td className="border px-2">{extract.processedRows}</td>
                <td className="border px-2">{extract.errorRows}</td>
                <td className="border px-2">
                  <Link to={`/extracts/${extract.id}`} className="text-primary-600 underline">Detay</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Extracts;