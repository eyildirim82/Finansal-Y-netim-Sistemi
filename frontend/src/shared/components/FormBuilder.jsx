import React from 'react';
import { useForm } from 'react-hook-form';

const FormBuilder = ({
  fields = [],
  onSubmit,
  defaultValues = {},
  submitText = 'Kaydet',
  loading = false,
  className = ''
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    defaultValues
  });

  const handleFormSubmit = (data) => {
    onSubmit(data);
  };

  const renderField = (field) => {
    const { name, label, type, required, options, validation } = field;
    const error = errors[name];

    const commonProps = {
      ...register(name, {
        required: required && `${label} alanı zorunludur`,
        ...validation
      }),
      className: `mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
        error ? 'border-red-300' : ''
      }`
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            placeholder={`${label} giriniz`}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Seçiniz</option>
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            step="any"
            placeholder={`${label} giriniz`}
          />
        );

      case 'email':
        return (
          <input
            {...commonProps}
            type="email"
            placeholder={`${label} giriniz`}
          />
        );

      case 'password':
        return (
          <input
            {...commonProps}
            type="password"
            placeholder={`${label} giriniz`}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type="text"
            placeholder={`${label} giriniz`}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={`space-y-6 ${className}`}>
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          <div className="mt-1">
            {renderField(field)}
          </div>
          
          {errors[field.name] && (
            <p className="mt-1 text-sm text-red-600">
              {errors[field.name].message}
            </p>
          )}
        </div>
      ))}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sıfırla
        </button>
        
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Kaydediliyor...' : submitText}
        </button>
      </div>
    </form>
  );
};

export default FormBuilder;
