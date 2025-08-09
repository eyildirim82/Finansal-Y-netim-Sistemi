import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Building, UserCheck } from 'lucide-react'
import customerService from '../services/customerService'
import toast from 'react-hot-toast'

const CustomerForm = ({ isOpen, onClose, customer = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: 'INDIVIDUAL',
    taxNumber: '',
    notes: '',
    dueDays: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        type: customer.type || 'INDIVIDUAL',
        taxNumber: customer.taxNumber || '',
        notes: customer.notes || '',
        dueDays: customer.dueDays ? customer.dueDays.toString() : ''
      })
    }
  }, [customer])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email) {
      toast.error('Lütfen gerekli alanları doldurun')
      return
    }

    try {
      setLoading(true)
      
      if (customer) {
        await customerService.updateCustomer(customer.id, formData)
        toast.success('Müşteri başarıyla güncellendi')
      } else {
        await customerService.createCustomer(formData)
        toast.success('Müşteri başarıyla oluşturuldu')
      }

      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Müşteri kaydedilirken hata:', error)
      toast.error('Müşteri kaydedilirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Müşteri Türü */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Müşteri Türü
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange('type', 'INDIVIDUAL')}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${
              formData.type === 'INDIVIDUAL'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <UserCheck className="h-6 w-6 mx-auto mb-2" />
            Bireysel
          </button>
          <button
            type="button"
            onClick={() => handleChange('type', 'CORPORATE')}
            className={`p-3 rounded-lg border-2 text-center transition-colors ${
              formData.type === 'CORPORATE'
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Building className="h-6 w-6 mx-auto mb-2" />
            Kurumsal
          </button>
        </div>
      </div>

      {/* Ad Soyad / Firma Adı */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {formData.type === 'INDIVIDUAL' ? 'Ad Soyad' : 'Firma Adı'} *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="input pl-10"
            placeholder={formData.type === 'INDIVIDUAL' ? 'Ad Soyad' : 'Firma Adı'}
            required
          />
        </div>
      </div>

      {/* E-posta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          E-posta *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="input pl-10"
            placeholder="ornek@email.com"
            required
          />
        </div>
      </div>

      {/* Telefon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Telefon
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="input pl-10"
            placeholder="0555 123 45 67"
          />
        </div>
      </div>

      {/* Adres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Adres
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <textarea
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="input pl-10"
            rows={3}
            placeholder="Adres bilgisi..."
          />
        </div>
      </div>

      {/* Vergi Numarası (Kurumsal için) */}
      {formData.type === 'CORPORATE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vergi Numarası
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={formData.taxNumber}
              onChange={(e) => handleChange('taxNumber', e.target.value)}
              className="input pl-10"
              placeholder="1234567890"
            />
          </div>
        </div>
      )}

      {/* Vade Günü */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vade Günü
        </label>
        <select
          value={formData.dueDays}
          onChange={(e) => handleChange('dueDays', e.target.value)}
          className="input"
        >
          <option value="">Vade günü seçin...</option>
          <option value="7">7 gün</option>
          <option value="15">15 gün</option>
          <option value="30">30 gün</option>
          <option value="45">45 gün</option>
          <option value="60">60 gün</option>
          <option value="90">90 gün</option>
          <option value="120">120 gün</option>
          <option value="180">180 gün</option>
        </select>
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
          placeholder="Müşteri hakkında ek notlar..."
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
            customer ? 'Güncelle' : 'Kaydet'
          )}
        </button>
      </div>
    </form>
  )
}

export default CustomerForm 