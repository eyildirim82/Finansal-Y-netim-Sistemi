import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma, PrismaClient } from '@prisma/client';
import { configurePrismaDecimalJson } from '../src/shared/prismaDecimalJson';

configurePrismaDecimalJson();

const prisma = new PrismaClient();

test('Prisma Decimal keeps the existing numeric JSON contract', () => {
  const payload = {
    amount: new Prisma.Decimal('0.10'),
    invoiceTotal: new Prisma.Decimal('123456789.99')
  };

  assert.equal(
    JSON.stringify(payload),
    '{"amount":0.1,"invoiceTotal":123456789.99}'
  );
});

test('PostgreSQL stores representative monetary values exactly to two decimals', async (t) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      username: `money-${suffix}`,
      email: `money-${suffix}@example.invalid`,
      password: 'test-only-password'
    }
  });

  t.after(async () => {
    await prisma.transaction.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  const first = await prisma.transaction.create({
    data: {
      type: 'INCOME',
      amount: new Prisma.Decimal('0.10'),
      currency: 'TRY',
      description: 'decimal regression value',
      date: new Date('2026-09-30T00:00:00.000Z'),
      userId: user.id
    }
  });

  const second = await prisma.transaction.create({
    data: {
      type: 'INCOME',
      amount: new Prisma.Decimal('999999999999.99'),
      currency: 'TRY',
      description: 'large exact decimal regression value',
      date: new Date('2026-09-30T00:00:00.000Z'),
      userId: user.id
    }
  });

  assert.equal(first.amount.toFixed(2), '0.10');
  assert.equal(second.amount.toFixed(2), '999999999999.99');
});
