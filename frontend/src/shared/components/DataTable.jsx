import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react';

const DataTable = ({
  data,
  columns = [],
  pagination = null,
  onPageChange,
  onSortChange,
  onLimitChange,
  filters = {},
  onFilterChange,
  loading = false,
  emptyMessage = 'Veri bulunamadı',
  className = ''
}) => {
  // data prop'unu güvenli hale getir
  const safeData = data && Array.isArray(data) ? data : [];
  
  // Sıralama durumunu pagination'dan al
  const currentSortBy = pagination?.sortBy || 'createdAt';
  const currentSortOrder = pagination?.sortOrder || 'desc';
  const [sortConfig, setSortConfig] = useState({ 
    key: currentSortBy, 
    direction: currentSortOrder 
  });

  // Sıralama işlemi
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    onSortChange?.(key, direction);
  };

  // Pagination'dan gelen sıralama değişikliklerini takip et
  React.useEffect(() => {
    if (pagination?.sortBy && pagination?.sortOrder) {
      setSortConfig({ 
        key: pagination.sortBy, 
        direction: pagination.sortOrder 
      });
    }
  }, [pagination?.sortBy, pagination?.sortOrder]);

  // Sıralama ikonu
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-600" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-600" />;
  };

  const handleFilter = (key, value) => {
    onFilterChange?.(key, value);
  };

  // Sayfalama kontrolleri
  const renderPagination = () => {
    if (!pagination) return null;

    const { page, totalPages, total, limit } = pagination;
    const startItem = (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, total);

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center space-x-4 text-sm text-gray-700">
          <span>
            {startItem}-{endItem} / {total} kayıt
          </span>
          
          {/* Sayfa boyutu seçici */}
          <div className="flex items-center space-x-2">
            <span>Sayfa başına:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange?.(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange?.(pageNum)}
                className={`relative inline-flex items-center px-3 py-2 text-sm font-medium border ${
                  page === pageNum
                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${column.width || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
            {columns.some(col => col.filterable) && (
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-2">
                    {column.filterable ? (
                      column.filterType === 'select' ? (
                        <select
                          value={filters[column.key] || ''}
                          onChange={(e) => handleFilter(column.key, e.target.value)}
                          className="border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Hepsi</option>
                          {column.filterOptions?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={filters[column.key] || ''}
                          onChange={(e) => handleFilter(column.key, e.target.value)}
                          className="border-gray-300 rounded-md text-sm w-full"
                        />
                      )
                    ) : null}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              safeData.map((row, index) => (
                <tr key={row.id || index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {column.render 
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {renderPagination()}
    </div>
  );
};

export default DataTable;
