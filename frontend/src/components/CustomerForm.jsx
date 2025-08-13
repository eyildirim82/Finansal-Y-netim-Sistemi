import React from 'react';
import { useForm } from 'react-hook-form';
import { useApiMutation, useApiUpdate } from '../shared/hooks/useApi';
import toast from 'react-hot-toast';

const CustomerForm = ({ customer, onSuccess, onCancel }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: customer || {
      name: '',
      phone: '',
      address: '',
      type: 'INDIVIDUAL',
      accountType: '',
      dueDays: 30,
      tag1: '',
      tag2: '',
      isActive: true
    }
  });

  // Müşteri oluşturma
  const createMutation = useApiMutation('/customers', {
    invalidateQueries: ['customers'],
    successMessage: 'Müşteri başarıyla oluşturuldu',
    errorMessage: 'Müşteri oluşturulurken hata oluştu',
    onSuccess: () => {
      onSuccess();
      reset();
    }
  });

  // Müşteri güncelleme
  const updateMutation = useApiUpdate(`/customers/${customer?.id}`, {
    invalidateQueries: ['customers'],
    successMessage: 'Müşteri başarıyla güncellendi',
    errorMessage: 'Müşteri güncellenirken hata oluştu',
    onSuccess: () => {
      onSuccess();
    }
  });

  const onSubmit = (data) => {
    if (customer) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Müşteri Adı */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Müşteri Adı *
          </label>
          <input
            type="text"
            {...register('name', { required: 'Müşteri adı zorunludur' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Müşteri adını giriniz"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Telefon */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Telefon
          </label>
          <input
            type="tel"
            {...register('phone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Telefon numarası"
          />
        </div>

        {/* Müşteri Türü */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Müşteri Türü
          </label>
          <select
            {...register('type')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="INDIVIDUAL">Bireysel</option>
            <option value="CORPORATE">Kurumsal</option>
          </select>
        </div>

        {/* Hesap Türü */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Hesap Türü
          </label>
          <select
            {...register('accountType')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Seçiniz</option>
            <option value="CASH">Nakit</option>
            <option value="CREDIT">Kredi</option>
            <option value="FACTORING">Faktoring</option>
          </select>
        </div>

        {/* Vade Günü */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Vade Günü
          </label>
          <input
            type="number"
            {...register('dueDays', { min: 0, max: 365 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="30"
          />
        </div>

        {/* Aktif Durum */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Durum
          </label>
          <select
            {...register('isActive')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value={true}>Aktif</option>
            <option value={false}>Pasif</option>
          </select>
        </div>
      </div>

      {/* Adres */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Adres
        </label>
        <textarea
          {...register('address')}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="Müşteri adresi"
        />
      </div>

      {/* Etiketler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Etiket 1
          </label>
          <input
            type="text"
            {...register('tag1')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Etiket 1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Etiket 2
          </label>
          <input
            type="text"
            {...register('tag2')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Etiket 2"
          />
        </div>
      </div>

      {/* Butonlar */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          İptal
        </button>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Kaydediliyor...' : (customer ? 'Güncelle' : 'Oluştur')}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm; 