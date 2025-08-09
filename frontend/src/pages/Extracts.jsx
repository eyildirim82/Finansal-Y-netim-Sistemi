import React, { useEffect, useState } from 'react';
import extractService from '../services/extractService';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2, AlertTriangle } from 'lucide-react';

const Extracts = () => {
  const [extracts, setExtracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'all' veya 'old'

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

  const handleDeleteExtract = async (id) => {
    if (!confirm('Bu ekstreyi silmek istediğinizden emin misiniz?')) return;
    
    try {
      await extractService.deleteExtract(id);
      await fetchExtracts();
      toast.success('Ekstre başarıyla silindi!');
    } catch (e) {
      toast.error('Ekstre silinirken hata oluştu!');
    }
  };

  const handleDeleteOldExtracts = async () => {
    try {
      const response = await extractService.deleteOldExtracts(null, true);
      await fetchExtracts();
      toast.success(`${response.data.deletedCount} ekstre başarıyla silindi!`);
      setShowDeleteModal(false);
    } catch (e) {
      toast.error('Ekstreler silinirken hata oluştu!');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Ekstre Yüklemeleri</h2>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700"
        >
          <Trash2 size={16} />
          Eski Yüklemeleri Sil
        </button>
      </div>

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
              <th className="border px-2">İşlemler</th>
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
                <td className="border px-2 flex gap-2">
                  <Link to={`/extracts/${extract.id}`} className="text-primary-600 underline">Detay</Link>
                  <button
                    onClick={() => handleDeleteExtract(extract.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Sil"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Silme Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-600" size={24} />
              <h3 className="text-lg font-semibold">Eski Yüklemeleri Sil</h3>
            </div>
            <p className="mb-4 text-gray-600">
              Tüm eski ekstre yüklemelerini silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz ve tüm işlem verilerini de silecektir.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteOldExtracts}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Tümünü Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Extracts;