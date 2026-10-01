export type CustomerType = 'INDIVIDUAL' | 'CORPORATE';

export interface CreateCustomerDto {
  name: string;
  phone?: string | null;
  address?: string | null;
  type?: CustomerType;
  accountType?: string | null;
  dueDays?: number | null;
  tag1?: string | null;
  tag2?: string | null;
  isActive?: boolean;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

const writableCustomerFields = [
  'name',
  'phone',
  'address',
  'type',
  'accountType',
  'dueDays',
  'tag1',
  'tag2',
  'isActive'
] as const;

function pickWritableFields(body: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};

  for (const field of writableCustomerFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      picked[field] = body[field];
    }
  }

  return picked;
}

export function toCreateCustomerDto(body: Record<string, unknown>): CreateCustomerDto {
  return pickWritableFields(body) as unknown as CreateCustomerDto;
}

export function toUpdateCustomerDto(body: Record<string, unknown>): UpdateCustomerDto {
  return pickWritableFields(body) as UpdateCustomerDto;
}
