import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { CustomerService } from '../src/modules/customers/service';

const prisma = new PrismaClient();

test('customer writes are owned by the authenticated user and isolated across users', async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const owner = await prisma.user.create({
    data: {
      username: `customer-owner-${suffix}`,
      email: `customer-owner-${suffix}@example.invalid`,
      password: 'test-only-password'
    }
  });
  const other = await prisma.user.create({
    data: {
      username: `customer-other-${suffix}`,
      email: `customer-other-${suffix}@example.invalid`,
      password: 'test-only-password'
    }
  });
  const service = new CustomerService();

  t.after(async () => {
    await prisma.customer.deleteMany({
      where: { userId: { in: [owner.id, other.id] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, other.id] } }
    });
    await service.disconnect();
    await prisma.$disconnect();
  });

  const created = await service.createCustomer({
    name: 'Owner Customer',
    type: 'CORPORATE',
    dueDays: 45
  }, owner.id);

  assert.equal(created.success, true);
  assert.ok(created.data);
  assert.equal(created.data.userId, owner.id);
  assert.equal(created.data.type, 'CORPORATE');
  assert.equal(created.data.dueDays, 45);
  assert.match(created.data.code, /^CUST_/);

  const customerId = created.data.id;

  const foreignRead = await service.getCustomerById(customerId, other.id);
  assert.equal(foreignRead.success, false);

  const foreignUpdate = await service.updateCustomer(customerId, {
    phone: '+90 555 000 00 00'
  }, other.id);
  assert.equal(foreignUpdate.success, false);

  const unchanged = await prisma.customer.findUnique({ where: { id: customerId } });
  assert.equal(unchanged?.phone, null);

  const foreignDelete = await service.deleteCustomer(customerId, other.id);
  assert.equal(foreignDelete.success, false);
  assert.ok(await prisma.customer.findUnique({ where: { id: customerId } }));

  const ownerUpdate = await service.updateCustomer(customerId, {
    phone: '+90 555 111 22 33'
  }, owner.id);
  assert.equal(ownerUpdate.success, true);
  assert.equal(ownerUpdate.data?.phone, '+90 555 111 22 33');

  const ownerRead = await service.getCustomerById(customerId, owner.id);
  assert.equal(ownerRead.success, true);
  assert.equal(ownerRead.data?.id, customerId);
});
