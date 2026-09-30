import { Prisma } from '@prisma/client';

type PrismaDecimal = InstanceType<typeof Prisma.Decimal>;

/**
 * Prisma Decimal values serialize to strings by default. The existing API and
 * frontend treat monetary fields as JSON numbers, so keep that public contract
 * while storing values exactly as DECIMAL in PostgreSQL.
 *
 * Storage/arithmetic remains decimal-safe inside Prisma. Conversion to a JS
 * number happens only at the JSON response boundary.
 */
export const configurePrismaDecimalJson = (): void => {
  Object.defineProperty(Prisma.Decimal.prototype, 'toJSON', {
    configurable: true,
    writable: true,
    value: function toJSON(this: PrismaDecimal): number {
      return this.toNumber();
    }
  });
};
