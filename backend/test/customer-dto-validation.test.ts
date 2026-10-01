import test from 'node:test';
import assert from 'node:assert/strict';
import { validationResult } from 'express-validator';
import {
  toCreateCustomerDto,
  toUpdateCustomerDto
} from '../src/modules/customers/dto';
import {
  createCustomerValidations,
  updateCustomerValidations
} from '../src/shared/middleware/validation';

async function runValidations(validations: any[], body: Record<string, unknown>) {
  const req: any = { body: { ...body } };
  await Promise.all(validations.map((validation) => validation.run(req)));
  return { req, errors: validationResult(req).array() };
}

test('customer DTO sanitizer strips server-owned and unknown fields', () => {
  const createDto = toCreateCustomerDto({
    name: 'Acme Ltd',
    type: 'CORPORATE',
    dueDays: 30,
    userId: 'attacker-user',
    code: 'ATTACKER-CODE',
    createdAt: '2026-01-01',
    unknown: 'ignored'
  });

  assert.deepEqual(createDto, {
    name: 'Acme Ltd',
    type: 'CORPORATE',
    dueDays: 30
  });

  const updateDto = toUpdateCustomerDto({
    phone: '+90 555 123 45 67',
    userId: 'other-user',
    code: 'OTHER-CODE'
  });

  assert.deepEqual(updateDto, { phone: '+90 555 123 45 67' });
});

test('create validation requires name and uses the current customer type contract', async () => {
  const missingName = await runValidations(createCustomerValidations, {
    type: 'CORPORATE'
  });
  assert.ok(missingName.errors.some((error: any) => error.path === 'name'));

  const staleCompanyType = await runValidations(createCustomerValidations, {
    name: 'Legacy Company',
    type: 'COMPANY'
  });
  assert.ok(staleCompanyType.errors.some((error: any) => error.path === 'type'));

  const currentType = await runValidations(createCustomerValidations, {
    name: 'Current Company',
    type: 'CORPORATE',
    dueDays: '30',
    isActive: 'false'
  });
  assert.equal(currentType.errors.length, 0);
  assert.equal(currentType.req.body.dueDays, 30);
  assert.equal(currentType.req.body.isActive, false);
});

test('update validation accepts partial updates without requiring name', async () => {
  const partial = await runValidations(updateCustomerValidations, {
    phone: '+90 555 123 45 67',
    tag1: 'priority'
  });

  assert.equal(partial.errors.length, 0);
});
