import { useState, useEffect } from 'react'
import { Tag, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import categoryService from '../services/categoryService'
import toast from 'react-hot-toast'

const CategoryForm = ({ isOpen, onClose, category = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'EXPENSE',
    color: '#6B7280'
  })
  const [loading, setLoading] = useState(false)

  const colors = [
    '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#8B5CF6', '#EC4899', '#F97316', '#06B6D4', '#84CC16'
  ]

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        type: category.type || 'EXPENSE',
        color: category.color || '#6B7280'
      })
    }
  }, [category])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast.error('Lütfen kategori adını girin')
      return
    }

    try {
      setLoading(true)
      
      if (category) {
        await categoryService.updateCategory(category.id, formData)
        toast.success('Kategori başarıyla güncellendi')
      } else {
        await categoryService.createCategory(formData)
        toast.success('Kategori başarıyla oluşturuldu')
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Kategori kaydedilirken hata:', error)
      toast.error('Kategori kaydedilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Kategori Türü */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategori Türü
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
            <TrendingUp className="h-6 w-6 mx-auto mb-2" />
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
            <TrendingDown className="h-6 w-6 mx-auto mb-2" />
            Gider
          </button>
        </div>
      </div>

      {/* Kategori Adı */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategori Adı *
        </label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="input pl-10"
            placeholder="Kategori adı"
            required
          />
        </div>
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Açıklama
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="input pl-10"
            rows={3}
            placeholder="Kategori açıklaması..."
          />
        </div>
      </div>

      {/* Renk Seçimi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Renk
        </label>
        <div className="flex items-center gap-4">
          <div 
            className="w-12 h-12 rounded-lg border-2 border-gray-300"
            style={{ backgroundColor: formData.color }}
          ></div>
          <div className="grid grid-cols-5 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('color', color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color 
                    ? 'border-gray-800 scale-110' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
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
            category ? 'Güncelle' : 'Kaydet'
          )}
        </button>
      </div>
    </form>
  )
}

export default CategoryForm 