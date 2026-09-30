import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrismaCuid } from '../src/shared/validation/cuid';

test('accepts Prisma CUID-shaped identifiers', () => {
  assert.equal(isPrismaCuid('c123456789012345678901234'), true);
});

test('rejects numeric and malformed identifiers', () => {
  assert.equal(isPrismaCuid(123), false);
  assert.equal(isPrismaCuid('123'), false);
  assert.equal(isPrismaCuid('not-a-cuid'), false);
  assert.equal(isPrismaCuid('c123'), false);
  assert.equal(isPrismaCuid('c12345678901234567890123!'), false);
});
