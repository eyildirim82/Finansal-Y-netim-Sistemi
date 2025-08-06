import { useState, useEffect } from 'react'
import { Calendar, DollarSign, FileText, User, Tag } from 'lucide-react'
import transactionService from '../services/transactionService'
import categoryService from '../services/categoryService'
import customerService from '../services/customerService'
import toast from 'react-hot-toast'

const TransactionForm = ({ isOpen, onClose, transaction = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    categoryId: '',
    customerId: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [customers, setCustomers] = useState([])

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description || '',
        amount: transaction.amount || '',
        type: transaction.type || 'EXPENSE',
        categoryId: transaction.categoryId || '',
        customerId: transaction.customerId || '',
        date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: transaction.notes || ''
      })
    }
  }, [transaction])

  useEffect(() => {
    loadCategories()
    loadCustomers()
  }, [])

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAllCategories()
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error)
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await customerService.getAllCustomers()
      setCustomers(response.data.data || [])
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.description || !formData.amount || !formData.categoryId) {
      toast.error('Lütfen gerekli alanları doldurun')
      return
    }

    try {
      setLoading(true)
      
      const data = {
        ...formData,
        amount: parseFloat(formData.amount)
      }

      if (transaction) {
        await transactionService.updateTransaction(transaction.id, data)
        toast.success('İşlem başarıyla güncellendi')
      } else {
        await transactionService.createTransaction(data)
        toast.success('İşlem başarıyla oluşturuldu')
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('İşlem kaydedilirken hata:', error)
      toast.error('İşlem kaydedilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* İşlem Türü */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İşlem Türü
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange('type', 'INCOME')}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${
              formData.type === 'INCOME'
                ? 'border-success-500 bg-success-50 text-success-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <DollarSign className="h-6 w-6 mx-auto mb-2" />
            Gelir
          </button>
          <button
            type="button"
            onClick={() => handleChange('type', 'EXPENSE')}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${
              formData.type === 'EXPENSE'
                ? 'border-danger-500 bg-danger-50 text-danger-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <DollarSign className="h-6 w-6 mx-auto mb-2" />
            Gider
          </button>
        </div>
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Açıklama *
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="input pl-10"
            placeholder="İşlem açıklaması"
            required
          />
        </div>
      </div>

      {/* Tutar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tutar (₺) *
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            className="input pl-10"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Kategori */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategori *
        </label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={formData.categoryId}
            onChange={(e) => handleChange('categoryId', e.target.value)}
            className="input pl-10"
            required
          >
            <option value="">Kategori seçin</option>
            {categories
              .filter(cat => cat.type === formData.type)
              .map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Müşteri */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Müşteri
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={formData.customerId}
            onChange={(e) => handleChange('customerId', e.target.value)}
            className="input pl-10"
          >
            <option value="">Müşteri seçin (opsiyonel)</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tarih */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tarih
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Notlar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notlar
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="input"
          rows={3}
          placeholder="Ek notlar..."
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-secondary btn-md"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-md"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Kaydediliyor...
            </>
          ) : (
            transaction ? 'Güncelle' : 'Kaydet'
          )}
        </button>
      </div>
    </form>
  )
}

export default TransactionForm 