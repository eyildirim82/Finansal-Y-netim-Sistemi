import { CreateCustomerDto, UpdateCustomerDto } from './dto';

// Valid examples should compile without errors
const validCreate: CreateCustomerDto = {
  name: 'Test Customer',
  phone: '1234567890'
};

const validUpdate: UpdateCustomerDto = {
  address: 'Somewhere'
};

// Invalid shapes should trigger TypeScript errors
// @ts-expect-error - missing required name field
const invalidCreate: CreateCustomerDto = {
  phone: '1234567890'
};

const extraField: CreateCustomerDto = {
  name: 'Another',
  // @ts-expect-error - property not defined in DTO
  unknown: 'value'
};

const wrongType: UpdateCustomerDto = {
  // @ts-expect-error - wrong type for phone
  phone: 12345
};
