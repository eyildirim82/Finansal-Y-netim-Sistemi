import { useState, useRef } from 'react'
import { Upload, FileText, FileSpreadsheet, Download, X, CheckCircle, AlertCircle } from 'lucide-react'
import importService from '../services/importService'
import toast from 'react-hot-toast'

const Import = () => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importType, setImportType] = useState('excel')
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Lütfen bir dosya seçin')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      console.log('Yüklenecek dosya:', selectedFile.name, 'Boyut:', selectedFile.size, 'Tip:', selectedFile.type)

      const onUploadProgress = (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        setUploadProgress(progress)
      }

      let response
      if (importType === 'excel') {
        response = await importService.importExcel(selectedFile, onUploadProgress)
      } else {
        response = await importService.importCSV(selectedFile, onUploadProgress)
      }

      console.log('Upload response:', response)

      toast.success('Dosya başarıyla yüklendi ve işlendi')
      setSelectedFile(null)
      setUploadProgress(0)
      
      // Dosya input'unu temizle
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Dosya yükleme hatası:', error)
      console.error('Error response:', error.response?.data)
      toast.error(error.response?.data?.message || 'Dosya yüklenirken hata oluştu')
    } finally {
      setUploading(false)
    }
  }

  const handleTemplateDownload = async () => {
    try {
      const response = await importService.downloadTemplate(importType)
      
      // Dosyayı indir
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${importType}_template.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Şablon başarıyla indirildi')
    } catch (error) {
      console.error('Şablon indirme hatası:', error)
      toast.error('Şablon indirilirken hata oluştu')
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dosya Import</h1>
          <p className="text-gray-600">Excel ve CSV dosyalarınızı sisteme yükleyin</p>
        </div>
        <div className="flex gap-2">
          <select
            className="input"
            value={importType}
            onChange={(e) => setImportType(e.target.value)}
          >
            <option value="excel">Excel Şablonu</option>
            <option value="csv">CSV Şablonu</option>
          </select>
          <button 
            className="btn btn-secondary btn-md"
            onClick={handleTemplateDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Şablon İndir
          </button>
        </div>
      </div>

      {/* Import Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Excel Import</h3>
            <p className="card-description">Ekstre ve cari hesap verilerini Excel dosyasından import edin</p>
          </div>
          <div className="card-content">
            <div className="flex items-center mb-4">
              <FileSpreadsheet className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <h4 className="font-medium">Desteklenen Formatlar</h4>
                <p className="text-sm text-gray-500">.xlsx, .xls</p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Cari hesap ekstreleri</li>
              <li>• Müşteri listeleri</li>
              <li>• İşlem geçmişi</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">CSV Import</h3>
            <p className="card-description">Banka hareketleri ve işlem verilerini CSV dosyasından import edin</p>
          </div>
          <div className="card-content">
            <div className="flex items-center mb-4">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium">Desteklenen Formatlar</h4>
                <p className="text-sm text-gray-500">.csv, .txt</p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Banka hareketleri</li>
              <li>• Gelir/gider listeleri</li>
              <li>• Kategori verileri</li>
            </ul>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dosya Yükle</h3>
          <p className="card-description">Import etmek istediğiniz dosyayı seçin veya sürükleyin</p>
        </div>
        <div className="card-content">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-900">
                {selectedFile ? selectedFile.name : 'Dosya seçin veya sürükleyin'}
              </p>
              <p className="text-sm text-gray-500">
                {selectedFile 
                  ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                  : 'Excel (.xlsx, .xls) veya CSV (.csv) dosyaları desteklenir'
                }
              </p>
            </div>
            <div className="mt-6">
              <input
                ref={fileInputRef}
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="file-upload"
                className="btn btn-primary btn-md cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Dosya Seç
              </label>
            </div>
          </div>

          {selectedFile && (
            <div className="mt-6 space-y-4">
              {/* Selected File Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {importType === 'excel' ? (
                    <FileSpreadsheet className="h-6 w-6 text-green-600 mr-3" />
                  ) : (
                    <FileText className="h-6 w-6 text-blue-600 mr-3" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Yükleniyor...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn btn-primary btn-lg w-full"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Dosyayı Import Et
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Import Geçmişi</h3>
          <p className="card-description">Son import işlemlerinizin listesi</p>
        </div>
        <div className="card-content">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Upload className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz import geçmişi yok</h3>
            <p className="text-gray-500">İlk dosyanızı import ettikten sonra burada görünecek</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Import 