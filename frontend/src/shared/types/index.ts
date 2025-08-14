// Ortak tip tanımları
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Müşteri tipleri
export interface Customer extends BaseEntity {
  code: string;
  name: string;
  originalName?: string;
  nameVariations?: string;
  phone?: string;
  address?: string;
  type: string;
  accountType?: string;
  lastPaymentDate?: Date;
  paymentPattern?: string;
  dueDays?: number;
  tag1?: string;
  tag2?: string;
  isActive: boolean;
  userId: string;
  balance?: Balance;
}

// Bakiye tipleri
export interface Balance {
  id: string;
  customerId: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  lastUpdated: Date;
}

// İşlem tipleri
export interface Transaction extends BaseEntity {
  type: string;
  amount: number;
  currency: string;
  description?: string;
  date: Date;
  categoryId?: string;
  customerId?: string;
  userId: string;
  sourceFile?: string;
  sourceRow?: number;
  metadata?: string;
}

// Kategori tipleri
export interface Category extends BaseEntity {
  name: string;
  type: string;
  parentId?: string;
  userId?: string;
}

// Kullanıcı tipleri
export interface User extends BaseEntity {
  username: string;
  email: string;
  role: string;
  isActive: boolean;
}

// Form tipleri
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Tablo tipleri
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { value: string; label: string }[];
}

// Filtre tipleri
export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: FilterOption[];
}

// Modal tipleri
export interface ModalConfig {
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  showFooter?: boolean;
}

// Toast tipleri
export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
