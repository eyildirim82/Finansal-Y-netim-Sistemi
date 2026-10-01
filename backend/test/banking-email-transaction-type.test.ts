import test from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { YapiKrediFASTEmailService } from '../src/modules/banking/emailService';

const prisma = new PrismaClient();

test('recognized provider transaction type survives the parser-to-Prisma boundary', async (t) => {
  const service = new YapiKrediFASTEmailService();
  const messageId = `<bank-type-${Date.now()}-${Math.random().toString(16).slice(2)}@example.invalid>`;

  t.after(async () => {
    await prisma.bankTransaction.deleteMany({ where: { messageId } });
    await prisma.$disconnect();
  });

  const parsed = await service.parseYapiKrediFASTEmail({
    messageId,
    subject: 'Asistan-Gelen FAST bildirimi',
    from: { text: 'bank@example.invalid' },
    date: new Date('2026-10-01T10:30:00.000Z'),
    text: '1234XXXX5678 TL / TR123456789012345678901234 hesabınıza, 01/10/2026 10:30:00 tarihinde, Test Müşteri isimli/unvanlı kişiden 1.250,00 TL FAST ödemesi gelmiştir.'
  });

  assert.ok(parsed);
  assert.equal(parsed.transactionType, 'FAST');
  assert.equal(parsed.direction, 'IN');
  assert.equal(parsed.amount, 1250);

  const persisted = await prisma.bankTransaction.create({ data: parsed });

  assert.equal(persisted.transactionType, 'FAST');
  assert.equal(persisted.messageId, messageId);
  assert.equal(persisted.amount.toFixed(2), '1250.00');
});
