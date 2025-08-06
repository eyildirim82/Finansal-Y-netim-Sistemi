import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Tag, Edit, Trash2, Eye } from 'lucide-react'
import categoryService from '../services/categoryService'
import toast from 'react-hot-toast'

const Categories = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: ''
  })

  // Kategorileri yükle
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const params = {
        search: searchTerm,
        ...filters
      }
      
      const response = await categoryService.getAllCategories(params)
      const data = response.data.data
      
      setCategories(data || [])
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error)
      toast.error('Kategoriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Kategori sil
  const handleDeleteCategory = async (id) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      return
    }
    
    try {
      await categoryService.deleteCategory(id)
      toast.success('Kategori başarıyla silindi')
      fetchCategories()
    } catch (error) {
      console.error('Kategori silinirken hata:', error)
      toast.error('Kategori silinirken hata oluştu')
    }
  }

  // Filtreleri uygula
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Arama yap
  const handleSearch = () => {
    fetchCategories()
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
          <p className="text-gray-600">Gelir ve gider kategorilerinizi yönetin</p>
        </div>
        <button className="btn btn-primary btn-md">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Kategori
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Kategori ara..."
                className="input pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              className="input"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">Tüm Türler</option>
              <option value="INCOME">Gelir</option>
              <option value="EXPENSE">Gider</option>
            </select>
          </div>
          <div className="flex justify-end mt-4">
            <button 
              className="btn btn-secondary btn-md"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              Ara
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Kategori Listesi</h3>
          <p className="card-description">Tüm kategorilerinizin detaylı listesi</p>
        </div>
        <div className="card-content">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Tag className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz kategori bulunmuyor</h3>
              <p className="text-gray-500 mb-6">İlk kategorinizi ekleyerek başlayın</p>
              <button className="btn btn-primary btn-md">
                <Plus className="h-4 w-4 mr-2" />
                İlk Kategoriyi Ekle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color || '#6B7280' }}
                      ></div>
                      <h3 className="font-medium text-gray-900">{category.name}</h3>
                    </div>
                    <div className="flex gap-1">
                      <button className="btn btn-sm btn-secondary">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button className="btn btn-sm btn-primary">
                        <Edit className="h-3 w-3" />
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className={`badge ${
                      category.type === 'INCOME' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {category.type === 'INCOME' ? 'Gelir' : 'Gider'}
                    </span>
                    <span className="text-gray-500">
                      {category._count?.transactions || 0} işlem
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Categories 