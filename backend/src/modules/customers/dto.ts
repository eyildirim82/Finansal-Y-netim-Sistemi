export interface CreateCustomerDto {
  name: string;
  phone?: string;
  address?: string;
  type?: 'INDIVIDUAL' | 'COMPANY';
  accountType?: string;
  tag1?: string;
  tag2?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  address?: string;
  type?: 'INDIVIDUAL' | 'COMPANY';
  accountType?: string;
  tag1?: string;
  tag2?: string;
}
